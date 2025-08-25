# Geoturret 2 – Progress Checklist

Living checklist derived from `ROADMAP.md` and `PRD.md`. Update this file with each meaningful change (feature completion, scope adjustment, date-stamped notes). Keep changes focused and atomic.

Legend:

- [x] Done / merged into main
- [>] In progress (open PR or active branch)
- [~] Partial (scaffold landed, follow-ups pending)
- [ ] Not started / backlog
- [!] Blocked / needs decision
- [Δ] Changed scope (amended vs original roadmap)

Add date-stamped notes under the related phase section when status changes. Example: `2025-08-24: Marked deterministic RNG wrapper complete (#42).`

---

## Phase 0 – Baseline Audit & Planning (Complete)

| ID | Item | Status | Notes |
|----|------|--------|-------|
| P0-1 | Inventory v1 features / mechanics / tooling | [x] | 2025-08-22 Completed during initial analysis |
| P0-2 | Draft PRD & v2 roadmap | [x] | 2025-08-22 PRD.md & ROADMAP.md created |
| P0-3 | Identify refactor boundaries | [x] | 2025-08-22 Module breakdown captured in PRD |

## Phase 1 – Architectural Refactor (Alpha)

| ID | Item | Status | Notes |
|----|------|--------|-------|
| P1-1 | Module extraction (engine, systems, content, state, devtools) | [x] | 2025-08-22 initial scaffold; 2025-08-22 finalized separation + parallax/camera systems added |
| P1-2 | Deterministic RNG wrapper & injection everywhere | [x] | 2025-08-22 pattern established (randomCounterSystem); 2025-08-23 legacy Math.random removed (grep audit) |
| P1-3 | Central event bus | [x] | 2025-08-22 bus implemented (emit/on/off/clear) stable |
| P1-4 | Expand object pooling (add pattern projectiles) | [x] | 2025-08-22 generic pool scaffold; enemy & bullet pooling integrated; 2025-08-23 pattern projectile pool + system added; 2025-08-23 particle pool + system + render & reuse tests added; 2025-08-23 specialized particle variants (spark, ember, trail, burst) added & pooled |
| P1-5 | Data registries (enemies, powerups, upgrades, waveMods, bossPatterns) | [x] | 2025-08-22 scaffold + placeholder content; 2025-08-23 tooling added (hash print, summary, versionMap persisted); 2025-08-23 versionMap helper + completeness test + script added. Further content breadth & balance moved to Phase 2 CR items. |
| P1-6 | Boss pattern scripting interface (timeline/state machine API) | [x] | 2025-08-24 finalized: fork/join aggregation, executedLabelCounts & rngDraws instrumentation, resume parity + nested fork tests, metrics/schema guard, documentation (SCRIPT_ENGINE.md) |
| P1-7 | State serialization (run summary + seed export) | [x] | 2025-08-24 schema v7 adds bossPatternState (script runner persistence) enabling deterministic mid-pattern resume; prior: v3 parallax, v5 boss lifecycle/graze/overdrive, v6 versionMap |
| P1-8 | Basic unit tests (spawn budget, wave progression, graze/overdrive, pooling recycle) | [x] | 2025-08-24 core integration test `core.p1-8.test.ts` + supporting system tests landed; deterministic multi-run boss + wave sims guard regression |
| P1-9 | Headless simulation test (waves 1–15 parity) | [x] | 2025-08-24 progression parity test (longSimulation.progression.test.ts) asserts wave transition signature to 15 |
| P1-10 | Performance micro-profiler overlay | [x] | 2025-08-22 per-system timing core; overlay toggled with 'p' |
| P1-11 | CI pipeline scaffold (lint/unit/sim/build/size/smoke) | [~] | 2025-08-22 initial workflow; 2025-08-23 added versionMap diff + registry freshness; pending smoke + extended sim gating |
| P1-12 | Dependency & image vulnerability scan setup | [~] | 2025-08-22 npm audit + script placeholder; 2025-08-23 Trivy workflow added; gating thresholds TBD |
| P1-13 | Early error boundary & ring buffer logging | [x] | 2025-08-22 ring buffer scaffold; 2025-08-23 integrated into failure capture plan |
| P1-14 | RNG wrapper shim (pre-refactor) | [x] | 2025-08-22 shim util added |
| P1-XC | Exit criteria met (determinism, parity, perf budget) | [x] | 2025-08-24 p1-exit-gate.mjs PASS (integration, progression signature, sim verify, boss multi-run, perf, registry) |

