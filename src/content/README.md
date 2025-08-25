# Content Registries

Holds declarative data: enemies, powerups, upgrades, wave modifiers, boss patterns. Registries are pure data + factory functions enabling deterministic replay and versioned migration.

## Versioning & Migrations

- Each definition includes a `version` (positive int). Increment when balance / behavior changes that could alter determinism (e.g. enemy hp, upgrade scaling).
- The registry hash intentionally ignores versions (ids only) so *adding/removing* ids changes hash; pure balance iteration (version bump) does not.
- Tests:
	- `registries.hashLock.test.ts` guards composition (ids).
	- `registryMigrations.test.ts` validates all entries have valid version numbers.
	- Future: add migration mapping (e.g. downgrade / upgrade transforms) if persistence schema needs semantic reconciliation.

### Update Procedure

1. Modify definition (e.g. change `hp`).
2. Increment its `version`.
3. Add note to CHANGELOG / roadmap if externally visible.
4. Run tests; ensure hash lock unchanged (unless ids changed intentionally).
5. If ids added/removed, update hash lock test EXPECTED_HASH (compute via `npm run registry:hash`).
6. (Optional) Regenerate registry summary: `npm run registry:summary` (artifact at `artifacts/registry-summary.md`).

### Helper Scripts

- `npm run registry:hash:print` – prints current registry composition hash.
- `npm run registry:summary` – outputs markdown summary of all entries + versions.
- `npm run registry:versionmap` – prints JSON of current versionMap (for diffing / tooling).

### Migration Scaffold (Forward Planning)

Add a migration when a definition's behavior change requires replay normalization (rare). Pattern:

```ts
// registryMigrations.ts
export interface RegistryMigration { from: number; to: number; kind: 'enemy'|'powerup'|'upgrade'|'waveMod'|'bossPattern'; id: string; apply(oldDef: any): any }
// Maintain ordered list; apply sequentially when loading legacy persistent state.
```

Currently migrations are not needed (all v1). Once a v2 is introduced that changes deterministic balance (e.g., enemy hp alters time-to-kill), bump its version and (optionally) add a migration entry specifying how to reconcile saved state (e.g., adjust remaining hp proportionally). This file intentionally minimal until first real need.
