use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::Deserialize;
use serde_json::json;

use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/tree", get(list_tree))
        .route("/file", get(read_file).post(write_file).delete(delete_file))
        .route("/raw", get(raw_file))
        .route("/create", post(create_file))
        .route("/search", get(search_memory))
}

#[derive(Deserialize)]
struct FileQuery {
    path: String,
}

#[derive(Deserialize)]
struct SearchQuery {
    q: String,
    limit: Option<usize>,
}

#[derive(Deserialize)]
struct WriteFileRequest {
    path: String,
    content: String,
    section: Option<String>,
}

#[derive(Deserialize)]
struct CreateFileRequest {
    category: String,
    filename: String,
    content: String,
}

async fn list_tree(State(state): State<AppState>) -> impl IntoResponse {
    match state.memory.list_tree() {
        Ok(tree) => (StatusCode::OK, Json(json!({ "success": true, "files": tree }))),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "error": e.to_string() })),
        ),
    }
}

async fn read_file(
    State(state): State<AppState>,
    Query(query): Query<FileQuery>,
) -> impl IntoResponse {
    match state.memory.read_file(&query.path) {
        Ok(content) => (
            StatusCode::OK,
            Json(json!({ "success": true, "path": query.path, "content": content })),
        ),
        Err(e) => (
            StatusCode::NOT_FOUND,
            Json(json!({ "success": false, "error": e.to_string() })),
        ),
    }
}

async fn raw_file(
    State(state): State<AppState>,
    Query(query): Query<FileQuery>,
) -> impl IntoResponse {
    let safe_rel = match crate::memory::sanitize_rel_path(&query.path) {
        Ok(p) => p,
        Err(_) => return (StatusCode::BAD_REQUEST, "Invalid path").into_response(),
    };
    let full_path = state.memory.base_dir().join(safe_rel);
    if !full_path.exists() || !full_path.is_file() {
        return (StatusCode::NOT_FOUND, "File not found").into_response();
    }

    let ext = full_path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();

    let mime = match ext.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "bmp" => "image/bmp",
        "mp4" => "video/mp4",
        "pdf" => "application/pdf",
        _ => "application/octet-stream",
    };

    match tokio::fs::read(&full_path).await {
        Ok(bytes) => (
            StatusCode::OK,
            [
                (axum::http::header::CONTENT_TYPE, mime),
                (axum::http::header::CACHE_CONTROL, "public, max-age=86400"),
            ],
            bytes,
        )
            .into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn write_file(
    State(state): State<AppState>,
    Json(payload): Json<WriteFileRequest>,
) -> impl IntoResponse {
    match state
        .memory
        .write_file(&payload.path, &payload.content, payload.section.as_deref())
        .await
    {
        Ok(()) => (
            StatusCode::OK,
            Json(json!({ "success": true, "path": payload.path })),
        ),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(json!({ "success": false, "error": e.to_string() })),
        ),
    }
}

async fn create_file(
    State(state): State<AppState>,
    Json(payload): Json<CreateFileRequest>,
) -> impl IntoResponse {
    match state
        .memory
        .create_file(&payload.category, &payload.filename, &payload.content)
        .await
    {
        Ok(path) => (
            StatusCode::CREATED,
            Json(json!({ "success": true, "path": path })),
        ),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(json!({ "success": false, "error": e.to_string() })),
        ),
    }
}

async fn delete_file(
    State(state): State<AppState>,
    Query(query): Query<FileQuery>,
) -> impl IntoResponse {
    match state.memory.delete_file(&query.path).await {
        Ok(()) => (
            StatusCode::OK,
            Json(json!({ "success": true, "path": query.path })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "error": e.to_string() })),
        ),
    }
}

async fn search_memory(
    State(state): State<AppState>,
    Query(query): Query<SearchQuery>,
) -> impl IntoResponse {
    let limit = query.limit.unwrap_or(10);
    match state.memory.search(&query.q, limit) {
        Ok(results) => (
            StatusCode::OK,
            Json(json!({ "success": true, "results": results })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "error": e.to_string() })),
        ),
    }
}