## Phase 2 – Content & Clarity (Beta)

| ID | Item | Status | Notes |
|----|------|--------|-------|
| P2-1 | New boss patterns (dual crossing lasers) | [ ] | |
| P2-2 | New boss pattern (shifting safe-lane volley) | [ ] | |
| P2-3 | New boss pattern (multi-beam intersection) | [x] | Implemented (multi-beam-intersect pattern w/ rotation phase) |
| P2-4 | Pattern fairness auto-adjust logic | [x] | Fairness system emits adjustmentFactor; integrated into volley, converge, telegraph visuals |
| P2-5 | Pre-laser safe-lane arc preview marker | [x] | pre-laser-arc-preview + chained laser-arc-sweep pattern |
| P2-6 | Pod aftermath polish (embers / glow) | [ ] | |
| P2-7 | Externalized difficulty scaling tables | [ ] | |
| P2-8 | Wave mod synergy rules | [ ] | |
| P2-9 | Pre-wave preview panel (icons + labels) | [ ] | |
| P2-10 | Mod combo enumeration test harness | [ ] | |
| P2-11 | Motion reduction mode | [~] | 2025-08-25 shake suppressed, particles thinned, coin bursts disabled, parallax frozen, overdrive pulse removed, global body class, parallax disable UI added; pending palette accessibility & final audio polish |
| P2-12 | Overdrive explicit meter | [x] | 2025-08-25 meter + active state + remaining time HUD |
| P2-13 | Audio ducking + volume slider | [~] | 2025-08-25 audio manager scaffold, duck on hit/death, master volume + hotkeys; pending asset pipeline |
| P2-14 | Enhanced color palettes (contrast + colorblind + dark) | [~] | 2025-08-25 highContrastDark + audit API (paletteAudit / auto mode) added; remaining: live contrast overlay opt-in |
| P2-15 | Safe lane highlight intensity slider | [x] | 2025-08-25 slider + persistence + API |
| P2-15a | HUD redesign (health/armor, coins, upgrades, timers) | [~] | 2025-08-25 core bars, meter, coin delta placeholder, damage flash, death overlay; pending icons/timers |
| P2-15b | Coin gain feedback polish | [x] | 2025-08-25 fade smoothing, bursts (motion aware), SR debounce, gain/spend styling |
| P2-15c | Upgrade summary panel | [ ] | |
| P2-16 | Hold-to-reroll interaction | [ ] | |
| P2-17 | Rarity / discount badges + tooltips | [ ] | |
| P2-18 | Reroll cost scaling feedback | [ ] | |
| P2-19 | Playwright smoke tests | [x] | 2025-08-25 baseline smoke + accessibility strict gate merged |
| P2-20 | Boss pattern screenshot capture | [ ] | |
| P2-21 | Failure artifact export (images + seed JSON) | [ ] | |
| P2-22 | Shop categorization & layout reorg | [ ] | |
| P2-23 | Settings menu grouping | [ ] | |
| P2-24 | Client telemetry schema (local export) | [ ] | |
| P2-25 | Bundle size budget enforcement | [ ] | |
| P2-26 | Automated accessibility scan (axe-core) | [x] | 2025-08-25 strict axe (0 violations) enforced in smoke.spec |
| P2-27 | Telegraph safety coverage harness | [ ] | |
| P2-XC | Exit criteria met (patterns, accessibility, smoke green) | [ ] | Gate |

### Phase 2 – Content Registry Breakdown (Granular Tracking)

Fine-grained items to visualize breadth & allow partial landing without inflating primary table. Link back to P1-5 (registries) & P2 pattern/content goals.

