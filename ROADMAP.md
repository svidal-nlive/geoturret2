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
- ⏳ Expand object pooling (particles, powerups, coins, enemy shots already pooled; add pattern projectiles)
- ⏳ Data registries: `enemies`, `powerups`, `upgrades`, `waveMods`, `bossPatterns`
- ⏳ Boss pattern scripting interface (timeline/state machine API)
- ✅ State serialization (run summary + seed export + restore path v1, migration TBD)
- ⏳ Basic unit tests: spawn budget, wave progression, graze/overdrive, pooling recycle
- ⏳ Headless simulation test (waves 1–15) parity check
- ✅ Performance micro-profiler (dev overlay) – update vs render split
- 🧩 CI pipeline scaffold (lint, unit, golden, build, size done; simulation/smoke pending)
- ⏳ Dependency & image vulnerability scan (npm audit + Trivy)
- ✅ Early error boundary & ring buffer logging (moved up from Phase 4)
- (Removed) RNG wrapper shim (all legacy Math.random eliminated)
- ✅ Camera lead, bounds, deadzone, zoom & shake refinements
- ✅ Parallax background system + persistence (URL + localStorage) & runtime layer APIs
- ✅ Snapshot schema v3 (parallax layer metadata) & golden recording regeneration (added parallax validation)

Exit Criteria:

- All v1 mechanics functional (waves, modifiers, shop, boss phases) running through refactored pipeline
- Simulation test passes deterministically ≥3 consecutive runs with same seed
- Frame time not worse than v1 (>10% regression budget flagged)
- CI pipeline passes all configured stages (lint, unit, sim, build, bundle size)
- Error boundary captures and buffers runtime errors for export

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

- ⏳ Motion reduction mode (disable shake/parallax, particle cap)
- ⏳ Overdrive explicit meter (fill + duration countdown)
- ⏳ Audio ducking (laser / shield break) + master volume slider
- ⏳ Enhanced color palettes (dark + high contrast + colorblind sets)
- ⏳ Safe lane highlight intensity slider
- ⏳ HUD redesign (distinct health vs armor, coin counter + gain delta flash, active upgrade icons w/ stacks, power-up timers)
- ⏳ Coin gain feedback polish (aggregate bursts, pulse animation)
- ⏳ Upgrade summary panel (collapsible / persistent strip) (see `UI_WIREFRAMES.md` §1)

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
- ⏳ Bundle size budget enforcement (<=120KB gz core)
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

- 2025-08-22: Marked module extraction, event bus, profiler, RNG shim, camera enhancements, parallax system, and snapshot v3 as complete; partial status for RNG full injection & serialization restore path. Added golden replay validation note.
	- Added error boundary ring buffer implementation & tests.
		- Added initial CI workflow (lint, typecheck, tests, golden, build, bundle size, perf optional) & size budget script (gzip limit 130KB).
	- Added snapshot restore implementation + helper (`createOrchestratorFromSnapshot`) and determinism tests.
	- Added registry hash mismatch validation test for snapshot restore.
	- Overall test coverage stabilized ~90% statements (v8 provider) after focused runtime tests & exclusions.
	- Added long-run accelerated simulation harness (`simCore.ts`, `sim-run.ts`) + determinism verify + baseline hash check integrated into CI.
	- Committed initial simulation baseline (`scripts/sim-baseline.json`) for gameplay drift detection (wave 15 hash lock).
