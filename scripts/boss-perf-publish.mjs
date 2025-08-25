#!/usr/bin/env node
/**
 * Generates current boss perf attribution metrics and writes to artifacts/boss-perf-current.json
 * Non-failing; used for CI diagnostic publishing.
 */
import fs from 'fs';
import { spawnSync } from 'child_process';

function runAttrib(extraEnv={}) {
  const env = { ...process.env, ...extraEnv };
  const r = spawnSync('npx', ['--yes','tsx','scripts/boss-perf-attrib.ts'], {encoding:'utf8', env});
  if (r.status !== 0) {
    console.error('[boss-perf-publish] attrib script failed', r.stderr || r.stdout);
    process.exit(0); // non-failing
  }
  try { return JSON.parse(r.stdout.trim()); } catch(e){
    console.error('[boss-perf-publish] failed to parse JSON', r.stdout);
    return null;
  }
}

const result = runAttrib();
if (result) {
  fs.mkdirSync('artifacts', { recursive: true });
  fs.writeFileSync('artifacts/boss-perf-current.json', JSON.stringify(result,null,2)+'\n');
  console.log('[boss-perf-publish] wrote artifacts/boss-perf-current.json');
}
