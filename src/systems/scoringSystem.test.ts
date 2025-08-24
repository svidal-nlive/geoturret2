import { describe, it, expect } from 'vitest';
import { GameOrchestrator } from '../engine/orchestrator';
import { RNG } from '../engine';
import { createGameState } from '../state/gameState';
import { createPlayerSystem } from './playerSystem';
import { createWaveSystem } from './waveSystem';
import { createEnemySystem } from './enemySystem';
import { createBulletSystem } from './bulletSystem';
import { createCollisionSystem } from './collisionSystem';
import { createGrazeSystem } from './grazeSystem';
import { createOverdriveSystem } from './overdriveSystem';
import { createBossSystem, BossSystemSummary } from './bossSystem';
import { createScoringSystem, createScoreSummary } from './scoringSystem';
import '../content/initialContent';

function harness(seed='score-seed') {
  const state = createGameState();
  const summary: BossSystemSummary = { bossActive:false };
  const scoreSummary = createScoreSummary();
  const o = new GameOrchestrator({ seed: new RNG(seed), fixedStep:1/60, summarySource: () => ({
    kills: state.kills, wave: state.wave, grazeCount: state.grazeCount, overdriveMeter: state.overdriveMeter, overdriveActive: state.overdriveActive,
    bossActive: summary.bossActive, bossPattern: summary.bossPattern, bossStartedFrame: summary.bossStartedFrame, bossEndedFrame: summary.bossEndedFrame, bossPatternState: summary.bossPatternState
  }) });
  o.register(createPlayerSystem(state));
  o.register(createWaveSystem(state));
  o.register(createEnemySystem(state));
  o.register(createBulletSystem(state));
  o.register(createCollisionSystem(state));
  o.register(createGrazeSystem(state));
  o.register(createOverdriveSystem(state));
  o.register(createBossSystem(summary, state, { triggerWave:0, patternId: 'scripted-demo' }));
  o.register(createScoringSystem(state, scoreSummary));
  o.init();
  return { o, state, summary, scoreSummary };
}

describe('scoring system', () => {
  it('accumulates score from kills & grazes & boss damage', () => {
    const { o, state, scoreSummary } = harness();
    // initialize baseline (first frame sets _last* trackers)
    o.advance(1/60);
    // simulate some kills after baseline
    state.kills = 5; state.waveKills = 5;
    o.advance(1/60);
    expect(scoreSummary.score).toBeGreaterThan(0);
    const afterKills = scoreSummary.score;
    // simulate grazes
    state.grazeCount += 10; state.grazeThisWave += 10;
    o.advance(1/60);
    expect(scoreSummary.score).toBeGreaterThan(afterKills);
    // simulate boss damage events
    state.bossDamageLog.push({ frame: 100, amount: 200, source: 'playerBullet', hpAfter: 800 });
    o.advance(1/60);
    expect(scoreSummary.score).toBeGreaterThan(afterKills + 10); // plus some boss damage points
  });
  it('wavePressure tracks smoothed ratio', () => {
    const { o, state, scoreSummary } = harness();
    state.waveTarget = 20;
    state.waveKills = 10;
    o.advance(1/60);
    expect(scoreSummary.wavePressure).toBeCloseTo(0.5, 2);
    // let it decay
    state.waveKills = 5; // drop instantaneous to 0.25, smoothing should decay not jump
    o.advance(0.5); // many frames
    expect(scoreSummary.wavePressure).toBeLessThan(0.5);
    expect(scoreSummary.wavePressure).toBeGreaterThan(0.2);
  });
});
