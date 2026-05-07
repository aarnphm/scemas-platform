# @scemas/pager

simple webhook echo server with a live web UI. receives alert webhook POSTs from the rust alerting dispatcher and displays them in a browser feed styled like the dashboard's alert queue.

## purpose

- test and visualize webhook delivery from `scemas-alerting` dispatcher
- works on phone and desktop (responsive single-page UI)
- zero build step: inline HTML/CSS/JS served by the server itself
- deployable locally via bun or to cloudflare workers via wrangler

## key files

- `src/server.ts` — bun server: HTTP + WebSocket, ring buffer for events
- `src/worker.ts` — cloudflare worker entry point (durable object for WebSocket + state)
- `src/page.ts` — inline HTML renderer (shared between bun and worker)
- `wrangler.toml` — cloudflare deployment config

## how it works

1. POST `/webhook` — receives alert payload, stores in memory ring buffer (200 max), broadcasts to WebSocket clients
2. GET `/` — serves the HTML page
3. WebSocket `/ws` — pushes events live, sends full history on connect

## running

```sh
# local (bun)
bun --filter @scemas/pager dev

# cloudflare
bun --filter @scemas/pager cf:dev
bun --filter @scemas/pager cf:deploy
```

paste the URL (e.g. `http://localhost:9999/webhook` or `https://scemas-pager.<account>.workers.dev/webhook`) into the subscription webhook URL field.

## visual design

matches the dashboard alert queue: cream background (#fffdf7), severity badges (red/amber/green), card borders (#e5e2dc), Inter font. supports dark mode via `prefers-color-scheme`.
