use serde_json::Value;

use crate::agent::compression::estimate_tools_tokens;
use crate::mcp::policy::PolicyTier;
use crate::mcp::types::McpTool;
use crate::memory::embeddings::SemanticEmbedder;
use crate::memory::vector::cosine_similarity;
use crate::router::openai::ToolParam;

#[allow(dead_code)]
pub const DEFAULT_MAX_TOOLS_BUDGET_TOKENS: usize = 2048;

/// Recursively strips redundant metadata from JSON schemas ($schema, title, $defs, etc.)
/// to minimize tool token footprint without losing property types or descriptions.
pub fn minify_tool_schema(schema: &mut Value) {
    match schema {
        Value::Object(map) => {
            map.remove("$schema");
            map.remove("title");
            map.remove("$id");
            map.remove("definitions");
            map.remove("$defs");
            map.remove("additionalProperties");

            if let Some(Value::Object(props)) = map.get_mut("properties") {
                for (_k, v) in props.iter_mut() {
                    minify_tool_schema(v);
                }
            }

            for (k, v) in map.iter_mut() {
                if k != "properties" {
                    minify_tool_schema(v);
                }
            }
        }
        Value::Array(arr) => {
            for item in arr.iter_mut() {
                minify_tool_schema(item);
            }
        }
        _ => {}
    }
}

/// Converts an McpTool into a minified ToolParam
pub fn mcp_tool_to_param(tool: &McpTool) -> ToolParam {
    let mut parameters = tool.input_schema.clone();
    minify_tool_schema(&mut parameters);
    ToolParam {
        name: tool.name.clone(),
        description: tool.description.clone(),
        parameters,
    }
}

/// Dynamically injects tools returned by search_tools into active tools for subsequent iterations
pub fn dynamically_register_discovered_tools(tools_output: &str, available_tools: &mut Vec<ToolParam>) {
    if let Ok(matched_tools) = serde_json::from_str::<Vec<Value>>(tools_output) {
        for mt in matched_tools {
            if let (Some(t_name), Some(desc), Some(params)) = (
                mt.get("name").and_then(|v| v.as_str()),
                mt.get("description").and_then(|v| v.as_str()),
                mt.get("parameters"),
            ) {
                if !available_tools.iter().any(|t| t.name == t_name) {
                    let mut p = params.clone();
                    minify_tool_schema(&mut p);
                    available_tools.push(ToolParam {
                        name: t_name.to_string(),
                        description: desc.to_string(),
                        parameters: p,
                    });
                }
            }
        }
    }
}

