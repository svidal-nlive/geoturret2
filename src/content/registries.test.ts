import { describe, it, expect } from 'vitest';
import './initialContent'; // side effects register content
import { Registries } from './registries';

describe('Registries placeholder content', () => {
  it('contains expected enemy ids', () => {
    const snap = Registries.snapshot();
    expect(snap.enemies.sort()).toEqual(['grunt','swift','tank']);
  });
  it('contains expected powerups', () => {
    const snap = Registries.snapshot();
    expect(snap.powerups.sort()).toEqual(['overdrive','shield']);
  });
  it('contains expected boss patterns', () => {
    const snap = Registries.snapshot();
  expect(snap.bossPatterns.sort()).toEqual(['future-converge','laser-cross','multi-beam-intersect','safe-lane-volley','spiral-barrage']);
  });
  it('enemy metadata populated', () => {
    const grunt = Registries.getEnemy('grunt');
    expect(grunt?.role).toBe('basic');
    expect(grunt?.bounty).toBeGreaterThan(0);
  });
  it('upgrade categories set', () => {
    const dmg = Registries.getUpgrade('damage+');
    expect(dmg?.category).toBe('offense');
    expect(dmg?.maxTier).toBe(5);
  });
  it('wave mod excludes and tags', () => {
    const gravity = Registries.getWaveMod('gravity');
    expect(gravity?.excludes).toContain('storm');
  });
});
