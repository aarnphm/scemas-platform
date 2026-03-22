use chrono::{DateTime, Utc};
use clap::{Args, Parser, Subcommand, ValueEnum};
use scemas_core::config::Config;
use scemas_core::models::{
    AlertStatus, Comparison, MetricType, ParseModelError, RuleStatus, Severity, ThresholdRule,
};
use scemas_core::regions;
use scemas_server::{RuntimeError, ScemasRuntime};
use serde::Serialize;
use sqlx::FromRow;
use std::env;
use std::ffi::OsString;
use std::path::{Path, PathBuf};
use std::process::{Command, ExitStatus, Stdio};
use std::str::FromStr;
use std::time::Duration;
use tokio::process::{Child, Command as TokioCommand};
use uuid::Uuid;

#[derive(Parser, Debug)]
#[command(
    name = "scemas",
    bin_name = "scemas",
    about = "agent-friendly local control plane for scemas",
    version
)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand, Debug)]
enum Commands {
    Dev {
        #[command(subcommand)]
        command: DevCommands,
    },
    Health(HealthArgs),
    Rules {
        #[command(subcommand)]
        command: RuleCommands,
    },
    Alerts {
        #[command(subcommand)]
        command: AlertCommands,
    },
    Tokens {
        #[command(subcommand)]
        command: TokenCommands,
    },
}

#[derive(Subcommand, Debug)]
enum DevCommands {
    Up,
    DbUp,
    DbDown,
    Engine,
    Dashboard,
    Seed(PassthroughArgs),
    Webhook(PassthroughArgs),
    Check,
}

#[derive(Subcommand, Debug)]
enum RuleCommands {
    List(ListArgs),
    Create(CreateRuleArgs),
    Edit(EditRuleArgs),
    SetStatus(SetRuleStatusArgs),
    Delete(DeleteRuleArgs),
}

#[derive(Subcommand, Debug)]
enum AlertCommands {
    List(ListAlertsArgs),
    Acknowledge(AlertActorArgs),
    Resolve(AlertActorArgs),
}

#[derive(Subcommand, Debug)]
enum TokenCommands {
    Create(CreateTokenArgs),
}

#[derive(Args, Debug, Clone)]
struct OutputArgs {
    #[arg(long, value_enum, default_value_t = OutputFormat::Text)]
    output: OutputFormat,
}

#[derive(Copy, Clone, Debug, Eq, PartialEq, ValueEnum)]
enum OutputFormat {
    Text,
    Json,
}

#[derive(Args, Debug)]
struct PassthroughArgs {
    #[arg(trailing_var_arg = true, allow_hyphen_values = true)]
    args: Vec<String>,
}

#[derive(Args, Debug)]
struct HealthArgs {
    #[command(flatten)]
    output: OutputArgs,

    #[arg(long, default_value_t = 10)]
    limit: i64,
}

#[derive(Args, Debug)]
struct ListArgs {
    #[command(flatten)]
    output: OutputArgs,

    #[arg(long, default_value_t = 50)]
    limit: i64,
}

#[derive(Args, Debug)]
struct ListAlertsArgs {
    #[command(flatten)]
    output: OutputArgs,

    #[arg(long, default_value_t = 50)]
    limit: i64,

    #[arg(long, value_parser = parse_alert_status)]
    status: Option<AlertStatus>,
}

#[derive(Args, Debug)]
struct CreateRuleArgs {
    #[command(flatten)]
    output: OutputArgs,

    #[arg(long, value_parser = parse_metric_type)]
    metric_type: MetricType,

    #[arg(long)]
    threshold_value: f64,

    #[arg(long, value_parser = parse_comparison)]
    comparison: Comparison,

    #[arg(long)]
    zone: Option<String>,

    #[arg(long)]
    created_by: Uuid,
}

#[derive(Args, Debug)]
struct EditRuleArgs {
    #[command(flatten)]
    output: OutputArgs,

    #[arg(long)]
    id: Uuid,

    #[arg(long, value_parser = parse_metric_type)]
    metric_type: MetricType,

    #[arg(long)]
    threshold_value: f64,

    #[arg(long, value_parser = parse_comparison)]
    comparison: Comparison,

    #[arg(long)]
    zone: Option<String>,