/// Dynamically selects and minifies active tools for an inference turn.
/// - Built-in core tools (server_id is None) are always retained.
/// - If total tool overhead <= max_budget_tokens, all unblocked tools are retained.
/// - If total tool overhead exceeds budget, dynamic tools are ranked by semantic
///   and lexical relevance against the user's prompt, fitting the best tools into budget.
pub fn select_active_tools(
    all_tools: &[McpTool],
    context_text: &str,
    max_budget_tokens: usize,
) -> Vec<ToolParam> {
    let unblocked: Vec<&McpTool> = all_tools
        .iter()
        .filter(|t| t.policy != PolicyTier::Blocked)
        .collect();

    if unblocked.is_empty() {
        return Vec::new();
    }

    // 1. Separate into core (builtin: server_id is None) and external dynamic tools
    let (core_tools, dynamic_tools): (Vec<&McpTool>, Vec<&McpTool>) = unblocked
        .into_iter()
        .partition(|t| t.server_id.is_none());

    let mut core_params: Vec<ToolParam> = core_tools.into_iter().map(mcp_tool_to_param).collect();
    let dynamic_params: Vec<ToolParam> = dynamic_tools.into_iter().map(mcp_tool_to_param).collect();

    // 2. If all tools combined fit comfortably within budget, return everything
    let all_params_len = core_params.len() + dynamic_params.len();
    let mut combined = Vec::with_capacity(all_params_len);
    combined.extend(core_params.clone());
    combined.extend(dynamic_params.clone());

    if estimate_tools_tokens(&combined) <= max_budget_tokens {
        return combined;
    }

    // 3. Otherwise, rank dynamic tools by pure semantic embedding similarity
    let query_vec = SemanticEmbedder::fast_semantic_encode(context_text);

    let mut scored_dynamic: Vec<(f32, ToolParam)> = dynamic_params
        .into_iter()
        .map(|param| {
            let tool_desc = format!("{} {}", param.name, param.description);
            let tool_vec = SemanticEmbedder::fast_semantic_encode(&tool_desc);
            let cos = cosine_similarity(&query_vec, &tool_vec);
            let score = ((cos + 1.0) / 2.0).clamp(0.0, 1.0);
            (score, param)
        })
        .collect();

    // Sort descending by score
    scored_dynamic.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));

    // 4. Greedily select top dynamic tools within remaining budget
    let core_cost = estimate_tools_tokens(&core_params);
    let mut current_cost = core_cost;
    let mut selected_dynamic = Vec::new();

    for (_score, param) in scored_dynamic {
        let param_cost = estimate_tools_tokens(std::slice::from_ref(&param));
        if current_cost + param_cost <= max_budget_tokens || selected_dynamic.len() < 3 {
            current_cost += param_cost;
            selected_dynamic.push(param);
        } else {
            break;
        }
    }

    core_params.extend(selected_dynamic);
    core_params
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_minify_tool_schema_strips_boilerplate() {
        let mut schema = json!({
            "$schema": "http://json-schema.org/draft-07/schema#",
            "title": "SendEmailParams",
            "$id": "https://example.com/schema.json",
            "additionalProperties": false,
            "type": "object",
            "properties": {
                "title": {
                    "title": "TitleMeta",
                    "type": "string",
                    "description": "Subject title"
                },
                "recipient": {
                    "title": "Recipient",
                    "type": "string",
                    "description": "Destination address"
                }
            },
            "required": ["title", "recipient"]
        });

        minify_tool_schema(&mut schema);

        assert!(schema.get("$schema").is_none());
        assert!(schema.get("title").is_none());
        assert!(schema.get("$id").is_none());
        assert!(schema.get("additionalProperties").is_none());
        assert_eq!(schema["type"], "object");
        assert!(schema["properties"].get("title").is_some());
        assert_eq!(schema["properties"]["title"]["type"], "string");
        assert!(schema["properties"]["title"].get("title").is_none());
        assert_eq!(schema["properties"]["recipient"]["type"], "string");
        assert_eq!(schema["properties"]["recipient"]["description"], "Destination address");
        assert!(schema["properties"]["recipient"].get("title").is_none());
    }

    #[test]
    fn test_select_active_tools_retains_core_and_ranks_by_query() {
        let core_tool = McpTool {
            name: "read_memory".to_string(),
            description: "Read memory files".to_string(),
            input_schema: json!({ "type": "object" }),
            server_id: None,
            policy: PolicyTier::Autonomous,
            risk_level: "LOW".to_string(),
        };

        let weather_tool = McpTool {
            name: "get_weather".to_string(),
            description: "Get real-time weather and forecast".to_string(),
            input_schema: json!({ "type": "object" }),
            server_id: Some("server-1".to_string()),
            policy: PolicyTier::Autonomous,
            risk_level: "LOW".to_string(),
        };

        let db_tool = McpTool {
            name: "query_database".to_string(),
            description: "Execute SQL queries on Postgres".to_string(),
            input_schema: json!({ "type": "object" }),
            server_id: Some("server-2".to_string()),
            policy: PolicyTier::Autonomous,
            risk_level: "LOW".to_string(),
        };

        let tools = vec![core_tool, weather_tool, db_tool];

        // Query related to weather with a tight budget forcing selection
        let selected = select_active_tools(&tools, "What is the weather in Toronto today?", 50);

        // Core tool must always be present
        assert!(selected.iter().any(|t| t.name == "read_memory"));
        // Weather tool should be prioritized over database
        assert!(selected.iter().any(|t| t.name == "get_weather"));
    }
}
