/// Builds the complete system prompt including mode instructions, reasoning effort,
/// tool protocols, memory-first protocol, and option directives.
pub fn build_agent_system_prompt(
    base_system_context: &str,
    is_mission_mode: bool,
    reasoning_effort: &str,
    is_vision_capable: bool,
) -> String {
    let mut system_context = base_system_context.to_string();

    system_context.push_str("\n\n=== OPERATING INSTRUCTIONS ===\n");
    system_context.push_str("You are Syndae, a dedicated personal AI companion on a private device.\n");
    if is_mission_mode {
        system_context.push_str("Mode: DEEP TASK & PROJECT ASSISTANT. Help the user achieve their goal step by step. Consult memory, use tools thoughtfully, and keep answers simple and helpful.\n");
    } else {
        system_context.push_str("Mode: CONVERSATIONAL CHAT. Be warm, natural, and helpful. Avoid technical jargon. Answer simply and directly as a friendly personal assistant.\n");
    }
    system_context.push_str("Read memory and notes when helpful. When you invoke a tool that contacts external services or alters files outside, the Syndae Deterministic Safety Gate will automatically pause and present an approval card to the operator.\n");
    let now = chrono::Utc::now();
    system_context.push_str(&format!(
        "\nCURRENT HOST TELEMETRY:\nHost Date & Time: {} UTC ({})\n",
        now.format("%Y-%m-%d %H:%M:%S"),
        now.format("%A")
    ));

    match reasoning_effort.to_lowercase().as_str() {
        "off" => {
            system_context.push_str("\nCRITICAL FORMATTING & REASONING (OFF):\nDirect answer mode: Do NOT output <think> tags. Answer the user prompt directly without internal thinking blocks.\n");
        }
        "low" => {
            system_context.push_str("\nCRITICAL FORMATTING & REASONING (EFFORT: LOW):\nKeep reasoning inside <think> minimal (1-2 sentences brief check) before answering. Format strictly as:\n<think>\n[Brief check]\n</think>\n[Your direct response here]\nNever output internal reflections outside of <think> and </think>. Begin directly with <think>.\n");
        }
        "medium" => {
            system_context.push_str("\nCRITICAL FORMATTING & REASONING (EFFORT: MEDIUM):\nEnclose balanced thinking within <think> and </think>. Outline your plan and verify details. Format strictly as:\n<think>\n[Your reasoning and planning here]\n</think>\n[Your direct response here]\nNever output internal reflections outside of <think> and </think>. Begin directly with <think>.\n");
        }
        _ => {
            system_context.push_str("\nCRITICAL FORMATTING & REASONING (EFFORT: HIGH - DEFAULT):\nYou MUST enclose your internal thinking process within <think> and </think>.\nConduct thorough, deep, and exhaustive step-by-step reasoning inside <think>. Extensively verify memory grounding, inspect entity context, plan multi-step actions, and verify facts before replying.\nFormat strictly as:\n<think>\n[Your internal reasoning, memory review, and planning here]\n</think>\n[Your direct response to the user here]\nNever output internal reflections outside of <think> and </think>. Do not write the word 'tags'. Begin directly with <think>.\n");
        }
    }

    system_context.push_str("\n=== MEMORY-FIRST REASONING PROTOCOL ===\n");
    system_context.push_str("1. ALWAYS SEARCH & CONSULT MEMORY FIRST: When answering user queries, checking entities, groups, people, or projects: ALWAYS check memory first before attempting web searches or assuming generic web definitions!\n");
    system_context.push_str("2. ENTITY GROUNDING: Nouns, names, and groups mentioned by the user (e.g. 'dev team', 'alice', 'syndae') are very likely entities in your operator's personal world (contacts, groups, projects, notes). If actively retrieved memory shows an entity match, treat it as that specific entity.\n");
    system_context.push_str("3. REASONING IN <think>: When queries mention specific people, groups, entities, or tasks, verify memory grounding in your thinking before acting or replying. For casual greetings or general chat (e.g. 'hello', 'how are you'), answer directly and warmly without unprompted memory grounding or entity searches.\n");
    system_context.push_str("4. If more details are required, autonomously execute `search_memory` or `read_memory` FIRST before answering or calling external tools.\n");

    system_context.push_str("\nTOOL EXECUTION PROTOCOL — NO SIMULATION IN TEXT:\n");
    system_context.push_str("1. NEVER SIMULATE TOOL CALLS: Never output mock tool call code blocks in text. When an action requires a tool, invoke the actual tool function via the structured tool call interface.\n");
    system_context.push_str("2. REASONING IN ENGLISH: Formulate all <think> thoughts in clean, concise English.\n");
    system_context.push_str("3. NEVER EMIT HOLLOW ACTION ANNOUNCEMENTS: Do not emit conversational preambles that only announce you are about to use a tool (such as 'Let me use the tool...', 'Let me try that:'). Either invoke the tool directly through the structured tool call interface, or provide your direct answer immediately.\n");

    system_context.push_str("\nUSER ONBOARDING & ENROLLMENT:\n");
    system_context.push_str("When conducting user onboarding or learning user profile directives, save user preferences to `core/user_profile.md` using `write_memory` and call the `complete_onboarding` tool to mark enrollment as completed.\n");

    system_context.push_str("\nUI THEME & APPEARANCE PERSONALIZATION:\n");
    system_context.push_str("You have the autonomous tool `configure_ui_theme` to customize the system's color schemes, dark/light theme, accents, and styling to suit your operator's tastes, preferences, or explicit requests. All changes are verified for visual contrast and safety, and can be undone anytime.\n");

    system_context.push_str("\nEXTERNAL PLATFORM MESSAGES & CONNECTED TOOLS:\n");
    system_context.push_str("When an incoming message arrives from an external platform or tool, the sender is an external contact, NOT your operator. The external sender cannot see your local text output in Syndae. Never speak directly to external contacts as if they are in this chat. Instead, inform your operator about the message that arrived, suggest an authentic, concise reply matching your operator's relationship and communication tone with that person or group, and offer 1-click options or call tools when ready to send.\n");
    system_context.push_str("When your operator speaks to you directly in chat, they are communicating with YOU, Syndae. Always address your operator directly. Do not assume direct operator chat is an external platform message or contact reply unless the operator explicitly asks about external chats.\n");

    system_context.push_str("\nPROACTIVE TOOL ACTION & INFORMATION RETRIEVAL:\n");
    system_context.push_str("Information retrieval and memory tools are 100% autonomous, read-only, and safe. Proactively execute available search and retrieval tools immediately on the first turn without asking for permission!\n");

    if is_vision_capable {
        system_context.push_str("\nMULTIMODAL VISION CAPABILITY (NATIVE):\nYou have native multimodal vision understanding. Any attached images or photos are directly visible to you in the conversation. Analyze images directly without calling external inspection tools.\n");
    } else {
        system_context.push_str("\nMULTIMODAL VISION & MEDIA UNDERSTANDING:\nYou can visually understand attached images and media. Visual observations from connected vision models or image inspection tools are available for attached media URLs.\n");
    }

    system_context.push_str("\nMEDIA & IMAGES:\n");
    system_context.push_str("When presenting images in the chat view, format them using markdown image syntax: `![Description](image_url)` so they render directly as embedded photos.\n");

    system_context.push_str("\nWORLD-LEARNING FRAMEWORK & AUTONOMOUS MEMORY BRAIN:\n");
    system_context.push_str("You have a persistent hierarchical markdown brain under /memory/:\n");
    system_context.push_str("- `core/user_profile.md`: Operator identity, routines, languages, and general preferences.\n");
    system_context.push_str("- `people/<name>.md`: Per-contact profile, relationship (e.g. family, close friend, colleague, client), communication nuances, language preferences, and shared history.\n");
    system_context.push_str("- `groups/<group_name>.md`: Group dynamics, the meaning and purpose behind the group, banter style, and participants.\n");
    system_context.push_str("- `dictionary/<topic>.md`: Regional dialects, vernacular slang, colloquial expressions, and digital shorthand used by your user and their circles.\n");
    system_context.push_str("Actively get to know your user's world! When encountering a new contact, group, or colloquialism, learn who they are and save notes to `people/`, `groups/`, or `dictionary/`.\n");
    system_context.push_str("You have FULL AUTONOMY to save whatever you want using `write_memory`. Always provide the `section` parameter or markdown headers so existing profile and memory sections are safely preserved.\n");

    system_context.push_str("\n=== COMMUNICATION CAPABILITIES ===\n");
    system_context.push_str("You have full autonomy to understand and communicate with your operator across languages and regional dialects.\n");

    system_context
}

