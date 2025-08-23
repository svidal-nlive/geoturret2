import { describe, it, expect, beforeAll } from 'vitest';
import '../content/initialContent'; // populate registries
import { createSnapshot } from './serialization';
import { RNG } from '../engine/rng';
import { Registries } from '../content/registries';

describe('serialization snapshot', () => {
  let rng: RNG;
  beforeAll(() => { rng = new RNG('test-seed'); });

  it('includes registry hash and matches computed hash', () => {
  const snap = createSnapshot({ frame: 42, time: 0.7, rng, state: { kills: 3, wave: 1, grazeCount: 0, overdriveMeter: 0, overdriveActive: false } });
    expect(snap.registryHash).toBe(Registries.hash());
    expect(snap.registries.enemies.length).toBeGreaterThan(0);
  expect(snap.version).toBe(5);
  expect(snap.summary.kills).toBe(3);
  expect(snap.summary.wave).toBe(1);
  });

  it('registry hash changes when a new enemy is registered', () => {
    const before = Registries.hash();
    Registries.enemy({ id: 'hash-test-enemy', hp: 1, speed: 0 });
    const after = Registries.hash();
    expect(after).not.toBe(before);
  });
});
