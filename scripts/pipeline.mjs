import { readFile, mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { validateConfig } from './config.mjs';
import { publicSnapshot, validateSnapshot } from './calendar.mjs';
import { fetchCalendar } from './github.mjs';
import { renderAssets } from './render.mjs';
import { renderReadme, updateReadme } from './readme.mjs';

export const root = path.resolve(import.meta.dirname, '..');
export async function readInputs(directory) {
  const config = validateConfig(JSON.parse(await readFile(path.join(directory, 'profile.json'), 'utf8')));
  const readme = await readFile(path.join(directory, 'README.md'), 'utf8');
  return { config, readme };
}
export function build(config, snapshot, readme) {
  validateSnapshot(snapshot, config.login);
  const assets = renderAssets(config, snapshot);
  return { ...assets, 'README.md': updateReadme(readme, renderReadme(config, snapshot, assets)) };
}
export async function writeOutputs(directory, outputs, { check = false } = {}) {
  const changed = [];
  // Render and compare everything before beginning any writes.
  for (const [file, content] of Object.entries(outputs)) {
    let current;
    try { current = await readFile(path.join(directory, file), 'utf8'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    if (current !== content) changed.push(file);
  }
  if (check && changed.length) throw new Error(`Generated files are stale: ${changed.join(', ')}`);
  if (!check) {
    for (const file of changed) {
      const target = path.join(directory, file);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(`${target}.tmp`, outputs[file]);
      await rename(`${target}.tmp`, target);
    }
  }
  return changed;
}
export async function generate({ directory = root, check = false } = {}) {
  const { config, readme } = await readInputs(directory);
  const snapshot = JSON.parse(await readFile(path.join(directory, 'data/contributions.json'), 'utf8'));
  return writeOutputs(directory, build(config, snapshot, readme), { check });
}
export async function update({ directory = root, token = process.env.GITHUB_TOKEN, now = new Date(), fetchImpl, sleep } = {}) {
  const { config, readme } = await readInputs(directory);
  // The date identifies a successful API observation, never an offline generation.
  const snapshot = await fetchCalendar({ login: config.login, token, queriedOn: now.toISOString().slice(0, 10), fetchImpl, sleep });
  const outputs = build(config, snapshot, readme);
  outputs['data/contributions.json'] = `${JSON.stringify(publicSnapshot(snapshot), null, 2)}\n`;
  return writeOutputs(directory, outputs);
}
