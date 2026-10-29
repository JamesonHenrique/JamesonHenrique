import assert from 'node:assert/strict';
import { escapeXml, hash, formatDate } from './render.mjs';
import { metrics } from './calendar.mjs';
const begin = '<!-- profile:start -->';
const end = '<!-- profile:end -->';
export function renderReadme(p, s, assets) {
  const m = metrics(s);
  const version = file => `./${file}?v=${s.queriedOn}-${m.total}-${hash(assets[file])}`;
  const headerAlt = `${p.name}. ${p.role}. ${p.summary} ${p.education}. ${p.location}. ${p.availability}. LinkedIn: ${p.links[0].url}. Repositórios públicos: ${(s.publicRepos ?? []).map(r => r.name).join(', ')}.`;
  const activityAlt = `${m.total} contribuições; ${m.active} dias ativos; ${m.peak ? `pico de ${m.peak.count} em ${formatDate(m.peak.date)}` : 'sem dia de pico'}. Período: ${formatDate(s.from)} a ${formatDate(s.to)}. Última consulta: ${formatDate(s.queriedOn)} UTC. ${p.activity.note}`;
  const stackAlt = `${p.stack.title}. ${p.stack.groups.map(g => `${g.title}: ${g.items.join(', ')}`).join('. ')}. ${p.stack.note}`;
  return `<div align="center">

<a href="${escapeXml(p.links[0].url)}">
  <img src="${version('assets/profile-header.svg')}" alt="${escapeXml(headerAlt)}" width="100%" />
</a>

<br/>

<a href="https://github.com/${p.login}">
  <img src="${version('assets/contributions.svg')}" alt="${escapeXml(activityAlt)}" width="100%" />
</a>

<br/>

<img src="${version('assets/tech-ecosystem.svg')}" alt="${escapeXml(stackAlt)}" width="100%" />

</div>\n`;
}
export function updateReadme(existing, generated) {
  assert.equal(existing.split(begin).length, 2, 'README needs exactly one start marker');
  assert.equal(existing.split(end).length, 2, 'README needs exactly one end marker');
  const start = existing.indexOf(begin), finish = existing.indexOf(end);
  assert(start < finish, 'README markers are reversed');
  return `${existing.slice(0, start)}${begin}\n\n${generated.trim()}\n\n${existing.slice(finish)}`;
}
