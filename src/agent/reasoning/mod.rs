//! Reasoning, thought extraction, and response post-processing.
//! Strictly pure harness: zero tool names, zero channel protocols, zero dialect heuristics.

pub mod repetition;
pub mod title;

pub use repetition::{arrest_repetition, arrest_response_repetition, find_repetition_cutoff};
pub use title::{extract_suggested_title, generate_fallback_title};

/// Checks if a string line represents a generic pseudo-function call (e.g. `func_name(...)` or `call: ...`)
fn is_pseudo_function_call(line: &str) -> bool {
    let lower = line.trim().to_lowercase();
    if lower.starts_with("call:") || lower.starts_with("call :") {
        return true;
    }
    if let Some(paren_idx) = lower.find('(') {
        let name = &lower[..paren_idx];
        if !name.is_empty()
            && name.chars().all(|c| c.is_ascii_alphanumeric() || c == '_')
            && name.chars().next().is_some_and(|c| c.is_ascii_alphabetic() || c == '_')
            && (lower.contains(')') || lower.contains('{') || lower.contains(':'))
        {
            return true;
        }
    }
    false
}

/// Helper function to detect and separate untagged chain-of-thought analysis paragraphs
pub fn split_leading_reasoning(content: &str) -> (Option<String>, String) {
    let meta_prefixes = [
        "Given ",
        "Considering ",
        "In this conversation",
        "In this context",
        "To respond to the user",
        "Looking at ",
        "The user ",
        "Since I ",
        "Since there ",
        "I should ",
        "I shouldn't ",
        "I need to ",
        "Let me ",
        "Based on ",
        "From my ",
        "From the ",
        "From memory",
        "From scratchpad",
        "Thinking Process",
        "Reasoning Process",
        "[Memory Check]",
        "[Plan]",
        "[Reasoning]",
        "[Thought]",
        "[Context]",
        "The daily log ",
        "As Syndae, I should ",
        "As an AI ",
        "However, I ",
        "I don't have access to real-time",
        "The memory only contains",
        "Call:",
        "call:",
        "STEP 1:",
        "Step 1:",
    ];

    let trimmed = content.trim();
    let paragraphs: Vec<&str> = trimmed.split("\n\n").collect();
    if paragraphs.len() <= 1 {
        let starts_with_meta = meta_prefixes.iter().any(|prefix| trimmed.starts_with(prefix))
            || is_pseudo_function_call(trimmed);
        if !starts_with_meta {
            return (None, trimmed.to_string());
        }
    }

    let is_meta_para = |p: &str| -> bool {
        let lower = p.to_lowercase();
        meta_prefixes.iter().any(|prefix| p.starts_with(prefix))
            || p.starts_with("Okay,")
            || p.starts_with("Okay.")
            || p.starts_with("Alright,")
            || p.starts_with("Alright.")
            || is_pseudo_function_call(p)
            || lower.starts_with("step 1:")
            || lower.contains("is asking ")
            || lower.contains("has chosen ")
            || lower.contains("has asked ")
            || lower.contains("wants me to ")
            || lower.contains("i should ")
            || lower.contains("i need to ")
            || lower.contains("i'll formulate")
            || lower.contains("i will formulate")
            || lower.contains("i'll generate")
            || lower.contains("i will generate")
            || lower.contains("i'll respond")
            || lower.contains("i will respond")
            || lower.contains("i'll output")
            || lower.contains("i will output")
            || lower.contains("system instructions")
            || lower.contains("onboarding mode")
            || lower.contains("<options> block")
            || lower.contains("wrap my thinking")
            || p.starts_with("- ")
            || p.starts_with("* ")
    };

    let first_is_meta = paragraphs.first().is_some_and(|p| is_meta_para(p.trim()));
    if !first_is_meta {
        return (None, trimmed.to_string());
    }

    let mut thought_paragraphs = Vec::new();
    let mut content_paragraphs = Vec::new();
    let mut in_leading_thought = true;

    for para in paragraphs {
        let p_trim = para.trim();
        if p_trim.is_empty() {
            continue;
        }

        if in_leading_thought {
            let is_numbered = p_trim.chars().next().is_some_and(|c| c.is_ascii_digit())
                && (p_trim.contains(". ") || p_trim.contains(") "));
            let is_meta = is_meta_para(p_trim) || is_numbered;
            if is_meta {
                thought_paragraphs.push(p_trim);
            } else {
                in_leading_thought = false;
                content_paragraphs.push(p_trim);
            }
        } else {
            content_paragraphs.push(p_trim);
        }
    }

    if thought_paragraphs.is_empty() {
        (None, trimmed.to_string())
    } else if content_paragraphs.is_empty() {
        (Some(thought_paragraphs.join("\n\n")), String::new())
    } else {
        (
            Some(thought_paragraphs.join("\n\n")),
            content_paragraphs.join("\n\n"),
        )
    }
}

