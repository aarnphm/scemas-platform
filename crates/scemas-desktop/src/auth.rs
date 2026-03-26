use chrono::{DateTime, Utc};
use scemas_core::models::UserInformation;
use serde::{Deserialize, Serialize};

#[derive(Debug, thiserror::Error)]
pub enum AuthError {
    #[error("network: {0}")]
    Network(#[from] reqwest::Error),

    #[error("auth failed: {0}")]
    Failed(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthSession {
    pub token: String,
    pub expires_at: DateTime<Utc>,
    pub user: UserInformation,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct LoginPayload {
    email: String,
    password: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SignupPayload {
    email: String,
    username: String,
    password: String,
}

pub struct RemoteAuth {
    client: reqwest::Client,
    base_url: String,
}

impl RemoteAuth {
    pub fn new(base_url: String) -> Self {
        Self {
            client: reqwest::Client::new(),
            base_url,
        }
    }

    pub fn base_url(&self) -> &str {
        &self.base_url
    }

    pub async fn login(&self, email: &str, password: &str) -> Result<AuthSession, AuthError> {
        let resp = self
            .client
            .post(format!("{}/internal/auth/login", self.base_url))
            .json(&LoginPayload {
                email: email.to_string(),
                password: password.to_string(),
            })
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(AuthError::Failed(format!("{status}: {body}")));
        }

        let session: AuthSession = resp.json().await?;
        Ok(session)
    }

    pub async fn signup(
        &self,
        email: &str,
        username: &str,
        password: &str,
    ) -> Result<AuthSession, AuthError> {
        let resp = self
            .client
            .post(format!("{}/internal/auth/signup", self.base_url))
            .json(&SignupPayload {
                email: email.to_string(),
                username: username.to_string(),
                password: password.to_string(),
            })
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(AuthError::Failed(format!("{status}: {body}")));
        }

        let session: AuthSession = resp.json().await?;
        Ok(session)
    }
}
