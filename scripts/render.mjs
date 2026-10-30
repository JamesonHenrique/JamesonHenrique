import { createHash } from 'node:crypto';
import { dateValue, metrics } from './calendar.mjs';
import { outlineTypography, measureText, fitText } from './typography.mjs';

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
function panelBackground(width, height, t) {
  return rect(0, 0, width, height, t.background, 18) + (t.flat ? '' : rect(0, 0, width, height, 'url(#halo)', 18)) + rect(0, 0, width, height, 'url(#grid)', 18) + rect(0.5, 0.5, width - 1, height - 1, 'none', 18, t.border);
}
function shell(height, title, description, t, content, mobile) {
  const width = t.mobile ? 400 : 960;
  if (t.mobile) { height = mobile.height; content = mobile.content; }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
<title id="title">${escapeXml(title)}</title><desc id="desc">${escapeXml(description)}</desc>
<defs><pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="${t.grid}" stroke-width="0.65" opacity="0.45"/></pattern><radialGradient id="halo" cx="80%" cy="0%" r="95%"><stop stop-color="${t.accent}" stop-opacity="0.1"/><stop offset="1" stop-color="${t.background}" stop-opacity="0"/></radialGradient><linearGradient id="accent-rule"><stop stop-color="${t.accent}"/><stop offset="1" stop-color="${t.secondary}" stop-opacity="0.12"/></linearGradient></defs>
<style>.still{display:none}@media(prefers-reduced-motion:reduce){.moving{display:none}.still{display:inline}}</style>
${panelBackground(width, height, t)}<g font-family="${sans}">${content}</g></svg>\n`;
  return outlineTypography(svg, t.typography);
}
function statusDot(x, y, t) {
  return `<circle cx="${x}" cy="${y}" r="4" fill="${t.signal}"><animate class="moving" attributeName="opacity" values="1;0.4;1" dur="1.8s" repeatCount="indefinite"/></circle>`;
}
function projectCard(repo, t) {
  return rect(0, 0, 284, 72, t.card, 12, t.accent).replace('/>', ' stroke-opacity="0.58"/>') +
    `<circle cx="22" cy="36" r="4" fill="${t.accent}"/>` +
    text(38, 41, fitText(repo.name, 182, 15, t.typography.strong), 15, t.text, 700) +
    text(268, 41, repo.pushedAt ? shortDate(repo.pushedAt.slice(0, 10)) : '', 12, t.muted, 400, 'text-anchor="end"');
}
export function renderIntro(p, t, snapshot) {
  const repos = snapshot.publicRepos ?? [];
  let body = rect(32, 28, 138, 28, t.surface, 14, t.border) + statusDot(50, 42, t);
  body += text(62, 47, p.availability.toUpperCase(), 11, t.signal, 700, 'letter-spacing="1.2"');
  body += text(32, 114, fitText(p.name, 520, 44, t.typography.display, -1.5), 44, t.text, 700, 'letter-spacing="-1.5"');
  const initials = p.name.trim().split(/\s+/).map(v => v[0]).filter((_, i, all) => i === 0 || i === all.length - 1).join('').toLowerCase();
  body += text(557, 47, `${initials}.`, 19, t.secondary, 700, 'text-anchor="end" data-kind="display"');
  body += rect(32, 129, 236, 3, 'url(#accent-rule)', 1.5);
  body += text(32, 164, fit(p.role.toUpperCase(), 62), 13, t.muted, 700, 'letter-spacing="0.6"');
  body += text(32, 192, '>', 15, t.accent, 400, `font-family="${mono}"`);
  body += text(50, 192, fit(p.headline, 57), 16, t.text);
  body += text(32, 216, p.presentation.contactLabel, 13, t.muted);
  body += rect(32, 234, 528, 42, t.surface, 10, t.border);
  const prompt = `~/github/${p.login}`;
  const promptWidth = measureText(prompt, 12, t.typography.mono);
  const command = fitText(`$ ${p.presentation.terminal}`, 484 - promptWidth, 12, t.typography.mono);
  body += text(48, 260, prompt, 12, t.accent, 400, `font-family="${mono}"`);
  body += text(60 + promptWidth, 260, command, 12, t.text, 400, `font-family="${mono}"`);
  body += `<g class="moving">${rect(66 + promptWidth + measureText(command, 12, t.typography.mono), 248, 3, 14, t.accent)}<animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"/></g>`;
  const panelStart = body.length;
  body += rect(588, 24, 340, 260, t.surface, 14, t.border) + rect(610, 68, 296, 1, t.border);
  body += text(610, 52, p.presentation.projectsLabel, 11, t.muted, 700, 'letter-spacing="1.3"');
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
  return shell(308, p.name, desc, t, body, mobileIntro(p, t, body.slice(panelStart)));
}
export function renderStack(p, t) {
  const rows = p.stack.groups.map((group, i) => group.items.flatMap((item, j) => measuredLines(item, 185, 14, (i === 1 || i === 2) && j === 0 ? t.typography.strong : t.typography.body)));
  const extraHeight = Math.max(0, ...rows.map(lines => lines.length - 3)) * 22;
  let body = rect(24, 22, 92, 4, t.accent, 2);
  body += text(24, 50, p.stack.title.toUpperCase(), 18, t.text, 700, 'letter-spacing="0.8"');
  body += text(24, 70, p.presentation.stackSubtitle, 13, t.muted);
  body += text(936, 50, p.presentation.stackKicker, 11, t.muted, 700, 'text-anchor="end" letter-spacing="0.8"');
  for (const [i, group] of p.stack.groups.entries()) {
    const x = 24 + i * 231.5, accent = t.groupAccents[i];
    body += rect(x, 92, 217.5, 120 + extraHeight, t.surface, 14, accent).replace('/>', ' stroke-opacity="0.48"/>');
    body += text(x + 200, 119, `0${i + 1}`, 10, t.muted, 400, 'text-anchor="end"');
    body += `<circle cx="${x + 22}" cy="116" r="4" fill="${accent}"/>`;
    body += text(x + 34, 120, fitText(group.title.toUpperCase(), 140, 11, t.typography.mono, 0.7), 11, accent, 700, 'letter-spacing="0.7"');
    const items = rows[i];
    items.forEach((v, j) => { body += text(x + 16, 150 + j * 22, v, 14, t.text, (i === 1 || i === 2) && j === 0 ? 700 : 400); });
  }
  return shell(236 + extraHeight, 'Ecossistema', `${p.stack.note} ${p.stack.groups.map(g => `${g.title}: ${g.items.join(', ')}`).join('. ')}`, t, body, mobileStack(p, t));
}
export function renderActivity(p, snapshot, theme) {
  const t = { ...theme, flat: true, typography: { ...theme.typography, display: theme.typography.strong, mono: theme.typography.body } };
  const m = metrics(snapshot);
  let body = rect(28, 24, 92, 4, t.accent, 2);
  body += text(28, 52, p.activity.title.toUpperCase(), 18, t.text, 700, 'letter-spacing="0.8"');
  body += text(28, 72, 'contribuições diárias · 365 dias completos', 13, t.muted);
  body += statusDot(746, 40, t) + text(758, 44, 'ATUALIZADO DIARIAMENTE', 11, t.signal, 700, 'letter-spacing="0.8"');
  const values = [[number(m.total), 'TOTAL NO PERÍODO'], [number(m.active), 'DIAS ATIVOS'], [number(m.peak?.count ?? 0), m.peak ? `PICO · ${shortDate(m.peak.date)}` : 'SEM DIA DE PICO'], [number(snapshot.days.at(-1).count), `ÚLTIMO · ${shortDate(snapshot.to)}`]];
  [28, 250, 430, 650].forEach((x, i) => { body += text(x, 104, values[i][0], 26, t.text, 700) + text(x, 124, values[i][1], 10, t.muted, 600, 'letter-spacing="0.7"'); });
  body += dailyCalendar(snapshot, t, { x: 58, y: 172, step: 861 / 52, size: 13, firstWeek: 0, weekCount: 54, labelSize: 11, axisX: 24 });
  body += text(28, 307, `${formatDate(snapshot.from)}–${formatDate(snapshot.to)} · consulta ${formatDate(snapshot.queriedOn)} UTC`, 11, t.muted);
  body += text(792, 307, 'Menos', 11, t.muted);
  t.heat.forEach((c, i) => { body += rect(828 + i * 16, 297, 11, 11, c, 2); });
  body += text(916, 307, 'Mais', 11, t.muted);
  return shell(327, 'Atividade no GitHub', `${m.total} contribuições em ${m.active} dias ativos. ${m.peak ? `Pico de ${m.peak.count} em ${formatDate(m.peak.date)}.` : 'Sem dia de pico.'} ${snapshot.from} a ${snapshot.to}; consulta bem-sucedida ${snapshot.queriedOn}. ${p.activity.note}`, t, body, mobileActivity(p, snapshot, t));
}
export function renderAssets(p, snapshot) {
  const files = {};
  for (const mobile of [false, true]) {
    const t = { ...p.themes.dark, typography: p.typography, mobile };
    const directory = mobile ? 'assets/mobile' : 'assets';
    files[`${directory}/profile-header.svg`] = renderIntro(p, t, snapshot);
    files[`${directory}/contributions.svg`] = renderActivity(p, snapshot, t);
    files[`${directory}/tech-ecosystem.svg`] = renderStack(p, t);
  }
  return files;
}
function measuredLines(value, width, size, face, spacing = 0) {
  const result = [];
  let line = '';
  for (const word of value.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && measureText(candidate, size, face, spacing) > width) { result.push(line); line = ''; }
    if (measureText(word, size, face, spacing) > width) {
      if (line) { result.push(line); line = ''; }
      result.push(fitText(word, width, size, face, spacing));
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) result.push(line);
  return result;
}
function mobileIntro(p, t, panel) {
  let content = rect(24, 27, 173, 30, t.surface, 15, t.border) + statusDot(41, 42, t);
  content += text(54, 47, p.availability.toUpperCase(), 12, t.signal, 600, 'letter-spacing="1"');
  content += text(24, 109, fitText(p.name, 352, 34, t.typography.display, -1), 34, t.text, 700, 'letter-spacing="-1"');
  content += rect(24, 126, 221, 3, 'url(#accent-rule)', 1.5);
  let y = 157;
  for (const line of measuredLines(p.role, 352, 15, t.typography.strong)) { content += text(24, y, line, 15, t.muted, 700); y += 22; }
  y += 6;
  const headlineY = y;
  for (const line of measuredLines(p.headline, 334, 17, t.typography.body)) { content += text(42, y, line, 17, t.text); y += 24; }
  content += text(24, headlineY, '>', 16, t.accent, 400, `font-family="${mono}"`);
  y += 10;
  for (const line of measuredLines(p.education, 352, 16, t.typography.body)) { content += text(24, y, line, 16, t.muted); y += 23; }
  content += text(24, y + 3, p.location, 16, t.muted);
  y += 23;
  content += rect(24, y, 352, 64, t.surface, 10, t.border);
  content += text(38, y + 24, fitText(`~/${p.login}`, 324, 14, t.typography.mono), 14, t.accent, 400, `font-family="${mono}"`);
  content += text(38, y + 47, fitText(`$ ${p.presentation.terminal}`, 324, 14, t.typography.mono), 14, t.text, 400, `font-family="${mono}"`);
  y += 86;
  // Reuse the same carousel composition with an inset suited to the mobile panel.
  const mobilePanel = panel.replaceAll('id="fade"', 'id="mobile-fade"').replaceAll('id="fade-mask"', 'id="mobile-fade-mask"').replaceAll('url(#fade)', 'url(#mobile-fade)').replaceAll('url(#fade-mask)', 'url(#mobile-fade-mask)');
  content += `<g transform="translate(-558 ${y - 24})">${mobilePanel}</g>`;
  return { height: y + 284, content };
}
function mobileStack(p, t) {
  let content = rect(24, 23, 85, 3, t.accent, 1.5) + text(24, 58, p.stack.title.toUpperCase(), 22, t.text, 700);
  let y = 86;
  for (const line of measuredLines(p.presentation.stackSubtitle, 352, 16, t.typography.body)) { content += text(24, y, line, 16, t.muted); y += 22; }
  y += 12;
  for (let row = 0; row < 2; row++) {
    const groups = p.stack.groups.slice(row * 2, row * 2 + 2);
    const layouts = groups.map(group => ({ title: measuredLines(group.title.toUpperCase(), 134, 11, t.typography.mono), items: group.items.map(item => measuredLines(item, 146, 17, t.typography.body)) }));
    const height = Math.max(...layouts.map(v => 62 + Math.max(0, v.title.length - 1) * 16 + v.items.reduce((sum, lines) => sum + lines.length * 24 + 5, 0)));
    groups.forEach((group, col) => {
      const index = row * 2 + col, color = t.groupAccents[index], x = 18 + col * 188, layout = layouts[col];
      content += rect(x, y, 176, height, t.surface, 13, color).replace('/>', ' stroke-opacity="0.48"/>');
      content += `<circle cx="${x + 14}" cy="${y + 23}" r="3.5" fill="${color}"/>`;
      layout.title.forEach((line, i) => { content += text(x + 25, y + 27 + i * 16, line, 11, color, 700); });
      let itemY = y + 60 + Math.max(0, layout.title.length - 1) * 16;
      layout.items.forEach((item, j) => {
        item.forEach(line => { content += text(x + 15, itemY, line, 17, t.text, (index === 1 || index === 2) && j === 0 ? 700 : 400); itemY += 24; });
        itemY += 5;
      });
    });
    y += height + 14;
  }
  return { height: y + 10, content };
}
function dailyCalendar(snapshot, t, { x, y, step, size, firstWeek, weekCount, labelSize, axisX }) {
  const offset = new Date(dateValue(snapshot.from)).getUTCDay(), peak = metrics(snapshot).peak?.count ?? 0;
  const seen = new Set();
  let body = '';
  snapshot.days.forEach((day, index) => {
    const week = Math.floor((index + offset) / 7), row = (index + offset) % 7;
    if (week < firstWeek || week >= firstWeek + weekCount) return;
    const column = week - firstWeek, month = day.date.slice(0, 7);
    if (!seen.has(month) && row === 0 && Number(day.date.slice(8)) <= 7) {
      seen.add(month);
      body += text(x + column * step, y - 16, monthNames[Number(day.date.slice(5, 7)) - 1], labelSize, t.muted);
    }
    const level = day.level ? ['NONE', 'FIRST_QUARTILE', 'SECOND_QUARTILE', 'THIRD_QUARTILE', 'FOURTH_QUARTILE'].indexOf(day.level) : day.count ? Math.max(1, Math.ceil(day.count / Math.max(1, peak) * 4)) : 0;
    body += `<g data-day="${day.date}" data-count="${day.count}"><title>${day.date}: ${day.count} contribuições</title>${rect(x + column * step, y + row * step, size, size, t.heat[level], 2)}</g>`;
  });
  [['Seg', 1], ['Qua', 3], ['Sex', 5]].forEach(([label, row]) => { body += text(axisX, y + 10 + row * step, label, labelSize, t.muted); });
  return body;
}
function mobileActivity(p, s, t) {
  const m = metrics(s);
  let content = rect(24, 23, 85, 3, t.accent, 1.5) + text(24, 58, p.activity.title.toUpperCase(), 22, t.text, 700);
  content += text(24, 84, 'Contribuições diárias · 365 dias completos', 15, t.muted);
  const values = [[number(m.total), 'Total no período'], [number(m.active), 'Dias ativos'], [number(m.peak?.count ?? 0), m.peak ? `Pico · ${shortDate(m.peak.date)}` : 'Sem dia de pico'], [number(s.days.at(-1).count), `Último · ${shortDate(s.to)}`]];
  values.forEach(([value, label], i) => {
    const x = 24 + i % 2 * 184, y = 133 + Math.floor(i / 2) * 72;
    content += text(x, y, value, 29, t.text, 700);
    content += text(x, y + 24, label, 14, t.muted);
  });
  const options = { x: 52, step: 12, size: 9, weekCount: 27, labelSize: 12, axisX: 24 };
  content += dailyCalendar(s, t, { ...options, y: 270, firstWeek: 0 });
  content += dailyCalendar(s, t, { ...options, y: 394, firstWeek: 27 });
  content += text(24, 500, 'Menos', 13, t.muted);
  t.heat.forEach((color, i) => { content += rect(73 + i * 17, 489, 12, 12, color, 2); });
  content += text(164, 500, 'Mais', 13, t.muted);
  content += text(24, 536, `${formatDate(s.from)} a ${formatDate(s.to)}`, 15, t.muted);
  content += text(24, 562, `Consulta: ${formatDate(s.queriedOn)} UTC`, 15, t.muted);
  return { height: 586, content };
}
