# Contributing Guide

Thanks for your interest in improving Geoturret2!

## Quick Start

1. Fork & clone
2. Install dependencies:

```bash
npm ci
```
3. Run the fast feedback loop:

```bash
npm test
npm run dev
```
4. Add tests for any gameplay, deterministic, or serialization change.
5. Ensure all checks pass (see CI matrix below) before opening a PR.

## Project Principles

- Determinism first: any change that can affect RNG sequence, frame counts, or snapshot schema must justify drift.
- Reproducibility: update goldens / baselines only with an explanatory commit message.
- Minimal RNG draws inside patterns/systems (documented in code comments) to localize drift sources.
- Backward compatibility: snapshot upgrade path must seamlessly upgrade all prior versions.

## Branching & Commits

- `main` is protected; all changes via PR.
- Conventional commit prefixes encouraged (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `perf:`, `refactor:`).
- If updating goldens: include rationale, e.g. `feat: boss pattern volley adds spawn cadence (update goldens)`.
- If bumping schema: increment `SCHEMA_VERSION`, update README snapshot section, add/adjust upgrade tests.

## Test Suites

| Suite | Command | Purpose |
|-------|---------|---------|
| Unit / systems | `npm test` | Core correctness & determinism smoke |
| Golden replay | `npm run test:golden` | Drift detection across recorded seeds |
| Long sim determinism | `npm run test:sim:verify` | Same-seed stability & seed differentiation |
| Baseline hash | `npm run test:sim:baseline` | Guard against unintended accelerator drift |
| Perf check | `npm run perf:check` | Enforce perf thresholds (req baseline file) |

## Updating Golden Recordings

1. Make intentional change.
2. Run with regeneration:

```bash
UPDATE_GOLDENS=1 npm run test:golden
```
3. Inspect diff of `golden/runRecordings.json`.
4. Commit with rationale.

## Performance Baseline

Update after intentional performance-impacting change:

```bash
node --expose-gc scripts/perf-baseline.mjs --frames 2000 --seeds a,b,c,d,e
```
Commit updated `perf-baseline.json` with rationale.

## Adding a Boss Pattern

1. Implement pattern in `src/content/patterns/`.
2. Register factory in `bossSystem` map.
3. Add tests for duration & lifecycle invariants.
4. Add a golden seed (`gN-boss-*`).
5. Regenerate goldens.

## Snapshot Schema Changes

1. Bump `SCHEMA_VERSION` in `serialization.ts`.
2. Add interface for prior version (e.g., `RunSnapshotV5`).
3. Expand `upgradeSnapshot` with exhaustive legacy mapping.
4. Update README (schema section) & tests expecting old version.
5. Consider adding negative tests for malformed legacy snapshots.

## Submitting a PR

Checklist before opening:

- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Unit tests green
- [ ] Golden replay passes (or goldens intentionally updated)
- [ ] Long sim verify passes
- [ ] Baseline hash passes
- [ ] Perf check (if baseline exists) passes or justified
- [ ] README / docs updated

## Code Style

Rely on the existing formatting conventions. Prefer small, focused changes. Document non-obvious deterministic decisions inline.

## Security / Vulnerabilities

Run the lightweight scan:

```bash
npm audit --omit=dev
```
If critical issues appear, open an issue with reproduction details.

## Questions

Open a GitHub Discussion or Issue. PR drafts welcome for early feedback.
