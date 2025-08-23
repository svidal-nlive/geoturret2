import { describe, it, expect } from 'vitest';
import { GameOrchestrator, System } from './orchestrator';

describe('GameOrchestrator', () => {
  it('updates systems in order each fixed step', () => {
    const calls: string[] = [];
    const mk = (id: string, order?: number): System => ({ id, order, update: () => { calls.push(id); } });
    const o = new GameOrchestrator({ fixedStep: 0.01, seed: 123 });
    o.register(mk('b', 10));
    o.register(mk('a', -5));
    o.register(mk('c', 10));
    o.init();
    o.advance(0.03); // 3 steps
    expect(calls.length).toBe(9);
    // Order inside each step should be a, b, c (since a.order -5 < b.order 10 == c.order 10 and b inserted before c)
    expect(calls.slice(0,3)).toEqual(['a','b','c']);
    expect(calls.slice(3,6)).toEqual(['a','b','c']);
    expect(calls.slice(6,9)).toEqual(['a','b','c']);
  });

  it('accumulates fractional elapsed and advances deterministically', () => {
    const frames: number[] = [];
    const sys: System = { id: 'counter', update: (_, ctx) => { frames.push(ctx.frame); } };
    const o1 = new GameOrchestrator({ fixedStep: 1/60, seed: 42 });
    const o2 = new GameOrchestrator({ fixedStep: 1/60, seed: 42 });
    o1.register(sys); o2.register(sys);
    o1.init(); o2.init();
    // Advance in different chunking but same total time 0.1s
    o1.advance(0.1); // single chunk
    o2.advance(0.03333); o2.advance(0.03333); o2.advance(0.03334);
    expect(o1.getMetrics().frame).toBe(o2.getMetrics().frame);
    expect(o1.getMetrics().time).toBeCloseTo(o2.getMetrics().time, 6);
  });
});
