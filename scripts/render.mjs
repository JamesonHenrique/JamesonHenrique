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
function text(x, y, value, size = 18, color = 'text', weight = 400, extra = '') {
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}" ${extra}>${escapeXml(value)}</text>`;
}
function lines(x, y, value, max, size, color, weight = 400, leading = size * 1.35) {
  return wrap(value, max).map((s, i) => text(x, y + i * leading, s, size, color, weight)).join('');
}
function rect(x, y, width, height, fill, radius = 0) {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}"/>`;
}
function shell(width, height, title, description, theme, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
<title id="title">${escapeXml(title)}</title><desc id="desc">${escapeXml(description)}</desc>
<g font-family="Arial, Helvetica, sans-serif">${rect(0, 0, width, height, theme.background, 18)}${rect(0, 26, 4, 42, theme.accent, 2)}${body}</g>
</svg>\n`;
}
function heading(t, w, index, label) {
  return text(28, 42, `${index} / ${label.toUpperCase()}`, 14, t.accent, 700, 'letter-spacing="1.5"') + rect(28, 63, w - 56, 1, t.border);
}
export function renderIntro(p, t, mobile) {
  const w = mobile ? 400 : 960, x = mobile ? 28 : 36;
  const headlineSize = mobile ? 31 : 46, headlineMax = mobile ? 21 : 36;
  const headlineLines = wrap(p.headline, headlineMax);
  const nameY = 105;
  const nameMax = mobile ? 24 : 40;
  const nameSize = mobile ? 25 : 32;
  const nameExtra = (wrap(p.name, nameMax).length - 1) * nameSize * 1.35;
  const headlineY = (mobile ? 154 : 170) + nameExtra;
  const end = headlineY + (headlineLines.length - 1) * headlineSize * 1.16;
  let body = heading(t, w, '01', p.role);
  body += lines(x, nameY, p.name, nameMax, nameSize, t.text, 700);
  body += lines(x, headlineY, p.headline, headlineMax, headlineSize, t.text, 700, headlineSize * 1.16);
  let y = end + 44;
  p.focus.forEach((f, i) => { body += text(mobile ? x : x + i * 290, mobile ? y + i * 28 : y, f, 18, t.accent, 700); });
  y += mobile ? 104 : 44;
  const edu = wrap(p.education, mobile ? 33 : 80);
  body += lines(x, y, p.education, mobile ? 33 : 80, 17, t.muted);
  y += (edu.length - 1) * 23 + 32;
  body += lines(x, y, p.location, mobile ? 33 : 90, 17, t.muted);
  y += (wrap(p.location, mobile ? 33 : 90).length - 1) * 23 + 40;
  body += rect(x, y - 17, 8, 8, t.accent, 4) + text(x + 18, y - 3, p.availability, 17, t.accent, 700);
  if (!mobile) {
    body += text(922, 108, 'JH', 38, t.accent, 700, 'text-anchor="end"');
    body += text(922, 139, 'INTERFACES', 12, t.muted, 400, 'text-anchor="end" letter-spacing="2"');
    body += text(922, 161, 'SISTEMAS', 12, t.muted, 400, 'text-anchor="end" letter-spacing="2"');
    body += text(922, 183, 'CONEXÕES', 12, t.muted, 400, 'text-anchor="end" letter-spacing="2"');
  }
  return shell(w, y + 28, p.name, `${p.headline} ${p.education}. ${p.availability}.`, t, body);
}
export function renderStack(p, t, mobile) {
  const w = mobile ? 400 : 960;
  let body = heading(t, w, '02', 'Stack e trabalho');
  const titleLines = wrap(p.stack.title, mobile ? 23 : 60);
  body += lines(28, 108, p.stack.title, mobile ? 23 : 60, 30, t.text, 700);
  let start = 139 + (titleLines.length - 1) * 40.5, maxY = start;
  for (const [i, g] of p.stack.groups.entries()) {
    const x = mobile ? 28 : 28 + i * 230;
    let y = mobile ? maxY : start;
    body += rect(x, y, mobile ? 344 : 214, 3, t.accent, 1);
    y += 32;
    body += text(x, y, `0${i + 1}`, 14, t.muted, 700);
    y += 28;
    const label = wrap(g.title, mobile ? 30 : 19);
    body += lines(x, y, g.title, mobile ? 30 : 19, 20, t.text, 700);
    y += label.length * 27;
    body += lines(x, y, g.note, mobile ? 32 : 24, 16, t.muted);
    y += (wrap(g.note, mobile ? 32 : 24).length - 1) * 21.6 + 35;
    for (const item of g.items) {
      body += lines(x, y, item, mobile ? 32 : 23, 17, i === 1 || i === 2 ? t.accent : t.text, i === 1 || i === 2 ? 700 : 400, 23);
      y += wrap(item, mobile ? 32 : 23).length * 23 + 5;
    }
    maxY = Math.max(maxY, y + (mobile ? 26 : 12));
  }
  body += lines(28, maxY + 13, p.stack.note, mobile ? 36 : 102, 16, t.muted);
  const height = maxY + 38 + (wrap(p.stack.note, mobile ? 36 : 102).length - 1) * 21.6;
  return shell(w, Math.ceil(height), 'Stack de trabalho', p.stack.groups.map(g => `${g.title}: ${g.items.join(', ')}`).join('. '), t, body);
}
export function renderActivity(p, s, t, mobile) {
  const w = mobile ? 400 : 960, m = metrics(s);
  let body = heading(t, w, '03', 'Registro público de atividade');
  const titleLines = wrap(p.activity.title, mobile ? 23 : 60);
  body += lines(28, 108, p.activity.title, mobile ? 23 : 60, 30, t.text, 700);
  let y = 154 + (titleLines.length - 1) * 40.5;
  const stats = [[number(m.total), 'contribuições'], [number(m.active), 'dias ativos'], [m.peak ? number(m.peak.count) : '0', m.peak ? `pico · ${formatDate(m.peak.date)}` : 'sem dia de pico']];
  stats.forEach(([value, label], i) => {
    const x = mobile ? 28 : 28 + i * 300;
    const sy = mobile ? y + i * 61 : y;
    body += text(x, sy, value, mobile ? 32 : 36, t.accent, 700);
    body += text(mobile ? 132 : x, mobile ? sy - 6 : sy + 28, label, 17, t.muted);
  });
  y += mobile ? 180 : 83;
  if (mobile) {
    body += text(28, y, 'CONTRIBUIÇÕES POR MÊS', 13, t.muted, 700, 'letter-spacing="1"');
    y += 30;
    const max = Math.max(1, ...m.months.map(v => v.total));
    for (const { month, total } of m.months) {
      body += text(28, y, `${month.slice(5)}/${month.slice(0, 4)}`, 16, t.muted);
      body += rect(112, y - 13, 198, 13, t.surface, 3);
      if (total) body += rect(112, y - 13, Math.max(2, 198 * total / max), 13, t.accent, 3);
      body += text(372, y, number(total), 16, t.text, 400, 'text-anchor="end"');
      y += 25;
    }
    body += text(28, y + 5, 'Meses nas bordas podem ser parciais.', 16, t.muted);
    y += 37;
  } else {
    const startWeekday = new Date(dateValue(s.from)).getUTCDay();
    const max = m.peak?.count ?? 0;
    const seen = new Set();
    s.days.forEach((d, i) => {
      const week = Math.floor((i + startWeekday) / 7), weekday = (i + startWeekday) % 7;
      const month = d.date.slice(0, 7);
      if (!seen.has(month) && weekday === 0 && Number(d.date.slice(8)) <= 7) {
        seen.add(month);
        body += text(42 + week * 16, y - 14, month.slice(5), 12, t.muted);
      }
      const level = d.count === 0 ? 0 : Math.max(1, Math.ceil(d.count / Math.max(1, max) * 4));
      body += `<g><title>${d.date}: ${d.count} contribuições</title>${rect(42 + week * 16, y + weekday * 16, 12, 12, t.heat[level], 3)}</g>`;
    });
    y += 133;
    body += text(42, y, 'Menos', 14, t.muted);
    t.heat.forEach((c, i) => { body += rect(95 + i * 17, y - 11, 12, 12, c, 3); });
    body += text(188, y, 'Mais · intensidade relativa ao pico do período', 14, t.muted);
    y += 33;
  }
  body += lines(28, y, `${formatDate(s.from)} a ${formatDate(s.to)} · ${s.days.length} dias`, mobile ? 36 : 100, 16, t.muted);
  y += 28;
  body += text(28, y, `Consulta bem-sucedida: ${formatDate(s.queriedOn)} (UTC)`, 16, t.muted);
  y += 30;
  body += lines(28, y, p.activity.note, mobile ? 36 : 102, 16, t.muted);
  return shell(w, Math.ceil(y + wrap(p.activity.note, mobile ? 36 : 102).length * 22 + 8), 'Atividade no GitHub', `${m.total} contribuições, ${m.active} dias ativos. Período: ${s.from} a ${s.to}. Consulta: ${s.queriedOn}.`, t, body);
}
export function renderAssets(p, s) {
  const files = {};
  for (const mode of ['light', 'dark']) {
    const t = p.themes[mode];
    for (const [size, mobile] of [['desktop', false], ['mobile', true]]) {
      files[`assets/intro-${mode}-${size}.svg`] = renderIntro(p, t, mobile);
      files[`assets/stack-${mode}-${size}.svg`] = renderStack(p, t, mobile);
      files[`assets/activity-${mode}-${size}.svg`] = renderActivity(p, s, t, mobile);
    }
  }
  return files;
}
