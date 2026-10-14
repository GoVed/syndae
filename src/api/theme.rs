use axum::extract::State;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::{get, post};
use axum::{Json, Router};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::state::AppState;

pub const DEFAULT_PRESET: &str = "syndae_dark";
pub const DEFAULT_ACCENT: &str = "#10b981";
pub const DEFAULT_BG_SHADE: &str = "midnight";
pub const DEFAULT_MODE: &str = "dark";
pub const DEFAULT_RADIUS: &str = "rounded";
pub const DEFAULT_FONT: &str = "sans";
pub const DEFAULT_BUBBLE: &str = "modern";
pub const DEFAULT_DENSITY: &str = "comfortable";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct UiThemeConfig {
    #[serde(default = "default_mode")]
    pub mode: String,
    #[serde(default = "default_preset")]
    pub preset: String,
    #[serde(default = "default_accent")]
    pub accent_color: String,
    #[serde(default = "default_bg_shade")]
    pub bg_shade: String,
    #[serde(default = "default_radius")]
    pub border_radius: String,
    #[serde(default = "default_font")]
    pub font_family: String,
    #[serde(default = "default_bubble")]
    pub bubble_style: String,
    #[serde(default = "default_density")]
    pub density: String,
    #[serde(default = "default_autonomy")]
    pub agent_can_adjust: bool,
    #[serde(default = "default_updated_by")]
    pub updated_by: String,
    #[serde(default)]
    pub change_reason: Option<String>,
    #[serde(default = "current_timestamp")]
    pub updated_at: String,
}

fn default_mode() -> String { DEFAULT_MODE.to_string() }
fn default_preset() -> String { DEFAULT_PRESET.to_string() }
fn default_accent() -> String { DEFAULT_ACCENT.to_string() }
fn default_bg_shade() -> String { DEFAULT_BG_SHADE.to_string() }
fn default_radius() -> String { DEFAULT_RADIUS.to_string() }
fn default_font() -> String { DEFAULT_FONT.to_string() }
fn default_bubble() -> String { DEFAULT_BUBBLE.to_string() }
fn default_density() -> String { DEFAULT_DENSITY.to_string() }
fn default_autonomy() -> bool { true }
fn default_updated_by() -> String { "user".to_string() }
fn current_timestamp() -> String { Utc::now().to_rfc3339() }

impl Default for UiThemeConfig {
    fn default() -> Self {
        Self {
            mode: default_mode(),
            preset: default_preset(),
            accent_color: default_accent(),
            bg_shade: default_bg_shade(),
            border_radius: default_radius(),
            font_family: default_font(),
            bubble_style: default_bubble(),
            density: default_density(),
            agent_can_adjust: default_autonomy(),
            updated_by: default_updated_by(),
            change_reason: None,
            updated_at: current_timestamp(),
        }
    }
}

/// Calculate relative luminance for WCAG contrast compliance
pub fn relative_luminance(r: u8, g: u8, b: u8) -> f64 {
    let to_linear = |val: u8| -> f64 {
        let c = val as f64 / 255.0;
        if c <= 0.03928 { c / 12.92 } else { ((c + 0.055) / 1.055).powf(2.4) }
    };
    0.2126 * to_linear(r) + 0.7152 * to_linear(g) + 0.0722 * to_linear(b)
}

/// Calculate contrast ratio between two relative luminances
pub fn contrast_ratio(l1: f64, l2: f64) -> f64 {
    let (max_l, min_l) = if l1 > l2 { (l1, l2) } else { (l2, l1) };
    (max_l + 0.05) / (min_l + 0.05)
}

pub fn parse_hex_color(hex: &str) -> Option<(u8, u8, u8)> {
    let clean = hex.trim().strip_prefix('#')?;
    match clean.len() {
        3 => {
            let r = u8::from_str_radix(&clean[0..1].repeat(2), 16).ok()?;
            let g = u8::from_str_radix(&clean[1..2].repeat(2), 16).ok()?;
            let b = u8::from_str_radix(&clean[2..3].repeat(2), 16).ok()?;
            Some((r, g, b))
        }
        6 => {
            let r = u8::from_str_radix(&clean[0..2], 16).ok()?;
            let g = u8::from_str_radix(&clean[2..4], 16).ok()?;
            let b = u8::from_str_radix(&clean[4..6], 16).ok()?;
            Some((r, g, b))
        }
        _ => None,
    }
}

pub fn sanitize_accent_color(hex: &str, is_dark_mode: bool) -> String {
    let (r, g, b) = match parse_hex_color(hex) {
        Some(rgb) => rgb,
        None => return DEFAULT_ACCENT.to_string(),
    };
    let cr = contrast_ratio(relative_luminance(r, g, b), if is_dark_mode { 0.01 } else { 0.95 });
    if cr < 2.8 {
        let (nr, ng, nb) = if is_dark_mode {
            (((r as f64 * 0.55) + 114.75) as u8, ((g as f64 * 0.55) + 114.75) as u8, ((b as f64 * 0.55) + 114.75) as u8)
        } else {
            ((r as f64 * 0.55) as u8, (g as f64 * 0.55) as u8, (b as f64 * 0.55) as u8)
        };
        return format!("#{:02x}{:02x}{:02x}", nr, ng, nb);
    }
    format!("#{:02x}{:02x}{:02x}", r, g, b)
}

