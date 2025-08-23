#!/usr/bin/env node
/**
 * Golden rotation / archival helper.
 * Archives current golden, then regenerates a new golden set using provided cases list.
 *
 * Usage:
 *   node scripts/golden-rotate.mjs --cases g1:6,g2:10,g3-parallax:6,g4-grazeOD:8 --message "feat: rotate golden seeds"
 *
 * Steps:
 *  1. Archive existing golden/runRecordings.json to golden/archives/runRecordings.<timestamp>.json
 *  2. Invoke golden-record with provided --cases (writes directly to golden/runRecordings.json)
 *  3. Run golden-diff against archived file (if present) for summary
 *  4. Print suggested commit snippet (using --message if supplied)
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function parseArgs() {
  const out = { cases: null, message: null, keepArchive: true };
  const args = process.argv.slice(2);
  for (let i=0;i<args.length;i++) {
    const a = args[i];
    if (a === '--cases') out.cases = args[++i];
    else if (a === '--message') out.message = args[++i];
    else if (a === '--no-archive') out.keepArchive = false; // debugging (not recommended)
  }
  return out;
}

function archiveGolden(file) {
  if (!fs.existsSync(file)) return null;
  const dir = path.resolve('golden/archives');
  fs.mkdirSync(dir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:T]/g,'-').replace(/\..+/, '');
  const target = path.join(dir, `runRecordings.${ts}.json`);
  fs.copyFileSync(file, target);
  return target;
}

function runCmd(cmd, args, opts={}) {
  console.log('[golden-rotate] Running:', cmd, args.join(' '));
  const res = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (res.status !== 0) process.exit(res.status || 1);
}

async function run() {
  const args = parseArgs();
  if (!args.cases) {
    console.error('Missing --cases list (e.g. g1:6,g2:10,...)');
    process.exit(1);
  }
  const goldenFile = path.resolve('golden/runRecordings.json');
  const archived = archiveGolden(goldenFile);
  if (archived) console.log('[golden-rotate] Archived previous golden ->', archived);
  else console.log('[golden-rotate] No existing golden to archive (fresh generation)');

  // Generate new golden directly into canonical file
  runCmd(process.execPath, ['scripts/golden-record.mjs', '--cases', args.cases, '--out', 'golden/runRecordings.json']);

  if (archived) {
    // Produce diff summary vs archived snapshot
    runCmd(process.execPath, ['scripts/golden-diff.mjs', '--actual', archived, '--golden', 'golden/runRecordings.json']);
  }

  console.log('\nSuggested commit message line:');
  const baseMsg = args.message || 'chore(golden): rotate golden seeds';
  console.log('  ' + baseMsg);
  console.log('\nReminder: update README if semantics of seeds changed.');
}

run().catch(e=>{ console.error(e); process.exit(1); });
