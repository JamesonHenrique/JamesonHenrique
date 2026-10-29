import { update } from './pipeline.mjs';
try {
  const changed = await update();
  console.log(`GitHub calendar validated; ${changed.length} file(s) changed`);
} catch (error) { console.error(`Update failed; previous snapshot and images preserved. ${error.message}`); process.exitCode = 1; }