    #[arg(long)]
    updated_by: Uuid,
}

#[derive(Args, Debug)]
struct SetRuleStatusArgs {
    #[command(flatten)]
    output: OutputArgs,

    #[arg(long)]
    id: Uuid,

    #[arg(long, value_parser = parse_rule_status)]
    status: RuleStatus,

    #[arg(long)]
    updated_by: Uuid,
}

#[derive(Args, Debug)]
struct DeleteRuleArgs {
    #[command(flatten)]
    output: OutputArgs,

    #[arg(long)]
    id: Uuid,

    #[arg(long)]
    deleted_by: Uuid,
}

#[derive(Args, Debug)]
struct AlertActorArgs {
    #[command(flatten)]
    output: OutputArgs,

    #[arg(long)]
    id: Uuid,

    #[arg(long)]
    user_id: Uuid,
}

#[derive(Args, Debug)]
struct CreateTokenArgs {
    #[command(flatten)]
    output: OutputArgs,

    #[arg(long)]
    account_id: Uuid,

    #[arg(long)]
    label: String,
}

#[derive(Debug, thiserror::Error)]
enum CliError {
    #[error(transparent)]
    Core(#[from] scemas_core::error::Error),

    #[error(transparent)]
    Runtime(#[from] RuntimeError),

    #[error(transparent)]
    Database(#[from] sqlx::Error),

    #[error(transparent)]
    Io(#[from] std::io::Error),

    #[error(transparent)]
    Json(#[from] serde_json::Error),

    #[error(transparent)]
    ParseModel(#[from] ParseModelError),

    #[error("missing required command on PATH: {0}")]
    MissingCommand(String),

    #[error("could not find the scemas workspace root from the current directory")]
    ProjectRootNotFound,

    #[error("command failed: {program} (exit code: {code})")]
    CommandFailed { program: String, code: String },

    #[error("{process} exited unexpectedly (exit code: {code})")]
    ChildExited { process: &'static str, code: String },
}

#[tokio::main]
async fn main() -> Result<(), CliError> {
    let root = find_project_root()?;
    env::set_current_dir(&root)?;
    dotenvy::dotenv().ok();

    let cli = Cli::parse();

    match cli.command {
        Commands::Dev { command } => handle_dev(command, &root).await,
        Commands::Health(args) => handle_health(args).await,
        Commands::Rules { command } => handle_rules(command).await,
        Commands::Alerts { command } => handle_alerts(command).await,
        Commands::Tokens { command } => handle_tokens(command).await,
    }
}

async fn handle_dev(command: DevCommands, root: &Path) -> Result<(), CliError> {
    match command {
        DevCommands::Up => dev_up(root).await,
        DevCommands::DbUp => start_db(root),
        DevCommands::DbDown => stop_db(root),
        DevCommands::Engine => run_checked(
            root,
            "cargo",
            &[
                OsString::from("run"),
                OsString::from("-p"),
                OsString::from("scemas-server"),
            ],
        ),
        DevCommands::Dashboard => run_checked(
            root,
            "bun",
            &[
                OsString::from("--filter"),
                OsString::from("@scemas/dashboard"),
                OsString::from("dev"),
            ],
        ),
        DevCommands::Seed(args) => run_script(root, "seed.ts", &args.args),
        DevCommands::Webhook(args) => run_script(root, "webhook-echo.ts", &args.args),
        DevCommands::Check => dev_check(root),
    }
}

async fn handle_health(args: HealthArgs) -> Result<(), CliError> {
    let runtime = load_runtime().await?;
    let (total_received, total_accepted, total_rejected) =
        runtime.distribution.load_ingestion_counters().await?;
    let rows: Vec<PlatformStatusRow> = sqlx::query_as(
        "SELECT subsystem, status, uptime, latency_ms, error_rate, time
         FROM platform_status
         ORDER BY time DESC
         LIMIT $1",
    )
    .bind(args.limit)
    .fetch_all(&runtime.pool)
    .await?;

    let report = HealthReport {
        ingestion_counters: IngestionCounters {
            total_received,
            total_accepted,
            total_rejected,
        },
        platform_status: rows.into_iter().map(PlatformStatusView::from).collect(),
    };

    print_output(args.output.output, &report, |value| {
        let latest_status = value
            .platform_status
            .first()
            .map(|status| {
                format!(
                    "latest {}={} at {}",
                    status.subsystem, status.status, status.time
                )
            })
            .unwrap_or_else(|| "no platform status rows recorded".to_owned());
        format!(
            "ingestion received={} accepted={} rejected={}\n{}",
            value.ingestion_counters.total_received,
            value.ingestion_counters.total_accepted,
            value.ingestion_counters.total_rejected,
            latest_status,
        )
    })
}

async fn handle_rules(command: RuleCommands) -> Result<(), CliError> {
    let runtime = load_runtime().await?;

    match command {
        RuleCommands::List(args) => {
            let rows: Vec<ThresholdRuleRow> = sqlx::query_as(
                "SELECT id, metric_type, threshold_value, comparison, zone, rule_status
                 FROM threshold_rules
                 ORDER BY created_at DESC
                 LIMIT $1",
            )
            .bind(args.limit)
            .fetch_all(&runtime.pool)
            .await?;

            let rules = rows
                .into_iter()
                .map(TryInto::try_into)
                .collect::<Result<Vec<ThresholdRule>, CliError>>()?;

            print_output(args.output.output, &rules, |value| {
                format_rule_list(value.as_slice())
            })
        }
        RuleCommands::Create(args) => {
            let rule = runtime
                .alerting
                .create_rule(
                    args.metric_type,
                    args.threshold_value,
                    args.comparison,
                    args.zone,
                    args.created_by,
                )
                .await?;

            print_output(args.output.output, &rule, |value| {
                format!(
                    "created rule {} {} {} {} {}",
                    value.id,
                    value.metric_type,
                    value.comparison,
                    value.threshold_value,
                    value.zone.as_deref().unwrap_or("all_zones"),
                )
            })
        }
        RuleCommands::Edit(args) => {
            let rule = runtime
                .alerting
                .edit_rule(
                    args.id,
                    args.metric_type,
                    args.threshold_value,
                    args.comparison,
                    args.zone,
                    args.updated_by,
                )
                .await?;

            print_output(args.output.output, &rule, |value| {
                format!(
                    "edited rule {} now {} {}",
                    value.id, value.metric_type, value.comparison
                )
            })
        }
        RuleCommands::SetStatus(args) => {
            runtime
                .alerting
                .update_rule_status(args.id, args.status.clone(), args.updated_by)
                .await?;

            let response = SuccessResponse {
                success: true,
                id: args.id,
                action: format!("set status to {}", args.status),
            };

            print_output(args.output.output, &response, |value| {
                format!("rule {} {}", value.id, value.action)
            })
        }
        RuleCommands::Delete(args) => {
            runtime
                .alerting
                .delete_rule(args.id, args.deleted_by)
                .await?;

            let response = SuccessResponse {
                success: true,
                id: args.id,
                action: "deleted".to_owned(),
            };

            print_output(args.output.output, &response, |value| {
                format!("rule {} {}", value.id, value.action)
            })
        }
    }
}

async fn handle_alerts(command: AlertCommands) -> Result<(), CliError> {
    let runtime = load_runtime().await?;

    match command {
        AlertCommands::List(args) => {
            let rows = if let Some(status) = args.status {
                sqlx::query_as::<_, AlertRow>(
                    "SELECT id, rule_id, sensor_id, severity, status, triggered_value, zone, metric_type, created_at, acknowledged_by, acknowledged_at, resolved_at
                     FROM alerts
                     WHERE status = $1
                     ORDER BY created_at DESC
                     LIMIT $2",
                )
                .bind(status.to_string())
                .bind(args.limit)
                .fetch_all(&runtime.pool)
                .await?
            } else {
                sqlx::query_as::<_, AlertRow>(
                    "SELECT id, rule_id, sensor_id, severity, status, triggered_value, zone, metric_type, created_at, acknowledged_by, acknowledged_at, resolved_at
                     FROM alerts
                     ORDER BY created_at DESC
                     LIMIT $1",
                )
                .bind(args.limit)
                .fetch_all(&runtime.pool)
                .await?
            };

            let alerts = rows
                .into_iter()
                .map(TryInto::try_into)
                .collect::<Result<Vec<AlertView>, CliError>>()?;

            print_output(args.output.output, &alerts, |value| {
                format_alert_list(value.as_slice())
            })
        }
        AlertCommands::Acknowledge(args) => {
            runtime
                .alerting
                .acknowledge_alert(args.id, args.user_id)
                .await?;

            let response = SuccessResponse {
                success: true,
                id: args.id,
                action: "acknowledged".to_owned(),
            };

            print_output(args.output.output, &response, |value| {
                format!("alert {} {}", value.id, value.action)
            })
        }
        AlertCommands::Resolve(args) => {
            runtime
                .alerting
                .resolve_alert(args.id, args.user_id)
                .await?;

            let response = SuccessResponse {
                success: true,
                id: args.id,
                action: "resolved".to_owned(),
            };

            print_output(args.output.output, &response, |value| {
                format!("alert {} {}", value.id, value.action)
            })
        }
    }
}

async fn handle_tokens(command: TokenCommands) -> Result<(), CliError> {
    let runtime = load_runtime().await?;

    match command {
        TokenCommands::Create(args) => {
            let response = runtime
                .access
                .create_api_token(args.account_id, &args.label)
                .await?;

            print_output(args.output.output, &response, |value| {
                format!(
                    "created token {} ({}) expiring {}",
                    value.prefix,
                    value.label,
                    value.expires_at.to_rfc3339(),
                )
            })
        }
    }
}

async fn dev_up(root: &Path) -> Result<(), CliError> {
    start_db(root)?;
    eprintln!("[scemas] waiting for postgres...");
    tokio::time::sleep(Duration::from_secs(2)).await;
    ensure_database(root)?;
    eprintln!("[scemas] starting rust engine + dashboard");
    eprintln!("[scemas] engine on :3001, dashboard on :3000 (ctrl+c to stop all)");

    let mut engine = spawn_engine(root)?;
    let mut dashboard = spawn_dashboard(root)?;

    tokio::select! {
        _ = tokio::signal::ctrl_c() => {
            eprintln!();
            eprintln!("[scemas] shutting down...");
            terminate_child(&mut engine).await?;
            terminate_child(&mut dashboard).await?;
            eprintln!("[scemas] stopped");
            Ok(())
        }
        status = engine.wait() => {
            let status = status?;
            terminate_child(&mut dashboard).await?;
            Err(CliError::ChildExited {
                process: "engine",
                code: exit_code_string(&status),
            })
        }
        status = dashboard.wait() => {
            let status = status?;
            terminate_child(&mut engine).await?;
            Err(CliError::ChildExited {
                process: "dashboard",
                code: exit_code_string(&status),
            })
        }
    }
}

fn dev_check(root: &Path) -> Result<(), CliError> {
    run_checked(root, "cargo", &[OsString::from("fmt")])?;
    run_checked(
        root,
        "cargo",
        &[
            OsString::from("clippy"),
            OsString::from("--all"),
            OsString::from("--benches"),
            OsString::from("--tests"),
            OsString::from("--examples"),
            OsString::from("--all-features"),
        ],
    )?;
    run_checked(
        root,
        "bun",
        &[OsString::from("run"), OsString::from("typecheck")],
    )
}

fn ensure_database(root: &Path) -> Result<(), CliError> {
    run_checked(
        root,
        "bun",
        &[
            OsString::from("--filter"),
            OsString::from("@scemas/db"),
            OsString::from("push"),
        ],
    )?;
    run_checked(
        root,
        "bun",
        &[
            OsString::from("--filter"),
            OsString::from("@scemas/db"),
            OsString::from("ensure-users"),
        ],
    )
}

fn start_db(root: &Path) -> Result<(), CliError> {
    if has_command("pg_start") {
        eprintln!("[scemas] starting postgres via nix");
        if has_command("pg_init") {
            let _ = Command::new("pg_init")
                .current_dir(root)
                .stdin(Stdio::inherit())
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .status();
        }
        return run_checked(root, "pg_start", &[]);
    }

    if has_command("docker") {
        eprintln!("[scemas] starting postgres via docker-compose");
        return run_checked(
            root,
            "docker",
            &[
                OsString::from("compose"),
                OsString::from("-f"),
                root.join("docker-compose.yml").into_os_string(),
                OsString::from("up"),
                OsString::from("-d"),
            ],
        );
    }

    Err(CliError::MissingCommand("pg_start or docker".to_owned()))
}

fn stop_db(root: &Path) -> Result<(), CliError> {
    let mut attempted = false;

    if has_command("pg_stop") {
        attempted = true;
        run_checked(root, "pg_stop", &[])?;
    }

    if has_command("docker") {
        attempted = true;
        run_checked(
            root,
            "docker",
            &[
                OsString::from("compose"),
                OsString::from("-f"),
                root.join("docker-compose.yml").into_os_string(),
                OsString::from("down"),
            ],
        )?;
    }

    if attempted {
        Ok(())
    } else {
        Err(CliError::MissingCommand("pg_stop or docker".to_owned()))
    }
}

fn run_script(root: &Path, script_name: &str, passthrough_args: &[String]) -> Result<(), CliError> {
    let mut args = vec![
        OsString::from("run"),
        root.join("scripts").join(script_name).into_os_string(),
    ];
    args.extend(passthrough_args.iter().map(OsString::from));
    run_checked(root, "bun", &args)
}

fn run_checked(root: &Path, program: &str, args: &[OsString]) -> Result<(), CliError> {
    require_command(program)?;

    let status = Command::new(program)
        .current_dir(root)
        .args(args)
        .stdin(Stdio::inherit())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .status()?;

    ensure_success(program, args, status)
}

fn spawn_engine(root: &Path) -> Result<Child, CliError> {
    if has_command("watchexec") {
        return spawn_checked(
            root,
            "watchexec",
            &[
                OsString::from("--restart"),
                OsString::from("--watch"),
                OsString::from("crates"),
                OsString::from("--watch"),
                OsString::from("data"),
                OsString::from("--watch"),
                OsString::from("Cargo.toml"),
                OsString::from("--watch"),
                OsString::from("Cargo.lock"),
                OsString::from("--exts"),
                OsString::from("rs,toml,json,lock"),
                OsString::from("--"),
                OsString::from("cargo"),
                OsString::from("run"),
                OsString::from("-p"),
                OsString::from("scemas-server"),
            ],
        );
    }

    spawn_checked(
        root,
        "cargo",
        &[
            OsString::from("run"),
            OsString::from("-p"),
            OsString::from("scemas-server"),
        ],
    )
}

fn spawn_dashboard(root: &Path) -> Result<Child, CliError> {
    spawn_checked(
        root,
        "bun",
        &[
            OsString::from("--filter"),
            OsString::from("@scemas/dashboard"),
            OsString::from("dev"),
        ],
    )
}

fn spawn_checked(root: &Path, program: &str, args: &[OsString]) -> Result<Child, CliError> {
    require_command(program)?;

    let child = TokioCommand::new(program)
        .current_dir(root)
        .args(args)
        .stdin(Stdio::inherit())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .kill_on_drop(true)
        .spawn()?;

    Ok(child)
}

async fn terminate_child(child: &mut Child) -> Result<(), CliError> {
    if child.id().is_none() {
        return Ok(());
    }

    if child.try_wait()?.is_some() {
        return Ok(());
    }

    child.kill().await?;
    let _ = child.wait().await?;
    Ok(())
}

fn ensure_success(program: &str, args: &[OsString], status: ExitStatus) -> Result<(), CliError> {
    if status.success() {
        return Ok(());
    }

    let rendered_args = args
        .iter()
        .map(|arg| arg.to_string_lossy().into_owned())
        .collect::<Vec<String>>()
        .join(" ");

    Err(CliError::CommandFailed {
        program: format!("{program} {rendered_args}").trim().to_owned(),
        code: exit_code_string(&status),
    })
}

fn require_command(program: &str) -> Result<(), CliError> {
    if has_command(program) {
        Ok(())
    } else {
        Err(CliError::MissingCommand(program.to_owned()))
    }
}

fn has_command(program: &str) -> bool {
    let Some(paths) = env::var_os("PATH") else {
        return false;
    };

    env::split_paths(&paths).any(|path| executable_in_path(&path, program))
}

fn executable_in_path(path: &Path, program: &str) -> bool {
    let direct = path.join(program);
    if direct.is_file() {
        return true;
    }

    #[cfg(windows)]
    {
        let executable = path.join(format!("{program}.exe"));
        executable.is_file()
    }

    #[cfg(not(windows))]
    {
        false
    }
}

async fn load_runtime() -> Result<ScemasRuntime, CliError> {
    let config = Config::from_env()?;
    ScemasRuntime::from_config(&config)
        .await
        .map_err(CliError::from)
}

fn find_project_root() -> Result<PathBuf, CliError> {
    let start = env::current_dir()?;

    for candidate in start.ancestors() {
        if candidate.join("Cargo.toml").is_file()
            && candidate.join("packages/dashboard/package.json").is_file()
            && candidate.join("crates/scemas-server/Cargo.toml").is_file()
        {
            return Ok(candidate.to_path_buf());
        }
    }

    Err(CliError::ProjectRootNotFound)
}

fn print_output<T, F>(format: OutputFormat, value: &T, text_renderer: F) -> Result<(), CliError>
where
    T: Serialize,
    F: FnOnce(&T) -> String,
{
    match format {
        OutputFormat::Text => {
            println!("{}", text_renderer(value));
            Ok(())
        }
        OutputFormat::Json => {
            println!("{}", serde_json::to_string_pretty(value)?);
            Ok(())
        }
    }
}

fn format_rule_list(rules: &[ThresholdRule]) -> String {
    if rules.is_empty() {
        return "no rules found".to_owned();
    }

    rules
        .iter()
        .map(|rule| {
            format!(
                "{} {} {} {} zone={} status={}",
                rule.id,
                rule.metric_type,
                rule.comparison,
                rule.threshold_value,
                rule.zone.as_deref().unwrap_or("all_zones"),
                rule.rule_status,
            )
        })
        .collect::<Vec<String>>()
        .join("\n")
}

fn format_alert_list(alerts: &[AlertView]) -> String {
    if alerts.is_empty() {
        return "no alerts found".to_owned();
    }

    alerts
        .iter()
        .map(|alert| {
            format!(
                "{} {} {} {} value={} zone={} sensor={}",
                alert.id,
                alert.status,
                alert.severity,
                alert.metric_type,
                alert.triggered_value,
                alert.zone,
                alert.sensor_id,
            )
        })
        .collect::<Vec<String>>()
        .join("\n")
}

fn parse_metric_type(value: &str) -> Result<MetricType, String> {
    MetricType::from_str(value).map_err(|error| error.to_string())
}

fn parse_comparison(value: &str) -> Result<Comparison, String> {
    Comparison::from_str(value).map_err(|error| error.to_string())
}

fn parse_rule_status(value: &str) -> Result<RuleStatus, String> {
    RuleStatus::from_str(value).map_err(|error| error.to_string())
}

fn parse_alert_status(value: &str) -> Result<AlertStatus, String> {
    AlertStatus::from_str(value).map_err(|error| error.to_string())
}

fn exit_code_string(status: &ExitStatus) -> String {
    status
        .code()
        .map(|code| code.to_string())
        .unwrap_or_else(|| "signal".to_owned())
}

#[derive(Debug, Serialize)]
struct SuccessResponse {
    success: bool,
    id: Uuid,
    action: String,
}

#[derive(Debug, Serialize)]
struct HealthReport {
    ingestion_counters: IngestionCounters,
    platform_status: Vec<PlatformStatusView>,
}

#[derive(Debug, Serialize)]
struct IngestionCounters {
    total_received: u64,
    total_accepted: u64,
    total_rejected: u64,
}

#[derive(Debug, FromRow)]
struct PlatformStatusRow {
    subsystem: String,
    status: String,
    uptime: Option<f64>,
    latency_ms: Option<f64>,
    error_rate: Option<f64>,
    time: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
struct PlatformStatusView {
    subsystem: String,
    status: String,
    uptime: Option<f64>,
    latency_ms: Option<f64>,
    error_rate: Option<f64>,
    time: DateTime<Utc>,
}

impl From<PlatformStatusRow> for PlatformStatusView {
    fn from(row: PlatformStatusRow) -> Self {
        Self {
            subsystem: row.subsystem,
            status: row.status,
            uptime: row.uptime,
            latency_ms: row.latency_ms,
            error_rate: row.error_rate,
            time: row.time,
        }
    }
}

#[derive(Debug, FromRow)]
struct ThresholdRuleRow {
    id: Uuid,
    metric_type: String,
    threshold_value: f64,
    comparison: String,
    zone: Option<String>,
    rule_status: String,
}

impl TryFrom<ThresholdRuleRow> for ThresholdRule {
    type Error = CliError;

    fn try_from(row: ThresholdRuleRow) -> Result<Self, Self::Error> {
        Ok(Self {
            id: row.id,
            metric_type: row.metric_type.parse()?,
            threshold_value: row.threshold_value,
            comparison: row.comparison.parse()?,
            zone: row.zone.map(|zone| regions::normalize_zone_id(&zone, None)),
            rule_status: row.rule_status.parse()?,
        })
    }
}

#[derive(Debug, FromRow)]
struct AlertRow {
    id: Uuid,
    rule_id: Option<Uuid>,
    sensor_id: String,
    severity: i32,
    status: String,
    triggered_value: f64,
    zone: String,
    metric_type: String,
    created_at: DateTime<Utc>,
    acknowledged_by: Option<Uuid>,
    acknowledged_at: Option<DateTime<Utc>>,
    resolved_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize)]
struct AlertView {
    id: Uuid,
    rule_id: Option<Uuid>,
    sensor_id: String,
    severity: Severity,
    status: AlertStatus,
    triggered_value: f64,
    zone: String,
    metric_type: MetricType,
    created_at: DateTime<Utc>,
    acknowledged_by: Option<Uuid>,
    acknowledged_at: Option<DateTime<Utc>>,
    resolved_at: Option<DateTime<Utc>>,
}

impl TryFrom<AlertRow> for AlertView {
    type Error = CliError;

    fn try_from(row: AlertRow) -> Result<Self, Self::Error> {
        let sensor_id = row.sensor_id;

        Ok(Self {
            id: row.id,
            rule_id: row.rule_id,
            sensor_id: sensor_id.clone(),
            severity: Severity::try_from(row.severity)?,
            status: row.status.parse()?,
            triggered_value: row.triggered_value,
            zone: regions::normalize_zone_id(&row.zone, Some(&sensor_id)),
            metric_type: row.metric_type.parse()?,
            created_at: row.created_at,
            acknowledged_by: row.acknowledged_by,
            acknowledged_at: row.acknowledged_at,
            resolved_at: row.resolved_at,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::{AlertRow, AlertStatus, AlertView, ThresholdRule, ThresholdRuleRow};
    use chrono::Utc;
    use scemas_core::models::{Comparison, MetricType, RuleStatus, Severity};
    use uuid::Uuid;

    #[test]
    fn threshold_rule_row_converts_into_domain_rule() {
        let row = ThresholdRuleRow {
            id: Uuid::nil(),
            metric_type: "air_quality".to_owned(),
            threshold_value: 35.0,
            comparison: "gte".to_owned(),
            zone: Some("downtown".to_owned()),
            rule_status: "active".to_owned(),
        };

        let rule = ThresholdRule::try_from(row).expect("rule should parse");

        assert_eq!(rule.metric_type, MetricType::AirQuality);
        assert_eq!(rule.comparison, Comparison::Gte);
        assert_eq!(rule.rule_status, RuleStatus::Active);
        assert_eq!(rule.zone.as_deref(), Some("downtown_core"));
    }

    #[test]
    fn alert_row_converts_into_agent_friendly_view() {
        let row = AlertRow {
            id: Uuid::nil(),
            rule_id: Some(Uuid::nil()),
            sensor_id: "temp-dt-001".to_owned(),
            severity: 2,
            status: "acknowledged".to_owned(),
            triggered_value: 42.5,
            zone: "downtown".to_owned(),
            metric_type: "temperature".to_owned(),
            created_at: Utc::now(),
            acknowledged_by: Some(Uuid::nil()),
            acknowledged_at: Some(Utc::now()),
            resolved_at: None,
        };

        let alert = AlertView::try_from(row).expect("alert should parse");

        assert_eq!(alert.metric_type, MetricType::Temperature);
        assert_eq!(alert.severity, Severity::Warning);
        assert_eq!(alert.status, AlertStatus::Acknowledged);
        assert_eq!(alert.zone, "downtown_core");
    }
}