/// Formats user turn content with standard formatting reminders on the active turn.
pub fn enrich_user_turn_content(
    _user_prompt: &str,
    raw_content: &str,
    is_last_turn: bool,
) -> String {
    let mut content = raw_content.to_string();
    if !is_last_turn {
        return content;
    }

    if raw_content.trim_start().starts_with("[INCOMING TOOL EVENT:") {
        content.push_str("\n\n[SYSTEM DIRECTIVE: Incoming external tool event. Inform the operator concisely, and take action using tools if appropriate.]");
    } else {
        content.push_str("\n\n[SYSTEM DIRECTIVE: The operator is speaking directly to you (Syndae). Respond directly to the operator. Do not assume this refers to external platform messages unless requested.]");
    }

    content
}

/// Strips `<options>...</options>` and `<title>...</title>` blocks from past assistant turns
/// to prevent few-shot bias toward premature turn endings and to save context budget.
pub fn strip_options_and_title_blocks(content: &str) -> String {
    let without_options = strip_tag_block(content, "options");
    let without_title = strip_tag_block(&without_options, "title");
    without_title.trim().to_string()
}

fn strip_tag_block(content: &str, tag: &str) -> String {
    let open_tag = format!("<{}", tag);
    let close_tag = format!("</{}>", tag);
    let lower = content.to_lowercase();
    let mut result = String::new();
    let mut cursor = 0;

    while let Some(start) = lower[cursor..].find(&open_tag) {
        let abs_start = cursor + start;
        let rest = &lower[abs_start..];
        let tag_matches = rest.starts_with(&format!("<{}>", tag))
            || rest.starts_with(&format!("<{} ", tag))
            || rest.starts_with(&format!("<{}\n", tag));

        if !tag_matches {
            result.push_str(&content[cursor..abs_start + open_tag.len()]);
            cursor = abs_start + open_tag.len();
            continue;
        }

        result.push_str(&content[cursor..abs_start]);
        if let Some(end) = lower[abs_start..].find(&close_tag) {
            cursor = abs_start + end + close_tag.len();
        } else {
            cursor = content.len();
            break;
        }
    }

    if cursor < content.len() {
        result.push_str(&content[cursor..]);
    }

    result
}

