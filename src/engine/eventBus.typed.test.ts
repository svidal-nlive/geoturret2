import { describe, it, expect } from 'vitest';
import { eventBus } from './eventBus';
import { GameOrchestrator } from './orchestrator';
import { RNG } from './rng';

// Ensure typed events fire with proper payload shapes.
describe('eventBus typed events', () => {
  it('emits frame, perfSample, snapshot events with expected payloads', () => {
    const frames: number[] = [];
    const perf: number[] = [];
    const snaps: string[] = [];
    const offFrame = eventBus.on('frame', f => frames.push(f.frame));
    const offPerf = eventBus.on('perfSample', p => perf.push(p.frame));
  const offSnap = eventBus.on('snapshot', s => { snaps.push(s.registryHash); expect(s.summary.kills).toBeTypeOf('number'); });

  const orch = new GameOrchestrator({ fixedStep: 1/60, seed: new RNG('typed'), summarySource: () => ({ kills: 0, wave: 0, grazeCount: 0, overdriveMeter: 0, overdriveActive: false }) });
    orch.register({ id: 'noop', update: () => {} });
    orch.enableProfiler(true);
    orch.init();
    orch.advance(1/60); // one frame
    orch.snapshot();

    expect(frames.length).toBeGreaterThan(0);
    expect(perf.length).toBeGreaterThan(0);
    expect(snaps.length).toBe(1);

    offFrame(); offPerf(); offSnap();
  });
});
