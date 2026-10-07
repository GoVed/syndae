use axum::extract::Query;
use axum::http::{header, StatusCode};
use axum::response::IntoResponse;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct MediaProxyQuery {
    pub url: String,
}

/// Generic proxy endpoint for external tool media so images render reliably in UI
/// across localhost, Docker networks, and remote domains.
pub async fn handle_media_proxy(
    Query(query): Query<MediaProxyQuery>,
) -> impl IntoResponse {
    match crate::router::vision::load_image_bytes(&query.url).await {
        Ok(bytes) => {
            let content_type = if bytes.starts_with(&[0xff, 0xd8, 0xff]) {
                "image/jpeg"
            } else if bytes.starts_with(&[0x89, 0x50, 0x4e, 0x47]) {
                "image/png"
            } else if bytes.starts_with(b"RIFF") && bytes.len() >= 12 && &bytes[8..12] == b"WEBP" {
                "image/webp"
            } else if bytes.starts_with(b"GIF") {
                "image/gif"
            } else {
                "application/octet-stream"
            };
            (
                StatusCode::OK,
                [(header::CONTENT_TYPE, content_type)],
                bytes,
            )
                .into_response()
        }
        Err(e) => (
            StatusCode::BAD_GATEWAY,
            format!("Failed to proxy tool media: {}", e),
        )
            .into_response(),
    }
}
