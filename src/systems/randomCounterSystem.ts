import { System, OrchestratorContext } from '../engine';

/**
 * RandomCounterSystem
 * Demonstrates deterministic RNG usage via orchestrator context (Phase 1 RNG injection pattern).
 * Each update records one random int in [0, 100].
 */
export interface RandomCounterSystemHandle {
  system: System;
  getValues(): number[];
  reset(): void;
}

export function createRandomCounterSystem(id = 'randomCounter'): RandomCounterSystemHandle {
  const values: number[] = [];
  const system: System = {
    id,
    update: (_dt: number, ctx: OrchestratorContext) => {
      values.push(ctx.rng.int(0, 100));
    }
  };
  return {
    system,
    getValues: () => values.slice(),
    reset: () => { values.length = 0; }
  };
}
