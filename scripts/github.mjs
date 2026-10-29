import { setTimeout as delay } from 'node:timers/promises';
import { normalizeCalendar, periodFor } from './calendar.mjs';

export const query = `query ProfileCalendar($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    login
    contributionsCollection(from: $from, to: $to) {
      startedAt endedAt
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;
export async function fetchCalendar({ login, token, queriedOn, fetchImpl = fetch, sleep = delay, timeoutMs = 15000 }) {
  if (!token) throw new Error('GITHUB_TOKEN is required; no files were changed');
  const { from, to } = periodFor(queriedOn);
  for (let attempt = 0; attempt < 3; attempt++) {
    let response, payload;
    try {
      response = await fetchImpl('https://api.github.com/graphql', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'jameson-profile-generator' },
        body: JSON.stringify({ query, variables: { login, from: `${from}T00:00:00Z`, to: `${to}T23:59:59Z` } }),
        signal: AbortSignal.timeout(timeoutMs)
      });
    } catch {
      if (attempt < 2) { await sleep(1000 * 2 ** attempt); continue; }
      throw new Error('GitHub network request failed or timed out after 3 attempts');
    }
    const retryAfter = response.headers.get('retry-after');
    const retryMs = retryAfter === null ? 1000 * 2 ** attempt : Number(retryAfter) * 1000;
    const rateLimited = response.status === 429 || (response.status === 403 && (retryAfter !== null || response.headers.get('x-ratelimit-remaining') === '0'));
    if (!response.ok) {
      if ((rateLimited || [500, 502, 503, 504].includes(response.status)) && attempt < 2 && Number.isFinite(retryMs) && retryMs >= 0 && retryMs <= 10000) {
        await sleep(retryMs); continue;
      }
      throw new Error(`GitHub HTTP ${response.status}${rateLimited ? ' (rate limited; retry later)' : ''}`);
    }
    try { payload = await response.json(); } catch { throw new Error('GitHub returned invalid JSON'); }
    if (payload?.errors?.length) {
      const retryable = payload.errors.every(e => ['RATE_LIMITED', 'INTERNAL', 'SERVICE_UNAVAILABLE'].includes(e.type));
      if (retryable && attempt < 2) { await sleep(1000 * 2 ** attempt); continue; }
      throw new Error(`GitHub GraphQL errors${retryable ? ' (transient/rate limited)' : ' (check token permissions and query)'}`);
    }
    return normalizeCalendar(payload, { login, queriedOn, from, to });
  }
}
