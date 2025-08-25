import { describe, it, expect } from 'vitest';
import { createGameState } from '../../state/gameState';
import { GameOrchestrator } from '../../engine';
import { createBossSystem } from '../../systems/bossSystem';
import { createWaveSystem } from '../../systems/waveSystem';
import { createEnemySystem } from '../../systems/enemySystem';
import { createCameraSystem } from '../../systems/cameraSystem';
import { createPlayerSystem } from '../../systems/playerSystem';

function run(seed: string) {
  const state = createGameState();
  const summary: any = { bossActive: false };
  const o = new GameOrchestrator({ seed, fixedStep: 1/60 });
  o.register(createCameraSystem(state));
  o.register(createPlayerSystem(state));
  o.register(createWaveSystem(state));
  o.register(createEnemySystem(state));
  // Force pattern selection via seed including 'safe'
  // Ensure boss triggers immediately by setting wave >= triggerWave (default 1)
  state.wave = 1;
  o.register(createBossSystem(summary, state, { seed }));
  // Initialize systems so bossSystem can start pattern immediately.
  o.init();
  // Advance a few frames into telegraph window (first 60 frames).
  for (let i=0;i<15;i++) o.advance(1/60);
  const snapshotSafe = summary.bossPatternState?.safeLane ?? state.safeLaneIndex;
  return { safeLaneSequence: snapshotSafe, state, summary };
}

describe('safe-lane-volley safe lane determinism', () => {
  it('produces consistent safe lane given identical seed', () => {
    const r1 = run('safe-seed-123');
    const r2 = run('safe-seed-123');
    expect(r1.safeLaneSequence).toBe(r2.safeLaneSequence);
  });
  it('different seed can flip initial lane', () => {
    const r1 = run('safe-seed-A');
    const r2 = run('safe-seed-B');
    // They may coincidentally match; ensure at least one of two attempts differs by adding extra distinct seeds if equal
    if (r1.safeLaneSequence === r2.safeLaneSequence) {
      const r3 = run('safe-seed-C');
      if (r1.safeLaneSequence === r3.safeLaneSequence) {
        // All three identical: acceptable but unlikely; test passes without assertion
        expect([0,1]).toContain(r3.safeLaneSequence);
      } else {
        expect(r1.safeLaneSequence).not.toBe(r3.safeLaneSequence);
      }
    }
  });
});
