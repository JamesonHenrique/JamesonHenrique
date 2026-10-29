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
const sans = 'Segoe UI, Helvetica, Arial, sans-serif';
const mono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
function text(x, y, value, size, color, weight = 400, extra = '') {
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}" ${extra}>${escapeXml(value)}</text>`;
}
function lines(x, y, value, max, size, color, weight = 400, leading = size * 1.35) {
  return wrap(value, max).map((s, i) => text(x, y + i * leading, s, size, color, weight)).join('');
}
function rect(x, y, width, height, fill, radius = 0, stroke) {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}"${stroke ? ` stroke="${stroke}"` : ''}/>`;
}
function dot(x, y, color, radius = 4) {
  return `<circle cx="${x}" cy="${y}" r="${radius}" fill="${color}"/>`;
}
function shell(width, height, title, description, theme, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
<title id="title">${escapeXml(title)}</title><desc id="desc">${escapeXml(description)}</desc>
<defs><pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="${theme.border}" stroke-width="0.65" opacity="0.55"/></pattern></defs>
${rect(0, 0, width, height, theme.background, 18)}${rect(0, 0, width, height, 'url(#grid)', 18)}${rect(0.5, 0.5, width - 1, height - 1, 'none', 18, theme.border)}
<g font-family="${sans}">${body}</g>
</svg>\n`;
}
function sectionHeader(p, t, title, subtitle, mobile, label = '') {
  let body = rect(28, 23, 90, 3, t.accent, 1.5);
  body += text(28, 51, title.toUpperCase(), mobile ? 21 : 18, t.text, 700, 'letter-spacing="0.8"');
  body += text(28, 74, subtitle, mobile ? 16 : 14, t.muted);
  if (!mobile && label) body += text(932, 49, label, 12, t.muted, 600, `text-anchor="end" font-family="${mono}"`);
  return body;
}
export function renderIntro(p, t, mobile) {
  const w = mobile ? 400 : 960, x = mobile ? 24 : 32;
  let body = rect(x, 27, mobile ? 263 : 228, 29, t.surface, 14.5, t.border);
  body += dot(x + 16, 41.5, t.signal);
  body += text(x + 30, 46, p.availability.toUpperCase(), mobile ? 14 : 12, t.signal, 600, `font-family="${mono}" letter-spacing="0.4"`);
  const nameSize = mobile ? 33 : 42, nameMax = mobile ? 21 : 27;
  const nameLines = wrap(p.name, nameMax);
  body += lines(x, 113, p.name, nameMax, nameSize, t.text, 700, nameSize * 1.15);
  let y = 113 + (nameLines.length - 1) * nameSize * 1.15;
  body += rect(x, y + 14, mobile ? 197 : 234, 4, t.accent, 2);
  y += mobile ? 49 : 41;
  body += text(x, y, p.role.toUpperCase(), mobile ? 16 : 14, t.muted, 700, 'letter-spacing="0.5"');
  y += 29;
  body += text(x, y, '>', 18, t.accent, 600, `font-family="${mono}"`);
  body += lines(x + 19, y, p.headline, mobile ? 30 : 51, mobile ? 18 : 17, t.text, 400, 24);
  y += (wrap(p.headline, mobile ? 30 : 51).length - 1) * 24 + 27;
  body += lines(x, y, p.education, mobile ? 32 : 62, mobile ? 16 : 14, t.muted, 400, 23);
  y += (wrap(p.education, mobile ? 32 : 62).length - 1) * 23 + 24;
  body += lines(x, y, p.location, mobile ? 34 : 62, mobile ? 16 : 14, t.muted, 400, 23);
  y += (wrap(p.location, mobile ? 34 : 62).length - 1) * 23 + 19;
  const terminalLines = wrap(p.presentation.terminal, mobile ? 28 : 56);
  const terminalHeight = mobile ? 30 + terminalLines.length * 20 : 42 + Math.max(0, terminalLines.length - 1) * 20;
  body += rect(x, y, mobile ? 352 : 536, terminalHeight, t.surface, 9, t.border);
  if (mobile) {
    body += text(x + 14, y + 20, `~/${p.login}`, 14, t.accent, 500, `font-family="${mono}"`);
    body += `<g font-family="${mono}">${lines(x + 14, y + 40, `$ ${p.presentation.terminal}`, 30, 15, t.text, 400, 20)}</g>`;
  } else {
    body += `<g font-family="${mono}">${lines(x + 14, y + 26, `~/${p.login} $ ${p.presentation.terminal}`, 62, 13, t.accent, 500, 20)}</g>`;
  }
  const leftBottom = y + terminalHeight;
  const panelX = mobile ? x : 600, panelY = mobile ? leftBottom + 20 : 24;
  const panelWidth = mobile ? 352 : 332;
  let cardY = panelY + 44;
  const cardHeights = p.projects.map(project => {
    const nameRows = wrap(project.name, mobile ? 24 : 25).length;
    const tags = project.technologies.slice(0, 3).join(' · ');
    return (mobile ? 28 : 18) + nameRows * 22 + wrap(tags, mobile ? 32 : 35).length * 20;
  });
  const panelHeight = 54 + cardHeights.reduce((s, h) => s + h + 10, 0);
  body += rect(panelX, panelY, panelWidth, panelHeight, t.surface, 13, t.border);
  body += text(panelX + 18, panelY + 26, p.presentation.projectsLabel, mobile ? 14 : 12, t.muted, 600, `font-family="${mono}" letter-spacing="1.5"`);
  body += dot(panelX + panelWidth - 22, panelY + 21, t.signal, 3.5);
  for (const [i, project] of p.projects.entries()) {
    body += rect(panelX + 12, cardY, panelWidth - 24, cardHeights[i], t.background, 10, t.border);
    body += dot(panelX + 28, cardY + 24, t.accent, 3.5);
    body += lines(panelX + 42, cardY + 29, project.name, mobile ? 24 : 25, mobile ? 18 : 16, t.text, 700, 22);
    const nameExtra = (wrap(project.name, mobile ? 24 : 25).length - 1) * 22;
    body += lines(panelX + 26, cardY + (mobile ? 53 : 48) + nameExtra, project.technologies.slice(0, 3).join(' · '), mobile ? 32 : 35, mobile ? 14 : 13, t.muted, 400, 20);
    cardY += cardHeights[i] + 10;
  }
  return shell(w, Math.ceil(Math.max(leftBottom, panelY + panelHeight) + 24), p.name, `${p.headline} ${p.education}. ${p.availability}. Projetos: ${p.projects.map(v => v.name).join(', ')}.`, t, body);
}
export function renderStack(p, t, mobile) {
  const w = mobile ? 400 : 960;
  let body = sectionHeader(p, t, p.stack.title, p.presentation.stackSubtitle, mobile, 'FULL STACK · AUTOMAÇÃO');
  // On small screens, two rows preserve both the panel composition and readable text.
  const columns = mobile ? 2 : 4, margin = mobile ? 18 : 24, gap = 12;
  const cardWidth = (w - margin * 2 - (columns - 1) * gap) / columns;
  const itemSize = mobile ? 16 : 15;
  const maxChars = mobile ? 17 : 25;
  let y = 98;
  for (let row = 0; row < p.stack.groups.length / columns; row++) {
    const groups = p.stack.groups.slice(row * columns, (row + 1) * columns);
    const heights = groups.map(g => 36 + wrap(g.title.toUpperCase(), mobile ? 15 : 22).length * 18 + g.items.reduce((s, v) => s + wrap(v, maxChars).length * 22 + 4, 0));
    const height = Math.max(...heights);
    groups.forEach((g, col) => {
      const index = row * columns + col, color = t.groupAccents[index], x = margin + col * (cardWidth + gap);
      body += rect(x, y, cardWidth, height, t.surface, 12, color);
      body += dot(x + 15, y + 24, color, 3.5);
      body += lines(x + 26, y + 29, g.title.toUpperCase(), mobile ? 15 : 22, mobile ? 12 : 12, color, 700, 18);
      let itemY = y + 39 + wrap(g.title.toUpperCase(), mobile ? 15 : 22).length * 18;
      for (const item of g.items) {
        body += lines(x + 14, itemY, item, maxChars, itemSize, t.text, 400, 22);
        itemY += wrap(item, maxChars).length * 22 + 4;
      }
    });
    y += height + gap;
  }
  return shell(w, y + 12, 'Stack de trabalho', p.stack.groups.map(g => `${g.title}: ${g.items.join(', ')}`).join('. '), t, body);
}
export function renderActivity(p, s, t, mobile) {
  const w = mobile ? 400 : 960, m = metrics(s);
  let body = sectionHeader(p, t, p.activity.title, mobile ? 'Contribuições nos 365 dias completos.' : 'Contribuições diárias · 365 dias completos', mobile, `CONSULTA ${formatDate(s.queriedOn)}`);
  const stats = [[number(m.total), 'TOTAL NO PERÍODO'], [number(m.active), 'DIAS ATIVOS'], [m.peak ? number(m.peak.count) : '0', m.peak ? `PICO · ${formatDate(m.peak.date)}` : 'SEM DIA DE PICO'], [number(s.days.at(-1).count), `ÚLTIMO · ${formatDate(s.to).slice(0, 5)}`]];
  let y = mobile ? 110 : 104;
  stats.forEach(([value, label], i) => {
    const x = mobile ? 24 + i % 2 * 182 : 28 + i * 233;
    const sy = mobile ? y + Math.floor(i / 2) * 72 : y;
    body += text(x, sy, value, mobile ? 31 : 28, t.text, 700);
    body += text(x, sy + 21, label, mobile ? 12 : 11, t.muted, 500, `font-family="${mono}"`);
  });
  y += mobile ? 160 : 65;
  if (mobile) {
    body += text(24, y, 'CONTRIBUIÇÕES POR MÊS', 13, t.muted, 600, `font-family="${mono}"`);
    y += 30;
    const max = Math.max(1, ...m.months.map(v => v.total));
    for (const { month, total } of m.months) {
      body += text(24, y, `${month.slice(5)}/${month.slice(0, 4)}`, 16, t.muted);
      body += rect(108, y - 12, 202, 12, t.surface, 3);
      if (total) body += rect(108, y - 12, Math.max(2, 202 * total / max), 12, t.accent, 3);
      body += text(376, y, number(total), 16, t.text, 400, 'text-anchor="end"');
      y += 23;
    }
    body += text(24, y + 2, 'Meses nas bordas podem ser parciais.', 15, t.muted);
    y += 30;
  } else {
    const startWeekday = new Date(dateValue(s.from)).getUTCDay();
    const max = m.peak?.count ?? 0, seen = new Set();
    const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    s.days.forEach((d, i) => {
      const week = Math.floor((i + startWeekday) / 7), weekday = (i + startWeekday) % 7;
      const month = d.date.slice(0, 7);
      if (!seen.has(month) && weekday === 0 && Number(d.date.slice(8)) <= 7) {
        seen.add(month);
        body += text(58 + week * 16.55, y - 15, monthNames[Number(d.date.slice(5, 7)) - 1], 12, t.muted);
      }
      const level = d.count === 0 ? 0 : Math.max(1, Math.ceil(d.count / Math.max(1, max) * 4));
      body += `<g><title>${d.date}: ${d.count} contribuições</title>${rect(58 + week * 16.55, y + weekday * 16, 12, 12, t.heat[level], 2)}</g>`;
    });
    for (const [day, row] of [['Seg', 1], ['Qua', 3], ['Sex', 5]]) body += text(20, y + row * 16 + 10, day, 11, t.muted);
    y += 126;
    body += text(28, y, 'Cada quadrado é um dia · a cor mostra o volume.', 12, t.muted);
    body += text(770, y, 'Menos', 12, t.muted);
    t.heat.forEach((c, i) => { body += rect(810 + i * 16, y - 10, 11, 11, c, 2); });
    body += text(897, y, 'Mais', 12, t.muted);
    y += 22;
  }
  body += text(mobile ? 24 : 28, y, `${formatDate(s.from)} a ${formatDate(s.to)}${mobile ? '' : ' · consulta bem-sucedida em ' + formatDate(s.queriedOn)}`, mobile ? 16 : 12, t.muted);
  if (mobile) { y += 25; body += text(24, y, `Consulta: ${formatDate(s.queriedOn)} (UTC)`, 16, t.muted); }
  return shell(w, y + 24, 'Atividade no GitHub', `${m.total} contribuições, ${m.active} dias ativos. Período: ${s.from} a ${s.to}. Consulta: ${s.queriedOn}. ${p.activity.note}`, t, body);
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
