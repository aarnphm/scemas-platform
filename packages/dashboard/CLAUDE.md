# @scemas/dashboard

next.js 15 + tRPC. deploys to cloudflare workers via opennext. this is where all three PAC agents live. in production it talks to postgres from the worker runtime and reaches the rust backend through `INTERNAL_RUST_URL` (normally `@scemas/api` on cloudflare).

## PAC agents (route groups)

| route group      | agent                      | role                         | data access                                                                         |
| ---------------- | -------------------------- | ---------------------------- | ----------------------------------------------------------------------------------- |
| `app/(console)/` | SystemAdmin + CityOperator | admin (superset) or operator | admin sees all operator views + admin-only pages. operator sees operator views only |
| `app/(public)/`  | PublicUserAgent            | public + third-party         | aggregated AQI only (sensitive data stripped)                                       |

admin is a strict superset of operator. the `(console)` layout reads the session role and builds nav groups conditionally: "operations" (dashboard, alerts, metrics) for everyone, "administration" (rules, users, health, audit) for admin only. middleware still gates admin paths server-side.

each agent's layout.tsx is its **Control** component. pages are **Presentation**. data from tRPC is **Abstraction**.

## tRPC (single app API surface)

all authenticated app calls go through tRPC. the browser never calls the rust service directly. the one exception is the public read-only route handler at `/api/v1/zones/aqi`.

| router                            | controller              | pattern                                                               |
| --------------------------------- | ----------------------- | --------------------------------------------------------------------- |
| `server/routers/auth.ts`          | AccessManager           | rust-backed signup/login, drizzle-backed `me`, cookie session control |
| `server/routers/telemetry.ts`     | TelemetryManager        | rust ingest + drizzle reads for dashboards                            |
| `server/routers/alerts.ts`        | AlertingManager         | drizzle reads + rust lifecycle transitions                            |
| `server/routers/rules.ts`         | AlertingManager         | rust-backed admin CRUD, normalized DTOs                               |
| `server/routers/subscriptions.ts` | AlertingManager         | innovative feature                                                    |
| `server/routers/users.ts`         | AccessManager           | admin user management                                                 |
| `server/routers/public.ts`        | DataDistributionManager | PAC abstraction for filtered zone-level views                         |
| `server/routers/health.ts`        | DataDistributionManager | drizzle snapshots + rust ingestion health                             |

## key files

- `server/trpc.ts` — tRPC instance, context, auth middleware (publicProcedure, protectedProcedure, adminProcedure)
- `server/router.ts` — root router composing all sub-routers
- `server/rust-client.ts` — server-to-server bridge to the rust backend
- `middleware.ts` — next.js middleware for JWT auth + role routing
- `app/api/v1/zones/aqi/route.ts` — public versioned REST endpoint
- `app/globals.css` — tailwind v4 theme with shadcn oklch variables
- `components/ui/` — 55 shadcn/ui components
- `open-next.config.ts` + `wrangler.toml` — cloudflare deployment config, worker bindings, asset config

## deployment notes

- local dev can keep using `DATABASE_URL` directly
- cloudflare worker runtime should use request-scoped db clients, not a long-lived global postgres client
- on cloudflare, dashboard -> api traffic should prefer the `SCEMAS_API` service binding. `INTERNAL_RUST_URL` is still kept as the non-cloudflare fallback
- auth routes are `/sign-in` and `/sign-up`, not `/login` and `/signup`

## abstraction layer

the public router (`server/routers/public.ts`) demonstrates PAC abstraction: it aggregates raw sensor data into `ZoneAQI` shapes, stripping sensor IDs, device details, and operator metadata. public users and third-party developers see the same filtered view.

## MCP endpoint

`/mcp` serves a stateless MCP server via streamable HTTP (`WebStandardStreamableHTTPServerTransport`). each request creates a fresh `McpServer` instance (no session persistence, CF Worker safe). authentication is required via OAuth 2.1 or `sk-scemas-` API tokens.

| tool                | data source              | notes                             |
| ------------------- | ------------------------ | --------------------------------- |
| `get_zone_aqi`      | DataDistributionManager  | public aggregated AQI             |
| `get_zone_current`  | DataDistributionManager  | single zone snapshot              |
| `get_zone_history`  | DataDistributionManager  | time-series by metric             |
| `list_alerts`       | drizzle (alerts table)   | optional status filter            |
| `acknowledge_alert` | rust via handlers/alerts | uses auth context, write:operator |
| `get_feed_status`   | DataDistributionManager  | feed health                       |

tools call internal dashboard functions directly (drizzle queries, DataDistributionManager, rust-client handlers), not the REST API. server code lives in `server/mcp-server.ts`.

## OAuth 2.1 (MCP auth)

the MCP endpoint implements OAuth 2.1 per the MCP protocol spec. the dashboard acts as both authorization server and resource server.

| endpoint                                  | method | purpose                              |
| ----------------------------------------- | ------ | ------------------------------------ |
| `/.well-known/oauth-authorization-server` | GET    | RFC 8414 metadata discovery          |
| `/oauth/register`                         | POST   | RFC 7591 dynamic client registration |
| `/oauth/authorize`                        | GET    | authorization flow entry point       |
| `/oauth/consent` (under (auth) layout)    | page   | user consent UI                      |
| `/oauth/authorize/decision`               | POST   | consent decision, issues auth code   |
| `/oauth/token`                            | POST   | token exchange + refresh             |
| `/oauth/revoke`                           | POST   | RFC 7009 token revocation            |

flow: client discovers metadata, registers, redirects user to authorize, user logs in + consents, client exchanges code (with PKCE S256) for access + refresh tokens. access tokens expire in 15 min, refresh in 7 days. both `sk-scemas-` API tokens and OAuth tokens are accepted on `/mcp`.

schema: `oauthClients`, `oauthCodes`, `oauthTokens` tables in `@scemas/db`. core crypto in `server/oauth.ts`.
