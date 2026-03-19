# scemas-platform

smart city environmental monitoring and alert system. SE 3A04 course project demonstrating PAC (presentation-abstraction-control) architecture.

## architecture

three PAC agents (distinct dashboards) fed by four controllers:

```
                    ┌─────────────────────┐
                    │  DataDistribution   │
                    │  Manager (tRPC)     │
                    └─────┬───────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
   │  Operator   │ │   Admin     │ │   Public    │
   │  Agent      │ │   Agent     │ │   Agent     │
   │  (operator/)│ │  (admin/)   │ │  (public/)  │
   └─────────────┘ └─────────────┘ └─────────────┘

   Controllers:
   ┌──────────────────┐  ┌──────────────────┐
   │ TelemetryManager │  │  AccessManager   │
   │ (pipe-and-filter)│  │  (repository)    │
   └──────────────────┘  └──────────────────┘
   ┌──────────────────┐
   │ AlertingManager  │
   │  (blackboard)    │
   └──────────────────┘
```

**operator agent**: dashboard with map, metrics, alerts, personalized subscriptions. full data access.

**admin agent**: threshold rules CRUD, user management, platform health, audit logs.

**public agent**: aggregated AQI display for digital signage. abstracted (sensitive data stripped). shared view for public users and third-party developers.

## directory map

```
scemas-platform/
├── crates/                      rust workspace (internal processing engine)
│   ├── scemas-core/             shared entity types from UML class diagram
│   ├── scemas-telemetry/        pipe-and-filter validation pipeline
│   ├── scemas-alerting/         blackboard alert evaluation + lifecycle
│   └── scemas-server/           axum internal API on :3001
│
├── packages/                    bun workspace (typescript)
│   ├── db/                      drizzle schema (database source of truth)
│   ├── types/                   zod schemas + shared types
│   └── dashboard/               next.js 15 + tRPC (3 PAC agent dashboards)
│
├── data/                        sample JSON sensor data (hamilton, ON)
├── scripts/                     seed script for data ingestion
├── docs/diagrams/               UML source of truth (.puml files)
└── docker-compose.yml           postgres
```

## getting started

### with nix

```sh
nix develop       # rust, bun, node, postgres, shell helpers, first-time setup
scemas-dev        # starts db + engine + dashboard
```

### without nix

install rust (>= 1.85), bun (>= 1.0), node (>= 22), and docker manually.

```sh
source scripts/start-scemas.sh   # shell helpers + first-time setup
scemas-dev                       # starts db (docker) + engine + dashboard
```

first-time setup (`.env` copy, `bun install`) runs automatically on first source and is tracked via a `.derived` sentinel file. delete `.derived` to re-run it.

### shell helpers

both paths give you the same functions:

| function | description |
|----------|-------------|
| `scemas-dev` | start everything (db + engine + dashboard) |
| `scemas-db` / `scemas-db-stop` | start/stop postgres (auto-detects nix or docker) |
| `scemas-engine` | rust engine on :3001 |
| `scemas-dash` | next.js dashboard on :3000 |
| `scemas-seed` | seed sample data (pass `--spike` for alerts) |
| `scemas-check` | run all lints (cargo fmt + clippy + tsc) |
| `scemas-nuke` | stop everything |

### environment variables

see `.env.example`. defaults work out of the box for both nix and docker setups.

## source of truth

all classes, attributes, methods, and relationships derive from the UML class diagram at [`docs/diagrams/class_diagram.puml`](docs/diagrams/class_diagram.puml). sequence diagrams and state charts in the same directory define interaction contracts.

## tech stack

| layer | tech |
|-------|------|
| rust engine | axum, sqlx, tokio, argon2, jsonwebtoken |
| database | postgresql (drizzle migrations) |
| api surface | tRPC v11 (next.js server) |
| frontend | next.js 15, tailwind v4, shadcn/ui, recharts, maplibre |
| validation | zod (typescript), thiserror (rust) |
| deployment | cloudflare workers via opennext |
| runtime | bun (typescript), tokio (rust) |
