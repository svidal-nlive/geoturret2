# GOLDEN_MODE Deterministic Baseline Guard

## 1. Purpose

`GOLDEN_MODE=1` freezes a curated slice of gameplay tuning so golden recordings, snapshot-based drift checks, and baseline performance metrics remain stable while normal development continues to iterate on balance. It is **not** a feature flag for player‑visible content; it is an internal reproducibility contract.

Goals:
- Keep golden replay diffs focused on intentional systemic changes, not incidental tuning experiments.
- Provide a safe sandbox (regular runs without `GOLDEN_MODE`) for rapid iteration on pacing, damage, radii, and pattern heuristics.
- Allow multi‑phase adoption: new systems can launch unguarded, then have critical invariants locked once mature.

## 2. Activation

Set the environment variable before running tests/tools that require the frozen baseline:

```bash
GOLDEN_MODE=1 npm test --silent -- golden.replay.test.ts
```

The golden replay test itself force‑sets the variable to ensure stability in CI. Local exploratory runs or regular `npm test` omit it by default.

## 3. Current Guarded Surfaces

| System | Guarded Elements (Frozen Under GOLDEN_MODE) | Rationale |
|--------|---------------------------------------------|-----------|
| enemySystem | Spawn interval schedule; dynamic center‑kill radius timetable | Kill cadence & early wave pacing directly drive golden kill counts / wave transitions |
| enemySystem | Center arrival kill *radius* | Prevent subtle radius tweaks from causing early kill churn |
| bulletSystem | Player fire interval; per‑bullet boss damage value | Fire rate & boss TTK influence frame/time invariants and kill timing |
| grazeSystem | Graze & hit radii constants | Graze count and near‑miss metrics are enforced in golden payloads |
| bossSystem | Pattern derivation heuristic (seed substring -> pattern id mapping) | Ensures identical boss lifecycle frames & spawn pacing |
| (implicit) tests | Seed-specific harness logic selecting special cases | Keeps semantics of recorded seeds stable |

Unlisted parameters are **not** yet locked and may legitimately drift golden metrics once intentionally adopted & rotated.

## 4. Workflow: Iteration vs. Baseline Update

| Scenario | Action | Commit Guidance |
|----------|--------|-----------------|
| Tuning spawn pacing experimentally | Change non‑golden path only; leave guarded branch intact | Regular feature/fix commit |
| New mechanic (e.g., shield) added | Implement freely; decide later what (if anything) must be frozen | Describe mechanic only |
| Decision to adopt new pacing as canonical | Edit guarded constants to match new values, regenerate goldens | Commit message: `chore(golden): rotate baseline – adopt spawn pacing v2 (reason)` |
| Large systemic overhaul (boss phase rewrite) | Stage changes unguarded, validate, then freeze critical invariants & rotate | Split into: feature PR, then golden rotation PR |

### Baseline Rotation Steps

1. Update guarded values (or add new guarded block).
2. Run full suite (without `GOLDEN_MODE`) to ensure no regressions.
3. Regenerate golden recordings:
   ```bash
   UPDATE_GOLDENS=1 npm test --silent -- golden.replay.test.ts
   ```
4. Inspect diff (`git diff golden/runRecordings.json`). Confirm changes match intent (frame, time, kills, wave, rngState, graze, boss lifecycle).
5. Commit with rationale (why the baseline changed). Avoid mixing unrelated refactors.

## 5. Adding a New Guarded Parameter

1. Identify the deterministic impact (does it affect frame counts, kill cadence, RNG draw ordering, or enforced metrics?).
2. Implement parameter with dual code path:
   ```ts
   const fireInterval = process.env.GOLDEN_MODE ? 0.18 : experimentalFireInterval; // example
   ```
3. Keep the *golden* branch referencing a literal or central constant; avoid function calls that could drift indirectly.
4. Add a brief comment: `// GOLDEN_MODE freeze (baseline vYYYY-MM-DD): explanation`.
5. (Optional) Document in this file’s table if widely impactful.
6. If not changing current golden behavior immediately, keep golden path equal to existing runtime value until a planned rotation.

## 6. Decision Checklist Before Rotating

