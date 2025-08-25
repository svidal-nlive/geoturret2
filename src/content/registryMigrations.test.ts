import { describe, it, expect } from 'vitest';
import './initialContent';
import { validateRegistryVersions, diffIds } from './registryMigrations';
import { Registries } from './registries';

describe('registry migrations & versions', () => {
  it('all current entries have valid version numbers', () => {
    const res = validateRegistryVersions();
    expect(res.ok).toBe(true);
    if (!res.ok) console.error('Version issues:', res.issues);
  });
  it('diffIds detects additions/removals', () => {
    const snap = Registries.snapshot();
    const before = snap.enemies;
    const after = [...before, 'newOne'];
    const diff = diffIds(before, after);
    expect(diff.added).toEqual(['newOne']);
    expect(diff.removed).toEqual([]);
  });
});
