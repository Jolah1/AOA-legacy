//! Shared error type for Tauri commands.

use serde::{Serialize, Serializer};

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("validation failed: {0}")]
    Validation(String),

    #[error("authentication required")]
    Unauthorized,

    #[error("authentication failed")]
    BadCredentials,

    #[error("not found")]
    NotFound,

    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("serialization error: {0}")]
    Serde(#[from] serde_json::Error),

    #[error("email error: {0}")]
    Email(String),

    #[error("pdf error: {0}")]
    Pdf(String),

    #[error("application data directory is unavailable")]
    NoAppDir,

    #[error("internal error: {0}")]
    Internal(String),
}

impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, ser: S) -> Result<S::Ok, S::Error> {
        ser.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
