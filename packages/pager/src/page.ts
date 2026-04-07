export function renderPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#fffdf7" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#1a1917" media="(prefers-color-scheme: dark)" />
<meta name="description" content="scemas webhook echo — live alert feed for Hamilton, ON" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-title" content="pager" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta property="og:title" content="pager — SCEMAS" />
<meta property="og:description" content="live feed of webhook alerts from the scemas alerting system" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="SCEMAS" />
<meta property="og:locale" content="en_CA" />
<meta name="twitter:card" content="summary" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap" rel="stylesheet" />
<title>pager | SCEMAS</title>
<style>
  :root {
    --bg: #fffdf7; --card: #fefcf6; --border: #e5e2dc; --muted: #f5f3ef;
    --fg: #1a1a1a; --muted-fg: #737068;
    --critical: #dc2626; --warning: #d97706; --low: #16a34a;
    --connected: #16a34a; --disconnected: #dc2626;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #1a1917; --card: #242320; --border: rgba(255,255,255,0.1); --muted: #2a2926;
      --fg: #e8e6e1; --muted-fg: #9c9890;
    }
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Geist', ui-sans-serif, system-ui, -apple-system, sans-serif;
    background: var(--bg); color: var(--fg);
    min-height: 100dvh; display: flex; flex-direction: column;
    -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
  }
  header {
    position: sticky; top: 0; z-index: 10;
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; border-bottom: 1px solid var(--border);
    background: var(--card); backdrop-filter: blur(8px);
  }
  header h1 { font-size: 14px; font-weight: 600; letter-spacing: -0.01em; }
  .status { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--muted-fg); }
  .dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .dot.on { background: var(--connected); }
  .dot.off { background: var(--disconnected); }
  .count { font-family: ui-monospace, monospace; font-size: 11px; color: var(--muted-fg); margin-left: 8px; }
  #feed { flex: 1; overflow-y: auto; }
  .empty {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 12px; height: 60vh; color: var(--muted-fg); font-size: 13px; padding: 16px;
    text-align: center;
  }
  .empty code {
    display: block; margin-top: 4px; padding: 6px 10px; border-radius: 4px;
    background: var(--muted); font-family: ui-monospace, monospace;
    font-size: 11px; color: var(--fg); user-select: all; word-break: break-all;
  }
  .spinner {
    width: 16px; height: 16px; border: 2px solid var(--border);
    border-top-color: var(--muted-fg); border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .event {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    padding: 10px 16px; min-height: 56px; border-bottom: 1px solid var(--border);
    cursor: pointer; transition: background 0.15s;
    content-visibility: auto; contain-intrinsic-block-size: 56px;
  }
  .event:hover { background: var(--muted); }
  .event-left { min-width: 0; flex: 1; }
  .event-top { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .event-bottom {
    margin-top: 3px; font-size: 11px; color: var(--muted-fg);
    display: flex; gap: 6px; flex-wrap: wrap;
  }
  .badge {
    display: inline-flex; align-items: center; border-radius: 3px;
    padding: 1px 6px; font-size: 10px; font-weight: 500; color: #fff; line-height: 16px;
    text-transform: uppercase; letter-spacing: 0.02em;
  }
  .badge.critical { background: var(--critical); }
  .badge.warning { background: var(--warning); }
  .badge.low { background: var(--low); }
  .tag {
    background: var(--muted); border-radius: 3px;
    padding: 1px 4px; font-size: 11px; color: var(--muted-fg);
  }
  .event-right { flex-shrink: 0; text-align: right; }
  .value { font-family: ui-monospace, monospace; font-size: 13px; font-variant-numeric: tabular-nums; }
  .time { font-size: 11px; color: var(--muted-fg); margin-top: 2px; }
  .raw { display: none; }
  .event.expanded .raw {
    display: block; margin-top: 8px; padding: 8px; border-radius: 4px;
    background: var(--muted); font-family: ui-monospace, monospace;
    font-size: 11px; white-space: pre-wrap; word-break: break-all;
    color: var(--muted-fg); max-height: 200px; overflow-y: auto;
  }
  .event.expanded { align-items: flex-start; contain-intrinsic-block-size: auto; }
  footer {
    position: sticky; bottom: 0;
    padding: 8px 16px; border-top: 1px solid var(--border);
    background: var(--card); font-size: 11px; color: var(--muted-fg);
    display: flex; justify-content: space-between; gap: 8px;
  }
  footer code { font-family: ui-monospace, monospace; user-select: all; }
</style>
</head>
<body>
<header>
  <div style="display:flex;align-items:baseline;gap:8px">
    <h1>pager</h1>
    <span class="count" id="count">0 events</span>
  </div>
  <div class="status">
    <div class="dot off" id="dot"></div>
    <span id="status-label">connecting</span>
  </div>
</header>
<div id="feed">
  <div class="empty" id="empty">
    <div class="spinner"></div>
    <span>waiting for webhooks&hellip;</span>
    <span style="font-size:11px">POST alert payloads to:
      <code id="webhook-url"></code>
    </span>
  </div>
</div>
<footer>
  <span>SCEMAS</span>
  <code id="url"></code>
</footer>
<script>
const feed = document.getElementById('feed');
const empty = document.getElementById('empty');
const dot = document.getElementById('dot');
const statusLabel = document.getElementById('status-label');
const countEl = document.getElementById('count');
const urlEl = document.getElementById('url');
const webhookUrlEl = document.getElementById('webhook-url');
let eventCount = 0;
let ws;
let retryMs = 500;

const webhookUrl = location.origin + '/webhook';
urlEl.textContent = webhookUrl;
webhookUrlEl.textContent = webhookUrl;

function severity(n) {
  if (n === 3) return { cls: 'critical', label: 'critical' };
  if (n === 2) return { cls: 'warning', label: 'warning' };
  return { cls: 'low', label: 'low' };
}

function fmtTime(iso) {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

function fmtZone(z) {
  return z ? z.replace(/_/g, ' ') : '?';
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function extractAlert(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const a = payload.alert;
  if (a && typeof a === 'object' && a.severity !== undefined) return a;
  if (payload.severity !== undefined && payload.metricType) return payload;
  return null;
}

function addEvent(evt) {
  if (empty && empty.parentNode) empty.remove();
  const a = extractAlert(evt.payload);
  const el = document.createElement('div');
  el.className = 'event';
  el.onclick = () => el.classList.toggle('expanded');

  if (a) {
    const s = severity(a.severity);
    const metric = esc((a.metricType || '').replace(/_/g, ' '));
    const zone = esc(fmtZone(a.zone));
    const sensor = esc(a.sensorId || '?');
    const id = esc((a.id || '').slice(0, 8));
    const val = esc(String(a.triggeredValue ?? '?'));
    el.innerHTML =
      '<div class="event-left">' +
        '<div class="event-top">' +
          '<span class="badge ' + s.cls + '">' + s.label + '</span>' +
          '<span class="tag">' + metric + '</span>' +
          '<span class="tag">' + zone + '</span>' +
        '</div>' +
        '<div class="event-bottom">' +
          '<span>sensor ' + sensor + '</span>' +
          '<span>' + id + '</span>' +
        '</div>' +
        '<div class="raw">' + esc(JSON.stringify(evt.payload, null, 2)) + '</div>' +
      '</div>' +
      '<div class="event-right">' +
        '<div class="value">' + val + '</div>' +
        '<div class="time">' + esc(fmtTime(evt.receivedAt)) + '</div>' +
      '</div>';
  } else {
    el.innerHTML =
      '<div class="event-left">' +
        '<div class="event-top"><span class="tag">raw payload</span></div>' +
        '<div class="event-bottom"><span>' + esc(fmtTime(evt.receivedAt)) + '</span></div>' +
        '<div class="raw">' + esc(JSON.stringify(evt.payload, null, 2)) + '</div>' +
      '</div>';
  }

  feed.prepend(el);
  eventCount++;
  countEl.textContent = eventCount + ' event' + (eventCount === 1 ? '' : 's');
}

function connect() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(proto + '//' + location.host + '/ws');
  ws.onopen = () => {
    dot.className = 'dot on';
    statusLabel.textContent = 'connected';
    retryMs = 500;
  };
  ws.onclose = () => {
    dot.className = 'dot off';
    statusLabel.textContent = 'disconnected';
    setTimeout(connect, Math.min(retryMs *= 1.5, 10000));
  };
  ws.onerror = (e) => {
    console.error('[pager] ws error', e);
  };
  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (Array.isArray(msg)) { msg.forEach(addEvent); }
      else { addEvent(msg); }
    } catch (err) {
      console.error('[pager] failed to process message', err, e.data);
    }
  };
}
connect();
</script>
</body>
</html>`
}
