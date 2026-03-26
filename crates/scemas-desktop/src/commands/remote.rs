use std::sync::Arc;

use scemas_server::ScemasRuntime;
use scemas_server::access::{LoginRequest, SignupRequest};
use tauri::State;

use crate::auth::{AuthSession, RemoteAuth};
use crate::error::DesktopError;

type Result<T> = std::result::Result<T, DesktopError>;

/// login: tries local AccessManager first (embedded postgres).
/// falls back to remote cloudflare API if local auth fails with a non-auth error.
#[tauri::command]
pub async fn auth_login(
    runtime: State<'_, ScemasRuntime>,
    auth: State<'_, Arc<RemoteAuth>>,
    email: String,
    password: String,
) -> Result<AuthSession> {
    // try local auth against embedded postgres
    let local_result = runtime
        .access
        .login(LoginRequest {
            email: email.clone(),
            password: password.clone(),
        })
        .await;

    match local_result {
        Ok(session) => {
            tracing::info!(email = %email, "local login succeeded");
            Ok(AuthSession {
                token: session.token,
                expires_at: session.expires_at,
                user: session.user,
            })
        }
        Err(scemas_core::error::Error::Unauthorized(_)) => {
            // credentials wrong locally, don't try remote
            Err(DesktopError::Core(scemas_core::error::Error::Unauthorized(
                "invalid email or password".into(),
            )))
        }
        Err(_) => {
            // local auth failed for non-auth reason (e.g. no accounts yet),
            // try remote as fallback
            tracing::debug!("local auth unavailable, trying remote");
            let session = auth.login(&email, &password).await?;
            Ok(session)
        }
    }
}

/// signup: creates account in local embedded postgres.
/// also tries remote so the account exists on both.
#[tauri::command]
pub async fn auth_signup(
    runtime: State<'_, ScemasRuntime>,
    auth: State<'_, Arc<RemoteAuth>>,
    email: String,
    username: String,
    password: String,
) -> Result<AuthSession> {
    // create locally first
    let local_result = runtime
        .access
        .signup(SignupRequest {
            email: email.clone(),
            username: username.clone(),
            password: password.clone(),
        })
        .await;

    match local_result {
        Ok(session) => {
            tracing::info!(email = %email, "local signup succeeded");
            // fire-and-forget remote signup (best effort sync)
            let auth = Arc::clone(&auth);
            let email = email.clone();
            let username = username.clone();
            let password = password.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = auth.signup(&email, &username, &password).await {
                    tracing::debug!("remote signup sync failed (non-critical): {e}");
                }
            });
            Ok(AuthSession {
                token: session.token,
                expires_at: session.expires_at,
                user: session.user,
            })
        }
        Err(e) => {
            tracing::warn!("local signup failed: {e}, trying remote");
            let session = auth.signup(&email, &username, &password).await?;
            Ok(session)
        }
    }
}
