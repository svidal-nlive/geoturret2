#!/usr/bin/env node
/**
 * boss-sim-record.mjs
 * Generates (or regenerates) the boss simulation baseline by invoking the headless boss sim.
 * Supports single run (default) or multi-pattern run ( --all ).
 * Seeds intentionally include substrings used by derivePatternId to exercise each boss pattern:
 *   default (laser-cross)
 *   safe (safe-lane-volley)
 *   multi (multi-beam-intersect)
 *   future (future-converge)
 *   spiral (spiral-barrage)
 *   script (scripted-demo)
 *   phase (phase-fork-demo)
 * Usage:
 *   npm run boss:sim:record              # single baseline (legacy format)
 *   npm run boss:sim:record -- --all     # multi-run baseline (preferred)
 *   npm run boss:sim:record -- --seed customSeed
 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

function runSim(seed) {
  const env = { ...process.env, BOSS_SIM_SEED: seed };
  const out = execFileSync('npx', ['tsx','scripts/sim-boss.ts'], { encoding: 'utf8', env });
  return JSON.parse(out.trim());
}

function main() {
  const args = process.argv.slice(2);
  let seed = process.env.BOSS_SIM_SEED || 'boss-sim-seed';
  let all = false;
  for (let i=0;i<args.length;i++) {
    if (args[i] === '--seed') seed = args[++i] || seed;
    else if (args[i] === '--all') all = true;
  }
  let baseline;
  if (all) {
    const seeds = [
      'boss-sim-seed',        // laser-cross (default)
      'boss-sim-safe',        // safe-lane-volley
      'boss-sim-multi',       // multi-beam-intersect
      'boss-sim-future',      // future-converge
      'boss-sim-spiral',      // spiral-barrage
      'boss-sim-script',      // scripted-demo
      'boss-sim-phase'        // phase-fork-demo
    ];
    const runs = seeds.map(s => runSim(s));
    baseline = { version: 3, runs: runs.map(r => ({
      seed: r.seed,
      bossPattern: r.bossPattern,
      startedFrame: r.startedFrame,
      endedFrame: r.endedFrame,
      durationFrames: r.durationFrames,
      wave: r.wave,
      kills: r.kills,
      hash: r.hash,
      // Conservative initial frame budget just above observed endedFrame; can be tuned
      maxEndedFrameBudget: r.endedFrame + 25
    })) };
  } else {
    const result = runSim(seed);
    baseline = {
      seed: result.seed,
      bossPattern: result.bossPattern,
      startedFrame: result.startedFrame,
      endedFrame: result.endedFrame,
      durationFrames: result.durationFrames,
      wave: result.wave,
      kills: result.kills,
      hash: result.hash
    };
  }
  fs.writeFileSync('boss-sim-baseline.json', JSON.stringify(baseline, null, 2));
  fs.mkdirSync('artifacts', { recursive: true });
  fs.writeFileSync('artifacts/boss-sim-baseline.json', JSON.stringify(baseline, null, 2));
  console.log('[boss-sim-record] Baseline written (schema ' + (baseline.version||1) + ') to boss-sim-baseline.json');
}

main();
