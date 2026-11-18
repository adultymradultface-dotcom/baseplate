// Baseplate relay: a tiny WebSocket server that puts players in rooms and forwards their messages.
// It never trusts or interprets game data; admin commands are signed in the browser and verified by the other players.
const http = require('http');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8080;
const MAX_ROOM = 16;
const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);   // optional, e.g. https://you.github.io

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end(req.url === '/healthz' ? 'ok' : 'baseplate relay');
});
const wss = new WebSocketServer({
  server,
  maxPayload: 1024 * 1024,
  verifyClient: ({ origin }) => !allowed.length || !origin || allowed.includes(origin),
});
const rooms = new Map();   // code -> Map(id -> ws)

const send = (ws, o) => { if (ws.readyState === 1) ws.send(JSON.stringify(o)); };
function leave(ws) {
  const r = ws.room && rooms.get(ws.room);
  if (!r) return;
  r.delete(ws.id);
  for (const p of r.values()) send(p, { t: 'leave', id: ws.id });
  if (!r.size) rooms.delete(ws.room);
  ws.room = null;
}

wss.on('connection', (ws) => {
  ws.id = crypto.randomBytes(4).toString('hex');
  ws.room = null; ws.alive = true; ws.count = 0;
  ws.on('pong', () => { ws.alive = true; });
  send(ws, { t: 'hi', id: ws.id });
  ws.on('message', (raw) => {
    if (++ws.count > 200) return;                      // flood guard (resets every second)
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (m.t === 'join') {
      const code = String(m.room || '');
      if (!/^[a-z0-9_-]{1,24}$/.test(code)) return ws.close();
      leave(ws);
      let r = rooms.get(code); if (!r) rooms.set(code, (r = new Map()));
      if (r.size >= MAX_ROOM) { send(ws, { t: 'full' }); return ws.close(); }
      send(ws, { t: 'peers', ids: [...r.keys()] });
      for (const p of r.values()) send(p, { t: 'join', id: ws.id });
      r.set(ws.id, ws); ws.room = code;
    } else if (m.t === 'msg' && ws.room && typeof m.a === 'string' && m.a.length <= 16) {
      const r = rooms.get(ws.room), out = JSON.stringify({ t: 'msg', a: m.a, d: m.d, from: ws.id });
      if (typeof m.to === 'string') { const p = r.get(m.to); if (p && p.readyState === 1) p.send(out); }
      else for (const p of r.values()) if (p !== ws && p.readyState === 1) p.send(out);
    }
  });
  ws.on('close', () => leave(ws));
  ws.on('error', () => {});
});
setInterval(() => { for (const ws of wss.clients) ws.count = 0; }, 1000);
setInterval(() => { for (const ws of wss.clients) { if (!ws.alive) { ws.terminate(); continue; } ws.alive = false; ws.ping(); } }, 30000);

server.listen(PORT, '0.0.0.0', () => console.log('baseplate relay listening on ' + PORT));
