use serde::Serialize;

/// unified error type for tauri commands.
/// tauri requires command return types to implement Serialize,
/// so we can't use anyhow or plain thiserror directly.
#[derive(Debug, thiserror::Error)]
pub enum DesktopError {
    #[error("{0}")]
    Core(#[from] scemas_core::error::Error),

    #[error("database: {0}")]
    Database(#[from] sqlx::Error),

    #[error("auth: {0}")]
    Auth(#[from] crate::auth::AuthError),

    #[error("postgres: {0}")]
    Postgres(#[from] crate::postgres::PgError),

    #[error("service unavailable: {0}")]
    Unavailable(String),

    #[error("validation: {0}")]
    Validation(String),
}

impl Serialize for DesktopError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
