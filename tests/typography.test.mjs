import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { measureText, fitText, outlineTypography } from '../scripts/typography.mjs';
const fonts = { display: 'display', body: 'body', strong: 'strong', mono: 'mono' };

test('real font advances fit a long repository label without hiding its date', () => {
  const value = 'very-long-public-repository-name-for-an-integration';
  const fitted = fitText(value, 182, 15, 'strong');
  assert(fitted.endsWith('…'));
  assert(measureText(fitted, 15, 'strong') <= 182);
  assert.equal(fitText('Newgram', 182, 15, 'strong'), 'Newgram');
});
test('Brazilian accents and typography outlines are offline, deterministic and carry licenses', () => {
  const input = '<svg><defs></defs><text x="32" y="100" font-size="44" font-weight="700" fill="#ffffff">João · integração</text></svg>';
  const svg = outlineTypography(input, fonts);
  assert.equal(svg, outlineTypography(input, fonts));
  assert(svg.includes('data-text="João · integração"'));
  assert(svg.includes('data-font="display"'));
  assert(svg.includes('SIL OPEN FONT LICENSE'));
  assert(!svg.includes('<text'));
  assert(!svg.includes('@font-face'));
  assert(!/href="(?!#)/.test(svg));
});
test('each face has distinct measured metrics; unsupported glyphs fail clearly', () => {
  assert.notEqual(measureText('Jameson Henrique', 44, 'display'), measureText('Jameson Henrique', 44, 'body'));
  assert.equal(measureText('iiii', 12, 'mono'), measureText('WWWW', 12, 'mono'));
  assert.throws(() => measureText('🙂', 14), /Unsupported character/);
  assert.throws(() => measureText('text', 14, 'unknown'), /Unknown font/);
});
test('atlas corresponds to pinned sources and every font notice is preserved', async () => {
  const sources = JSON.parse(await readFile(new URL('../fonts/sources.json', import.meta.url), 'utf8'));
  const atlas = JSON.parse(await readFile(new URL('../fonts/atlas.json', import.meta.url), 'utf8'));
  assert.equal(sources.revision, atlas.revision);
  for (const font of sources.fonts) {
    assert(/^[a-f0-9]{64}$/.test(font.sha256));
    const license = await readFile(new URL(`../fonts/${font.license}`, import.meta.url), 'utf8');
    assert(license.includes('SIL OPEN FONT LICENSE'));
  }
});