| ID | Item | Status | Notes |
|----|------|--------|-------|
| P2-CR1 | Enemy: Shielded Drone (front arc shield, angle telegraph) | [ ] | Requires collision layering refinement |
| P2-CR2 | Enemy: Phase Skirmisher (brief invuln blink) | [ ] | Needs deterministic blink schedule tied to seed |
| P2-CR3 | Enemy: Burst Swarm (on-death radial micro-shots) | [ ] | Pool integration extension |
| P2-CR4 | Powerup: Chain Lightning (jump arcs) | [ ] | Balance jump falloff table externalized |
| P2-CR5 | Powerup: Temporal Slow (short burst field) | [ ] | Must respect motion reduction mode (P2-11) |
| P2-CR6 | Upgrade: Graze Multiplier Tiering | [ ] | Scales overdrive charge efficacy |
| P2-CR7 | Upgrade: Overdrive Extender (duration + decay curve) | [ ] | Needs new scalar in snapshot schema v7? |
| P2-CR8 | Upgrade: Projectile Pierce (limited passes) | [ ] | Pool accounting for pierce decrement |
| P2-CR9 | Boss Pattern: Spiral Barrage (seed-stable) | [~] | 2025-08-23 core spawn loop landed; polish pending |
| P2-CR10 | Boss Pattern: Rotating Safe Donut (gap orbit) | [ ] | Collision mask choreography |
| P2-CR11 | Wave Mod: Pulsing Hazard Field | [ ] | Telemetry hook for exposure time |
| P2-CR12 | Wave Mod: Moving Safe Lane (laterally shifting) | [ ] | Requires camera-follow decoupling review |
| P2-CR13 | Registry auto-version stamp script | [ ] | Extends versionMap generation (P1-5 follow-up) |
| P2-CR14 | Balance pass: Tier baseline DPS curve doc | [ ] | Export table + graph artifact |
| P2-CR15 | Fairness harness: pattern survivability sim | [ ] | Headless multi-seed Monte Carlo |
| P2-CR16 | Content diff report (added/removed IDs) | [ ] | Pre-commit script + markdown summary |

## Phase 3 – Meta & Persistence (RC)

| ID | Item | Status | Notes |
|----|------|--------|-------|
| P3-1 | Recent Runs log | [ ] | |
| P3-2 | Unlock flags (cosmetics / preset) | [ ] | |
| P3-3 | Cosmetic system (palette + particle variant) | [ ] | |
| P3-4 | Seed share URL generation | [ ] | |
| P3-5 | Version / build hash display | [ ] | |
| P3-6 | README + Dev Guide update (systems diagram) | [ ] | |
| P3-7 | Persistence migration framework + test | [ ] | |
| P3-8 | SLO definition & overlay | [ ] | |
| P3-XC | Exit criteria met (meta persistence stable) | [ ] | Gate |

## Phase 4 – Polish & Performance (Release)

| ID | Item | Status | Notes |
|----|------|--------|-------|
| P4-1 | Final balance pass | [ ] | |
| P4-2 | Particle & allocation audit | [ ] | |
| P4-3 | Lazy-load dev tooling bundle | [ ] | |
| P4-4 | Lighthouse pass (decision on PWA) | [ ] | |
| P4-5 | Traefik routing live at gt2.vectorhost.net | [ ] | |
| P4-6 | Error boundary & console error capture | [ ] | |
| P4-7 | Rollback playbook & tagged image promotion | [ ] | |
| P4-XC | Release gate (tests green, budgets, accessibility) | [ ] | Gate |

## Post 2.0 Backlog / Stretch (Non-Blocking)

| ID | Item | Status | Notes |
|----|------|--------|-------|
| B-1 | Elite enemy variants | [ ] | |
| B-2 | Additional wave mods (time dilation, rotating walls, hazard rings) | [ ] | |
| B-3 | Focus mode | [ ] | |
| B-4 | Expanded Overdrive / Bomb synergy | [ ] | |
| B-5 | Meta progression tree (expanded) | [ ] | |
| B-6 | PWA offline caching | [ ] | |
| B-7 | Basic analytics (opt-in) | [ ] | |
| B-8 | Cloud save / sync abstraction | [ ] | |
| B-9 | Dynamic background layers | [ ] | |
| B-10 | Additional audio stingers / ambient layer | [ ] | |
| B-11 | Visual regression diffing for telegraph frames | [ ] | |
| B-12 | Automated fairness analyzer | [ ] | |

## Deferred / Explicit Non-Goals (Reference)

- Multiplayer / co-op
- Server authoritative progression
- Real-money transactions
- Cross-session leaderboards

## Update Log

(Add newest entries at top)