/// Parses and cleans response and thoughts, stripping `<think>` tags,
/// "Thinking Process:" headings, pseudo-function call syntax, and untagged meta-reasoning blocks.
pub fn extract_thought_and_response(
    raw_response: &str,
    raw_thought: &str,
) -> (String, Option<String>) {
    let mut final_response = raw_response.trim().to_string();
    let mut final_thought = raw_thought.trim().to_string();

    // 1. Check for thinking tags (<think>, <thought>, <thinking>, <antthinking>, etc.) in final_response
    for tag in ["think", "thought", "thinking", "antthinking", "antthought", "ifm|think"] {
        let open_tag = format!("<{}>", tag);
        let close_tag = format!("</{}>", tag);
        loop {
            let lower = final_response.to_lowercase();
            if let Some(start) = lower.find(&open_tag) {
                if let Some(end_rel) = lower[start..].find(&close_tag) {
                    let end_idx = start + end_rel;
                    let extracted = final_response[start + open_tag.len()..end_idx].trim();
                    if !extracted.is_empty() {
                        if final_thought.is_empty() {
                            final_thought = extracted.to_string();
                        } else if !final_thought.contains(extracted) {
                            final_thought.push_str("\n\n");
                            final_thought.push_str(extracted);
                        }
                    }
                    let before = &final_response[..start];
                    let after = &final_response[end_idx + close_tag.len()..];
                    final_response = format!("{}{}", before, after).trim().to_string();
                } else {
                    break;
                }
            } else {
                break;
            }
        }

        // Orphan closing tag
        let lower = final_response.to_lowercase();
        if let Some(end_idx) = lower.find(&close_tag) {
            let extracted = final_response[..end_idx].trim();
            if !extracted.is_empty() {
                if final_thought.is_empty() {
                    final_thought = extracted.to_string();
                } else if !final_thought.contains(extracted) {
                    final_thought.push_str("\n\n");
                    final_thought.push_str(extracted);
                }
            }
            final_response = final_response[end_idx + close_tag.len()..].trim().to_string();
        }
    }

    // 2. Check for "Thinking Process: ... "
    if let Some(start) = final_response.find("Thinking Process:") {
        let after = &final_response[start + "Thinking Process:".len()..];
        if let Some(split) = after.find("\n\n") {
            let extracted = after[..split].trim();
            if !extracted.is_empty() {
                if final_thought.is_empty() {
                    final_thought = extracted.to_string();
                } else if !final_thought.contains(extracted) {
                    final_thought.push_str("\n\n");
                    final_thought.push_str(extracted);
                }
            }
            final_response =
                format!("{}{}", &final_response[..start], &after[split..]).trim().to_string();
        }
    }

    // 3. Extract any leading untagged meta-reasoning paragraphs
    if let (Some(leading_thought), clean_resp) = split_leading_reasoning(&final_response)
        && !leading_thought.is_empty()
        && !clean_resp.is_empty()
    {
        if final_thought.is_empty() {
            final_thought = leading_thought;
        } else if !final_thought.contains(&leading_thought) {
            final_thought.push_str("\n\n");
            final_thought.push_str(&leading_thought);
        }
        final_response = clean_resp;
    }

    // 4. Strip any generic pseudo-function call syntax blocks: e.g. identifier followed by '(' ... ')'
    let mut search_from = 0;
    while let Some(open_rel) = final_response[search_from..].find('(') {
        let open_idx = search_from + open_rel;
        let before_ident = &final_response[..open_idx];
        let ident = before_ident
            .rsplit(|c: char| !c.is_ascii_alphanumeric() && c != '_')
            .next()
            .unwrap_or("");

        let ident_start = open_idx.saturating_sub(ident.len());
        let is_valid_ident = !ident.is_empty()
            && ident.chars().next().is_some_and(|c| c.is_ascii_alphabetic() || c == '_')
            && (ident_start == 0
                || final_response
                    .as_bytes()
                    .get(ident_start.saturating_sub(1))
                    .is_some_and(|&b| b == b'\n' || b == b' ' || b == b'\t' || b == b':' || b == b'`'));

        if is_valid_ident {
            if let Some(close_rel) = final_response[open_idx..].find(')') {
                let close_idx = open_idx + close_rel + 1;
                let mock_call = final_response[ident_start..close_idx].trim();
                if mock_call.contains('"')
                    || mock_call.contains('\'')
                    || mock_call.contains('{')
                    || mock_call.contains(':')
                    || mock_call.contains(',')
                    || mock_call.ends_with("()")
                {
                    if final_thought.is_empty() {
                        final_thought = mock_call.to_string();
                    } else if !final_thought.contains(mock_call) {
                        final_thought.push_str("\n\n");
                        final_thought.push_str(mock_call);
                    }
                    final_response = format!(
                        "{}{}",
                        &final_response[..ident_start],
                        &final_response[close_idx..]
                    )
                    .trim()
                    .to_string();
                    search_from = ident_start;
                    continue;
                }
            }
        }
        search_from = open_idx + 1;
    }

    // Strip stray unhandled pseudo-tags (e.g. <parameter name="...">...</parameter>)
    while let Some(start) = final_response.find("<parameter") {
        if let Some(end_open) = final_response[start..].find('>') {
            let tag_end = start + end_open + 1;
            if let Some(close) = final_response[tag_end..].find("</parameter>") {
                let close_end = tag_end + close + "</parameter>".len();
                final_response = format!("{}{}", &final_response[..start], &final_response[close_end..]).trim().to_string();
            } else {
                final_response = format!("{}{}", &final_response[..start], &final_response[tag_end..]).trim().to_string();
            }
        } else {
            break;
        }
    }

    // Strip any stray 'tags.' or 'tags:' artifacts
    for s in [&mut final_thought, &mut final_response] {
        let mut t = s.trim().to_string();
        while t.to_lowercase().starts_with("tags.")
            || t.to_lowercase().starts_with("tags:")
            || t.to_lowercase().starts_with("tags\n")
        {
            if let Some(pos) = t.find('\n') {
                t = t[pos..].trim().to_string();
            } else {
                t.clear();
                break;
            }
        }
        *s = t;
    }

    if let Some(cutoff) = find_repetition_cutoff(&final_response) {
        final_response.truncate(cutoff);
    }

    let thought_opt = if !final_thought.is_empty() {
        Some(final_thought)
    } else {
        None
    };

    (final_response, thought_opt)
}
