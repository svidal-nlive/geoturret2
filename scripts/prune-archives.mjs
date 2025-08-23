#!/usr/bin/env node
/**
 * Prune old perf & golden archive files, keeping the most recent N by timestamp in filename.
 * Directories:
 *   perf-baseline.archive/ perf-baseline.YYYY-MM-DD-HH-MM-SS.json
 *   golden/archives/ runRecordings.YYYY-MM-DD-HH-MM-SS.json
 *
 * Usage:
 *   node scripts/prune-archives.mjs --keep 5      # keep last 5 (default)
 *   npm run archives:prune -- --keep 8
 */
import fs from 'node:fs';
import path from 'node:path';

function parseArgs() {
  const args = process.argv.slice(2);
  let keep = 5;
  for (let i=0;i<args.length;i++) if (args[i]==='--keep') keep = Number(args[++i]||keep);
  if (!Number.isFinite(keep) || keep < 0) keep = 5;
  return { keep };
}

function prune(dir, prefix) {
  if (!fs.existsSync(dir)) return { dir, removed: 0, kept: 0 };
  const files = fs.readdirSync(dir).filter(f => f.startsWith(prefix)).sort();
  if (files.length <= opts.keep) return { dir, removed: 0, kept: files.length };
  const remove = files.slice(0, files.length - opts.keep);
  for (const f of remove) fs.unlinkSync(path.join(dir, f));
  return { dir, removed: remove.length, kept: files.length - remove.length };
}

const opts = parseArgs();
const results = [
  prune('perf-baseline.archive', 'perf-baseline.'),
  prune('golden/archives', 'runRecordings.')
];
for (const r of results) {
  console.log(`[prune-archives] ${r.dir} -> removed ${r.removed}, kept ${r.kept}`);
}
