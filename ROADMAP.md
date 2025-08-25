# Geoturret 2 Roadmap

Status legends:

- ✅ Done (v1 carried forward or already implemented during v2 Alpha)
- 🧩 In Progress
- ⏳ Planned / Backlog
- 💡 Idea / Stretch
- 🔬 Experimental / Validate First

## Phase 0 – Baseline Audit & Planning (Complete)

- ✅ Inventory v1 features / mechanics / tooling
- ✅ Draft PRD & v2 roadmap
- ✅ Identify refactor boundaries (systems, registries, deterministic RNG)

## Phase 1 – Architectural Refactor (Alpha)

Goal: Extract systems; achieve feature parity with v1 (arena + boss) under modular design; lay foundations for determinism & tests.

Core Tasks:

- ✅ Module extraction (`engine`, `systems`, `content`, `state`, `devtools`)
- ✅ Deterministic RNG wrapper; injected across systems (shim removed)
- ✅ Centralized event bus (lightweight) for UI & dev tools
- ✅ Expand object pooling (pattern projectiles & particles pooled + reuse tests in place)
- ✅ Data registries (ids + versions + hash + summary + versionMap helper & diff tooling)
- ✅ Boss pattern scripting interface (timeline/state machine execution engine, instrumentation, resume parity, metrics, docs)
- ✅ State serialization (run summary + seed export + restore path) (schema v7: boss lifecycle, graze/overdrive, versionMap, bossPatternState script runner persistence)
- ✅ Basic unit tests: spawn budget, wave progression, graze/overdrive, pooling recycle (P1-8 core suite complete)
- ✅ Headless simulation test (waves 1–15) parity check (accelerated deterministic harness + progression signature & boss multi-run guard)
- ✅ Performance micro-profiler (dev overlay) – update vs render split
- ✅ CI pipeline (lint, typecheck, coverage, golden replay + versionMap diff, perf check, size, registry freshness, extended sim & roadmap sync guard, boss multi-run determinism, vuln enforcement baseline). Pending in Phase 2: Playwright smoke, accessibility scan gating.
- ✅ Dependency & image vulnerability scan (npm audit enforced for prod deps + Trivy workflow; severity policy to refine later)
- ✅ Early error boundary & ring buffer logging (moved up from Phase 4)
- (Removed) RNG wrapper shim (all legacy Math.random eliminated)
- ✅ Camera lead, bounds, deadzone, zoom & shake refinements
- ✅ Parallax background system + persistence (URL + localStorage) & runtime layer APIs
- ✅ Snapshot schema v3 (parallax layer metadata) -> evolved to v7 (bossPatternState for mid-pattern resume)

Exit Criteria:

- All v1 mechanics functional (waves, modifiers, shop, boss phases) running through refactored pipeline (FOUNDATIONAL SUBSET ACHIEVED; shop UI polish & modifiers breadth deferred to Phase 2 scope per 2025-08-24 note)
- Simulation test passes deterministically ≥3 consecutive runs with same seed (accelerated harness + boss multi-pattern baseline)
- Frame time not worse than v1 (>10% regression budget flagged) (perf thresholds + micro-profiler tests green)
- CI pipeline passes all configured stages (lint, unit, sim, build, bundle size, boss determinism, registry freshness) (smoke/accessibility deferred to Phase 2)
- Error boundary captures and buffers runtime errors for export (implemented & tested)

## Phase 2 – Content & Clarity (Beta)

Goal: Improve fairness, readability, accessibility, and boss variety.

Boss & Combat:

- ⏳ New boss patterns: dual crossing lasers, shifting safe-lane volley, multi-beam intersection
- ⏳ Pattern fairness auto-adjust (lane widen after recent hit, telegraph min durations)
- ⏳ Pre-laser safe-lane arc preview marker
- ⏳ Additional pod aftermath polish (embers, fading glow)
- ⏳ Difficulty scaling tables externalized (JSON / config module)

Wave Modifiers 2.0:

- ⏳ Synergy rules (e.g., storm+shielder balancing, drift+gravity disallow)
- ⏳ Pre-wave preview panel (icons + text + accessibility labels)
- ⏳ Mod combo enumeration test harness