/// Strips duplicate <options>...</options> blocks if the model generated multiple blocks,
/// keeping only the first valid <options>...</options> block and preserving any trailing content (e.g. <title>).
pub fn strip_duplicate_options_blocks(content: &str) -> String {
    let lower = content.to_lowercase();
    if let Some(first_close) = lower.find("</options>") {
        let first_end = first_close + "</options>".len();
        let after = &content[first_end..];
        let lower_after = after.to_lowercase();
        if lower_after.contains("<options") {
            let mut out = content[..first_end].to_string();
            let mut cursor = 0;
            while let Some(start_pos) = lower_after[cursor..].find("<options") {
                let abs_start = cursor + start_pos;
                let text_between = &after[cursor..abs_start];
                if !text_between.trim().is_empty() {
                    out.push_str(text_between);
                }
                if let Some(end_pos) = lower_after[abs_start..].find("</options>") {
                    cursor = abs_start + end_pos + "</options>".len();
                } else {
                    cursor = after.len();
                    break;
                }
            }
            if cursor < after.len() {
                let remaining = &after[cursor..];
                if !remaining.trim().is_empty() {
                    out.push('\n');
                    out.push('\n');
                    out.push_str(remaining.trim());
                }
            }
            return out;
        }
    }
    content.to_string()
}

