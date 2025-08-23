# Geoturret 2 (Alpha Planning Scaffold)

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
- Long-run accelerated headless simulation harness (`scripts/simCore.ts`, `sim-run.ts`)
- Determinism verification script (`scripts/sim-verify.ts`) and baseline hash guard (`scripts/sim-baseline.json`, `sim-baseline-check.ts`)
- Performance baseline tooling (histograms + memory growth) & optional CI enforcement
- CI stages: lint, typecheck, unit + determinism, long sim verify, baseline hash, golden replay, build, size, perf (optional)
- ~90% statement coverage (Vitest + v8)

## Scripts

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run test:sim:long        # accelerated wave 1->15 JSON output
npm run test:sim:verify      # determinism (same seed twice) + seed differentiation
npm run test:sim:baseline    # assert current gameplay hash matches committed baseline
npm run build
npm run perf:baseline   # generate/update perf-baseline.json (profiling stats & suggested thresholds)
npm run perf:check      # enforce thresholds using perf-baseline.json
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

Overlay fields: seed, frame, time, kills, wave, pool usage (enemy & bullet inUse/free), pause indicator, optional system timings. Kills & pool stats should be identical for same seed & simulated time across reloads. Wave currently advances on kill thresholds (scaling target: initial 10, +25% rounded each wave).

Determinism quick check: reload with same seed and compare logged snapshot `rngState` after ~1s.

### Run Snapshot (v5)

`GameOrchestrator.snapshot()` (schema v5) fields:

- `version`: 5
- `frame`: number
- `time`: simulated seconds
- `rngState`: internal RNG numeric state
- `registries`: current registry listings (ids + metadata)
- `registryHash`: djb2 hex digest of sorted registry ids (integrity & drift detection)
- `summary`: `{ kills, wave, grazeCount, overdriveMeter, overdriveActive, parallaxLayers?, bossActive, bossPattern, bossStartedFrame, bossEndedFrame }` (older v1–v4 snapshots are auto-upgraded; new mandatory boss fields default to inactive/null lifecycle).
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

### Replay Harness & Golden Recordings (v5 Metrics & Boss Enforcement)

Deterministic verification utility (`src/devtools/replay.ts`):

```ts
import { recordRun, replayRun } from './devtools/replay';
const rec = recordRun({ seed: 'abc', duration: 10 });
const result = replayRun(rec);
console.log(result.ok, result.differences);
```

Recorded payload (`RunRecording`) stores seed, duration, fixedStep, final snapshot and summary stats (kills, wave). Replay recomputes and flags any drift across core invariants (frame, time, rngState, registryHash, kills, wave). This underpins future regression detection (e.g., store golden recordings per commit).

Golden recordings (`golden/runRecordings.json`) are verified in CI to catch deterministic drift. As of schema v5, graze & overdrive metrics plus boss lifecycle fields are enforced in golden verification. A dedicated golden case `g4-grazeOD` (legacy seed name retained) exercises non-zero graze accumulation and overdrive activation. Boss pattern cases (`g5-boss`, `g6-boss-safe`, `g7-boss-multi`) lock lifecycle timing & spawn pacing.

Regenerate intentionally after approved gameplay / balance changes:

```bash
UPDATE_GOLDENS=1 npm test --silent -- golden.replay.test.ts   # or: UPDATE_GOLDENS=1 npm run test:golden
git add golden/runRecordings.json
```

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

Boss patterns introduce deterministic scripted challenge phases launched after the first wave (configurable). Current patterns:

| Pattern | Duration (frames) | Duration (s @60fps) | RNG draws | Spawn cadence | Notes |
|---------|-------------------|---------------------|-----------|---------------|-------|
| laser-cross | 180 | 3.0 | 1 at start | none | Baseline intro (no spawns to preserve prior goldens) |
| safe-lane-volley | 240 | 4.0 | 1 at start + per-spawn | Every 30f (0.5s) during frames 60-239 | Alternating hazardous lane (swap at 180f) |
| multi-beam-intersect | 300 | 5.0 | 1 at start + per-spawn | Every 40f (≈0.667s) during frames 60-299 | Orbiting enemies; rotation direction from RNG |

Seed heuristic (for golden seeds & ad‑hoc runs):

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


Alternative approaches (e.g. authoring source imports with explicit `.js` or using a bundler) were avoided to keep in-repo source ergonomics and avoid extra build tooling for the minimal deterministic harness.

### Snapshot Upgrade Negative Tests

`serialization.upgrade.negative.test.ts` adds defensive coverage for malformed / legacy snapshots:

- Ensures latest snapshots return by reference (no copy churn)
- Upgrades v1–v4 (and even unknown future numeric versions) to v5 defaults for new metrics & boss lifecycle fields
- Ignores extraneous unexpected fields
- Confirms parallax layer absence doesn't introduce empty arrays unnecessarily

These tests reduce risk when editing `upgradeSnapshot()` or introducing v5+; expand with additional edge cases (e.g. truncated registries, NaN times) if future bugs surface.