/// Strict validation of theme config to prevent hallucination exploits
pub fn sanitize_theme_config(config: &mut UiThemeConfig) {
    let is_dark = config.mode != "light";
    config.accent_color = sanitize_accent_color(&config.accent_color, is_dark);

    let valid_modes = ["dark", "light", "system"];
    if !valid_modes.contains(&config.mode.as_str()) {
        config.mode = DEFAULT_MODE.to_string();
    }

    let valid_bgs = ["midnight", "oled", "navy", "slate", "charcoal", "zinc"];
    if !valid_bgs.contains(&config.bg_shade.as_str()) {
        config.bg_shade = DEFAULT_BG_SHADE.to_string();
    }

    let valid_radius = ["sharp", "rounded", "curved"];
    if !valid_radius.contains(&config.border_radius.as_str()) {
        config.border_radius = DEFAULT_RADIUS.to_string();
    }

    let valid_fonts = ["sans", "mono", "system"];
    if !valid_fonts.contains(&config.font_family.as_str()) {
        config.font_family = DEFAULT_FONT.to_string();
    }

    let valid_bubbles = ["modern", "minimal", "glass"];
    if !valid_bubbles.contains(&config.bubble_style.as_str()) {
        config.bubble_style = DEFAULT_BUBBLE.to_string();
    }

    let valid_densities = ["comfortable", "compact", "spacious"];
    if !valid_densities.contains(&config.density.as_str()) {
        config.density = DEFAULT_DENSITY.to_string();
    }

    if let Some(ref r) = config.change_reason {
        let clean = r.chars().filter(|c| c.is_alphanumeric() || " .,!?'\"-_/()".contains(*c)).take(160).collect();
        config.change_reason = Some(clean);
    }
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_theme_handler).post(update_theme_handler))
        .route("/reset", post(reset_theme_handler))
        .route("/undo", post(undo_theme_handler))
}

async fn get_theme_handler(State(state): State<AppState>) -> impl IntoResponse {
    let theme = fetch_or_default_theme_db(&state.db).await;
    let history = fetch_theme_history_db(&state.db).await;
    (StatusCode::OK, Json(json!({ "success": true, "theme": theme, "can_undo": !history.is_empty(), "history_count": history.len() })))
}

async fn update_theme_handler(State(state): State<AppState>, Json(mut payload): Json<UiThemeConfig>) -> impl IntoResponse {
    let current = fetch_or_default_theme_db(&state.db).await;
    payload.updated_at = Utc::now().to_rfc3339();
    sanitize_theme_config(&mut payload);
    push_theme_history_db(&state.db, &current).await;
    let _ = save_theme_to_db_ref(&state.db, &payload).await;
    let _ = state.ws_broadcast.send(json!({ "topic": "theme_updated", "theme": payload }).to_string());
    (StatusCode::OK, Json(json!({ "success": true, "theme": payload })))
}

async fn reset_theme_handler(State(state): State<AppState>) -> impl IntoResponse {
    let current = fetch_or_default_theme_db(&state.db).await;
    push_theme_history_db(&state.db, &current).await;
    let default_theme = UiThemeConfig::default();
    let _ = save_theme_to_db_ref(&state.db, &default_theme).await;
    let _ = state.ws_broadcast.send(json!({ "topic": "theme_updated", "theme": default_theme }).to_string());
    (StatusCode::OK, Json(json!({ "success": true, "theme": default_theme })))
}

async fn undo_theme_handler(State(state): State<AppState>) -> impl IntoResponse {
    let mut history = fetch_theme_history_db(&state.db).await;
    if let Some(prev) = history.pop() {
        let _ = save_theme_to_db_ref(&state.db, &prev).await;
        if let Ok(ser) = serde_json::to_string(&history) {
            let _ = state.db.set_setting("ui_theme_history", &ser).await;
        }
        let _ = state.ws_broadcast.send(json!({ "topic": "theme_updated", "theme": prev }).to_string());
        (StatusCode::OK, Json(json!({ "success": true, "theme": prev, "can_undo": !history.is_empty() })))
    } else {
        let current = fetch_or_default_theme_db(&state.db).await;
        (StatusCode::OK, Json(json!({ "success": true, "theme": current, "can_undo": false })))
    }
}

pub async fn fetch_or_default_theme_db(db: &crate::db::Database) -> UiThemeConfig {
    if let Ok(Some(raw)) = db.get_setting("ui_theme_config").await {
        if let Ok(mut parsed) = serde_json::from_str::<UiThemeConfig>(&raw) {
            sanitize_theme_config(&mut parsed);
            return parsed;
        }
    }
    UiThemeConfig::default()
}

