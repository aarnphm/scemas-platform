import { renderPage } from './page'

type WebhookEvent = { id: string; receivedAt: string; payload: unknown }

const MAX_EVENTS = 200
const events: WebhookEvent[] = []
const clients = new Set<{ send(data: string): void }>()
const html = renderPage()

const port = parsePort(process.argv.slice(2))

const server = Bun.serve({
  port,
  fetch(req, server) {
    const url = new URL(req.url)

    if (url.pathname === '/ws') {
      if (server.upgrade(req)) return undefined
      return new Response('websocket upgrade failed', { status: 400 })
    }

    if (req.method === 'POST' && url.pathname === '/webhook') {
      return handleWebhook(req)
    }

    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '')) {
      return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
    }

    return new Response('not found', { status: 404 })
  },
  websocket: {
    open(ws) {
      clients.add(ws)
      if (events.length > 0) {
        ws.send(JSON.stringify(events))
      }
    },
    close(ws) {
      clients.delete(ws)
    },
    message() {},
  },
})

async function handleWebhook(req: Request): Promise<Response> {
  const payload = await req.json().catch(() => null)
  const event: WebhookEvent = {
    id: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
    payload,
  }

  events.unshift(event)
  if (events.length > MAX_EVENTS) events.length = MAX_EVENTS

  const msg = JSON.stringify(event)
  for (const client of clients) {
    client.send(msg)
  }

  logEvent(event)
  return new Response('ok')
}

function logEvent(event: WebhookEvent) {
  const a = (event.payload as Record<string, unknown>)?.alert as
    | Record<string, unknown>
    | undefined
  if (a) {
    const sev = a.severity === 3 ? 'CRITICAL' : a.severity === 2 ? 'WARNING' : 'LOW'
    console.log(
      `${event.receivedAt}  ${sev} — ${a.metricType} at ${a.triggeredValue} in ${a.zone} (sensor ${a.sensorId})`,
    )
  } else {
    console.log(`${event.receivedAt}  POST /webhook`, JSON.stringify(event.payload))
  }
}

function parsePort(args: string[]): number {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && args[i + 1]) {
      const n = Number(args[i + 1])
      if (Number.isFinite(n) && n > 0 && n < 65536) return n
      console.error(`invalid port: ${args[i + 1]}`)
      process.exit(1)
    }
  }
  return 9999
}

console.log(`pager listening on http://localhost:${server.port}`)
console.log(`webhook URL: http://localhost:${server.port}/webhook\n`)
