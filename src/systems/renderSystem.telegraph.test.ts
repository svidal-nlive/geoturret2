import { describe, it, expect } from 'vitest';
import { createGameState } from '../state/gameState';
import { GameOrchestrator } from '../engine/orchestrator';
import { createBossSystem } from './bossSystem';
import { createRenderSystem } from './renderSystem';

function mockCanvasCaptureAlpha() {
  const calls: string[] = [];
  const alphas: number[] = [];
  let _alpha = 1;
  const ctx: any = {
    fillStyle: '#000', strokeStyle: '#000',
    save: () => calls.push('save'), restore: () => calls.push('restore'),
    translate: () => calls.push('translate'), scale: () => calls.push('scale'),
    fillRect: () => calls.push('fillRect'), beginPath: () => calls.push('beginPath'), arc: () => calls.push('arc'), stroke: () => calls.push('stroke'),
    fill: () => calls.push('fill')
  };
  Object.defineProperty(ctx, 'globalAlpha', {
    get() { return _alpha; },
    set(v: number) { _alpha = v; alphas.push(v); }
  });
  const canvas: any = { width: 1600, height: 1200, getContext: () => ctx };
  return { canvas, calls, alphas };
}

describe('renderSystem telegraph alpha', () => {
  it('applies 0.35 alpha only during telegraph (before 0.15) and duration matches pattern state', () => {
    const { canvas, alphas } = mockCanvasCaptureAlpha();
    (global as any).document = { getElementById: (id: string) => id === 'game' ? canvas : null };
    (global as any).window = { devicePixelRatio: 1 } as any;
    (global as any).devicePixelRatio = 1;
    const state = createGameState();
    state.wave = 1; // trigger boss immediately
    const summary: any = { bossActive: false };
    const o = new GameOrchestrator({ seed: 'safe-alpha-seed', fixedStep: 1/60 });
    o.register(createBossSystem(summary, state, { seed: 'safe-alpha-seed' }));
    o.register(createRenderSystem(state));
    o.init();
    type Record = { simFrame: number; telegraph: boolean; alpha: number; remaining: number };
    const records: Record[] = [];
    for (let simFrame=0; simFrame<90; simFrame++) {
      o.advance(1/60);
      const st = summary.bossPatternState;
      if (st) {
        const alpha = alphas[alphas.length - 1];
        records.push({ simFrame, telegraph: !!st.telegraph, alpha, remaining: st.telegraphRemaining });
      }
    }
    const first35 = records.findIndex(r => Math.abs(r.alpha - 0.35) < 1e-6);
    const first15 = records.findIndex(r => Math.abs(r.alpha - 0.15) < 1e-6);
    expect(first35).toBeGreaterThanOrEqual(0);
    expect(first15).toBeGreaterThan(first35);
    // All telegraph frames should report alpha 0.35 and remaining decreasing to 0.
    const telegraphFrames = records.filter(r => r.telegraph);
    expect(telegraphFrames.length).toBeGreaterThan(0);
    for (const tf of telegraphFrames) expect(Math.abs(tf.alpha - 0.35)).toBeLessThan(1e-6);
    // Remaining strictly decreases until 0
    for (let i=1;i<telegraphFrames.length;i++) {
      expect(telegraphFrames[i].remaining).toBeLessThanOrEqual(telegraphFrames[i-1].remaining);
    }
  const lastTelegraph = telegraphFrames[telegraphFrames.length -1];
  // With current pattern logic remaining hits 1 on final telegraph frame (frame 59), then 0 once telegraph ends.
  expect(lastTelegraph.remaining).toBeGreaterThan(0);
  // Post-telegraph frames use 0.15 alpha only (no 0.35 after) and remaining becomes 0
    const postFrames = records.filter(r => !r.telegraph);
    expect(postFrames.length).toBeGreaterThan(0);
  expect(postFrames[0].remaining).toBe(0);
    for (const pf of postFrames) expect(Math.abs(pf.alpha - 0.15)).toBeLessThan(1e-6);
  });
});
