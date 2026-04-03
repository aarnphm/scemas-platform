# SCEMAS Platform: Installation Guide
*Smart City Environmental Monitoring & Alert System*

---

## Before You Begin *(required)*

Please ensure the following tools are installed on your system before proceeding:

| Dependency | Version | Purpose |
|---|---|---|
| rustup / Rust | stable (pinned via `rust-toolchain.toml`) | Runs the backend engine |
| Bun | >= 1.2 | Runs the frontend & manages packages |
| Docker | latest stable | Runs the PostgreSQL database |

macOS or Linux are the recommended platforms. On Windows, please use WSL (Windows Subsystem for Linux).

---

## Step 1: Extract the Source Code *(required)*

You have received the project as a `Tutorial2_Group5_D4` file. Extract it and navigate into the project folder:

```sh
unzip Tutorial2_Group5_D4.zip
cd ./Tutorial2_Group5_D4/scemas-platform-main
```

---

## Step 2: Start the Platform *(required)*

Run the following two commands to load the shell helpers and start everything:

```sh
source scripts/start-scemas.sh
scemas-dev
```

On first run, the script automatically creates the `.env` settings file and installs all dependencies before starting. `scemas-dev` then starts the database (Docker), applies the schema, creates default accounts, and launches the Rust engine on `:3001` and the Next.js dashboard on `:3000`.

> **Keep this terminal tab open.** `scemas-dev` must stay running; closing it or pressing Ctrl+C will stop the platform.

---

## Step 3: Seed Sample Data *(required)*

The dashboard will appear empty until the database is populated. Open a **new terminal tab**, navigate to the project folder, `scemas-platform-main`, and run:

```sh
scemas-seed
```

Seeding runs continuously and data appears in the dashboard in real time as it is ingested — you do not need to wait for it to finish. Open your browser (i.e., Google Chrome) and navigate to http://localhost:3000 whenever you are ready.

**That's it — the platform is running.**

> **Optional flags:**
> - `--spike` — generate extreme readings that trigger alerts
> - `--rate 8` — increase aggregate sensor data generation frequency

---

## Reference

### Default Accounts *(informational)*

The following accounts are created automatically on first start. All use password `1234`.

| Email | Password | Role | Dashboard Access |
|---|---|---|---|
| `admin@example.com` | `1234` | admin | `/rules`, `/users`, `/health`, `/audit` |
| `operator@example.com` | `1234` | operator | `/dashboard`, `/alerts`, `/subscriptions`, `/metrics` |
| `viewer@example.com` | `1234` | viewer | `/display` (public AQI grid) |
| `public@example.com` | `1234` | viewer | `/display` (public AQI grid) |

---

### Environment Configuration *(informational)*

No manual configuration is needed; the `start-scemas.sh` script handles it automatically. The table below lists all available settings for reference only.

| Setting | Default Value | What it does |
|---|---|---|
| `DATABASE_URL` | `postgres://scemas:scemas@localhost:5432/scemas` | Tells the app where to find the local database |
| `NEON_DATABASE_URL` | `postgres://user:pass@...` | Cloud database connection — only needed for production deployment, not local use |
| `RUST_PORT` | `3001` | Port number the backend engine listens on |
| `RUST_LOG` | `info` | Controls how much detail the backend prints to the console |
| `JWT_SECRET` | `change-me-in-production` | Secret key that secures user login tokens — change this before any public deployment |
| `JWT_EXPIRY_HOURS` | `24` | How many hours a user stays logged in before needing to sign in again |
| `DEVICE_AUTH_SECRET` | `change-me-device-ingest-secret` | Secret key used by sensors to send data securely — change before public deployment |
| `DEVICE_CATALOG_PATH` | `data/hamilton-sensor-catalog.json` | Path to the sensor locations file — sample Hamilton data is already included |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` | Web address of the dashboard on your machine |
| `INTERNAL_RUST_URL` | `http://localhost:3001` | Web address of the backend engine on your machine |
| `CLOUDFLARE_API_TOKEN` | *(empty)* | Only needed for cloud deployment — leave blank for local use |
| `CLOUDFLARE_ACCOUNT_ID` | *(empty)* | Only needed for cloud deployment — leave blank for local use |

---

### Shell Helper Reference *(optional)*

After sourcing the start script, the following commands are available in your terminal:

| Command | Description |
|---|---|
| `scemas-dev` | Start everything (db + schema + accounts + engine + dashboard) |
| `scemas-engine` | Start Rust engine only (`:3001`) |
| `scemas-dash` | Start Next.js dashboard only (`:3000`) |
| `scemas-seed` | Seed sample data (supports `--spike` and `--rate <n>`) |
| `scemas-check` | Run all lints (cargo fmt + clippy + tsc) |
| `scemas-nuke` | Stop all services |

---

### Verify Installation *(optional)*

To run the architecture tests and confirm everything is working correctly:

```sh
cargo test --all
```

---

### Tech Stack *(informational)*

| Layer | Tech |
|---|---|
| Rust engine | axum, sqlx, tokio, argon2, jsonwebtoken |
| Database | PostgreSQL (drizzle migrations) |
| API surface | tRPC v11 (Next.js server) |
| Frontend | Next.js 15, Tailwind v4, shadcn/ui, recharts, MapLibre |
| Validation | zod (TypeScript), thiserror (Rust) |
| Deployment | Cloudflare Workers via OpenNext |
| Runtime | Bun (TypeScript), Tokio (Rust) |

---

*For full documentation regarding architecture, please refer to `docs/D1.pdf`, `docs/D2.pdf` and `docs/D3.pdf`.*