pub async fn save_theme_to_db_ref(db: &crate::db::Database, theme: &UiThemeConfig) -> anyhow::Result<()> {
    let serialized = serde_json::to_string(theme)?;
    db.set_setting("ui_theme_config", &serialized).await
}

pub async fn fetch_theme_history_db(db: &crate::db::Database) -> Vec<UiThemeConfig> {
    if let Ok(Some(raw)) = db.get_setting("ui_theme_history").await {
        if let Ok(history) = serde_json::from_str::<Vec<UiThemeConfig>>(&raw) {
            return history;
        }
    }
    Vec::new()
}

pub async fn push_theme_history_db(db: &crate::db::Database, current: &UiThemeConfig) {
    let mut history = fetch_theme_history_db(db).await;
    history.push(current.clone());
    if history.len() > 10 { history.remove(0); }
    if let Ok(serialized) = serde_json::to_string(&history) {
        let _ = db.set_setting("ui_theme_history", &serialized).await;
    }
}

pub async fn apply_agent_theme_update(db: &crate::db::Database, args: Value) -> crate::mcp::ToolCallOutput {
    let mut current = fetch_or_default_theme_db(db).await;
    if !current.agent_can_adjust {
        return crate::mcp::ToolCallOutput {
            tool_name: "configure_ui_theme".to_string(),
            success: false,
            content: "Theme personalization is currently locked by the user in Settings.".to_string(),
            is_error: false,
        };
    }
    push_theme_history_db(db, &current).await;

    if let Some(p) = args.get("preset").and_then(|v| v.as_str()) { current.preset = p.to_string(); }
    if let Some(a) = args.get("accent_color").and_then(|v| v.as_str()) { current.accent_color = a.to_string(); }
    if let Some(b) = args.get("bg_shade").and_then(|v| v.as_str()) { current.bg_shade = b.to_string(); }
    if let Some(m) = args.get("theme_mode").and_then(|v| v.as_str()) { current.mode = m.to_string(); }
    if let Some(r) = args.get("border_radius").and_then(|v| v.as_str()) { current.border_radius = r.to_string(); }
    if let Some(f) = args.get("font_family").and_then(|v| v.as_str()) { current.font_family = f.to_string(); }
    if let Some(b) = args.get("bubble_style").and_then(|v| v.as_str()) { current.bubble_style = b.to_string(); }
    if let Some(d) = args.get("density").and_then(|v| v.as_str()) { current.density = d.to_string(); }
    let reason = args.get("reason").and_then(|v| v.as_str()).unwrap_or("Personalized by Syndae").to_string();
    current.change_reason = Some(reason.clone());
    current.updated_by = "syndae".to_string();
    current.updated_at = Utc::now().to_rfc3339();

    sanitize_theme_config(&mut current);
    let _ = save_theme_to_db_ref(db, &current).await;

    crate::mcp::ToolCallOutput {
        tool_name: "configure_ui_theme".to_string(),
        success: true,
        content: format!("Theme updated: preset '{}', accent '{}', bg '{}'. Reason: {}", current.preset, current.accent_color, current.bg_shade, reason),
        is_error: false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_relative_luminance_and_contrast() {
        let white_lum = relative_luminance(255, 255, 255);
        let black_lum = relative_luminance(0, 0, 0);
        let cr = contrast_ratio(white_lum, black_lum);
        assert!((cr - 21.0).abs() < 0.1);
    }

    #[test]
    fn test_sanitize_accent_color_prevents_invisible_dark_on_dark() {
        let invisible_black = "#050505";
        let sanitized = sanitize_accent_color(invisible_black, true);
        assert_ne!(sanitized, invisible_black);
        let (r, g, b) = parse_hex_color(&sanitized).unwrap();
        let cr = contrast_ratio(relative_luminance(r, g, b), 0.01);
        assert!(cr >= 2.8);
    }

    #[test]
    fn test_sanitize_theme_config_clamps_invalid_values() {
        let mut cfg = UiThemeConfig {
            mode: "hacked_mode".to_string(),
            preset: "custom".to_string(),
            accent_color: "invalid_hex".to_string(),
            bg_shade: "neon_yellow".to_string(),
            border_radius: "1000px".to_string(),
            font_family: "comic_sans".to_string(),
            bubble_style: "exploding".to_string(),
            density: "ultra_tight".to_string(),
            agent_can_adjust: true,
            updated_by: "syndae".to_string(),
            change_reason: Some("<script>bad</script>".to_string()),
            updated_at: current_timestamp(),
        };

        sanitize_theme_config(&mut cfg);
        assert_eq!(cfg.mode, "dark");
        assert_eq!(cfg.accent_color, DEFAULT_ACCENT);
        assert_eq!(cfg.bg_shade, DEFAULT_BG_SHADE);
        assert_eq!(cfg.border_radius, DEFAULT_RADIUS);
        assert_eq!(cfg.font_family, DEFAULT_FONT);
        assert_eq!(cfg.bubble_style, DEFAULT_BUBBLE);
        assert_eq!(cfg.density, DEFAULT_DENSITY);
        assert_eq!(cfg.change_reason.unwrap(), "scriptbad/script");
    }
}
