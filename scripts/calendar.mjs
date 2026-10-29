import assert from 'node:assert/strict';

const DAY = 86_400_000;
export function dateValue(date) {
  assert(typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date), 'Invalid calendar date');
  const value = Date.parse(`${date}T00:00:00Z`);
  assert(Number.isFinite(value) && new Date(value).toISOString().slice(0, 10) === date, 'Invalid calendar date');
  return value;
}
export const isoDate = value => new Date(value).toISOString().slice(0, 10);
export function periodFor(queriedOn, days = 365) {
  assert.equal(days, 365);
  const end = dateValue(queriedOn) - DAY;
  return { from: isoDate(end - (days - 1) * DAY), to: isoDate(end) };
}
export function normalizeCalendar(payload, { login, queriedOn, from, to }) {
  assert(!payload.errors?.length, 'GitHub returned GraphQL errors');
  assert.equal(payload.data?.user?.login?.toLowerCase(), login.toLowerCase(), 'Unexpected GitHub user');
  const collection = payload.data.user.contributionsCollection;
  assert.equal(collection?.startedAt, `${from}T00:00:00Z`, 'Unexpected API start');
  assert.equal(collection?.endedAt, `${to}T23:59:59Z`, 'Unexpected API end');
  const c = collection.contributionCalendar;
  assert(Array.isArray(c?.weeks) && c.weeks.length > 0 && c.weeks.length <= 54, 'Invalid calendar weeks');
  const days = c.weeks.flatMap(w => {
    assert(Array.isArray(w.contributionDays) && w.contributionDays.length > 0 && w.contributionDays.length <= 7, 'Invalid calendar week');
    return w.contributionDays.map(d => ({ date: d.date, count: d.contributionCount, ...(d.contributionLevel ? { level: d.contributionLevel } : {}) }));
  }).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const nodes = payload.data.user.repositories?.nodes ?? [];
  assert(Array.isArray(nodes) && nodes.length <= 30, 'Invalid public repositories');
  const publicRepos = nodes.filter(r => r && r.isPrivate === false && r.isFork === false && r.isArchived === false && r.name.toLowerCase() !== login.toLowerCase())
    .map(r => {
      assert(typeof r.name === 'string' && /^[a-zA-Z0-9._-]{1,100}$/.test(r.name), 'Invalid repository name');
      assert(typeof r.pushedAt === 'string' && Number.isFinite(Date.parse(r.pushedAt)), 'Invalid repository date');
      return { name: r.name, pushedAt: r.pushedAt };
    }).sort((a, b) => b.pushedAt.localeCompare(a.pushedAt) || a.name.localeCompare(b.name)).slice(0, 5);
  const snapshot = { version: 1, source: 'github-graphql', login, queriedOn, from, to, days, publicRepos };
  validateSnapshot(snapshot, login);
  assert(Number.isSafeInteger(c.totalContributions) && c.totalContributions === metrics(snapshot).total, 'Calendar total mismatch');
  return snapshot;
}
export function validateSnapshot(s, login) {
  assert(s?.version === 1 && s.source === 'github-graphql', 'Expected a successful GitHub snapshot');
  assert.equal(s.login, login, 'Snapshot belongs to another profile');
  const period = periodFor(s.queriedOn);
  assert.equal(s.from, period.from, 'Invalid snapshot start');
  assert.equal(s.to, period.to, 'Invalid snapshot end');
  assert(Array.isArray(s.days) && s.days.length === 365, 'Expected 365 complete calendar dates');
  s.days.forEach((d, i) => {
    assert.equal(dateValue(d.date), dateValue(s.from) + i * DAY, 'Missing, duplicate or out-of-range date');
    assert(Number.isSafeInteger(d.count) && d.count >= 0, 'Invalid contribution count');
    if (d.level !== undefined) assert(['NONE', 'FIRST_QUARTILE', 'SECOND_QUARTILE', 'THIRD_QUARTILE', 'FOURTH_QUARTILE'].includes(d.level), 'Invalid contribution level');
  });
  assert(Number.isSafeInteger(s.days.reduce((sum, d) => sum + d.count, 0)), 'Contribution total overflow');
  if (s.publicRepos !== undefined) {
    assert(Array.isArray(s.publicRepos) && s.publicRepos.length <= 5, 'Invalid public repository snapshot');
    s.publicRepos.forEach(r => {
      assert(typeof r.name === 'string' && /^[a-zA-Z0-9._-]{1,100}$/.test(r.name), 'Invalid repository name');
      assert(typeof r.pushedAt === 'string' && Number.isFinite(Date.parse(r.pushedAt)), 'Invalid repository date');
    });
  }
  return s;
}
export function metrics(snapshot) {
  const days = snapshot.days;
  const peak = days.reduce((best, d) => d.count > (best?.count ?? 0) ? d : best, null);
  const months = new Map();
  for (const d of days) months.set(d.date.slice(0, 7), (months.get(d.date.slice(0, 7)) ?? 0) + d.count);
  return { total: days.reduce((s, d) => s + d.count, 0), active: days.filter(d => d.count > 0).length, peak, months: [...months].map(([month, total]) => ({ month, total })) };
}
export function publicSnapshot(s) {
  return { version: s.version, source: s.source, login: s.login, queriedOn: s.queriedOn, from: s.from, to: s.to, days: s.days.map(({ date, count, level }) => ({ date, count, ...(level ? { level } : {}) })), publicRepos: (s.publicRepos ?? []).map(({ name, pushedAt }) => ({ name, pushedAt })) };
}
