/**
 * Registry migration helpers.
 * For now we expose a validator that ensures every definition with a version field uses a positive integer
 * and provides a compare utility for future diffing (e.g., when generating a migration script or changelog).
 */
import { Registries } from './registries';

export interface VersionedEntry { id: string; version?: number }

export function validateRegistryVersions(): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  const check = (kind: string, entry?: VersionedEntry) => {
    if (!entry) return;
    if (entry.version == null) { issues.push(`${kind}:${entry.id} missing version`); return; }
    if (!Number.isInteger(entry.version) || entry.version <= 0) issues.push(`${kind}:${entry.id} invalid version ${entry.version}`);
  };
  // Iterate known ids via snapshot to avoid leaking internal maps
  const snap = Registries.snapshot();
  for (const id of snap.enemies) check('enemy', Registries.getEnemy(id));
  for (const id of snap.powerups) check('powerup', Registries.getPowerup(id));
  for (const id of snap.upgrades) check('upgrade', Registries.getUpgrade(id));
  for (const id of snap.waveMods) check('waveMod', Registries.getWaveMod(id));
  // Boss patterns already mandate version in definition; still validate
  for (const id of snap.bossPatterns) check('bossPattern', Registries.getBossPattern(id));
  return { ok: issues.length === 0, issues };
}

export interface RegistryDiff { added: string[]; removed: string[]; }

/** Compute id-level diff between two snapshot id arrays. */
export function diffIds(before: string[], after: string[]): RegistryDiff {
  const b = new Set(before);
  const a = new Set(after);
  const added = [...a].filter(x => !b.has(x)).sort();
  const removed = [...b].filter(x => !a.has(x)).sort();
  return { added, removed };
}
