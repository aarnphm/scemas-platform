export function renderPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>pager | scemas webhook echo</title>
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
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    background: var(--bg); color: var(--fg);
    min-height: 100dvh; display: flex; flex-direction: column;
  }
  header {
    position: sticky; top: 0; z-index: 10;
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; border-bottom: 1px solid var(--border);
    background: var(--card); backdrop-filter: blur(8px);
  }
  header h1 { font-size: 14px; font-weight: 600; }
  .status { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--muted-fg); }
  .dot { width: 7px; height: 7px; border-radius: 50%; }
  .dot.on { background: var(--connected); }
  .dot.off { background: var(--disconnected); }
  .count { font-family: ui-monospace, monospace; font-size: 11px; color: var(--muted-fg); margin-left: 8px; }
  #feed { flex: 1; overflow-y: auto; }
  .empty {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 8px; height: 60vh; color: var(--muted-fg); font-size: 13px;
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
    transition: background 0.15s;
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
  }
  .badge.critical { background: var(--critical); }
  .badge.warning { background: var(--warning); }
  .badge.low { background: var(--low); }
  .tag {
    background: var(--muted); border-radius: 3px;
    padding: 1px 4px; font-size: 11px; color: var(--muted-fg);
  }
  .event-right {
    flex-shrink: 0; text-align: right;
  }
  .value { font-family: ui-monospace, monospace; font-size: 13px; font-variant-numeric: tabular-nums; }
  .time { font-size: 11px; color: var(--muted-fg); margin-top: 2px; }
  .raw { display: none; }
  .event.expanded .raw {
    display: block; margin-top: 8px; padding: 8px; border-radius: 4px;
    background: var(--muted); font-family: ui-monospace, monospace;
    font-size: 11px; white-space: pre-wrap; word-break: break-all;
    color: var(--muted-fg); max-height: 200px; overflow-y: auto;
  }
  footer {
    position: sticky; bottom: 0;
    padding: 8px 16px; border-top: 1px solid var(--border);
    background: var(--card); font-size: 11px; color: var(--muted-fg);
    display: flex; justify-content: space-between;
  }
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
    <span>waiting for webhooks...</span>
  </div>
</div>
<footer>
  <span>scemas webhook echo</span>
  <span id="url"></span>
</footer>
<script>
const feed = document.getElementById('feed');
const empty = document.getElementById('empty');
const dot = document.getElementById('dot');
const statusLabel = document.getElementById('status-label');
const countEl = document.getElementById('count');
const urlEl = document.getElementById('url');
let eventCount = 0;
let ws;
let retryMs = 500;

urlEl.textContent = location.origin + '/webhook';

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

function addEvent(evt) {
  if (empty.parentNode) empty.remove();
  const isAlert = evt.payload?.type === 'alert.triggered' && evt.payload?.alert;
  const el = document.createElement('div');
  el.className = 'event';
  el.onclick = () => el.classList.toggle('expanded');

  if (isAlert) {
    const a = evt.payload.alert;
    const s = severity(a.severity);
    el.innerHTML =
      '<div class="event-left">' +
        '<div class="event-top">' +
          '<span class="badge ' + s.cls + '">' + s.label + '</span>' +
          '<span class="tag">' + (a.metricType || '').replace(/_/g, ' ') + '</span>' +
          '<span class="tag">' + fmtZone(a.zone) + '</span>' +
        '</div>' +
        '<div class="event-bottom">' +
          '<span>sensor ' + (a.sensorId || '?') + '</span>' +
          '<span>' + (a.id || '').slice(0, 8) + '</span>' +
        '</div>' +
        '<div class="raw">' + JSON.stringify(evt.payload, null, 2) + '</div>' +
      '</div>' +
      '<div class="event-right">' +
        '<div class="value">' + (a.triggeredValue ?? '?') + '</div>' +
        '<div class="time">' + fmtTime(evt.receivedAt) + '</div>' +
      '</div>';
  } else {
    el.innerHTML =
      '<div class="event-left">' +
        '<div class="event-top"><span class="tag">unknown payload</span></div>' +
        '<div class="event-bottom"><span>' + fmtTime(evt.receivedAt) + '</span></div>' +
        '<div class="raw">' + JSON.stringify(evt.payload, null, 2) + '</div>' +
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
  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (Array.isArray(msg)) { msg.forEach(addEvent); }
      else { addEvent(msg); }
    } catch {}
  };
}
connect();
</script>
</body>
</html>`
}
