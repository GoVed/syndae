use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::Deserialize;
use serde_json::json;
use tokio::sync::mpsc;

use crate::agent::AgentEvent;
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/sessions", get(list_sessions).post(create_session))
        .route(
            "/sessions/{id}",
            get(get_session)
                .patch(update_session)
                .put(update_session)
                .delete(delete_session),
        )
        .route("/sessions/{id}/messages", get(list_messages))
        .route("/send", post(send_message))
        .route("/queue", get(get_queue_status).post(update_queue_config))
        .route("/queue/config", post(update_queue_config))
        .route("/queue/clear", post(clear_queue))
}

#[derive(Deserialize)]
struct UpdateQueueConfigRequest {
    max_concurrent_turns: usize,
}

#[derive(Deserialize)]
struct CreateSessionRequest {
    title: Option<String>,
    mode: Option<String>, // "chat" or "mission"
}

#[derive(Deserialize)]
struct UpdateSessionRequest {
    title: Option<String>,
    mode: Option<String>,
}

#[derive(Deserialize)]
struct SendMessageRequest {
    session_id: String,
    prompt: String,
    mode: Option<String>,
    images: Option<Vec<String>>,
}

async fn list_sessions(State(state): State<AppState>) -> impl IntoResponse {
    match state.db.list_sessions().await {
        Ok(sessions) => (
            StatusCode::OK,
            Json(json!({ "success": true, "sessions": sessions })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "error": e.to_string() })),
        ),
    }
}

async fn create_session(
    State(state): State<AppState>,
    Json(payload): Json<CreateSessionRequest>,
) -> impl IntoResponse {
    let mode = payload.mode.unwrap_or_else(|| "chat".to_string());
    let title = payload.title.unwrap_or_else(|| {
        if mode == "mission" {
            "New Task".to_string()
        } else {
            "New Chat".to_string()
        }
    });

    match state.db.create_session(&title, &mode).await {
        Ok(session) => (
            StatusCode::CREATED,
            Json(json!({ "success": true, "session": session })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "error": e.to_string() })),
        ),
    }
}

async fn get_session(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match state.db.get_session(&id).await {
        Ok(Some(session)) => (
            StatusCode::OK,
            Json(json!({ "success": true, "session": session })),
        ),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(json!({ "success": false, "error": "Session not found" })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "error": e.to_string() })),
        ),
    }
}

async fn update_session(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateSessionRequest>,
) -> impl IntoResponse {
    match state.db.get_session(&id).await {
        Ok(Some(session)) => {
            let title = payload.title.as_deref().unwrap_or(&session.title).trim();
            let mode = payload.mode.as_deref().unwrap_or(&session.mode).trim();
            if title.is_empty() {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(json!({ "success": false, "error": "Title cannot be empty" })),
                );
            }
            match state.db.update_session_title_and_mode(&id, title, mode).await {
                Ok(_) => {
                    let updated = state.db.get_session(&id).await.ok().flatten();
                    let ws_broadcast = state.ws_broadcast.clone();
                    let msg = json!({
                        "topic": "chat_event",
                        "session_id": id,
                        "event": {
                            "type": "session_title_updated",
                            "title": title
                        }
                    });
                    let _ = ws_broadcast.send(msg.to_string());
                    (
                        StatusCode::OK,
                        Json(json!({ "success": true, "session": updated })),
                    )
                }
                Err(e) => (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "success": false, "error": e.to_string() })),
                ),
            }
        }
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(json!({ "success": false, "error": "Session not found" })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "error": e.to_string() })),
        ),
    }
}

async fn delete_session(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match state.db.delete_session(&id).await {
        Ok(()) => (StatusCode::OK, Json(json!({ "success": true }))),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "error": e.to_string() })),
        ),
    }
}

async fn list_messages(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match state.db.list_messages(&id).await {
        Ok(messages) => (
            StatusCode::OK,
            Json(json!({ "success": true, "messages": messages })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "error": e.to_string() })),
        ),
    }
}

async fn send_message(
    State(state): State<AppState>,
    Json(payload): Json<SendMessageRequest>,
) -> impl IntoResponse {
    let mode = payload.mode.unwrap_or_else(|| "chat".to_string());
    let session_id = payload.session_id.clone();
    let prompt = payload.prompt.clone();

    // Verify session exists or auto-create
    let actual_session = match state.db.get_session(&session_id).await {
        Ok(Some(s)) => s,
        _ => {
            let title = crate::agent::reasoning::generate_fallback_title(&prompt);
            state
                .db
                .create_session(&title, &mode)
                .await
                .unwrap_or_else(|_| crate::db::ChatSession {
                    id: session_id.clone(),
                    title: "Active Session".to_string(),
                    mode: mode.clone(),
                    created_at: chrono::Utc::now().to_rfc3339(),
                    updated_at: chrono::Utc::now().to_rfc3339(),
                })
        }
    };
    let target_session_id = actual_session.id;

    let (event_tx, mut event_rx) = mpsc::channel::<AgentEvent>(100);
    let ws_broadcast = state.ws_broadcast.clone();
    let session_id_broadcast = target_session_id.clone();

    // Spawn event relay to WebSocket broadcast
    tokio::spawn(async move {
        while let Some(evt) = event_rx.recv().await {
            let msg = json!({
                "topic": "chat_event",
                "session_id": session_id_broadcast,
                "event": evt
            });
            let _ = ws_broadcast.send(msg.to_string());
        }
    });

    let (turn_id, position, is_immediate) = state
        .turn_queue
        .submit_turn_with_images(&target_session_id, &prompt, &mode, "user", payload.images, event_tx)
        .await;

    (
        StatusCode::ACCEPTED,
        Json(json!({
            "success": true,
            "session_id": target_session_id,
            "turn_id": turn_id,
            "status": if is_immediate { "running" } else { "queued" },
            "queue_position": position,
            "message": if is_immediate { "Turn execution initiated" } else { "Turn queued for GPU execution" }
        })),
    )
}

async fn get_queue_status(State(state): State<AppState>) -> impl IntoResponse {
    let status = state.turn_queue.get_status().await;
    (
        StatusCode::OK,
        Json(json!({ "success": true, "queue": status })),
    )
}

async fn update_queue_config(
    State(state): State<AppState>,
    Json(payload): Json<UpdateQueueConfigRequest>,
) -> impl IntoResponse {
    state.turn_queue.set_max_concurrent(payload.max_concurrent_turns);
    (
        StatusCode::OK,
        Json(json!({
            "success": true,
            "max_concurrent_turns": state.turn_queue.max_concurrent(),
            "message": format!("Max concurrent turns updated to {}", state.turn_queue.max_concurrent())
        })),
    )
}

async fn clear_queue(State(state): State<AppState>) -> impl IntoResponse {
    let cleared = state.turn_queue.clear_queue().await;
    (
        StatusCode::OK,
        Json(json!({
            "success": true,
            "cleared_count": cleared,
            "message": format!("Successfully cleared {} queued turns", cleared)
        })),
    )
}
