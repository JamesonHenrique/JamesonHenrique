import { createHash } from 'node:crypto';
import { dateValue, metrics } from './calendar.mjs';

export const escapeXml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
export const hash = content => createHash('sha256').update(content).digest('hex').slice(0, 16);
export const formatDate = date => date.split('-').reverse().join('/');
const number = n => n.toLocaleString('pt-BR');
export function wrap(value, max) {
  const lines = [];
  let line = '';
  for (const word of value.split(/\s+/)) {
    if (line && `${line} ${word}`.length > max) { lines.push(line); line = ''; }
    // Long tokens are split instead of disappearing outside the viewport.
    let rest = word;
    while (rest.length > max) { if (line) { lines.push(line); line = ''; } lines.push(rest.slice(0, max)); rest = rest.slice(max); }
    line = line ? `${line} ${rest}` : rest;
  }
  if (line) lines.push(line);
  return lines;
}
const sans = 'Noto Sans, Segoe UI, Helvetica, Arial, sans-serif';
const mono = 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const fit = (s, length) => s.length > length ? `${s.slice(0, length - 1)}…` : s;
const shortDate = date => `${Number(date.slice(8, 10))} ${monthNames[Number(date.slice(5, 7)) - 1]}`;
function text(x, y, value, size, color, weight = 400, extra = '') {
  return `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-weight="${weight}" ${extra}>${escapeXml(value)}</text>`;
}
function rect(x, y, w, h, fill, radius = 0, stroke) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}"${stroke ? ` stroke="${stroke}"` : ''}/>`;
}
function shell(height, title, description, t, content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="${height}" viewBox="0 0 960 ${height}" role="img" aria-labelledby="title desc">
<title id="title">${escapeXml(title)}</title><desc id="desc">${escapeXml(description)}</desc>
<defs><pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="${t.border}" stroke-width="1" opacity="0.65"/></pattern></defs>
<style>.still{display:none}@media(prefers-reduced-motion:reduce){.moving{display:none}.still{display:inline}}</style>
${rect(0, 0, 960, height, t.background, 18)}${rect(0, 0, 960, height, 'url(#grid)', 18)}${rect(0.5, 0.5, 959, height - 1, 'none', 18, t.border)}
<g font-family="${sans}">${content}</g></svg>\n`;
}
function statusDot(x, y, t) {
  return `<circle cx="${x}" cy="${y}" r="4" fill="${t.signal}"><animate class="moving" attributeName="opacity" values="1;0.4;1" dur="1.8s" repeatCount="indefinite"/></circle>`;
}
function projectCard(repo, t) {
  return rect(0, 0, 284, 72, '#18181B', 12, t.accent).replace('/>', ' stroke-opacity="0.58"/>') +
    `<circle cx="22" cy="36" r="4" fill="${t.accent}"/>` +
    text(38, 41, fit(repo.name, 24), 15, t.text, 700) +
    text(268, 41, repo.pushedAt ? shortDate(repo.pushedAt.slice(0, 10)) : '', 12, t.muted, 400, 'text-anchor="end"');
}
export function renderIntro(p, t, snapshot) {
  const repos = snapshot.publicRepos ?? [];
  let body = rect(32, 28, 138, 28, t.surface, 14, t.border) + statusDot(50, 42, t);
  body += text(62, 47, p.availability.toUpperCase(), 11, t.signal, 700, 'letter-spacing="1.2"');
  body += text(32, 114, fit(p.name, 24), 40, t.text, 700);
  body += rect(32, 128, 236, 4, t.accent, 2);
  body += text(32, 164, fit(p.role.toUpperCase(), 62), 13, t.muted, 700, 'letter-spacing="0.6"');
  body += text(32, 192, '>', 15, t.accent, 400, `font-family="${mono}"`);
  body += text(50, 192, fit(p.headline, 57), 16, t.text);
  body += text(32, 216, p.presentation.contactLabel, 13, '#85858F');
  body += rect(32, 234, 528, 42, t.surface, 10, t.border);
  body += `<text x="48" y="260" font-family="${mono}" font-size="13"><tspan fill="${t.accent}">~/github/${escapeXml(p.login)}</tspan><tspan fill="${t.muted}"> $ </tspan><tspan fill="${t.text}">${escapeXml(fit(p.presentation.terminal, 31))}</tspan><tspan fill="${t.accent}"> ▌<animate class="moving" attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"/></tspan></text>`;
  body += rect(588, 24, 340, 260, t.surface, 14, t.border);
  body += text(610, 52, p.presentation.projectsLabel, 11, t.muted, 700, 'letter-spacing="1.6"');
  body += statusDot(896, 48, t);
  body += `<svg x="600" y="62" width="316" height="210" viewBox="0 0 316 210" overflow="hidden"><defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="white" stop-opacity="0"/><stop offset="0.22" stop-color="white"/><stop offset="0.78" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient><mask id="fade-mask"><rect width="316" height="210" fill="url(#fade)"/></mask></defs><g mask="url(#fade-mask)">`;
  if (repos.length > 1) {
    const duration = Math.max(9, repos.length * 3);
    // One card moves from the lower preview to center, then to the upper preview.
    const cycle = [0, 0.6, 3, 3.6, 6, 6.6, 8.4, 9, duration];
    const times = [...new Set(cycle.map(v => Math.min(v, duration) / duration))].join(';');
    const positions = ['16 226', '16 164', '16 164', '16 69', '16 69', '16 -26', '16 -26', '16 -88'];
    const opacity = [0, 1, 1, 1, 1, 1, 1, 0];
    if (duration > 9) { positions.push('16 -88'); opacity.push(0); }
    repos.forEach((repo, i) => {
      body += `<g class="moving" transform="translate(16 69)"><animateTransform attributeName="transform" type="translate" values="${positions.join(';')}" keyTimes="${times}" dur="${duration}s" begin="-${i * 3}s" repeatCount="indefinite"/><animate attributeName="opacity" values="${opacity.join(';')}" keyTimes="${times}" dur="${duration}s" begin="-${i * 3}s" repeatCount="indefinite"/>${projectCard(repo, t)}</g>`;
    });
    body += `<g class="still" transform="translate(16 69)">${projectCard(repos[0], t)}</g>`;
  } else if (repos.length === 1) {
    body += `<g transform="translate(16 69)">${projectCard(repos[0], t)}</g>`;
  } else {
    body += text(28, 110, 'Sem repositórios no período.', 14, t.muted);
  }
  body += '</g></svg>';
  const desc = `${p.name}. ${p.role}. ${p.summary} ${p.education}. ${p.location}. ${p.availability}. ${p.presentation.contactLabel}. Repositórios públicos recentes: ${repos.map(r => `${r.name} (${r.pushedAt.slice(0, 10)})`).join(', ')}.`;
  return shell(308, p.name, desc, t, body);
}
export function renderStack(p, t) {
  let body = rect(24, 22, 92, 4, t.accent, 2);
  body += text(24, 50, p.stack.title.toUpperCase(), 18, t.text, 700, 'letter-spacing="0.8"');
  body += text(24, 70, p.presentation.stackSubtitle, 13, t.muted);
  body += text(936, 50, p.presentation.stackKicker, 11, t.muted, 700, 'text-anchor="end" letter-spacing="0.8"');
  for (const [i, group] of p.stack.groups.entries()) {
    const x = 24 + i * 231.5, accent = t.groupAccents[i];
    body += rect(x, 92, 217.5, 120, t.surface, 14, accent);
    body += `<circle cx="${x + 22}" cy="116" r="4" fill="${accent}"/>`;
    body += text(x + 34, 120, group.title.toUpperCase(), 11, accent, 700, 'letter-spacing="0.7"');
    const items = group.items.flatMap(v => wrap(v, 27));
    items.slice(0, 3).forEach((v, j) => { body += text(x + 16, 150 + j * 22, v, 13, t.text); });
  }
  return shell(236, 'Ecossistema', `${p.stack.note} ${p.stack.groups.map(g => `${g.title}: ${g.items.join(', ')}`).join('. ')}`, t, body);
}
export function renderActivity(p, snapshot, t) {
  const m = metrics(snapshot);
  let body = rect(28, 24, 92, 4, t.accent, 2);
  body += text(28, 52, p.activity.title.toUpperCase(), 18, t.text, 700, 'letter-spacing="0.8"');
  body += text(28, 72, 'contribuições diárias · 365 dias completos', 13, t.muted);
  body += statusDot(746, 40, t) + text(758, 44, 'ATUALIZADO DIARIAMENTE', 11, t.signal, 700, 'letter-spacing="0.8"');
  const values = [[number(m.total), 'TOTAL NO PERÍODO'], [number(m.active), 'DIAS ATIVOS'], [number(m.peak?.count ?? 0), m.peak ? `PICO · ${shortDate(m.peak.date)}` : 'SEM DIA DE PICO'], [number(snapshot.days.at(-1).count), `ÚLTIMO · ${shortDate(snapshot.to)}`]];
  [28, 250, 430, 650].forEach((x, i) => { body += text(x, 104, values[i][0], 26, t.text, 700) + text(x, 124, values[i][1], 10, '#85858F', 600, 'letter-spacing="0.7"'); });
  const offset = new Date(dateValue(snapshot.from)).getUTCDay();
  const step = 861 / 52, seen = new Set();
  snapshot.days.forEach((d, i) => {
    const column = Math.floor((i + offset) / 7), row = (i + offset) % 7;
    if (!seen.has(d.date.slice(0, 7)) && row === 0 && Number(d.date.slice(8)) <= 7) {
      seen.add(d.date.slice(0, 7));
      body += text(58 + column * step, 156, monthNames[Number(d.date.slice(5, 7)) - 1], 11, '#85858F');
    }
    const level = d.level ? ['NONE', 'FIRST_QUARTILE', 'SECOND_QUARTILE', 'THIRD_QUARTILE', 'FOURTH_QUARTILE'].indexOf(d.level) : d.count ? Math.max(1, Math.ceil(d.count / m.peak.count * 4)) : 0;
    body += `<g><title>${d.date}: ${d.count} contribuições</title>${rect(58 + column * step, 172 + row * step, 13, 13, t.heat[level], 2)}</g>`;
  });
  [['Seg', 1], ['Qua', 3], ['Sex', 5]].forEach(([label, row]) => { body += text(24, 182 + row * step, label, 11, '#85858F'); });
  body += text(28, 307, `${formatDate(snapshot.from)}–${formatDate(snapshot.to)} · consulta ${formatDate(snapshot.queriedOn)} UTC`, 11, '#85858F');
  body += text(792, 307, 'Menos', 11, '#85858F');
  t.heat.forEach((c, i) => { body += rect(828 + i * 16, 297, 11, 11, c, 2); });
  body += text(916, 307, 'Mais', 11, '#85858F');
  return shell(327, 'Atividade no GitHub', `${m.total} contribuições em ${m.active} dias ativos. ${m.peak ? `Pico de ${m.peak.count} em ${formatDate(m.peak.date)}.` : 'Sem dia de pico.'} ${snapshot.from} a ${snapshot.to}; consulta bem-sucedida ${snapshot.queriedOn}. ${p.activity.note}`, t, body);
}
export function renderAssets(p, snapshot) {
  const t = p.themes.dark;
  return {
    'assets/profile-header.svg': renderIntro(p, t, snapshot),
    'assets/contributions.svg': renderActivity(p, snapshot, t),
    'assets/tech-ecosystem.svg': renderStack(p, t)
  };
}
