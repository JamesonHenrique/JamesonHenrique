import assert from 'node:assert/strict';
import { escapeXml, hash, formatDate } from './render.mjs';
import { metrics } from './calendar.mjs';

const begin = '<!-- profile:start -->';
const end = '<!-- profile:end -->';
const markdown = value => value.replace(/[\\`*_{}\[\]<>#|~]/g, '\\$&');
function picture(module, alt, assets, breakpoint) {
  const src = (mode, size) => {
    const file = `assets/${module}-${mode}-${size}.svg`;
    return `./${file}?v=${hash(assets[file])}`;
  };
  return `<picture>
  <source media="(max-width: ${breakpoint}px) and (prefers-color-scheme: dark)" srcset="${src('dark', 'mobile')}">
  <source media="(max-width: ${breakpoint}px)" srcset="${src('light', 'mobile')}">
  <source media="(prefers-color-scheme: dark)" srcset="${src('dark', 'desktop')}">
  <img src="${src('light', 'desktop')}" alt="${escapeXml(alt)}" width="100%">
</picture>`;
}
export function renderReadme(p, s, assets) {
  const m = metrics(s);
  return `# ${markdown(p.name)}

${picture('intro', `${p.role}. ${p.headline} ${p.availability}.`, assets, p.presentation.mobileBreakpoint)}

${markdown(p.summary)}

${markdown(p.location)} · ${markdown(p.education)}. **${markdown(p.availability)}.**

${p.links.map(l => `[${markdown(l.label)}](${l.url})`).join(' · ')}

${picture('stack', 'Stack organizada em IA e automação, frontend, backend e dados, cloud e sistemas. Lista em texto abaixo.', assets, p.presentation.mobileBreakpoint)}

<details>
<summary>Stack em texto</summary>

${p.stack.groups.map(g => `- **${markdown(g.title)}:** ${g.items.map(markdown).join('; ')}.`).join('\n')}

${markdown(p.stack.note)}

</details>

## Projetos selecionados

${p.projects.map(v => `### ${markdown(v.name)}

${markdown(v.description)}

${v.technologies.map(markdown).join(' · ')}

[Código](${v.url})${v.demo ? ` · [${markdown(v.demoLabel)}](${v.demo})` : ''}`).join('\n\n')}

${picture('activity', `Calendário real de ${formatDate(s.from)} a ${formatDate(s.to)}. Métricas em texto abaixo.`, assets, p.presentation.mobileBreakpoint)}

**${m.total.toLocaleString('pt-BR')} contribuições** em **${m.active} dias ativos**, de ${formatDate(s.from)} a ${formatDate(s.to)} (${s.days.length} dias completos). ${m.peak ? `Pico de ${m.peak.count} em ${formatDate(m.peak.date)}; em caso de empate, o primeiro dia do período.` : 'Nenhuma contribuição no período; sem dia de pico.'} Última consulta bem-sucedida: **${formatDate(s.queriedOn)} (UTC)**.

${markdown(p.activity.note)} Os números dependem da visibilidade e da autenticação da API.
`;
}
export function updateReadme(existing, generated) {
  assert.equal(existing.split(begin).length, 2, 'README needs exactly one start marker');
  assert.equal(existing.split(end).length, 2, 'README needs exactly one end marker');
  const start = existing.indexOf(begin), finish = existing.indexOf(end);
  assert(start < finish, 'README markers are reversed');
  return `${existing.slice(0, start)}${begin}\n\n${generated.trim()}\n\n${existing.slice(finish)}`;
}
