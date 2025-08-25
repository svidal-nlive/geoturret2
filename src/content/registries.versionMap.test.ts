import { describe, it, expect } from 'vitest';
import './initialContent';
import { Registries } from './registries';

/** Ensures versionMap helper returns entries for every ID in snapshot and versions are positive ints. */

describe('Registries.versionMap completeness', () => {
  it('covers all snapshot ids with positive integer versions', () => {
    const snap = Registries.snapshot();
    const vm = Registries.versionMap();
    const expectedCount = snap.enemies.length + snap.powerups.length + snap.upgrades.length + snap.waveMods.length + snap.bossPatterns.length;
    expect(Object.keys(vm).length).toBe(expectedCount);
    for (const [k,v] of Object.entries(vm)) {
      expect(Number.isInteger(v) && v > 0).toBe(true);
      // Basic prefix sanity
      expect(/^(enemy|powerup|upgrade|waveMod|bossPattern):/.test(k)).toBe(true);
    }
  });
});
