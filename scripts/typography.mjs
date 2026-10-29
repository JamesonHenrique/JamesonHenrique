import { readFileSync } from 'node:fs';
const atlas = JSON.parse(readFileSync(new URL('../fonts/atlas.json', import.meta.url), 'utf8'));
const licenses = ['spacegrotesk', 'manrope', 'ibmplexmono'].map(name => readFileSync(new URL(`../fonts/${name}-OFL.txt`, import.meta.url), 'utf8')).join('\n\n');
const xml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
const decode = value => value.replace(/&(amp|lt|gt|quot|apos);/g, (_, key) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })[key]);
const round = n => Number(n.toFixed(3));
export function measureText(value, size, face = 'body', spacing = 0) {
  const font = atlas.faces[face];
  if (!font) throw new Error(`Unknown font face: ${face}`);
  let width = 0;
  for (const char of value) {
    const glyph = font.glyphs[char];
    if (!glyph) throw new Error(`Unsupported character U+${char.codePointAt(0).toString(16).toUpperCase()} in ${face}`);
    width += glyph.advance * size / font.units + spacing;
  }
  return round(Math.max(0, width - (value.length ? spacing : 0)));
}
export function fitText(value, maxWidth, size, face = 'body', spacing = 0) {
  if (measureText(value, size, face, spacing) <= maxWidth) return value;
  let result = value;
  while (result && measureText(`${result}…`, size, face, spacing) > maxWidth) result = result.slice(0, -1);
  if (!result) throw new Error('Text box is too narrow for its font');
  return `${result}…`;
}
export function outlineTypography(svg, config) {
  const used = new Map();
  const result = svg.replace(/<text\b([^>]*)>([^<]*)<\/text>/g, (_, raw, encoded) => {
    const attrs = Object.fromEntries([...raw.matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
    const value = decode(encoded), size = Number(attrs['font-size']);
    const kind = attrs['data-kind'] ?? (size >= 26 || size >= 18 && Number(attrs['font-weight']) >= 600 ? 'display' : size <= 12 || attrs['font-family']?.includes('monospace') ? 'mono' : Number(attrs['font-weight']) >= 600 ? 'strong' : 'body');
    const face = config[kind], font = atlas.faces[face];
    if (!font) throw new Error(`Unknown font face: ${face}`);
    const spacing = Number(attrs['letter-spacing'] ?? 0), width = measureText(value, size, face, spacing);
    const x = Number(attrs.x) - (attrs['text-anchor'] === 'end' ? width : attrs['text-anchor'] === 'middle' ? width / 2 : 0);
    let advance = 0, paths = '';
    for (const char of value) {
      const glyph = font.glyphs[char], id = `font-${face}-${char.codePointAt(0).toString(16)}`;
      if (glyph.path) {
        used.set(id, glyph.path);
        paths += `<use href="#${id}" x="${round(advance)}"/>`;
      }
      advance += glyph.advance + spacing * font.units / size;
    }
    return `<g data-text="${xml(value)}" data-font="${face}" aria-label="${xml(value)}" role="img" fill="${attrs.fill}" transform="translate(${round(x)} ${attrs.y}) scale(${Number((size / font.units).toFixed(7))} ${Number((-size / font.units).toFixed(7))})">${paths}</g>`;
  });
  if (/<text\b/.test(result)) throw new Error('All visible text must pass through the typography renderer');
  const defs = [...used].sort(([a], [b]) => a.localeCompare(b)).map(([id, d]) => `<path id="${id}" d="${d}"/>`).join('');
  const note = `Embedded outline subsets. Sources and copyright notices:\n${licenses}`;
  return result.replace('</defs>', `${defs}</defs><metadata>${xml(note)}</metadata>`);
}
