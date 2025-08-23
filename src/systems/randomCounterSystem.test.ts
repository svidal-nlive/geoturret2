import { describe, it, expect } from 'vitest';
import { GameOrchestrator } from '../engine';
import { createRandomCounterSystem } from './randomCounterSystem';

function run(seconds: number, seed: string | number) {
  const { system, getValues } = createRandomCounterSystem();
  const o = new GameOrchestrator({ fixedStep: 1/60, seed });
  o.register(system);
  o.init();
  o.advance(seconds); // single chunk
  return getValues();
}

describe('RNG injection determinism', () => {
  it('produces identical sequences for same seed', () => {
    const a = run(0.5, 'seed-xyz');
    const b = run(0.5, 'seed-xyz');
    expect(a).toEqual(b);
  });

  it('produces different sequences for different seeds', () => {
    const a = run(0.5, 'seed-1');
    const b = run(0.5, 'seed-2');
    expect(a).not.toEqual(b);
  });
});
