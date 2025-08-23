import { describe, it, expect } from 'vitest';
import { createRenderSystem } from './renderSystem';
import { createGameState } from '../state/gameState';
import { GameOrchestrator } from '../engine/orchestrator';

function mockCanvas() {
  const calls: string[] = [];
  const ctx: any = {
    fillStyle: '#000', strokeStyle: '#000',
    save: () => calls.push('save'), restore: () => calls.push('restore'),
    translate: () => calls.push('translate'), scale: () => calls.push('scale'),
    fillRect: () => calls.push('fillRect'), beginPath: () => calls.push('beginPath'), arc: () => calls.push('arc'), stroke: () => calls.push('stroke')
  };
  const canvas: any = { width: 800, height: 600, getContext: () => ctx };
  return { canvas, ctx, calls };
}

function mockWindowWithCanvas(id='game') {
  const { canvas, calls } = mockCanvas();
  (global as any).document = { getElementById: (q:string) => q===id?canvas:null };
  (global as any).window = { devicePixelRatio: 1 } as any;
  (global as any).devicePixelRatio = 1; // global reference used directly in renderSystem
  return { calls };
}

describe('render system basic draw path', () => {
  it('draws parallax fallback when no parallax system cache', () => {
    const { calls } = mockWindowWithCanvas();
    const state = createGameState();
    state.parallax!.layers = []; // ensure fallback path
    const sys = createRenderSystem(state);
    const o = new GameOrchestrator({ seed:'render-seed', fixedStep:1/60 });
    o.register(sys); o.init();
    o.advance(o.getStep());
    expect(calls.filter(c=>c==='fillRect').length).toBeGreaterThan(0);
  });

  it('uses cached parallax layers when present', () => {
    const { calls } = mockWindowWithCanvas();
    const state = createGameState();
    state.parallax!.layers = [ { depth:0.25, offsetX:10, offsetY:20 }, { depth:0.5, offsetX:-5, offsetY:15 } ] as any;
    const sys = createRenderSystem(state); const o = new GameOrchestrator({ seed:'render-seed2', fixedStep:1/60 });
    o.register(sys); o.init(); o.advance(o.getStep());
    // At least one fillRect from layer drawing
    expect(calls.includes('fillRect')).toBe(true);
  });
});