- [ ] Have you run determinism scripts (`npm run test:sim:verify`)?
- [ ] Are all non-golden tests green without `GOLDEN_MODE`?
- [ ] Do golden diffs reflect only intended fields? (No unexpected `rngState` jumps from added RNG draws?)
- [ ] Is performance impact (perf baseline) acceptable? (Run `npm run perf:check` if relevant.)
- [ ] Commit message includes succinct rationale.

## 7. Troubleshooting Drift

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Golden replay fails on `kills` mismatch | Unguarded change to kill cadence (spawn interval, radius, TTK) | Either guard it or intentionally rotate goldens |
| `rngState` mismatch only | Added RNG draws (e.g., new random angle) outside of deterministic schedule | Hoist new RNG call behind conditional / reuse existing seeded value |
| Boss lifecycle frame mismatch | Pattern mapping changed for golden seed | Guard heuristic or update goldens intentionally |
| Graze count mismatch | Adjusted graze/hit radii outside guard | Add guard or rotate |

## 8. FAQ

**Q: Can I temporarily disable GOLDEN_MODE logic to test a hypothesis?**  
Yes—just run without the variable. Do **not** commit code that depends on GOLDEN_MODE being unset for correctness; only tuning should differ.

**Q: Should I guard everything immediately?**  
No. Guard too soon and you create friction for legitimate evolution. Guard only parameters whose variability would generate noisy golden diffs.

**Q: How is this different from `UPDATE_GOLDENS`?**  
`UPDATE_GOLDENS` triggers regeneration of recorded outputs; `GOLDEN_MODE` enforces the stable code path those recordings expect.

**Q: What if a parameter must diverge for a bug fix?**  
Apply bug fix in both code paths (or remove the guard if the old behavior was incorrect). Golden rotation may still be required if outputs change.

## 9. Anti-Patterns

- Baking *experimental* values directly into the GOLDEN_MODE branch (locks instability).
- Mixing unrelated refactors with a golden rotation commit (harder diff review).
- Silent guard additions without documentation (future maintainers lose context).

## 10. Future Extensions (Candidates to Guard)

| Candidate | Trigger | Metric Risk |
|-----------|---------|-------------|
| Overdrive meter gain rate | Balance pass adjusts frequency of activation | Wave frame timing & graze synergy |
| New boss phase RNG seeds | Additional draws per frame | `rngState` drift |
| Particle system spawn counts (if enforced later) | Visual density tweaks | Potential future deterministic hash changes |

## 11. Glossary

- *Golden Recordings*: JSON snapshots of deterministic run invariants verified each CI run.
- *Baseline Rotation*: Intentional update of golden recordings after approved systemic change.
- *Deterministic Surface*: Set of variables affecting enforced invariants (kills, wave, frame, time, rngState, graze, boss lifecycle fields).

## 12. Boss Performance Baseline Rotation Policy

The boss pattern performance guard enforces two thresholds (see `artifacts/boss-perf-baseline.json`):
 - serializePctMax: maximum allowed percentage of pattern frame time attributable to serialization
 - avgUpdateMsMax: maximum allowed average pattern update milliseconds per frame

Baseline rotation (updating `boss-perf-baseline.json`) is permitted ONLY when:
 1. The baseline pattern+seed pair (pattern + seed fields in the JSON) shows a strictly lower `serializePct` than the committed baseline.
 2. `avgUpdateMs` does not exceed its threshold.
 3. No other pattern/seed in the matrix breaches thresholds.

Rotation steps:
 1. Run locally: `npm run boss:perf:check` (ensure PASS and improvement logged).
 2. Commit the updated `artifacts/boss-perf-baseline.json` with message `chore(perf): rotate boss perf baseline (serializePct X -> Y)`.
 3. Push and verify CI passes (guard will now use the new values).

Matrix Expansion:
The guard runs a matrix of patterns and seeds (override with env vars `BOSS_PERF_PATTERNS` and `BOSS_PERF_SEEDS`). Add new critical boss patterns to `BOSS_PERF_PATTERNS` once they are stable so regressions are caught early.

Non-improving Changes:
If code changes increase `serializePct` or `avgUpdateMs` for the baseline, investigate before relaxing thresholds. Only raise thresholds if the new cost is inherent and justified (document rationale in commit message).

---
*Update notes: Initial guard surfaces documented 2025-08-23.*
