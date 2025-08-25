#!/usr/bin/env node
/**
 * boss-sim-check.mjs
 * Compares current boss simulation deterministic signature to committed baseline.
 * Fails CI if drift detected.
 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const BASELINE_PATH = 'boss-sim-baseline.json';

function loadBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) {
    console.error(`[boss-sim-check] Missing ${BASELINE_PATH}. Run: npm run boss:sim:record`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(BASELINE_PATH,'utf8'));
}

function runSim(seed) {
  const env = { ...process.env, BOSS_SIM_SEED: seed };
  try {
    const out = execFileSync('npx', ['tsx','scripts/sim-boss.ts'], { encoding: 'utf8', env });
    return JSON.parse(out.trim());
  } catch (e) {
    console.error('[boss-sim-check] Underlying sim failed to produce a successful lifecycle for seed', seed);
    throw e;
  }
}

function diffFields(base, cur, fields) {
  const diffs = [];
  for (const f of fields) {
    if (base[f] !== cur[f]) diffs.push({ field: f, baseline: base[f], current: cur[f] });
  }
  return diffs;
}

function main() {
  const baseline = loadBaseline();
  fs.mkdirSync('artifacts', { recursive: true });
  if ((baseline.version === 2 || baseline.version === 3) && Array.isArray(baseline.runs)) {
    const currentRuns = baseline.runs.map(r => runSim(r.seed));
    const runDiffs = [];
    const budgetViolations = [];
    for (let i=0;i<baseline.runs.length;i++) {
      const b = baseline.runs[i];
      const c = currentRuns[i];
      const fields = ['bossPattern','hash','startedFrame','endedFrame','wave','kills'];
      if (baseline.version >= 3) fields.push('durationFrames');
      const diffs = diffFields(b, c, fields);
      if (diffs.length) runDiffs.push({ seed: b.seed, diffs });
      if (baseline.version >= 3 && typeof b.maxEndedFrameBudget === 'number' && c.endedFrame > b.maxEndedFrameBudget) {
        budgetViolations.push({ seed: b.seed, endedFrame: c.endedFrame, budget: b.maxEndedFrameBudget });
      }
    }
    fs.writeFileSync('artifacts/boss-sim-current.json', JSON.stringify({ version:2, runs: currentRuns }, null, 2));
    // Always publish a summary artifact
    const summaryLines = ['# Boss Sim Run Summary','', '| Seed | Pattern | Started | Ended | Duration | Wave | Kills | Hash | Budget |', '| ---- | ------- | ------- | ----- | -------- | ---- | ----- | ---- | ------ |'];
    for (let i=0;i<baseline.runs.length;i++) {
      const b = baseline.runs[i];
      const c = currentRuns[i];
      const dur = (c.endedFrame != null && c.startedFrame != null) ? (c.endedFrame - c.startedFrame) : 'n/a';
      const budget = (baseline.version >=3 && typeof b.maxEndedFrameBudget === 'number') ? b.maxEndedFrameBudget : '';
      summaryLines.push(`| ${b.seed} | ${c.bossPattern} | ${c.startedFrame} | ${c.endedFrame} | ${dur} | ${c.wave} | ${c.kills} | ${c.hash} | ${budget} |`);
    }
    fs.writeFileSync('artifacts/boss-sim-summary.md', summaryLines.join('\n'));
    if (runDiffs.length || budgetViolations.length) {
      const lines = [];
      for (const rd of runDiffs) {
        lines.push(`## Seed ${rd.seed}`);
        for (const d of rd.diffs) lines.push(`- ${d.field}: baseline=${d.baseline} current=${d.current}`);
      }
      if (budgetViolations.length) {
        lines.push('');
        lines.push('## Budget Violations');
        for (const bv of budgetViolations) lines.push(`- ${bv.seed}: endedFrame=${bv.endedFrame} exceeds budget ${bv.budget}`);
      }
      const md = ['# Boss Sim Drift Detected (multi-run)','', ...lines, '', 'Update baseline intentionally if expected:', '```', 'npm run boss:sim:record -- --all', '```'].join('\n');
      fs.writeFileSync('artifacts/boss-sim-diff.md', md);
      if (process.env.BOSS_SIM_ALLOW_DRIFT === '1') {
        console.warn('[boss-sim-check] WARNING drift detected but allowed via BOSS_SIM_ALLOW_DRIFT=1');
      } else {
        console.error('[boss-sim-check] FAIL Boss simulation issues: diffs=', runDiffs.length, 'budgetViolations=', budgetViolations.length);
        process.exit(1);
      }
    }
    console.log('[boss-sim-check] PASS Boss multi-run baseline verified');
  } else {
    // Legacy single-run mode
    const current = runSim(baseline.seed);
    fs.writeFileSync('artifacts/boss-sim-current.json', JSON.stringify(current, null, 2));
    const critical = ['bossPattern','hash','startedFrame','endedFrame','wave','kills','durationFrames'];
    const diffs = diffFields(baseline, current, critical);
    if (diffs.length) {
      const summary = diffs.map(d=>`${d.field}: baseline=${d.baseline} current=${d.current}`).join('\n');
      const md = ['# Boss Sim Drift Detected','', 'Field | Baseline | Current', '----- | -------- | -------', ...diffs.map(d=>`${d.field} | ${d.baseline} | ${d.current}`), '', 'Hash drift indicates deterministic change. Update baseline intentionally if expected:','```','npm run boss:sim:record','```'].join('\n');
      fs.writeFileSync('artifacts/boss-sim-diff.md', md);
      console.error('[boss-sim-check] FAIL Boss simulation drift detected:\n' + summary);
      process.exit(1);
    }
    console.log('[boss-sim-check] PASS Boss simulation matches baseline hash', baseline.hash);
  }
}

main();
