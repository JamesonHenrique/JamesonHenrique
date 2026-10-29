import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validateConfig } from '../scripts/config.mjs';
import { dateValue, periodFor, normalizeCalendar, validateSnapshot, metrics, publicSnapshot } from '../scripts/calendar.mjs';
import { fetchCalendar } from '../scripts/github.mjs';
import { escapeXml, hash, renderAssets, wrap } from '../scripts/render.mjs';
import { renderReadme, updateReadme } from '../scripts/readme.mjs';
import { build, generate, update, root } from '../scripts/pipeline.mjs';

const fixture = JSON.parse(await readFile(new URL('./fixtures/calendar.json', import.meta.url), 'utf8'));
const profile = JSON.parse(await readFile(path.join(root, 'profile.json'), 'utf8'));
const context = { login: 'FixtureUser', queriedOn: '2024-03-02', ...periodFor('2024-03-02') };
const snapshot = () => normalizeCalendar(structuredClone(fixture), context);
const reply = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers });
const apiOptions = { login: 'FixtureUser', queriedOn: context.queriedOn, token: 'test-placeholder', sleep: async () => {} };
const manual = 'Manual before\n<!-- profile:start -->\nold\n<!-- profile:end -->\nManual after\n';

test('known calendar: total, active dates, earliest peak tie and monthly aggregation', () => {
  const s = snapshot(), m = metrics(s);
  assert.equal(m.total, 19); assert.equal(m.active, 3);
  assert.deepEqual(m.peak, { date: '2024-02-28', count: 8 });
  assert.deepEqual(m.months.at(-2), { month: '2024-02', total: 16 });
  assert.equal(m.months.reduce((s, v) => s + v.total, 0), 19);
});
test('empty calendar has no invented peak date', () => {
  const s = snapshot(); s.days.forEach(d => { d.count = 0; });
  assert.equal(metrics(s).total, 0); assert.equal(metrics(s).active, 0); assert.equal(metrics(s).peak, null);
});
test('365 complete dates include leap day and never include query day', () => {
  assert.deepEqual(periodFor('2024-03-02'), { from: '2023-03-03', to: '2024-03-01' });
  assert.deepEqual(periodFor('2025-03-01'), { from: '2024-03-01', to: '2025-02-28' });
  assert.deepEqual(periodFor('2026-01-01'), { from: '2025-01-01', to: '2025-12-31' });
  assert(snapshot().days.some(d => d.date === '2024-02-29'));
  assert.throws(() => dateValue('2023-02-29'));
  assert.throws(() => dateValue('2024-13-01'));
});
test('rejects null user, GraphQL errors, wrong bounds, totals and malformed weeks', () => {
  const mutations = [p => { p.data.user = null; }, p => { p.errors = [{ message: 'denied' }]; },
    p => { p.data.user.contributionsCollection.startedAt = '2024-01-01T00:00:00Z'; },
    p => { p.data.user.contributionsCollection.contributionCalendar.totalContributions++; },
    p => { p.data.user.contributionsCollection.contributionCalendar.weeks = null; },
    p => { p.data.user.contributionsCollection.contributionCalendar.weeks[0].contributionDays[0].contributionCount = -1; },
    p => { p.data.user.contributionsCollection.contributionCalendar.weeks[0].contributionDays.pop(); }];
  for (const mutate of mutations) { const p = structuredClone(fixture); mutate(p); assert.throws(() => normalizeCalendar(p, context)); }
});
test('snapshot rejects duplicate, missing, out-of-range, wrong-owner and fractional dates/counts', () => {
  for (const mutate of [s => s.days.pop(), s => { s.days[1].date = s.days[0].date; }, s => { s.days[0].date = '2020-01-01'; },
    s => { s.days[0].count = 1.5; }, s => { s.days[0].count = '3'; }, s => { s.source = 'fixture'; }, s => { s.login = 'SomeoneElse'; }]) {
    const s = snapshot(); mutate(s); assert.throws(() => validateSnapshot(s, context.login));
  }
});
test('public snapshot strips all unexpected fields and private activity details', () => {
  const s = snapshot(); s.privateRepositories = ['secret']; s.days[0].repository = 'secret';
  assert(!JSON.stringify(publicSnapshot(s)).includes('secret'));
});
test('API uses explicit bounds, native timeout and environment-only authorization', async () => {
  const s = await fetchCalendar({ ...apiOptions, fetchImpl: async (url, opts) => {
    assert.equal(url, 'https://api.github.com/graphql'); assert(opts.signal instanceof AbortSignal);
    const body = JSON.parse(opts.body);
    assert.equal(body.variables.from, '2023-03-03T00:00:00Z');
    assert.equal(body.variables.to, '2024-03-01T23:59:59Z');
    assert(!body.query.includes('repository')); return reply(fixture);
  } });
  assert.equal(metrics(s).total, 19);
});
test('API rejects missing token, unauthorized and HTTP 200 GraphQL permission errors without retries or secret logs', async () => {
  await assert.rejects(fetchCalendar({ ...apiOptions, token: '' }), /required/);
  for (const response of [reply({}, 401), reply({ errors: [{ type: 'FORBIDDEN', message: 'test-placeholder' }] })]) {
    let calls = 0;
    await assert.rejects(fetchCalendar({ ...apiOptions, fetchImpl: async () => { calls++; return response; } }), e => !e.message.includes('test-placeholder'));
    assert.equal(calls, 1);
  }
});
test('limited retry on 503/network/GraphQL transient errors recovers', async () => {
  for (const fail of [() => reply({}, 503), () => { throw new TypeError('network'); }, () => reply({ errors: [{ type: 'INTERNAL' }] })]) {
    let calls = 0;
    await fetchCalendar({ ...apiOptions, fetchImpl: async () => ++calls < 3 ? fail() : reply(fixture) });
    assert.equal(calls, 3);
  }
});
test('rate limits honor bounded Retry-After; long cooldown exits immediately', async () => {
  let calls = 0; const waits = [];
  await fetchCalendar({ ...apiOptions, sleep: async ms => waits.push(ms), fetchImpl: async () => ++calls === 1 ? reply({}, 429, { 'retry-after': '2' }) : reply(fixture) });
  assert.deepEqual(waits, [2000]);
  calls = 0;
  await assert.rejects(fetchCalendar({ ...apiOptions, fetchImpl: async () => { calls++; return reply({}, 403, { 'retry-after': '60' }); } }), /rate limited/);
  assert.equal(calls, 1);
});
test('network/timeout and rate-limit retries stop after three attempts', async () => {
  for (const fail of [() => { throw new DOMException('timeout', 'TimeoutError'); }, () => reply({}, 429)]) {
    let calls = 0;
    await assert.rejects(fetchCalendar({ ...apiOptions, fetchImpl: async () => { calls++; return fail(); } }));
    assert.equal(calls, 3);
  }
});
test('invalid JSON and malformed successful response fail closed', async () => {
  await assert.rejects(fetchCalendar({ ...apiOptions, fetchImpl: async () => new Response('not json') }), /invalid JSON/);
  await assert.rejects(fetchCalendar({ ...apiOptions, fetchImpl: async () => reply({ data: {} }) }));
});
test('configuration validates themes, URLs, groups and content limits', () => {
  assert.equal(validateConfig(profile), profile);
  for (const mutate of [p => { p.links[0].url = 'javascript:alert(1)'; }, p => { p.themes.dark.accent = 'red"/>'; },
    p => { p.stack.groups.pop(); }, p => { p.name = ''; }, p => { p.activity.days = 366; }, p => { p.presentation.mobileBreakpoint = 100; },
    p => { p.name = 'x'.repeat(161); }, p => { p.stack.groups[0].items = []; }]) {
    const p = structuredClone(profile); mutate(p); assert.throws(() => validateConfig(p));
  }
});
test('SVG escapes text/attributes, wraps long tokens and has no executable/external content', () => {
  assert.equal(escapeXml('<&>"\''), '&lt;&amp;&gt;&quot;&apos;');
  assert.deepEqual(wrap('abcdefghij', 4), ['abcd', 'efgh', 'ij']);
  const p = structuredClone(profile); p.name = '<script>&"\'';
  const assets = renderAssets(p, snapshot());
  assert.equal(Object.keys(assets).length, 6);
  for (const svg of Object.values(assets)) {
    assert(svg.includes('<title id="title">')); assert(svg.includes('<desc id="desc">')); assert(svg.includes('viewBox='));
    assert(!/<script|foreignObject|\bonload=|(?:href|src)="(?!#)/.test(svg));
    const idList = [...svg.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    const ids = new Set(idList);
    assert.equal(ids.size, idList.length, 'Desktop and mobile views must not duplicate IDs');
    assert(/^<svg[^>]+viewBox=/.test(svg));
    for (const match of svg.matchAll(/href="#([^"]+)"/g)) assert(ids.has(match[1]), 'Vector glyph reference must be local and defined');
  }
  assert(assets['assets/profile-header.svg'].includes('&lt;script&gt;&amp;&quot;&apos;'));
});
test('README update preserves manual regions, requires unique ordered markers and is idempotent', () => {
  const updated = updateReadme(manual, 'new');
  assert(updated.startsWith('Manual before\n')); assert(updated.endsWith('\nManual after\n'));
  assert.equal(updateReadme(updated, 'new'), updated);
  for (const content of ['', '<!-- profile:end --><!-- profile:start -->', manual + '<!-- profile:start -->']) assert.throws(() => updateReadme(content, 'x'));
});
test('content hash is stable; only modified modules change their cache versions', () => {
  const s = snapshot(), p = structuredClone(profile);
  const a = renderAssets(p, s), r = renderReadme(p, s, a);
  p.name = 'A different name';
  const b = renderAssets(p, s);
  for (const file of Object.keys(a)) assert.equal(hash(a[file]) === hash(b[file]), !file.includes('profile-header'));
  assert.equal(r, renderReadme(profile, s, renderAssets(profile, s)));
  assert(r.includes(`-${hash(a['assets/profile-header.svg'])}`));
  s.days[0].count++;
  const c = renderAssets(profile, s);
  for (const file of Object.keys(a)) assert.equal(hash(a[file]) === hash(c[file]), !file.includes('contributions'));
});
test('same config/data produce byte-identical SVGs and README', () => {
  assert.deepEqual(build(profile, { ...snapshot(), login: profile.login }, manual), build(structuredClone(profile), { ...snapshot(), login: profile.login }, manual));
});
async function sandbox(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'profile-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const p = { ...profile, login: 'FixtureUser' };
  await mkdir(path.join(directory, 'data'));
  await writeFile(path.join(directory, 'profile.json'), JSON.stringify(p));
  await writeFile(path.join(directory, 'README.md'), manual);
  await writeFile(path.join(directory, 'data/contributions.json'), JSON.stringify(snapshot()));
  return directory;
}
test('offline generation twice is a no-op; unrelated files are preserved', async t => {
  const directory = await sandbox(t);
  await writeFile(path.join(directory, 'unrelated.txt'), 'keep');
  assert.equal((await generate({ directory })).length, 7);
  assert.deepEqual(await generate({ directory }), []);
  assert.deepEqual(await generate({ directory, check: true }), []);
  assert.equal(await readFile(path.join(directory, 'unrelated.txt'), 'utf8'), 'keep');
});
test('failed fetch/validation leaves snapshot, README and all images byte-identical', async t => {
  const directory = await sandbox(t); await generate({ directory });
  const files = ['README.md', 'data/contributions.json', ...Object.keys(renderAssets(profile, snapshot()))];
  const before = await Promise.all(files.map(f => readFile(path.join(directory, f), 'utf8')));
  for (const response of [reply({}, 403), reply({ errors: [{ type: 'FORBIDDEN' }] }), reply({ data: {} })]) {
    await assert.rejects(update({ directory, token: 'test-placeholder', now: new Date('2024-03-02T12:00:00Z'), fetchImpl: async () => response }));
    assert.deepEqual(await Promise.all(files.map(f => readFile(path.join(directory, f), 'utf8'))), before);
  }
});
test('successful update strips extra fields and is byte-identical within a successful query date', async t => {
  const directory = await sandbox(t);
  const opts = { directory, token: 'test-placeholder', now: new Date('2024-03-02T12:00:00Z'), fetchImpl: async () => reply(fixture) };
  await update(opts);
  assert.deepEqual(await update({ ...opts, now: new Date('2024-03-02T19:00:00Z') }), []);
});
test('invalid README prevents a successful API result from overwriting snapshot', async t => {
  const directory = await sandbox(t);
  const before = await readFile(path.join(directory, 'data/contributions.json'), 'utf8');
  await writeFile(path.join(directory, 'README.md'), 'manual without markers');
  await assert.rejects(update({ directory, token: 'test-placeholder', now: new Date('2024-03-02'), fetchImpl: async () => reply(fixture) }));
  assert.equal(await readFile(path.join(directory, 'data/contributions.json'), 'utf8'), before);
});
test('README has exactly the three SVGs in reference order, with clickable header and activity', () => {
  const s = snapshot(), assets = renderAssets(profile, s), readme = renderReadme(profile, s, assets);
  assert(readme.startsWith('<div align="center">'));
  assert.equal((readme.match(/<img /g) ?? []).length, 3);
  assert(!/<details|###/.test(readme));
  assert.equal((readme.match(/<picture>/g) ?? []).length, 3);
  assert.equal((readme.match(/assets\/mobile\//g) ?? []).length, 3);
  assert(readme.indexOf('profile-header.svg') < readme.indexOf('contributions.svg'));
  assert(readme.indexOf('contributions.svg') < readme.indexOf('tech-ecosystem.svg'));
  assert(readme.includes(profile.links[0].url));
  assert(readme.includes(profile.summary));
  assert(readme.includes(profile.education));
});
test('public repository selection excludes private, forked, archived and profile repositories', () => {
  const p = structuredClone(fixture);
  p.data.user.repositories.nodes = [
    { name: 'public-project', pushedAt: '2024-03-01T12:00:00Z', isPrivate: false, isFork: false, isArchived: false },
    { name: 'private-project', pushedAt: '2024-03-01T12:00:00Z', isPrivate: true, isFork: false, isArchived: false },
    { name: 'fork-project', pushedAt: '2024-03-01T12:00:00Z', isPrivate: false, isFork: true, isArchived: false },
    { name: 'FixtureUser', pushedAt: '2024-03-01T12:00:00Z', isPrivate: false, isFork: false, isArchived: false }
  ];
  const s = normalizeCalendar(p, context);
  assert.deepEqual(s.publicRepos, [{ name: 'public-project', pushedAt: '2024-03-01T12:00:00Z' }]);
  assert(!JSON.stringify(publicSnapshot(s)).includes('private-project'));
});
test('header carousel has local animation, fade mask and reduced-motion fallback', () => {
  const s = snapshot();
  s.publicRepos = ['one', 'two', 'three', 'four', 'five'].map(name => ({ name, pushedAt: '2024-03-01T12:00:00Z' }));
  const svg = renderAssets(profile, s)['assets/profile-header.svg'];
  assert.equal((svg.match(/<animateTransform /g) ?? []).length, 5);
  assert(svg.includes('prefers-reduced-motion:reduce'));
  assert(svg.includes('mask="url(#fade-mask)"'));
  assert(svg.includes('dur="15s"'));
});
test('additional configured stack technologies remain visible and expand their panel', () => {
  const p = structuredClone(profile);
  p.stack.groups[0].items.push('Integrações REST');
  const assets = renderAssets(p, snapshot());
  assert(assets['assets/tech-ecosystem.svg'].includes('data-text="Integrações REST"'));
  assert(assets['assets/mobile/tech-ecosystem.svg'].includes('data-text="Integrações'));
  const height = Number(assets['assets/tech-ecosystem.svg'].match(/viewBox="0 0 960 (\d+)"/)[1]);
  assert(height > 236);
});
