use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct UserInfo {
    pub id: Uuid,
    pub email: String,
    pub username: String,
    pub role: String,
    pub created_at: DateTime<Utc>,
}

pub async fn list(pool: &PgPool) -> Result<Vec<UserInfo>, sqlx::Error> {
    sqlx::query_as::<_, UserInfo>(
        "SELECT id, email, username, role, created_at
         FROM accounts
         ORDER BY created_at DESC",
    )
    .fetch_all(pool)
    .await
}

pub async fn get(pool: &PgPool, id: Uuid) -> Result<Option<UserInfo>, sqlx::Error> {
    sqlx::query_as::<_, UserInfo>(
        "SELECT id, email, username, role, created_at
         FROM accounts
         WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(pool)
    .await
}

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ActiveSession {
    pub token_value: String,
    pub user_id: Uuid,
    pub role: String,
    pub expiry: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub username: String,
}

pub async fn active_sessions(pool: &PgPool) -> Result<Vec<ActiveSession>, sqlx::Error> {
    sqlx::query_as::<_, ActiveSession>(
        "SELECT t.token_value, t.user_id, t.role, t.expiry, t.created_at, a.username
         FROM active_session_tokens t
         INNER JOIN accounts a ON t.user_id = a.id
         WHERE t.expiry > NOW()
         ORDER BY t.created_at DESC",
    )
    .fetch_all(pool)
    .await
}
