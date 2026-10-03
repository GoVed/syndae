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
        "translate(",
        "send_message(",
        "search_contacts(",
        "send_reaction(",
        "Call: translate",
        "Call: send_message",
        "Call:",
        "call:",
        "STEP 1:",
        "Step 1:",
    ];

    let trimmed = content.trim();
    let paragraphs: Vec<&str> = trimmed.split("\n\n").collect();
    if paragraphs.len() <= 1 {
        let starts_with_meta = meta_prefixes.iter().any(|prefix| trimmed.starts_with(prefix));
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
            || lower.starts_with("translate(")
            || lower.starts_with("send_message(")
            || lower.starts_with("search_contacts(")
            || lower.starts_with("send_reaction(")
            || lower.starts_with("call:")
            || lower.starts_with("call :")
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

/// Parses and cleans response and thoughts, stripping <think> tags,
/// "Thinking Process:" headings, and untagged meta-reasoning blocks.
pub fn extract_thought_and_response(
    raw_response: &str,
    raw_thought: &str,
) -> (String, Option<String>) {
    let mut final_response = raw_response.trim().to_string();
    let mut final_thought = raw_thought.trim().to_string();

    // 1. Check for <think>...</think>, <thought>...</thought>, or <ifm|think> tags in final_response
    for tag in ["think", "thought", "ifm|think"] {
        let open_tag = format!("<{}>", tag);
        let close_tag = format!("</{}>", tag);
        while let Some(start) = final_response.find(&open_tag) {
            if let Some(end) = final_response[start..].find(&close_tag) {
                let end_idx = start + end;
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
        }

        // 1b. Check for orphan closing tag </think> (e.g. if opening tag was stripped during streaming)
        if let Some(end_idx) = final_response.find(&close_tag) {
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
        && !leading_thought.is_empty() && !clean_resp.is_empty() {
            if final_thought.is_empty() {
                final_thought = leading_thought;
            } else if !final_thought.contains(&leading_thought) {
                final_thought.push_str("\n\n");
                final_thought.push_str(&leading_thought);
            }
            final_response = clean_resp;
        }

    // 4. Strip any pseudo function call syntax blocks (e.g. translate(...), send_message(...))
    for func in ["translate", "send_message", "search_contacts", "send_reaction"] {
        let call_sig = format!("{}(", func);
        while let Some(start) = final_response.find(&call_sig) {
            if let Some(close_paren) = final_response[start..].find(')') {
                let end_idx = start + close_paren + 1;
                let mock_call = final_response[start..end_idx].trim();
                if final_thought.is_empty() {
                    final_thought = mock_call.to_string();
                } else if !final_thought.contains(mock_call) {
                    final_thought.push_str("\n\n");
                    final_thought.push_str(mock_call);
                }
                final_response = format!("{}{}", &final_response[..start], &final_response[end_idx..]).trim().to_string();
            } else {
                break;
            }
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

/// Detects runaway degenerative repetition loops (e.g. model repeating the same sentence or phrase 3+ times).
/// Returns Some(cutoff_index) if repetition is detected, where cutoff_index is the end of the first occurrence.
pub fn find_repetition_cutoff(text: &str) -> Option<usize> {
    let n = text.len();
    if n < 50 {
        return None;
    }

    // 1. Line-based repetition check: scan non-empty trimmed lines
    let non_empty_lines: Vec<(usize, &str)> = text
        .match_indices('\n')
        .chain(std::iter::once((text.len(), "")))
        .scan(0usize, |start, (end, _)| {
            let line = text.get(*start..end).unwrap_or("");
            let res = (*start, line.trim());
            *start = (end + 1).min(text.len());
            Some(res)
        })
        .filter(|(_, line)| line.len() >= 10)
        .collect();

    if non_empty_lines.len() >= 3 {
        let len = non_empty_lines.len();
        let l3 = non_empty_lines[len - 1].1;
        let l2 = non_empty_lines[len - 2].1;
        let (l1_idx, l1) = non_empty_lines[len - 3];
        if l1 == l2 && l2 == l3 {
            return Some(l1_idx + l1.len());
        }
    }

    // 2. Exact chunk pattern repetition check (length 15 to 250)
    let max_pat_len = (n / 3).min(250);
    for pat_len in 15..=max_pat_len {
        let p3_start = n - pat_len;
        let p2_start = n - 2 * pat_len;
        let p1_start = n - 3 * pat_len;

        if let (Some(p3), Some(p2), Some(p1)) = (
            text.get(p3_start..n),
            text.get(p2_start..p3_start),
            text.get(p1_start..p2_start),
        ) {
            if p1.trim() == p2.trim() && p2.trim() == p3.trim() && p1.trim().len() >= 10 {
                return Some(p1_start + p1.trim_end().len());
            }
        }
    }

    None
}

/// Truncates repeated patterns and halts streaming when a repetition loop is detected.
pub fn arrest_repetition(current: &mut String, accumulated: &mut String) -> bool {
    if current.len() >= 50 && (current.ends_with('\n') || current.ends_with('.') || current.ends_with('!')) {
        if let Some(cutoff) = find_repetition_cutoff(current) {
            let discarded = current.len().saturating_sub(cutoff);
            current.truncate(cutoff);
            if accumulated.len() >= discarded {
                let new_len = accumulated.len() - discarded;
                accumulated.truncate(new_len);
            }
            return true;
        }
    }
    false
}

/// Extracts a suggested conversation title from <title>...</title> tags in the response,
/// strips the tag from the returned response text, and returns the cleaned title.
pub fn extract_suggested_title(content: &str) -> (String, Option<String>) {
    let open_tags = ["<title>", "<suggested_title>", "<session_title>"];
    let close_tags = ["</title>", "</suggested_title>", "</session_title>"];

    for (open_tag, close_tag) in open_tags.iter().zip(close_tags.iter()) {
        let lower = content.to_lowercase();
        if let Some(start_idx) = lower.find(open_tag) {
            let body_start = start_idx + open_tag.len();
            if let Some(end_rel) = lower[body_start..].find(close_tag) {
                let body_end = body_start + end_rel;
                let raw_title = content[body_start..body_end].trim();

                // Clean the title: strip quotes, backticks, asterisks, hashtags
                let cleaned = raw_title
                    .trim_matches(|c| c == '"' || c == '\'' || c == '`' || c == '*' || c == '#')
                    .trim();

                let mut before = content[..start_idx].trim_end().to_string();
                let after = content[body_end + close_tag.len()..].trim_start();
                if !before.is_empty() && !after.is_empty() {
                    before.push('\n');
                }
                before.push_str(after);
                let clean_content = before.trim().to_string();

                let lower_cleaned = cleaned.to_lowercase();
                if !cleaned.is_empty()
                    && cleaned.chars().count() <= 60
                    && lower_cleaned != "new mission workspace"
                    && lower_cleaned != "new chat"
                    && lower_cleaned != "active session"
                    && lower_cleaned != "untitled session"
                    && lower_cleaned != "chat"
                {
                    return (clean_content, Some(cleaned.to_string()));
                } else {
                    return (clean_content, None);
                }
            }
        }
    }

    (content.to_string(), None)
}

/// Generates an intelligent, clean title from the user prompt when a default or generic title exists.
pub fn generate_fallback_title(user_prompt: &str) -> String {
    let trimmed = user_prompt.trim();

    // 1. If it's an incoming tool event, e.g. [INCOMING TOOL EVENT: whatsapp Protocol: whatsapp Channel: ... Sender: Alice]: Message
    if trimmed.starts_with("[INCOMING TOOL EVENT:") || trimmed.starts_with("[EXTERNAL") {
        let protocol = if trimmed.to_lowercase().contains("whatsapp") {
            "WhatsApp"
        } else if trimmed.to_lowercase().contains("email") {
            "Email"
        } else if trimmed.to_lowercase().contains("imessage") {
            "iMessage"
        } else {
            "External"
        };

        if let Some(sender_pos) = trimmed.find("Sender:") {
            let after_sender = &trimmed[sender_pos + "Sender:".len()..];
            let first_line = after_sender.lines().next().unwrap_or("").trim();
            let sender_raw = first_line.split([']', ',', '\n']).next().unwrap_or("").trim();
            let clean_sender = sender_raw
                .strip_prefix('"')
                .unwrap_or(sender_raw)
                .strip_suffix('"')
                .unwrap_or(sender_raw)
                .trim();
            if !clean_sender.is_empty() && clean_sender != "Unknown" {
                return format!("{}: {}", protocol, clean_sender.chars().take(25).collect::<String>());
            }
        }
        return format!("{} Event", protocol);
    }

    if trimmed.starts_with("[EMAIL]") {
        let line = trimmed.lines().next().unwrap_or(trimmed);
        return line.chars().take(35).collect::<String>();
    }

    // 2. Regular user prompt: strip common conversational prefixes
    let lower = trimmed.to_lowercase();
    let mut clean_prompt = trimmed;

    let prefixes = [
        "can you help me with ",
        "can you help me ",
        "can you please ",
        "could you please ",
        "could you help me ",
        "could you ",
        "can you ",
        "please help me with ",
        "please help me ",
        "please ",
        "i need you to ",
        "i want to ",
        "i want you to ",
        "how do i ",
        "how to ",
        "what is the ",
        "what are the ",
        "tell me about ",
        "explain to me ",
        "explain ",
    ];

    for prefix in prefixes {
        if lower.starts_with(prefix) {
            clean_prompt = &clean_prompt[prefix.len()..];
            break;
        }
    }

    // Take first 5-6 words
    let words: Vec<&str> = clean_prompt.split_whitespace().collect();
    if words.is_empty() {
        return "Conversation".to_string();
    }

    let candidate_words: Vec<&str> = words.into_iter().take(5).collect();
    let candidate = candidate_words.join(" ");

    // Capitalize first letter
    let mut chars = candidate.chars();
    let capitalized = match chars.next() {
        None => String::new(),
        Some(f) => f.to_uppercase().collect::<String>() + chars.as_str(),
    };

    let result = capitalized.trim_end_matches(|c| c == '.' || c == '?' || c == '!' || c == ':');
    if result.chars().count() > 35 {
        format!("{}...", result.chars().take(32).collect::<String>())
    } else {
        result.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_suggested_title_from_tags() {
        let raw = "Here is the summary of your task.\n\n<title>Docker Container Setup</title>";
        let (cleaned, title_opt) = extract_suggested_title(raw);
        assert_eq!(cleaned, "Here is the summary of your task.");
        assert_eq!(title_opt, Some("Docker Container Setup".to_string()));
    }

    #[test]
    fn test_extract_suggested_title_strips_quotes_and_ignores_generic() {
        let raw = "Done!\n<title>\"New Mission Workspace\"</title>";
        let (cleaned, title_opt) = extract_suggested_title(raw);
        assert_eq!(cleaned, "Done!");
        assert_eq!(title_opt, None); // Ignored because it's the generic placeholder
    }

    #[test]
    fn test_generate_fallback_title_from_user_prompt() {
        let prompt = "Can you help me write a python script for scraping?";
        let fallback = generate_fallback_title(prompt);
        assert_eq!(fallback, "Write a python script for");

        let event_prompt = "[INCOMING TOOL EVENT: whatsapp Protocol: whatsapp Sender: Alice]: Hey there!";
        let event_fallback = generate_fallback_title(event_prompt);
        assert_eq!(event_fallback, "WhatsApp: Alice");
    }
}