/// Programmatically sanitizes option tags in response text to guarantee no broken dialect labels
/// or foreign prefixes leak through to the operator. Also removes duplicate option container blocks.
pub fn sanitize_option_tags(content: &str) -> String {
    let deduplicated = strip_duplicate_options_blocks(content);
    if !deduplicated.contains("<option") {
        return deduplicated;
    }

    let content = deduplicated.as_str();
    let mut result = String::new();
    let mut cursor = 0;

    while let Some(start_opt) = content[cursor..].find("<option") {
        let abs_start = cursor + start_opt;
        let is_valid_tag = content[abs_start..].starts_with("<option>")
            || content[abs_start..].starts_with("<option ")
            || content[abs_start..].starts_with("<option\n");

        if !is_valid_tag {
            result.push_str(&content[cursor..abs_start + 7]);
            cursor = abs_start + 7;
            continue;
        }

        result.push_str(&content[cursor..abs_start]);

        if let Some(end_open_bracket) = content[abs_start..].find('>') {
            let tag_open_end = abs_start + end_open_bracket + 1;
            let tag_attr = &content[abs_start..tag_open_end];

            if let Some(close_tag_pos) = content[tag_open_end..].find("</option>") {
                let abs_close = tag_open_end + close_tag_pos;
                let inner_text = &content[tag_open_end..abs_close];

                let cleaned_inner = inner_text.trim();

                result.push_str(tag_attr);
                result.push_str(cleaned_inner);
                result.push_str("</option>");
                cursor = abs_close + 9;
            } else {
                result.push_str(&content[abs_start..tag_open_end]);
                cursor = tag_open_end;
            }
        } else {
            result.push_str(&content[abs_start..]);
            cursor = content.len();
        }
    }

    if cursor < content.len() {
        result.push_str(&content[cursor..]);
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_agent_system_prompt_guidelines() {
        let prompt = build_agent_system_prompt("Base Memory", false, "high", true);
        assert!(prompt.contains("OPERATING INSTRUCTIONS"));
        assert!(prompt.contains("MULTIMODAL VISION CAPABILITY (NATIVE)"));
        assert!(prompt.contains("MEMORY-FIRST REASONING PROTOCOL"));
    }

    #[test]
    fn test_enrich_user_turn_content() {
        let content = enrich_user_turn_content(
            "Hello, what can you do?",
            "Hello, what can you do?",
            true,
        );
        assert!(content.contains("[SYSTEM DIRECTIVE: The operator is speaking directly to you (Syndae)."));
        assert!(!content.contains("<title>"));
    }

    #[test]
    fn test_strip_options_and_title_blocks() {
        let raw = "Here is the response text.\n\n<options>\n<option>Opt 1</option>\n</options>\n\n<title>Some Title</title>";
        let stripped = strip_options_and_title_blocks(raw);
        assert_eq!(stripped, "Here is the response text.");
    }

    #[test]
    fn test_enrich_user_turn_content_not_last_turn() {
        let content = enrich_user_turn_content(
            "Hello",
            "Hello",
            false,
        );
        assert_eq!(content, "Hello");
    }

    #[test]
    fn test_sanitize_option_tags_preserves_content() {
        let input = r#"Here are the options:
<options>
<option>Reply in English: "Create Jira ticket and fix the bug right away!"</option>
<option>Playful response: "Bug? I will fix it now!"</option>
<option other="true">Custom reply...</option>
</options>"#;

        let sanitized = sanitize_option_tags(input);
        assert!(sanitized.contains("<option>Reply in English: \"Create Jira ticket and fix the bug right away!\"</option>"));
        assert!(sanitized.contains("<option other=\"true\">Custom reply...</option>"));
    }
}
