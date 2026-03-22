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

    let drain_runtime = runtime.clone();
    axum::serve(listener, app)
        .with_graceful_shutdown(async move {
            shutdown_signal().await;
            drain_runtime.drain().await;
        })
        .await?;

    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install ctrl+c handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        () = ctrl_c => tracing::info!("received ctrl+c"),
        () = terminate => tracing::info!("received SIGTERM"),
    }
}
