use scemas_core::config::Config;
use scemas_server::{RuntimeError, ScemasRuntime, init_tracing, routes};

#[tokio::main]
async fn main() -> Result<(), RuntimeError> {
    init_tracing();

    let config = Config::from_env()?;
    let runtime = ScemasRuntime::from_config(&config).await?;
    let app = routes::create_router(runtime.app_state());

    let addr = format!("0.0.0.0:{}", config.port);
    tracing::info!("rust engine listening on {addr}");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
