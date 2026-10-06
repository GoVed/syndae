//! Title extraction and fallback title generation.

/// Extracts a suggested conversation title from `<title>...</title>` tags in the response,
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

/// Generates a clean title from the user prompt when a default or generic title exists.
/// Purely generic: extracts protocol and sender dynamically without hardcoded platform lists.
pub fn generate_fallback_title(user_prompt: &str) -> String {
    let trimmed = user_prompt.trim();

    // 1. Generic incoming tool event format, e.g. [INCOMING TOOL EVENT: <source> Protocol: <proto> Channel: ... Sender: Alice]: Message
    if trimmed.starts_with("[INCOMING TOOL EVENT:") || trimmed.starts_with("[EXTERNAL") {
        let protocol = if let Some(proto_pos) = trimmed.find("Protocol:") {
            let after = trimmed[proto_pos + "Protocol:".len()..].trim_start();
            let raw_proto = after.split([' ', ']', ',', '\n']).next().unwrap_or("Event").trim();
            let mut chars = raw_proto.chars();
            match chars.next() {
                None => "Event".to_string(),
                Some(f) => f.to_uppercase().collect::<String>() + chars.as_str(),
            }
        } else {
            "External".to_string()
        };

        if let Some(sender_pos) = trimmed.find("Sender:") {
            let after_sender = trimmed[sender_pos + "Sender:".len()..].trim_start();
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

    // Generic bracketed event header (e.g. [SOURCE] ...)
    if trimmed.starts_with('[') && trimmed.contains(']') {
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
        assert_eq!(title_opt, None);
    }

    #[test]
    fn test_generate_fallback_title_from_user_prompt() {
        let prompt = "Can you help me write a python script for scraping?";
        let fallback = generate_fallback_title(prompt);
        assert_eq!(fallback, "Write a python script for");

        let event_prompt = "[INCOMING TOOL EVENT: msg Protocol: WhatsApp Sender: Alice]: Hey there!";
        let event_fallback = generate_fallback_title(event_prompt);
        assert_eq!(event_fallback, "WhatsApp: Alice");
    }
}
