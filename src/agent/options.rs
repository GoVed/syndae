//! Sub-call options and conversation title generator.
//! Runs a fast post-turn generation call without reasoning overhead to extract
//! interactive choices (<options>) and session title (<title>) without biasing
//! the primary ReAct agent turn loop.
//! Strictly pure harness: zero tool names, zero channel protocols, zero hardcoded relationships.

use std::time::Duration;
use tokio::time::timeout;

use crate::db::ModelConfigRecord;
use crate::router::openai::ChatMessageParam;
use crate::router::{MultiModelRouter, StreamChunk};

/// Extracts the `<options>...</options>` container block from raw output text.
pub fn extract_options_block(content: &str) -> Option<String> {
    let lower = content.to_lowercase();
    if let Some(start_idx) = lower.find("<options") {
        if let Some(_tag_close) = lower[start_idx..].find('>') {
            let actual_start = start_idx;
            if let Some(end_rel) = lower[actual_start..].find("</options>") {
                let end_idx = actual_start + end_rel + "</options>".len();
                let block = content[actual_start..end_idx].trim().to_string();
                if block.contains("<option") {
                    return Some(block);
                }
            }
        }
    }

    // Fallback: If model output raw <option>...</option> without outer container
    if lower.contains("<option>") || lower.contains("<option ") {
        let mut opts = Vec::new();
        let mut cursor = 0;
        while let Some(start) = lower[cursor..].find("<option") {
            let abs_start = cursor + start;
            if let Some(close) = lower[abs_start..].find("</option>") {
                let abs_close = abs_start + close + "</option>".len();
                opts.push(content[abs_start..abs_close].trim().to_string());
                cursor = abs_close;
            } else {
                break;
            }
        }
        if !opts.is_empty() {
            let mut out = String::from("<options>\n");
            for opt in opts {
                out.push_str(&opt);
                out.push('\n');
            }
            out.push_str("</options>");
            return Some(out);
        }
    }

    None
}

/// Dispatches a fast, non-reasoning sub-call to suggest options and session title.
/// Times out after 8 seconds to prevent blocking the turn on engine slowness.
pub async fn generate_options_and_title(
    router: &MultiModelRouter,
    model_cfg: &ModelConfigRecord,
    user_prompt: &str,
    assistant_response: &str,
) -> (Option<String>, Option<String>) {
    // Truncate inputs to prevent prompt bloat and keep inference latency under ~1s
    let clean_prompt: String = user_prompt
        .lines()
        .filter(|l| !l.trim_start().starts_with("[SYSTEM DIRECTIVE:") && !l.trim_start().starts_with("[FORMAT DIRECTIVE:"))
        .collect::<Vec<_>>()
        .join(" ")
        .chars()
        .take(400)
        .collect();

    let clean_response: String = assistant_response
        .chars()
        .take(800)
        .collect();

    if clean_prompt.trim().is_empty() && clean_response.trim().is_empty() {
        return (None, None);
    }

    let system_prompt = "You are an intelligent assistant. Suggest 3 to 4 helpful, natural next action options for the operator based on the latest interaction, formatted inside <options><option>...</option><option other=\"true\">Other (specify custom details)...</option></options> tags in English. Also provide a concise 2-4 word conversation title in <title>...</title> tags. Output only these tags.";

    let user_content = format!("Operator: {}\nSyndae: {}", clean_prompt.trim(), clean_response.trim());

    let messages = vec![
        ChatMessageParam {
            role: "system".to_string(),
            content: system_prompt.to_string(),
            name: None,
            tool_call_id: None,
            tool_calls: None,
            images: None,
        },
        ChatMessageParam {
            role: "user".to_string(),
            content: user_content,
            name: None,
            tool_call_id: None,
            tool_calls: None,
            images: None,
        },
    ];

    let fut = async {
        let mut rx = router
            .dispatch_stream(
                &model_cfg.provider,
                model_cfg.base_url.as_deref(),
                model_cfg.api_key.as_deref(),
                &model_cfg.model_id,
                messages,
                Vec::new(), // Zero tools
                Some(160),  // Compact budget
                Some("off"), // Disable reasoning tokens for instant response
                None,
            )
            .await;

        let mut output_text = String::new();
        while let Some(chunk) = rx.recv().await {
            match chunk {
                StreamChunk::Token(token) => output_text.push_str(&token),
                StreamChunk::Done => break,
                StreamChunk::Error(e) => {
                    tracing::warn!("Options generator received error chunk: {}", e);
                    break;
                }
                _ => {}
            }
        }
        output_text
    };

    match timeout(Duration::from_secs(8), fut).await {
        Ok(raw_output) => {
            let options_block = extract_options_block(&raw_output);
            let (_, title_opt) = crate::agent::reasoning::extract_suggested_title(&raw_output);
            (options_block, title_opt)
        }
        Err(_) => {
            tracing::warn!("Options generator timed out after 8s; continuing without sub-call options");
            (None, None)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_options_block_standard() {
        let raw = "<options>\n<option>Option 1</option>\n<option>Option 2</option>\n<option other=\"true\">Other</option>\n</options>\n<title>Test Title</title>";
        let extracted = extract_options_block(raw);
        assert!(extracted.is_some());
        let text = extracted.unwrap();
        assert!(text.contains("<option>Option 1</option>"));
        assert!(text.contains("<option other=\"true\">Other</option>"));
        assert!(!text.contains("<title>"));
    }

    #[test]
    fn test_extract_options_block_missing_outer() {
        let raw = "<option>Choice A</option>\n<option>Choice B</option>";
        let extracted = extract_options_block(raw);
        assert!(extracted.is_some());
        let text = extracted.unwrap();
        assert!(text.starts_with("<options>"));
        assert!(text.ends_with("</options>"));
        assert!(text.contains("<option>Choice A</option>"));
    }

    #[test]
    fn test_extract_options_block_none() {
        let raw = "Just standard conversational text with no tags.";
        assert!(extract_options_block(raw).is_none());
    }
}