Accessibility & UX:

		- 🧩 Motion reduction mode (camera shake suppression, particle thinning, burst suppression, HUD effect simplification, parallax freeze + overdrive pulse removal; pending: explicit parallax toggle UX & audio ducking tie-in) (2025-08-25)
	- ✅ Overdrive explicit meter (fill + duration countdown + active state text) (2025-08-25)
		- 🧩 Audio ducking (playerHit / death events, master volume slider; pending: sound asset integration & category balancing) (2025-08-25)
	- 🧩 Enhanced color palettes (dark + high contrast + colorblind sets + contrast audit tooling)
	- ✅ Safe lane highlight intensity slider (state + API + UI slider + persistence) (2025-08-25)
	- 🧩 HUD redesign (implemented: coins/wave/seed, overdrive meter line & pct, health & armor bars with low/critical states + dynamic pulse, coin delta flash placeholder, damage flash, death overlay & restart; pending: upgrade icons, power-up timers, shop integration polish) (2025-08-25)
	- ⏳ Coin gain feedback polish (aggregate bursts, pulse animation)
	- ⏳ Upgrade summary panel (collapsible / persistent strip) (see `UI_WIREFRAMES.md` §1)
	- ✅ Enemy bounty & coin economy system (kill -> coins, single-award guard, HUD coin delta groundwork) (2025-08-25)
	- ✅ Survivability system (armor absorbs then health, events, damage flash, death overlay & non-reload restart scaffolding) (2025-08-25)

Shop & Economy:

- ⏳ Hold-to-reroll (≥550ms) interaction with progress ring
- ⏳ Rarity / discount badges with accessible tooltips
- ⏳ Improved reroll cost scaling feedback (next cost precomputed)
- ⏳ Shop categorization (Offense / Defense / Utility / Economy) & layout reorg
- ⏳ Settings menu grouping (Gameplay / Accessibility / Audio / Performance) + future search placeholder

Testing:

- ⏳ Playwright smoke: load -> wave clear -> shop interaction -> boss intro skip
- ⏳ Boss pattern screenshot capture (telegraph frame)
- ⏳ Failure artifact export (images + JSON seed) for repro
- ⏳ Client telemetry schema (waveReached, bossPatternFail, runEnd) local export only
	- 🧩 Bundle size budget enforcement (<=120KB gz core) (size regression guard active; minimal core baseline 7.34KB via `size-entry` + diagnostics; next: modularize optional systems to push core <6KB & set stricter gate)
- ⏳ Automated accessibility scan (axe-core) in Playwright
- ⏳ Telegraph snapshot & safety coverage assertion harness

Exit Criteria:

- All new patterns integrated & pass fairness thresholds
- Accessibility features toggleable & persisted
- Smoke tests green in CI (local / containerized)
- Bundle size within budget & no critical accessibility violations
- Telegraph safety coverage assertions pass for all new boss patterns

## Phase 3 – Meta & Persistence (Release Candidate)

Goal: Light meta progression & retention features.

- ⏳ Recent Runs log (last 5) with seed, wave, score, build summary
- ⏳ Unlock flags (cosmetic palette, extra preset) triggered by milestones (e.g., first boss defeat, wave 30, no-damage boss)
- ⏳ Basic cosmetic system (palette swap & optional particle trail variant with perf guard)
- ⏳ Seed share URL generation (`?seed=...` + optional mod flags)
- ⏳ Version / build hash display (footer / console)
- ⏳ README + Dev Guide update (systems diagram)
- ⏳ Persistence migration framework + test (v1→v2)
- ⏳ SLO definition (fps p95, crash rate) & overlay display

Exit Criteria:

- Meta data persists across reload (versioned schema)
- Unlock gating stable and test-covered
- No uncaught errors in 50 automated simulation runs

## Phase 4 – Polish & Performance (2.0 Release)

- ⏳ Final balance pass (enemy frequency curves, upgrade cost, Overdrive pacing)
- ⏳ Particle & allocation audit (no sustained growth >5MB after 20 min test)
- ⏳ Lazy-load dev tooling bundle
- ⏳ Lighthouse pass (PWA decision postponed or included if trivial)
- ⏳ Traefik routing live at `gt2.vectorhost.net` (smoke healthcheck)
- ⏳ Error boundary & console error capture (local ring buffer only)
- ⏳ Rollback playbook & tagged image promotion workflow

## Post 2.0 Backlog / Stretch

Gameplay & Systems:

- 💡 Elite enemy variants (fast / armored / volatile)
- 💡 Additional wave mods (time dilation zone, rotating walls, hazard rings)
- 💡 Focus mode (hold to narrow spread, accuracy reward)
- 💡 Expanded Overdrive / Bomb synergy (invulnerability window)
- 💡 Meta progression tree (unlock upgrade tiers / patterns)

Platform / Infra:

- 💡 PWA offline caching & install banner
- 💡 Basic analytics (privacy-preserving, opt-in)
- 💡 Cloud save / sync abstraction (future server integration)

Visual & Audio:

- 💡 Dynamic background layers & subtle gradient cycles (respect motion reduction)
- 💡 Additional audio stingers & ambient layer (adaptive with intensity)

Testing / Tooling:

- 🔬 Visual regression diffing for telegraph frames
- 🔬 Automated fairness analyzer (min safe-lane coverage metrics) per pattern build

## Deferred / Explicit Non-Goals (v2 Cycle)

- Multiplayer / co-op
- Server authoritative progression
- Real-money transactions
- Cross-session leaderboards (until privacy policy & backend considered)

## Tracking & Metrics

- Add lightweight metrics overlay (dev only): object counts, avg frame ms, pattern id.
- Manual log export for simulation harness (CSV/JSON).

## High-Level Timeline (Indicative)

| Phase | Duration | Window |
|-------|----------|--------|
| 0 | 1w | Complete |
| 1 | 2–3w | Alpha |
| 2 | 2w | Beta |
| 3 | 1–1.5w | RC |
| 4 | 1w | Release |

(Tune based on complexity discovered during refactor.)

## Acceptance & Exit Quality Gates

- All automated tests green (unit + simulation + smoke)
- Deterministic seed reproducibility verified across at least 3 devices / browsers
- Performance budgets met (frame, memory, bundle size)
- Accessibility audit checklist (contrast, focus order, reduced motion) passed

---

This roadmap will evolve; major deltas reflected in CHANGELOG and annotated here with date-stamped notes.

Update Notes:

- 2025-08-24: Phase 1 exit gate (P1-XC) implemented (`p1-exit-gate.mjs`) aggregating core integration, progression parity, deterministic sim verify, boss multi-pattern baseline, performance thresholds, registry freshness. CI + local run PASS. Marked headless simulation, CI pipeline, and dependency scan tasks complete; snapshot schema noted at v7. Remaining Phase 1 originally-scoped shop/mod breadth moved explicitly to Phase 2.

- 2025-08-24: Boss pattern scripting engine finalized (fork/join aggregation, executedLabelCounts + rngDraws parity instrumentation, nested fork parity & metrics schema guard tests). Snapshot schema advanced to v7 adding `bossPatternState` for mid-pattern resume determinism. ROADMAP & checklist updated (P1-6 complete). Added SCRIPT_ENGINE.md and README link.

- 2025-08-25: Bundle size baseline raised to 7.34KB (core minimal entry) after adding size diagnostics & `src/size-entry.ts`. Tracking TODO (Phase 2 tooling): modularize optional subsystems (audio manager, boss system, extended HUD, contrast audit, large theme palettes) behind dynamic imports to target <6KB gzip core with lazy load for non-critical UX. Evaluate splitting `renderSystem` heavy HUD/theme code and deferring palette audit to user interaction. Add follow-up size budget tightening once modularization complete.
\n+- 2025-08-25: Accepted boss simulation deterministic baseline refresh (fairness/pattern adjustments increased frame counts & kill metrics). Updated `boss-sim-baseline.json`; reinforced multi-run guard. Strategy: treat future deterministic drift as intentional only when tied to fairness accessibility improvements (document & rotate baseline) vs unintended regressions (investigate).\n*** End Patch

- 2025-08-22: Marked module extraction, event bus, profiler, RNG shim, camera enhancements, parallax system, and snapshot v3 as complete; partial status for RNG full injection & serialization restore path. Added golden replay validation note.
	- Added error boundary ring buffer implementation & tests.
		- Added initial CI workflow (lint, typecheck, tests, golden, build, bundle size, perf optional) & size budget script (gzip limit 130KB).
	- Added snapshot restore implementation + helper (`createOrchestratorFromSnapshot`) and determinism tests.
	- Added registry hash mismatch validation test for snapshot restore.
	- Overall test coverage stabilized ~90% statements (v8 provider) after focused runtime tests & exclusions.
	- Added long-run accelerated simulation harness (`simCore.ts`, `sim-run.ts`) + determinism verify + baseline hash check integrated into CI.
	- Committed initial simulation baseline (`scripts/sim-baseline.json`) for gameplay drift detection (wave 15 hash lock).
- 2025-08-23: RNG injection completed (legacy Math.random removed); snapshot schema bumped to v5 (boss lifecycle, graze/overdrive metrics); performance baseline tooling enhanced (robust spike trimming, per-seed memory enforcement); new boss pattern `spiral-barrage` integrated with golden & spawn delta test; bullet system optimized (angle precompute, batched spawns) reducing spike volatility.
- 2025-08-23: Snapshot schema bumped to v6 (versionMap for registries) + registry version fields & validation tests added.
	- Added Registries.versionMap helper + versionMap diff in golden replay workflow; registry summary freshness check & script fallback to source.
	- Data registries breadth & balance moved to Phase 2 Content Registry breakdown (CR list) to keep Phase 1 focused on platform foundations.
