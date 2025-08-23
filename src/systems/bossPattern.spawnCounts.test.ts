import { describe, it, expect } from 'vitest';
import { GameOrchestrator } from '../engine/orchestrator';
import { createGameState } from '../state/gameState';
import { createPlayerSystem } from './playerSystem';
import { createWaveSystem } from './waveSystem';
import { createEnemySystem } from './enemySystem';
import { createBulletSystem } from './bulletSystem';
import { createCollisionSystem } from './collisionSystem';
import { createGrazeSystem } from './grazeSystem';
import { createOverdriveSystem } from './overdriveSystem';
import { createBossSystem, BossSystemSummary } from './bossSystem';
import '../content/initialContent';

function runWithBoss(seed: string, duration: number) {
  const state = createGameState();
  const summary: BossSystemSummary = { bossActive: false };
  const o = new GameOrchestrator({ seed, fixedStep: 1/60, summarySource: () => ({
    kills: state.kills,
    wave: state.wave,
    grazeCount: state.grazeCount,
    overdriveMeter: state.overdriveMeter,
    overdriveActive: state.overdriveActive,
    bossActive: summary.bossActive,
    bossPattern: summary.bossPattern,
    bossStartedFrame: summary.bossStartedFrame,
    bossEndedFrame: summary.bossEndedFrame
  }) });
  o.register(createPlayerSystem(state));
  o.register(createWaveSystem(state));
  o.register(createEnemySystem(state));
  o.register(createBulletSystem(state));
  o.register(createCollisionSystem(state));
  o.register(createGrazeSystem(state));
  o.register(createOverdriveSystem(state));
  o.register(createBossSystem(summary, state, { triggerWave: 1, seed }));
  o.init();
  o.advance(duration);
  return { state, summary };
}

// Baseline run without boss system to compare kill deltas (avoids brittle absolute thresholds)
function runBaseline(seed: string, duration: number) {
  const state = createGameState();
  const o = new GameOrchestrator({ seed, fixedStep: 1/60, summarySource: () => ({
    kills: state.kills,
    wave: state.wave,
    grazeCount: state.grazeCount,
    overdriveMeter: state.overdriveMeter,
    overdriveActive: state.overdriveActive,
    bossActive: false,
    bossPattern: null,
    bossStartedFrame: null,
    bossEndedFrame: null
  }) });
  o.register(createPlayerSystem(state));
  o.register(createWaveSystem(state));
  o.register(createEnemySystem(state));
  o.register(createBulletSystem(state));
  o.register(createCollisionSystem(state));
  o.register(createGrazeSystem(state));
  o.register(createOverdriveSystem(state));
  o.init();
  o.advance(duration);
  return state;
}

describe('boss pattern spawn counts', () => {
  it('laser-cross does not inflate kill count vs baseline', () => {
    const duration = 6; // seconds
    const baseline = runBaseline('boss', duration).kills;
    const { state } = runWithBoss('boss', duration);
    const delta = state.kills - baseline;
    // laser-cross pattern intentionally has no spawns; allow tiny delta (<=1) due to wave timing differences
    expect(delta).toBeLessThanOrEqual(1);
  });
  it('safe-lane-volley increases kills vs baseline due to volley spawns', () => {
    const duration = 25; // seconds (pattern length 4s)
    const baseline = runBaseline('boss-safe-test', duration).kills;
    const { state, summary } = runWithBoss('boss-safe-test', duration);
    const durationFrames = (summary.bossEndedFrame! - summary.bossStartedFrame!);
    const delta = state.kills - baseline;
    expect(durationFrames).toBeGreaterThanOrEqual(240);
    // Expect at least several additional kills (pattern spawns 6 extra enemies)
    expect(delta).toBeGreaterThanOrEqual(3);
  });
  it('multi-beam-intersect increases kills vs baseline due to orbit spawns', () => {
    const duration = 30; // seconds (pattern length 5s)
    const baseline = runBaseline('boss-multi-test', duration).kills;
    const { state, summary } = runWithBoss('boss-multi-test', duration);
    const durationFrames = (summary.bossEndedFrame! - summary.bossStartedFrame!);
    const delta = state.kills - baseline;
    expect(durationFrames).toBeGreaterThanOrEqual(300);
    expect(delta).toBeGreaterThanOrEqual(3); // 6 spawns expected, allow some survivors
  });
  it('future-converge significantly increases kills vs baseline due to radial & pulse spawns', () => {
    const duration = 20; // seconds (pattern length 5.5s) allow cleanup
    const baseline = runBaseline('boss-future-test', duration).kills;
    const { state, summary } = runWithBoss('boss-future-test', duration);
    const durationFrames = (summary.bossEndedFrame! - summary.bossStartedFrame!);
    const delta = state.kills - baseline;
    expect(durationFrames).toBeGreaterThanOrEqual(330);
    // Spawns: Phase A: 4 waves *6 =24, Phase B: 4 waves *8=32, Pulse: 2*12=24 => 80 potential kills (some may survive)
    expect(delta).toBeGreaterThanOrEqual(20); // conservative lower bound
  });
});