- 2025-08-25: Implemented economy (enemy bounty -> coins) & survivability (armor/health, damage flash, death overlay, in-place restart). Overdrive meter & active state HUD (P2-12) complete. Safe lane intensity slider fully wired (P2-15). HUD redesign partial (P2-15a) – remaining: upgrade icons, power-up timers, coin gain polish (P2-15b in progress). Added non-reload resetGame scaffold.
	- 2025-08-25: Fairness auto-adjust scaffold: added adjustmentFactor (widen heuristic) + event 'fairnessAdjust'; recentHits decay & unsafe time heuristic (P2-4 partial). Added theme accessibility auto-selection & audit, highContrastDark palette, UI controls for auto mode + interval.

- 2025-08-24: Phase 1 exit criteria (P1-XC) satisfied; gate script added and passing. CI pipeline covers determinism (wave + boss multi-run), performance thresholds, registry freshness, and integration tests. Remaining deferred items (smoke, accessibility) explicitly moved to Phase 2.

- 2025-08-24: P1-9 marked complete (headless progression parity test capturing deterministic wave transition signature up to wave 15).

- 2025-08-24: P1-8 marked complete (spawn budget / wave progression / graze-overdrive / pooling recycle integration test). Added boss multi-run deterministic guard & per-run frame budgets; PR comment summary extended with boss sim table.

- 2025-08-24: P1-6 marked complete (script engine finalized with instrumentation, parity tests, docs); snapshot schema advanced to v7 (bossPatternState). Added ROADMAP updates & README link.

- 2025-08-23: Added pattern projectile pool + system + reuse test; integrated into spiral-barrage pattern (P1-4 progress).
- 2025-08-23: Added particle pool + system + reuse test; render integration & spawn on spiral-barrage pattern (P1-4 further progress).
- 2025-08-23: Added specialized particle variants (spark, ember, trail, burst) with pooled behaviors & variant reuse test; marked P1-4 complete.
- 2025-08-23: Boss script execution engine scaffold (wait/do/repeat) + scripted-demo pattern + engine tests (P1-6 progress).

- 2025-08-23: Phase 1 next-focus alignment: concentrate on P1-4 (pattern projectile pooling), P1-6 execution engine, then add P1-8/P1-9 tests to close P1-XC.

- 2025-08-23: Marked P1-5 complete (added Registries.versionMap(), completeness test, registry-versionmap script; moved breadth/balance expansions to Phase 2 Content Registry CR list).

- 2025-08-23: Added content registry breakdown subsection (P2-CR1..P2-CR16) for granular tracking; spiral barrage pattern partially implemented (P2-CR9 -> [~]).

- 2025-08-23: Performance tooling upgraded (robust spike trimming, per-seed memory pass, baseline regeneration scripts); bullet system optimized (precomputed angles, batched spawns); added new boss pattern `spiral-barrage` + golden seed & spawn delta test; snapshot schema advanced to v5 (boss lifecycle + graze/overdrive fields); marked RNG injection, serialization, error boundary complete.

- 2025-08-22: Added parallax system, runtime URL/localStorage persistence & golden snapshot v3 (parallaxLayers captured); new golden case with validated layer metadata.
- 2025-08-22: Camera system extended (follow, deadzone, bounds, zoom, shake, velocity lead); tests expanded (41→42).
- 2025-08-22: Snapshot schema bumped to v3; goldens regenerated including parallax scenario.
- 2025-08-22: Added dedicated render order test & pooling reuse tests; profiler overlay toggle integrated.
- 2025-08-22: Golden recordings updated (added g3-parallax) with layer validation assertions.
- 2025-08-22: Checklist scaffold created.
2025-08-22: RNG wrapper scaffold added (`rng.ts`) – mark P1-2 to [~] once injected project-wide.

---

Maintenance Guidelines:

1. When finishing a task (merged), change its status to `[x]` and add a dated note if non-trivial.
2. For work started but not done in a PR, mark `[>]`.
3. If partially landed (scaffold) use `[~]` and clarify follow-ups in Notes.
4. Blocked tasks mark `[!]` with cause (dependency, decision, external).
5. Scope changes: annotate with `[Δ]` and briefly explain delta.
6. Do not remove rows; strike-through (~~text~~) only if task cancelled (retain history). Add note.
