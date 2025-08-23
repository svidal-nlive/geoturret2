import { describe, it, expect } from 'vitest';
import '../content/initialContent';
import { GameOrchestrator } from '../engine/orchestrator';
import { RNG } from '../engine/rng';

describe('run summary in orchestrator snapshot', () => {
  it('embeds kills/wave from summarySource', () => {
  const orch = new GameOrchestrator({ seed: new RNG('sum'), summarySource: () => ({ kills: 7, wave: 2, grazeCount: 0, overdriveMeter: 0, overdriveActive: false }) });
    const snap = orch.snapshot();
    expect(snap.summary.kills).toBe(7);
    expect(snap.summary.wave).toBe(2);
  });
});
