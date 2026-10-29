import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { root } from './pipeline.mjs';
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (/^\/assets\/(profile-header|contributions|tech-ecosystem)\.svg$/.test(url.pathname)) {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.end(await readFile(path.join(root, url.pathname))); return;
    }
    if (url.pathname !== '/') { res.writeHead(404).end(); return; }
    const readme = await readFile(path.join(root, 'README.md'), 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jameson Henrique — prévia</title><style>:root{color-scheme:dark}body{margin:0;background:#0B0B0C;font:13px/1.4 Arial,sans-serif}main{max-width:896px;margin:28px auto 48px;padding:0 16px}img{display:block;width:100%;height:auto}</style><main>${readme}</main></html>`);
  } catch { res.writeHead(500).end('Preview failed'); }
});
const port = Number(process.env.PROFILE_PREVIEW_PORT ?? 4173);
server.listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${port}/`));
