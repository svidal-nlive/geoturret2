import { describe, it, expect } from 'vitest';
import '../content/initialContent';
import { GameOrchestrator } from '../engine/orchestrator';
import { createOrchestratorFromSnapshot } from './serialization';
import { Registries } from '../content/registries';

describe('snapshot registry validation', () => {
  it('throws when registries diverge after snapshot if validateRegistries enabled', () => {
    const o = new GameOrchestrator({ fixedStep: 1/60, seed: 'reg-mismatch' });
    o.init();
    o.advance(0.1);
    const snap = o.snapshot();
    // Diverge registries
    Registries.enemy({ id: 'new-enemy-after-snapshot', hp: 1, speed: 0 });
    expect(() => createOrchestratorFromSnapshot(snap, { validateRegistries: true })).toThrow(/registry hash mismatch/i);
  });
});
