import { describe, it, expect } from 'vitest';
import { GameOrchestrator } from './orchestrator';
import '../content/initialContent';

describe('Orchestrator snapshot', () => {
  it('produces identical snapshots for identical seeds & elapsed', () => {
    const o1 = new GameOrchestrator({ fixedStep: 1/60, seed: 'snap-seed' });
    const o2 = new GameOrchestrator({ fixedStep: 1/60, seed: 'snap-seed' });
    o1.init(); o2.init();
    o1.advance(0.5); o2.advance(0.5);
    const s1 = o1.snapshot();
    const s2 = o2.snapshot();
    expect(s1.frame).toBe(s2.frame);
    expect(s1.time).toBeCloseTo(s2.time, 6);
    expect(s1.rngState).toBe(s2.rngState);
    expect(s1.registries).toEqual(s2.registries);
  });

  it('snapshot changes RNG state after additional advance when RNG consumed', () => {
    const o = new GameOrchestrator({ fixedStep: 1/60, seed: 123 });
    // System that consumes RNG each frame to mutate internal state
    o.register({ id: 'rngConsumer', update: (_dt, ctx) => { ctx.rng.next(); } });
    o.init();
    o.advance(0.2);
    const s1 = o.snapshot();
    o.advance(0.2);
    const s2 = o.snapshot();
    expect(s2.frame).toBeGreaterThan(s1.frame);
    expect(s2.rngState).not.toBe(s1.rngState);
  });
});
