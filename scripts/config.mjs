import assert from 'node:assert/strict';

function text(value, name, max = 160) {
  assert.equal(typeof value, 'string', `${name}: expected text`);
  assert(value.trim() && value.length <= max && !/[\x00-\x1f\x7f]/.test(value), `${name}: invalid length/control character`);
}
function url(value) {
  text(value, 'url', 240);
  const parsed = new URL(value);
  assert(parsed.protocol === 'https:' && !parsed.username && !parsed.password && !/[<>"'\s]/.test(value), 'Expected a safe HTTPS URL');
}
export function validateConfig(p) {
  assert(p && typeof p === 'object', 'Expected profile object');
  assert(/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(p.login), 'Invalid GitHub login');
  for (const key of ['name', 'location', 'role', 'headline', 'summary', 'education', 'availability']) text(p[key], key, key === 'summary' ? 350 : 160);
  text(p.role, 'role', 58); text(p.availability, 'availability', 32);
  assert(Array.isArray(p.focus) && p.focus.length === 3, 'Expected three focus labels');
  p.focus.forEach(v => text(v, 'focus', 35));
  assert(Array.isArray(p.links) && p.links.length > 0 && p.links.length <= 5, 'Invalid links');
  p.links.forEach(l => { text(l.label, 'link label', 50); url(l.url); });
  text(p.stack.title, 'stack title', 80);
  text(p.stack.note, 'stack note', 160);
  assert.equal(p.stack.groups.length, 4, 'Expected four stack groups');
  p.stack.groups.forEach(g => {
    text(g.title, 'group title', 30); text(g.note, 'group note', 40);
    assert(Array.isArray(g.items) && g.items.length > 0 && g.items.length <= 4, 'Expected 1–4 stack items');
    g.items.forEach(v => text(v, 'stack item', 32));
  });
  assert(Array.isArray(p.projects) && p.projects.length > 0 && p.projects.length <= 4, 'Expected 1–4 projects');
  p.projects.forEach(v => {
    text(v.name, 'project name', 60); text(v.description, 'project description', 240); url(v.url);
    assert(Array.isArray(v.technologies) && v.technologies.length > 0 && v.technologies.length <= 8, 'Invalid project technologies');
    v.technologies.forEach(t => text(t, 'technology', 40));
    if (v.demo) { url(v.demo); text(v.demoLabel, 'demo label', 40); }
  });
  assert.equal(p.activity.days, 365, 'Only the 365 complete UTC date window is supported');
  text(p.activity.title, 'activity title', 80); text(p.activity.note, 'activity note', 160);
  assert(Number.isInteger(p.presentation.mobileBreakpoint) && p.presentation.mobileBreakpoint >= 480 && p.presentation.mobileBreakpoint <= 768, 'Invalid breakpoint');
  for (const key of ['terminal', 'projectsLabel', 'stackSubtitle', 'contactLabel', 'stackKicker']) text(p.presentation[key], key, key === 'stackSubtitle' ? 50 : 40);
  for (const mode of ['light', 'dark']) {
    const t = p.themes[mode];
    assert(t, `Missing ${mode} theme`);
    for (const key of ['background', 'surface', 'text', 'muted', 'accent', 'border', 'signal']) assert(/^#[\da-f]{6}$/i.test(t[key]), `Invalid ${mode}.${key}`);
    assert(t.groupAccents.length === 4 && t.groupAccents.every(c => /^#[\da-f]{6}$/i.test(c)), 'Expected four group colors');
    assert(t.heat.length === 5 && t.heat.every(c => /^#[\da-f]{6}$/i.test(c)), 'Expected five heat colors');
  }
  return p;
}
