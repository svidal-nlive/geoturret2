import { describe, it, expect } from 'vitest';
import { SCHEMA_VERSION, createSnapshot } from './serialization';
import { RNG } from '../engine';

describe('SCHEMA_VERSION constant', () => {
  it('snapshot uses current schema version', () => {
    const rng = new RNG(123);
    const snap = createSnapshot({ frame: 0, time: 0, rng });
    expect(snap.version).toBe(SCHEMA_VERSION);
  });
});