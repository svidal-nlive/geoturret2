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
    expect(snap.bossPatterns.sort()).toEqual(['future-converge','laser-cross','multi-beam-intersect','safe-lane-volley']);
  });
});
