import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { root } from './pipeline.mjs';
import { escapeXml as e } from './render.mjs';

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (/^\/assets\/(intro|stack|activity)-(light|dark)-(desktop|mobile)\.svg$/.test(url.pathname)) {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.end(await readFile(path.join(root, url.pathname))); return;
    }
    if (url.pathname !== '/') { res.writeHead(404).end(); return; }
    const dark = url.searchParams.get('theme') === 'dark';
    const p = JSON.parse(await readFile(path.join(root, 'profile.json'), 'utf8'));
    const t = p.themes[dark ? 'dark' : 'light'];
    const readme = await readFile(path.join(root, 'README.md'), 'utf8');
    // Uses the exact picture blocks generated for GitHub; text is a local preview.
    const pictures = [...readme.matchAll(/<picture>[\s\S]*?<\/picture>/g)].map(m => m[0]);
    const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jameson Henrique — prévia</title><style>
    :root{color-scheme:${dark ? 'dark' : 'light'}}*{box-sizing:border-box}body{margin:0;background:${dark ? '#0d1117' : '#fff'};color:${t.text};font:16px/1.6 Arial,Helvetica,sans-serif}main{max-width:960px;margin:24px auto;padding:0 16px}img{width:100%;height:auto;display:block}picture{display:block;margin:0 0 16px}a{color:${t.accent}}h1{font-size:26px}h2{font-size:22px}h3{margin-bottom:6px}p{margin:10px 0 18px}
    </style><main>${pictures.join('')}<p>${p.links.map(l => `<a href="${e(l.url)}">${e(l.label)}</a>`).join(' · ')}</p><h3>Projetos</h3><ul>${p.projects.map(v => `<li><strong><a href="${e(v.url)}">${e(v.name)}</a></strong> — ${e(v.description)} ${e(v.technologies.join(' · '))}.${v.demo ? ` <a href="${e(v.demo)}">${e(v.demoLabel)}</a>.` : ''}</li>`).join('')}</ul><details><summary>Sobre mim, stack e dados de atividade em texto</summary><p>${e(p.summary)}</p><p>${e(p.education)} · ${e(p.location)} · ${e(p.availability)}</p>${p.stack.groups.map(g => `<p>${e(g.title)}: ${e(g.items.join('; '))}</p>`).join('')}<p>${e(p.activity.note)}</p></details></main></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(html);
  } catch { res.writeHead(500).end('Preview failed'); }
});
const port = Number(process.env.PROFILE_PREVIEW_PORT ?? 4173);
server.listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${port}/ (append ?theme=dark; emulate the matching color scheme)`));
