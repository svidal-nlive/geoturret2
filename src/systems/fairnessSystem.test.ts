import { describe, it, expect } from 'vitest';
import { GameOrchestrator } from '../engine';
import { createGameState } from '../state/gameState';
import { createFairnessSystem } from './fairnessSystem';
import type { OrchestratorContext } from '../engine/orchestrator';

// Minimal boss stub to toggle safeLaneIndex
function createStubBoss(state: any) {
  return {
    id: 'bossStub', order: 70,
    init() {},
    update(dt: number, ctx: any) {
      // Alternate safe lane every frame
      const f = ctx.frame;
      state.safeLaneIndex = (f % 2 === 0) ? 0 : 1;
      return false;
    },
    teardown() {}
  };
}

describe('fairnessSystem', () => {
  it('tracks exposure count when lanes toggle', () => {
    const state = createGameState();
    state.safeLaneIndex = null;
    const orch = new GameOrchestrator({ seed: 'fair', fixedStep: 1/60, summarySource: () => ({ kills:0,wave:0,grazeCount:0,overdriveMeter:0,overdriveActive:false }) });
    orch.register(createStubBoss(state) as any);
    orch.register(createFairnessSystem(state));
    orch.init();
    for (let i=0;i<10;i++) orch.advance(1/60);
    expect(state.fairness.exposures).toBeGreaterThan(0);
    expect(state.fairness.cumulativeUnsafeTime).toBe(0); // never unsafe
  });
  it('accumulates unsafe time when lane absent', () => {
    const state = createGameState();
    // Boss that provides no safe lane
    const boss = { id:'bossNone', order:70, init(){}, update(){ state.safeLaneIndex = null; return false; }, teardown(){} };
    const orch = new GameOrchestrator({ seed: 'unsafe', fixedStep: 1/60, summarySource: () => ({ kills:0,wave:0,grazeCount:0,overdriveMeter:0,overdriveActive:false }) });
    orch.register(boss as any);
    orch.register(createFairnessSystem(state));
    orch.init();
    for (let i=0;i<30;i++) orch.advance(1/60);
    expect(state.fairness.cumulativeUnsafeTime).toBeGreaterThan(0);
  });
  it('records minSafeWidth placeholder when lane present', () => {
    const state = createGameState();
    // Boss constantly provides a safe lane
    const boss = { id:'bossSafe', order:70, init(){}, update(){ state.safeLaneIndex = 0; return false; }, teardown(){} };
    const orch = new GameOrchestrator({ seed: 'minwidth', fixedStep: 1/60, summarySource: () => ({ kills:0,wave:0,grazeCount:0,overdriveMeter:0,overdriveActive:false }) });
    orch.register(boss as any);
    orch.register(createFairnessSystem(state));
    orch.init();
    for (let i=0;i<5;i++) orch.advance(1/60);
    expect(state.fairness.minSafeWidth).toBeLessThanOrEqual(0.5);
    expect(state.fairness.minSafeWidth).not.toBe(Infinity);
  });
});
