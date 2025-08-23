import { describe, it, expect } from 'vitest';
import { GameOrchestrator } from '../engine/orchestrator';
import { createGameState } from '../state/gameState';
import { createPlayerSystem } from '../systems/playerSystem';
import { createWaveSystem } from '../systems/waveSystem';
import { createEnemySystem } from '../systems/enemySystem';
import { createBulletSystem } from '../systems/bulletSystem';
import { createCollisionSystem } from '../systems/collisionSystem';
import '../content/initialContent';

function run(seconds: number, seed: string) {
  const state = createGameState();
  const o = new GameOrchestrator({ seed, fixedStep: 1/60, summarySource: () => ({ kills: state.kills, wave: state.wave, grazeCount: state.grazeCount, overdriveMeter: state.overdriveMeter, overdriveActive: state.overdriveActive }) });
  o.register(createPlayerSystem(state));
  o.register(createWaveSystem(state));
  o.register(createEnemySystem(state));
  o.register(createBulletSystem(state));
  o.register(createCollisionSystem(state));
  o.init();
  // mid snapshot at 1/3 and 2/3 for comparison
  const mid1At = seconds / 3;
  const mid2At = (seconds * 2) / 3;
  let mid1: any; let mid2: any;
  let t = 0;
  while (t < seconds) {
    const step = o.getStep();
    o.advance(step);
    t += step;
    if (!mid1 && t >= mid1At) mid1 = o.snapshot();
    if (!mid2 && t >= mid2At) mid2 = o.snapshot();
  }
  const finalSnap = o.snapshot();
  return { finalSnap, mid1, mid2, state };
}

describe('integration: deterministic multi-wave simulation', () => {
  it('produces identical mid and final snapshots for same seed', () => {
    const a = run(12, 'multi-wave-seed');
    const b = run(12, 'multi-wave-seed');
    expect(a.mid1.frame).toBe(b.mid1.frame);
    expect(a.mid1.rngState).toBe(b.mid1.rngState);
    expect(a.mid2.frame).toBe(b.mid2.frame);
    expect(a.mid2.rngState).toBe(b.mid2.rngState);
    expect(a.finalSnap.frame).toBe(b.finalSnap.frame);
    expect(a.finalSnap.summary.wave).toBe(b.finalSnap.summary.wave);
    expect(a.finalSnap.summary.kills).toBe(b.finalSnap.summary.kills);
    // Ensure some progression happened
    expect(a.finalSnap.summary.kills).toBeGreaterThan(0);
    expect(a.finalSnap.summary.wave).toBeGreaterThanOrEqual(1);
  });
});
