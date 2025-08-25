#!/usr/bin/env node
/**
 * P1-XC Exit Criteria Gate Script
 * Aggregates critical Phase 1 completion guards into a single pass/fail summary.
 * Checks (fast, headless):
 *  1. Core integration test (spawn/graze/overdrive/pooling) via vitest targeted run.
 *  2. Progression parity test (waves 1-15 signature) via vitest targeted run.
 *  3. Deterministic accelerated simulation hash & seed differentiation (sim-verify script).
 *  4. Boss multi-pattern deterministic baseline (boss-sim-check).
 *  5. Performance threshold test (perf.threshold).
 *  6. Bundle size regression guard (non-blocking note if fails separately in CI).
 *  7. Registry freshness / version map integrity (hash + freshness tests).
 * Produces: artifacts/p1-exit-summary.md with consolidated status.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';

const steps = [
  { id: 'core-p1-8', cmd: ['npx','vitest','run','src/systems/core.p1-8.test.ts'] },
  { id: 'progression-parity', cmd: ['npx','vitest','run','src/devtools/longSimulation.progression.test.ts'] },
  { id: 'sim-verify', cmd: ['npx','tsx','scripts/sim-verify.ts'] },
  { id: 'boss-det', cmd: ['node','scripts/boss-sim-check.mjs'] },
  { id: 'perf-threshold', cmd: ['npx','vitest','run','src/devtools/perf.threshold.test.ts'] },
  { id: 'registry-freshness', cmd: ['npx','vitest','run','src/content/registryFreshness.test.ts','src/content/registries.versionMap.test.ts'] },
];

const results = [];
for (const step of steps) {
  const started = Date.now();
  let status = 'PASS';
  let error = '';
  try {
    execFileSync(step.cmd[0], step.cmd.slice(1), { stdio: 'pipe', encoding: 'utf8' });
  } catch (e) {
    status = 'FAIL';
    error = (e.stdout || '') + '\n' + (e.stderr || '') + (e.message ? ('\n'+e.message) : '');
  }
  const durationMs = Date.now() - started;
  results.push({ id: step.id, status, ms: durationMs, error: status==='FAIL' ? error.trim().slice(0, 8000) : undefined });
  if (status === 'FAIL') {
    // Continue collecting other failures for full summary rather than early exit.
  }
}

// Optional: size regression (non-fatal to gate, but capture current result)
let sizeNote = '';
try {
  execFileSync('npm',['run','size:regression'], { stdio: 'pipe', encoding: 'utf8' });
  sizeNote = 'Size regression check: PASS';
} catch (e) {
  sizeNote = 'Size regression check: FAIL (see CI size job)';
}

const pass = results.every(r => r.status === 'PASS');
const lines = [
  '# P1-XC Exit Criteria Summary',
  '',
  '| Check | Status | Time (ms) |',
  '|-------|--------|-----------|',
  ...results.map(r => `| ${r.id} | ${r.status} | ${r.ms} |`),
  '',
  sizeNote,
  '',
];
for (const r of results.filter(r=>r.status==='FAIL')) {
  lines.push(`## Failure Detail: ${r.id}`); lines.push(''); lines.push('```'); lines.push(r.error || ''); lines.push('```','');
}
lines.push(pass ? 'Overall: PASS (Phase 1 exit criteria satisfied)' : 'Overall: FAIL (See failures above)');

fs.mkdirSync('artifacts', { recursive: true });
fs.writeFileSync('artifacts/p1-exit-summary.md', lines.join('\n'));

if (!pass) process.exit(1);
else console.log('[p1-exit] PASS all exit checks');