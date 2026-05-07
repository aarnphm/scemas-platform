# scemas-desktop

tauri 2.x desktop app. if `DATABASE_URL` is set, connects to that postgres directly (dev, docker-compose, nix). if not, starts embedded postgres as fallback (production). set `SCEMAS_REMOTE_DB_URL` to enable database-to-database sync from a remote postgres (e.g. neon).

## architecture

```
tauri webview → tauri IPC → rust controllers → postgres
                                                 ↑
                          DATABASE_URL (dev) OR embedded (production fallback)
                                                 ↑
                          sync service pulls from SCEMAS_REMOTE_DB_URL if set
```

## key files

- `src/main.rs` — tauri entry, postgres mode selection, ScemasRuntime init
- `src/postgres.rs` — embedded postgres lifecycle (initdb, start, stop, stale PID cleanup, schema apply)
- `src/auth.rs` — RemoteAuth client (cloudflare fallback for login/signup)
- `src/commands/local.rs` — write commands calling controllers directly
- `src/commands/reads.rs` — read commands (sqlx queries)
- `src/commands/remote.rs` — auth commands (local-first, remote fallback)
- `src/queries/` — 8 sqlx query modules
- `src/sync.rs` — background sync service (database-to-database or HTTP fallback)
- `src/tray.rs` — system tray with severity-colored icon, manual sync trigger
- `src/notifications.rs` — native OS alerts on threshold breaches

frontend lives at `packages/desktop/`.

## dev

```sh
scemas dev desktop              # starts dev postgres, passes DATABASE_URL to tauri
```
