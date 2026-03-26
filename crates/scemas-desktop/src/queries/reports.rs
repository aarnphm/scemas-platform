use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct HazardReport {
    pub id: Uuid,
    pub zone: String,
    pub category: String,
    pub description: String,
    pub status: String,
    pub contact_email: Option<String>,
    pub reported_by: Option<Uuid>,
    pub reviewed_by: Option<Uuid>,
    pub review_note: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub resolved_at: Option<DateTime<Utc>>,
}

pub async fn list(
    pool: &PgPool,
    status: Option<&str>,
    limit: i64,
) -> Result<Vec<HazardReport>, sqlx::Error> {
    sqlx::query_as::<_, HazardReport>(
        "SELECT * FROM hazard_reports
         WHERE ($1::text IS NULL OR status = $1)
         ORDER BY created_at DESC
         LIMIT $2",
    )
    .bind(status)
    .bind(limit)
    .fetch_all(pool)
    .await
}

pub async fn submit(
    pool: &PgPool,
    zone: &str,
    category: &str,
    description: &str,
    contact_email: Option<&str>,
    reported_by: Option<Uuid>,
) -> Result<HazardReport, sqlx::Error> {
    sqlx::query_as::<_, HazardReport>(
        "INSERT INTO hazard_reports (zone, category, description, contact_email, reported_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *",
    )
    .bind(zone)
    .bind(category)
    .bind(description)
    .bind(contact_email)
    .bind(reported_by)
    .fetch_one(pool)
    .await
}

pub async fn update_status(
    pool: &PgPool,
    id: Uuid,
    status: &str,
    review_note: Option<&str>,
    reviewed_by: Option<Uuid>,
) -> Result<(), sqlx::Error> {
    ::sqlx::query(
        "UPDATE hazard_reports
         SET status = $2,
             review_note = $3,
             reviewed_by = $4,
             updated_at = NOW(),
             resolved_at = CASE WHEN $2 = 'resolved' THEN NOW() ELSE resolved_at END
         WHERE id = $1",
    )
    .bind(id)
    .bind(status)
    .bind(review_note)
    .bind(reviewed_by)
    .execute(pool)
    .await?;
    Ok(())
}
