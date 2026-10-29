import { generate } from './pipeline.mjs';
try {
  if (process.argv.slice(2).some(v => v !== '--check')) throw new Error('Usage: node scripts/generate.mjs [--check]');
  const changed = await generate({ check: process.argv.includes('--check') });
  console.log(`${changed.length} generated file(s) changed`);
} catch (error) { console.error(`Generation failed: ${error.message}`); process.exitCode = 1; }
