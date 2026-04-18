import 'dotenv/config';
import http from 'http';
import { readFileSync } from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.DASHBOARD_PORT || 3001;

http.createServer((req, res) => {

  // ── Dashboard HTML ──
  if (req.method === 'GET' && req.url === '/') {
    const html = readFileSync(path.join(__dirname, 'dashboard.html'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // ── CORS preflight ──
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' });
    res.end();
    return;
  }

  // ── POST /api/scan  — SSE stream ──
  if (req.method === 'POST' && req.url === '/api/scan') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let marques = [];
      try { marques = JSON.parse(body).marques || []; } catch {}

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      const env = { ...process.env };
      if (marques.length) env.SCAN_MARQUES = marques.join(',');

      const send = (type, msg) => {
        if (!res.writableEnded) res.write(`data: ${JSON.stringify({ type, msg })}\n\n`);
      };

      send('log', `🚀 Démarrage scan${marques.length ? ` — marques: ${marques.join(', ')}` : ' — toutes marques'}…`);

      const child = spawn('node', ['src/run.js'], { env, cwd: __dirname });
      child.stdout.on('data', d => send('log', d.toString().trimEnd()));
      child.stderr.on('data', d => send('err', d.toString().trimEnd()));
      child.on('close', code => {
        send('done', code === 0 ? '✅ Scan terminé.' : `❌ Erreur (code ${code})`);
        res.end();
      });
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');

}).listen(PORT, () => {
  console.log(`\n🚗  Dashboard  →  http://localhost:${PORT}\n`);
});
