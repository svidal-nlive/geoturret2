# Geoturret 2 (Alpha Planning Scaffold)

[![CI](https://github.com/svidal-nlive/geoturret2/actions/workflows/ci.yml/badge.svg)](https://github.com/svidal-nlive/geoturret2/actions/workflows/ci.yml)
[![Coverage](./coverage-badge.svg)](#coverage-badge-generation)
![Size](./size-badge.svg)


Pre-implementation scaffold aligned with `PRD.md` & `ROADMAP.md`.

## Status (Key Implemented)

- Deterministic RNG (shim removed) + injection across systems (`src/engine/rng.ts`)
- Event bus (`src/engine/eventBus.ts`), orchestrator fixed-step core (`src/engine/orchestrator.ts`)
- Snapshot / restore (schema v5: parallax + extended summary: graze & overdrive metrics + mandatory boss lifecycle fields, backward-compatible upgrades) + helper `createOrchestratorFromSnapshot`
- Graze detection system (near-miss) & Overdrive system (meter, activation, fire-rate modifier)
- Wave system (`src/systems/waveSystem.ts`) with scalable kill targets & `waveStart` emission
- Parallax layer system + persistence; camera refinements
- Error boundary ring buffer (`src/engine/errorBoundary.ts`)
- Profiler timings (`enableProfiler()`), object pool (`src/engine/pool.ts`)
- Golden recording & replay harness (deterministic drift detection)
- Boss patterns (Phase 1 placeholder + spawn variants):
	- `laser-cross` (timed lifecycle, no spawns; stability baseline)
	- `safe-lane-volley` (lane hazard volleys; periodic hazardous lane spawns)
	- `multi-beam-intersect` (rotating beam placeholder with orbit spawns every 40f)
	- `future-converge` (radial inward waves + convergence pulses; higher spawn volume for stress testing)
	- `spiral-barrage` (rotating arc bursts every 20f; mixed inward/outward velocities)
- Long-run accelerated headless simulation harness (`scripts/simCore.ts`, `sim-run.ts`)
- Determinism verification script (`scripts/sim-verify.ts`) and baseline hash guard (`scripts/sim-baseline.json`, `sim-baseline-check.ts`)
- Performance baseline tooling (histograms + memory growth, robust spike trimming, per-seed memory pass) & optional CI enforcement
- CI stages: lint, typecheck, unit + determinism, long sim verify, baseline hash, golden replay, build, size, perf (optional)
- ~90% statement coverage (Vitest + v8)

## Scripts

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run coverage:badge      # run coverage & update coverage-badge.svg
npm run test:sim:long        # accelerated wave 1->15 JSON output
npm run test:sim:verify      # determinism (same seed twice) + seed differentiation
npm run test:sim:baseline    # assert current gameplay hash matches committed baseline
npm run build
npm run perf:baseline   # generate/update perf-baseline.json (profiling stats & suggested thresholds)
npm run perf:check      # enforce thresholds using perf-baseline.json
npm run perf:regen      # archive previous + regenerate with diff summary (wrapper)
npm run golden:rotate   # archive & regenerate golden set with new --cases list
```

## Deterministic Simulation & Baseline

Headless accelerated simulation (no rendering) advances waves rapidly by injecting synthetic kills each frame until target wave reached (default wave 15). This keeps CI fast while still exercising wave scaling & kill accounting.

Scripts:

- `test:sim:long` emits a JSON summary: `{ seed, targetWave, reachedWave, kills, frame, time, rngState, hash }`.
- `test:sim:verify` runs same-seed twice (hash must match) and a different seed (hash must differ) while asserting target wave is reached.
- `test:sim:baseline` replays the canonical baseline (`scripts/sim-baseline.json`) and fails on any divergence (hash, frame count, kills, rngState). Update baseline only after intentional gameplay changes:

```bash
tsx scripts/sim-run.ts > new.json
# Inspect differences, then:
cp new.json scripts/sim-baseline.json
git add scripts/sim-baseline.json -m "chore: update simulation baseline (reason)"
```

Hash function (baseline v1) combined `rngState`, `kills`, and `wave` via FNV-1a steps. Baseline v2 (current) additionally mixes in graze & overdrive metrics (quantized) even though the accelerated harness does not populate them yet—this future‑proofs drift detection if those systems are later included.

Baseline versioning:

- Bump only when the hash algorithm or invariant scope changes (not just gameplay/balance changes that alter values under the same algorithm).
- Update `scripts/simCore.ts`, regenerate `scripts/sim-baseline.json`, and set `EXPECTED_BASELINE_VERSION` in `scripts/sim-baseline-check.ts` to the new version.
- Document rationale in commit message (e.g., "baseline v2: include graze/overdrive metrics in hash").
- Never silently downgrade version; if reverting algorithm, bump again (v3) and explain.

Environment knobs:

- `SIM_SEED` (string)
- `SIM_TARGET_WAVE` (default 15)
- `SIM_SECONDS` (fail-safe cap, default 30)
- `SIM_ACCEL_KILLS_PER_FRAME` (accelerator intensity, default 5)

Changing accelerator logic or additional systems that affect frame count will intentionally shift baseline—document rationale when updating.

## Quick Run

```bash
npm install
npm run dev
```

Open <http://localhost:5173> (optionally add `?seed=abc`).

Keys:

- `p` toggle profiler timings in overlay
- `s` log deterministic snapshot to console
- `space` pause/unpause simulation
- `.` advance one fixed step while paused
- `o` open/close settings dialog
- `m` toggle motion reduction
- `Shift+[` / `Shift+]` decrease / increase safe lane highlight intensity (0.1–1.0) (temporary dev hotkey)

Overlay fields: seed, frame, time, kills, wave, pool usage (enemy & bullet inUse/free), pause indicator, optional system timings. Kills & pool stats should be identical for same seed & simulated time across reloads. Wave currently advances on kill thresholds (scaling target: initial 10, +25% rounded each wave).

Accessibility Runtime APIs (`window.accessibility`):

- `setMotionReduction(bool)` / `getMotionReduction()`
- `setSafeLaneIntensity(number 0.1-1)` / `getSafeLaneIntensity()` (persists; URL param `laneIntensity` overrides on load)

Phase 2 HUD Progress: Structured top HUD (coins / wave / seed + overdrive metrics) and bottom health & armor bars added; live coin awarding (enemy bounty -> coin counter + delta flash) implemented via economy system. Upgrade icons & power-up timers pending.

Determinism quick check: reload with same seed and compare logged snapshot `rngState` after ~1s.

### Run Snapshot (v7)

`GameOrchestrator.snapshot()` (schema v7) fields:

- `version`: 7
- `frame`: number
- `time`: simulated seconds
- `rngState`: internal RNG numeric state
- `registries`: current registry listings (ids + metadata)
- `registryHash`: djb2 hex digest of sorted registry ids (integrity & drift detection)

- `summary`: `{ kills, wave, grazeCount, overdriveMeter, overdriveActive, parallaxLayers?, bossActive, bossPattern, bossStartedFrame, bossEndedFrame, bossPatternState? }` (older snapshots auto-upgraded). `bossPatternState` (added v7) stores serialized internal script runner state to allow mid-pattern resume determinism; it is omitted unless a boss is active.
	- `versionMap`: map of `kind:id` → content version for each registry entry (added v6 for future persistence migrations / drift analytics)
	- Boss patterns always populate lifecycle fields; `future-converge` & others drive spawn deltas validated by `bossPattern.spawnCounts.test.ts`.
- `parallaxLayers`: persisted parallax layer descriptors (for golden replay parity)

Helper `createOrchestratorFromSnapshot(snapshot)` rebuilds a fresh orchestrator, registers systems & restores temporal/RNG state after validating registry integrity. Fails fast on `registryHash` mismatch to surface content drift. v5 remains backward-compatible for consumers expecting earlier fields; boss lifecycle fields are always present (inactive/null when absent historically).

### Performance Baseline & Enforcement

1. Collect baseline (longer frame counts for stability):

```bash
rm -rf dist-baseline && npm run perf:baseline -- --frames 2000 --seeds a,b,c,d,e
```

Produces `perf-baseline.json` with per-system stats (avg/min/max/p90/p95/p99/std) and derived thresholds. Timing samples are aggregated via an adaptive fixed-bin histogram (default 256 bins, dynamic cap) so the file remains small while percentiles remain stable.

1. Enforce thresholds in CI / locally:

```bash
npm run perf:check -- --frames 600 --seeds a,b,c
```

Optional histogram flags (tune fidelity vs size):

```bash
--hist-bins 256   # number of timing bins (default 256). Larger -> finer percentile resolution, larger file.
--hist-cap 0.2    # initial cap in seconds for timing bins (dynamic expansion occurs automatically if exceeded).
```

Environment variables:

- `PERF_MARGIN=1.1` apply 10% slack to all thresholds.
- `PERF_SHOW_SAMPLES=1` prints first samples for diagnostics.

Regenerate baseline after intentional perf changes, review diffs, and commit updated `perf-baseline.json` with rationale.

Wrapper helper (archives previous, shows per-system threshold deltas, guards against overly aggressive tightening):

```bash
npm run perf:regen -- --frames 2400 --seeds a,b,c,d,e
# If you intentionally tightened >50% some thresholds:
npm run perf:regen -- --frames 2400 --seeds a,b,c,d,e --force
```

Archives stored under `perf-baseline.archive/`.

Prune old archives (keep last 5 by default):

```bash
npm run archives:prune -- --keep 7
```

Memory: Baseline script records per-seed heap deltas and derives:

- `memory.delta` (overall run delta threshold)
- `memory.growthP95`, `memory.growthP99` (per-seed positive growth percentile thresholds) – only set when enough positive growth samples exist.

`perf:check` enforces:

1. Total run delta (`memory.delta`), after all seeds.
2. Per-seed growth vs `growthP95` / `growthP99` (light secondary pass with a short simulation per seed). Negative deltas (net memory release) are ignored for violation purposes.

Use `--expose-gc` to enable a GC hint between seeds for more stable baselines:

```bash
node --expose-gc scripts/perf-baseline.mjs --frames 1200 --seeds a,b,c --hist-bins 128 --hist-cap 0.2
```

Troubleshooting / tuning:

- If spike thresholds are too tight, increase frames & seeds, then regenerate baseline.
- If one-off OS / GC spikes cause failures, rely on adaptive cap expansion and re-run baseline rather than inflating margins globally.
- To tighten thresholds over time: gradually lower `PERF_MARGIN` in CI after observing stability (start 1.1 → 1.05 → 1.0).

Histogram notes: The baseline stores bin counts, bin width, and final cap. Percentiles are computed from cumulative counts; dynamic cap expansion re-bins existing counts approximately (bin center mapping) so prior data still contributes.

Planned enhancement: histogram-based sampling (fixed bins) to avoid storing full sample arrays and enable percentile tightening over time.

Robust spike handling:

- Pass `--robust-spike --spike-trim N` (same flags for `perf:baseline` and `perf:check`) to exclude the top N timing samples per system when deriving / enforcing spike thresholds. This mitigates single outlier noise (e.g., first JIT, sporadic GC) without masking sustained regressions.
- Baseline stores both `rawMax` and `trimmedTop`; threshold uses trimmed max while retaining raw for audit.
- Always keep baseline & check invocations aligned (either both robust or both plain) to avoid artificial failures.
- Use small N (start with 1). If you need >2 consistently, investigate root cause before increasing.

### Replay Harness & Golden Recordings (Extended Metrics & Boss Enforcement)

Deterministic verification utility (`src/devtools/replay.ts`):

```ts
import { recordRun, replayRun } from './devtools/replay';
const rec = recordRun({ seed: 'abc', duration: 10 });
const result = replayRun(rec);
console.log(result.ok, result.differences);
```

Recorded payload (`RunRecording`) stores seed, duration, fixedStep, final snapshot and summary stats (kills, wave). Replay recomputes and flags any drift across core invariants (frame, time, rngState, registryHash, kills, wave). This underpins future regression detection (e.g., store golden recordings per commit).

Golden recordings (`golden/runRecordings.json`) are verified in CI to catch deterministic drift. Extended metrics include graze & overdrive accumulation, boss lifecycle fields, parallax layer metadata, and (schema v7) pattern persistence state where applicable. A dedicated golden case `g4-grazeOD` exercises non-zero graze & overdrive. Boss pattern cases (`g5-boss`, `g6-boss-safe`, `g7-boss-multi`, etc.) lock lifecycle timing & spawn pacing.

Regenerate intentionally after approved gameplay / balance changes:

```bash
UPDATE_GOLDENS=1 npm test --silent -- golden.replay.test.ts   # or: UPDATE_GOLDENS=1 npm run test:golden
git add golden/runRecordings.json
```

Rotation helper (archives previous golden to `golden/archives/` then regenerates):

```bash
npm run golden:rotate -- --cases g1:6,g2:10,g3-parallax:6,g4-grazeOD:8,g5-boss:14,g6-boss-safe:22,g7-boss-multi:26,g8-boss-future:16 --message "chore(golden): rotate seeds"
```

This wraps `golden-record` + `golden-diff` (diff vs previous archived file) for concise review.

Archived snapshots accumulate (manual pruning safe). CI still enforces the committed canonical `golden/runRecordings.json`.

Prune old golden archives similarly with the same prune command (targets both perf + golden archive dirs).

When introducing or removing seeds ensure ordering consistency (`gN-` monotonic) to keep diffs clean.

If you want to experiment without overwriting the canonical file use `golden:record` directly targeting an `.actual.json` path.

CI produces an artifact (`golden-actual`) each run containing a freshly generated `runRecordings.actual.json` so diffs vs committed golden can be inspected without rerunning locally.

#### Adding a New Golden Seed

1. Pick a deterministic seed string (e.g. `g8-bossNew`). Keep prefix `gN-` monotonic for ordering.
2. Add an entry to `CASES` in `src/devtools/golden.replay.test.ts` with `{ seed, duration }` (and `-parallax` in the seed if you need parallax layers captured, or include `grazeOD` substring if you want overdrive-friendly config applied).
3. (Optional) Adjust replay harness logic if special config needed (e.g. custom overdrive gains keyed off seed substring).
4. Re-run:

```bash
UPDATE_GOLDENS=1 npm run test:golden
```

1. Inspect `golden/runRecordings.json` diff (ensure new metrics look sane) and commit with a message explaining intent (e.g. `feat: add golden seed g5-bossIntro for boss prelude regression coverage`).
1. CI will now enforce deterministic parity including the new case.

If you only want to trial a candidate without committing, use the golden record script to produce an "actual" file:

```bash
npm run golden:record -- --cases g1:6,g2:10,g3-parallax:6,g4-grazeOD:8,g5-bossIntro:12 --out golden/runRecordings.actual.json
```
Compare `golden/runRecordings.actual.json` to the committed `runRecordings.json` before deciding to update.

#### Golden Monitor Severity

`npm run golden:monitor` regenerates actuals under `GOLDEN_MODE=1` and classifies drift:

- STRUCTURAL: frame/time/rngState/registry hash/version map/seed ordering (must never drift without intentional rotation + rationale).
- BALANCE: kills, wave, grazeCount, overdriveMeter, overdriveActive (acceptable only when balance tuning and followed by rotation).
- COSMETIC: parallax metadata or other presentational fields (lowest risk; still require review for unintended side effects).

This severity breakdown prints before commit (pre-commit hook) to prioritize review.

#### Quick Golden Diff (No Regeneration)

After recording a candidate set (or downloading the CI artifact), run:


```bash
npm run golden:diff
```

This compares `golden/runRecordings.actual.json` against the committed golden file and prints concise per-case field diffs (frame/time/rngState/kills/wave + v4 metrics + parallax metadata). Non-zero exit code signals drift without overwriting the committed file. You can supply custom paths:

```bash
node scripts/golden-diff.mjs --actual some/other.json --golden golden/runRecordings.json
```

Useful in PR review to validate that only intended metrics changed before deciding to regenerate the golden file.

### Shared ESM Import Patch Utility

The baseline / headless scripts (`perf-baseline.mjs`, `golden-record.mjs`) compile a minimal subset of sources to `dist-baseline` using `tsconfig.baseline.json`. Because source imports are written extension-less (TypeScript style) and Node's native ESM loader requires explicit file extensions, a shared helper `scripts/esm-import-patch.mjs` post-processes the emitted JS:

- Appends `.js` to relative `./` / `../` specifiers lacking an extension.
- Rewrites directory imports (e.g. `../engine`) to `../engine/index.js`.
- Runs idempotently; safe to invoke multiple times.

If you add new baseline scripts that directly `import` from `dist-baseline`, reuse it:

```ts
import { patchEsmImports } from './scripts/esm-import-patch.mjs';
// ... after building with tsc ...
patchEsmImports('dist-baseline');
```

### Boss Patterns & Projectile Effects

Boss pattern timelines use a deterministic mini script engine (`do`, `wait`, `if`, `loopUntil`, `fork`, `join`) with resume-safe serialization (snapshot schema v7). See [SCRIPT_ENGINE.md](./SCRIPT_ENGINE.md) for step semantics, metrics, determinism guarantees, and authoring guidance.

Boss patterns introduce deterministic scripted challenge phases launched after the first wave (configurable). Current patterns:

| Pattern | Duration (frames) | Duration (s @60fps) | RNG draws | Spawn cadence | Notes |
|---------|-------------------|---------------------|-----------|---------------|-------|
| laser-cross | 180 | 3.0 | 1 at start | none | Baseline intro (no spawns to preserve prior goldens) |
| safe-lane-volley | 240 | 4.0 | 1 at start + per-spawn | Every 30f (0.5s) during frames 60-239 | Alternating hazardous lane (swap at 180f) |
| multi-beam-intersect | 300 | 5.0 | 1 at start + per-spawn | Every 40f (≈0.667s) during frames 60-299 | Orbiting enemies; rotation direction from RNG |
| spiral-barrage | 360 | 6.0 | 1 at start + per-burst | Burst every 20f (frames 40-359) | Rotating arc bursts alternating inward/outward velocities |

Seed heuristic (for golden seeds & ad‑hoc runs):

- Seed containing `spiral` → `spiral-barrage`
- Seed containing `safe` → `safe-lane-volley`
- Seed containing `multi` → `multi-beam-intersect`
- Otherwise → `laser-cross`

Lifecycle summary fields are mandatory in snapshot schema v5: `bossPattern`, `bossStartedFrame`, `bossEndedFrame`, `bossActive` (legacy snapshots upgraded with inactive/null defaults).

Golden tests assert lifecycle invariants when a boss pattern appears:

1. Pattern id matches.
2. Start/end frames match golden.
3. End frame > start frame.

Adding a new pattern:

1. Register id in `initialContent.ts` (keeps registry hash explicit).
2. Provide factory in `bossSystem` map.
3. Implement frame-based timeline (no reliance on wall-clock time).
4. Use minimal RNG draws (document each) – prefer single draw for orientation/seeded variance, then deterministic arithmetic.
5. Add unit test asserting frame duration and deterministic replay (start/end).
6. Add golden seed; regenerate goldens with `UPDATE_GOLDENS=1`.

Schema v5 made boss fields mandatory to simplify downstream analysis & golden enforcement.

### GOLDEN_MODE Guard (Deterministic Baseline Freeze)

`GOLDEN_MODE=1` (environment variable) activates a stability layer used by the golden replay test to freeze a curated set of gameplay tuning knobs so that future balance / pacing experiments do not silently drift the committed golden recordings. When enabled:

- Enemy spawn interval & dynamic center‑kill radius schedule use the frozen (current) values.
- Center arrival kill radius does not reflect any experimental tweaks.
- Player fire interval and boss damage per bullet remain constant.
- Graze & hit radii remain at the frozen values.
- Boss pattern derivation (seed → pattern selection heuristics) is locked.

Design intent: Developers can iterate on balance outside golden mode (normal test runs) without immediately invalidating deterministic artifacts. Golden verification (`golden.replay.test.ts`) forces `GOLDEN_MODE=1` to assert invariants against the stable baseline.

Workflow guidelines:

1. For routine tuning (spawn pacing, radii, damage numbers) adjust only the non‑golden path (leave the guarded block unchanged) and validate behavior via normal tests / manual runs (without `GOLDEN_MODE`).
2. Once new tuning is approved and you intentionally want it to become the new deterministic baseline: update the guarded constants (or remove the old ones), run `UPDATE_GOLDENS=1 npm test --silent -- golden.replay.test.ts` to regenerate, and commit both the code + updated `golden/runRecordings.json` with rationale.
3. If adding a new parameter that should remain stable for golden runs, wrap it in the existing `if (process.env.GOLDEN_MODE)` (or equivalent) block in its system file and document it briefly in the commit message.
4. Never mix unrelated balance experiments with a golden rotation commit; keep rotations reviewable (golden diff should only show intended field changes).

If a future system significantly expands deterministic state (e.g., new boss phases or scoring subsystems) consider adding its critical invariants under the guard before regenerating goldens so that subsequent tuning stays opt‑in.

### Pre-Commit Hook (Local Guardrail)

A lightweight Husky pre-commit hook enforces fast feedback locally:

Steps executed (skipped automatically in CI via `CI` env detection):

1. `npm run lint:ts` – strict TypeScript ESLint (no warnings allowed)
2. `npm run typecheck` – `tsc --noEmit` to catch type regressions early
3. `npm run golden:monitor` – regenerates actual recordings under `GOLDEN_MODE=1` + extended metrics and diffs vs committed goldens

Behavior:

- If golden monitor reports drift (prints `DRIFT_DETECTED`) the commit is blocked. Rotate goldens intentionally with:
	```bash
	UPDATE_GOLDENS=1 npm run test:golden
	git add golden/runRecordings.json
	git commit -m "chore(golden): rotate (reason)"
	```
- The hook is deliberately minimal (no full test run) to keep latency low (<2s typical). Full suite still enforced in CI.
- CI already runs golden diff & monitor; skipping the hook there avoids redundant work.

Adjust / opt-out:

- One-off bypass: `SKIP_PRECOMMIT=1 git commit -m "msg"`.
- Add a quick perf smoke (≈1s) by opting in: `PRECOMMIT_PERF=1 git commit -m "msg"` (runs `perf:check --frames 300 --seeds a,b`).
- Permanently disable locally: remove/rename `.husky/pre-commit` (not recommended) or export `SKIP_PRECOMMIT=1` in your shell profile.
- Tighten or relax perf smoke parameters in the hook if false positives occur (e.g. increase frames or bins for stability).

Rationale: Developers see deterministic drift immediately (especially overdrive / graze / boss lifecycle metrics) before opening a PR, reducing noisy review iterations.

#### Husky Version

Pinned via `devDependencies` to `"husky": "^9.0.0"`. If upgrading to v10+:

1. Remove legacy shim lines (already removed in this repo).
2. Re-run `npm install` (prepare script re-installs hooks).
3. Confirm hook still exits early for `CI` / `SKIP_PRECOMMIT` and optional perf smoke remains functional.

### Coverage Badge Generation

Local coverage badge (statements %) generated via:

```bash
npm run coverage:badge
```

Updates `coverage-badge.svg` referenced at the top of this README. Commit changes after meaningful coverage shifts. (CI publishes coverage artifact but does not auto-update the badge to avoid autonomous commits.)

On pushes to `main`, a dedicated workflow regenerates the badge; if it changes it is committed automatically with `[skip ci]` to avoid recursive runs.


Alternative approaches (e.g. authoring source imports with explicit `.js` or using a bundler) were avoided to keep in-repo source ergonomics and avoid extra build tooling for the minimal deterministic harness.

### Bundle Size Regression Guard

`npm run size:regression` builds a minimal production bundle (`dist/size-check.js`) via esbuild and measures its gzip size. A baseline (`size-baseline.json`) is created on first run and updated automatically when size decreases (or when an increase is explicitly accepted).

Failure criteria (non-override):

- Absolute growth > 5KB OR
- Relative growth > 5%

Override & accept a deliberate increase:

```bash
SIZE_ALLOW_REGRESSION=1 npm run size:regression
git add size-baseline.json
git commit -m "chore(size): accept increase rationale"
```

Rationale: Prevent unnoticed asset creep in core deterministic harness. Thresholds are intentionally forgiving early; tighten later as content stabilizes.

### Snapshot Upgrade Negative Tests

`serialization.upgrade.negative.test.ts` adds defensive coverage for malformed / legacy snapshots:

- Ensures latest snapshots return by reference (no copy churn)
- Upgrades v1–v4 (and even unknown future numeric versions) to v5 defaults for new metrics & boss lifecycle fields
- Ignores extraneous unexpected fields
- Confirms parallax layer absence doesn't introduce empty arrays unnecessarily

These tests reduce risk when editing `upgradeSnapshot()` or introducing v5+; expand with additional edge cases (e.g. truncated registries, NaN times) if future bugs surface.
