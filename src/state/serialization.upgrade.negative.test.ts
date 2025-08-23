import { describe, it, expect } from 'vitest';
import { upgradeSnapshot, SCHEMA_VERSION, AnyRunSnapshot } from './serialization';

// These tests exercise defensive behavior of upgradeSnapshot with malformed legacy inputs.

describe('upgradeSnapshot negative / malformed inputs', () => {
  it('passes through already-latest snapshot reference', () => {
    const latest: any = { version: SCHEMA_VERSION, frame: 1, time: 0.016, rngState: 123, registries: {}, registryHash: 'abcd', summary: { kills: 0, wave: 0, grazeCount: 1, overdriveMeter: 0.2, overdriveActive: false, parallaxLayers: [] } };
    const out = upgradeSnapshot(latest);
    expect(out).toBe(latest); // ensures no copy when already latest
  });

  it('upgrades v1 missing new fields to defaults', () => {
    const v1: AnyRunSnapshot = { version: 1, frame: 2, time: 0.033, rngState: 99, registries: {}, registryHash: 'h1', summary: { kills: 2, wave: 0 } } as any;
    const up = upgradeSnapshot(v1);
    expect(up.version).toBe(SCHEMA_VERSION);
    expect(up.summary.kills).toBe(2);
    expect(up.summary.grazeCount).toBe(0);
    expect(up.summary.overdriveMeter).toBe(0);
    expect(up.summary.overdriveActive).toBe(false);
  });

  it('handles unexpected extra fields gracefully', () => {
    const weird: any = { version: 2, frame: 5, time: 0.08, rngState: 42, registries: {}, registryHash: 'weird', summary: { kills: 1, wave: 0 }, extraneous: 123 };
    const up = upgradeSnapshot(weird);
    expect(up.version).toBe(SCHEMA_VERSION);
    expect((up as any).extraneous).toBeUndefined();
  });

  it('treats unknown higher version as legacy structure (future-proof default)', () => {
    // Simulate snapshot with future version number but missing new fields
    const future: any = { version: 999, frame: 3, time: 0.05, rngState: 7, registries: {}, registryHash: 'f', summary: { kills: 4, wave: 1 } };
    const up = upgradeSnapshot(future);
    expect(up.version).toBe(SCHEMA_VERSION);
    expect(up.summary.kills).toBe(4);
    expect(up.summary.grazeCount).toBe(0);
  });

  it('defaults parallaxLayers when absent', () => {
    const v3NoLayers: any = { version: 3, frame: 10, time: 0.16, rngState: 5, registries: {}, registryHash: 'p', summary: { kills: 0, wave: 0 } };
    const up = upgradeSnapshot(v3NoLayers);
    expect(up.summary.parallaxLayers).toBeUndefined();
  });
});
