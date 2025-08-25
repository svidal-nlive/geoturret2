import { describe, it, expect } from 'vitest';
import '../content/initialContent';
import { upgradeSnapshot, SCHEMA_VERSION } from './serialization';

describe('snapshot upgrade adds versionMap', () => {
  it('upgrades v5 snapshot without versionMap', () => {
    const legacy: any = { version: 5, frame: 10, time: 0.16, rngState: 123, registries: { enemies: ['grunt'], powerups: [], upgrades: [], waveMods: [], bossPatterns: [] }, registryHash: 'deadbeef', summary: { kills: 1, wave: 0, grazeCount: 0, overdriveMeter: 0, overdriveActive: false, bossActive: false, bossPattern: null, bossStartedFrame: null, bossEndedFrame: null } };
    const up = upgradeSnapshot(legacy);
    expect(up.version).toBe(SCHEMA_VERSION);
    expect(up.versionMap['enemy:grunt']).toBe(1);
  });
});
