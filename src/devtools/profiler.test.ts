import { describe, it, expect } from 'vitest';
import { GameOrchestrator } from '../engine';

describe('Profiler', () => {
  it('captures per-system timings when enabled', () => {
    const o = new GameOrchestrator({ fixedStep: 1/120, seed: 1 });
    o.register({ id: 'fast', update: () => {} });
    o.register({ id: 'slow', update: () => { let x=0; for (let i=0;i<10000;i++) x+=i; } });
    o.enableProfiler(true);
    o.init();
    o.advance(0.1);
    const prof = o.getMetrics().profiling!;
    expect(Object.keys(prof).sort()).toEqual(['fast','slow']);
    expect(prof.slow).toBeGreaterThanOrEqual(prof.fast);
  });
});
