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
| P1-2 | Deterministic RNG wrapper & injection everywhere | [~] | 2025-08-22 pattern established (randomCounterSystem); 2025-08-22 orchestrator requires explicit seed; remaining: remove legacy Math.random in content generation |
| P1-3 | Central event bus | [x] | 2025-08-22 bus implemented (emit/on/off/clear) stable |
| P1-4 | Expand object pooling (add pattern projectiles) | [~] | 2025-08-22 generic pool scaffold; 2025-08-22 enemy & bullet pooling integrated; TODO: pattern projectiles / particles |
| P1-5 | Data registries (enemies, powerups, upgrades, waveMods, bossPatterns) | [~] | 2025-08-22 scaffold + placeholder content; hash validated in snapshot tests; TODO: populate & version entries |
| P1-6 | Boss pattern scripting interface (timeline/state machine API) | [~] | 2025-08-22 interface stub (no execution engine yet) |
| P1-7 | State serialization (run summary + seed export) | [~] | 2025-08-22 snapshot scaffold + orchestrator export; 2025-08-22 bumped to v3 (parallaxLayers) |
| P1-8 | Basic unit tests (spawn budget, wave progression, graze/overdrive, pooling recycle) | [ ] | |
| P1-9 | Headless simulation test (waves 1–15 parity) | [ ] | |
| P1-10 | Performance micro-profiler overlay | [x] | 2025-08-22 per-system timing core; overlay toggled with 'p' |
| P1-11 | CI pipeline scaffold (lint/unit/sim/build/size/smoke) | [~] | 2025-08-22 GitHub Actions workflow added |
| P1-12 | Dependency & image vulnerability scan setup | [~] | 2025-08-22 npm audit + script placeholder |
| P1-13 | Early error boundary & ring buffer logging | [~] | 2025-08-22 ring buffer scaffold |
| P1-14 | RNG wrapper shim (pre-refactor) | [x] | 2025-08-22 shim util added |
| P1-XC | Exit criteria met (determinism, parity, perf budget) | [ ] | Aggregate gate |

## Phase 2 – Content & Clarity (Beta)

| ID | Item | Status | Notes |
|----|------|--------|-------|
| P2-1 | New boss patterns (dual crossing lasers) | [ ] | |
| P2-2 | New boss pattern (shifting safe-lane volley) | [ ] | |
| P2-3 | New boss pattern (multi-beam intersection) | [ ] | |
| P2-4 | Pattern fairness auto-adjust logic | [ ] | |
| P2-5 | Pre-laser safe-lane arc preview marker | [ ] | |
| P2-6 | Pod aftermath polish (embers / glow) | [ ] | |
| P2-7 | Externalized difficulty scaling tables | [ ] | |
| P2-8 | Wave mod synergy rules | [ ] | |
| P2-9 | Pre-wave preview panel (icons + labels) | [ ] | |
| P2-10 | Mod combo enumeration test harness | [ ] | |
| P2-11 | Motion reduction mode | [ ] | |
| P2-12 | Overdrive explicit meter | [ ] | |
| P2-13 | Audio ducking + volume slider | [ ] | |
| P2-14 | Enhanced color palettes (contrast + colorblind + dark) | [ ] | |
| P2-15 | Safe lane highlight intensity slider | [ ] | |
| P2-15a | HUD redesign (health/armor, coins, upgrades, timers) | [ ] | |
| P2-15b | Coin gain feedback polish | [ ] | |
| P2-15c | Upgrade summary panel | [ ] | |
| P2-16 | Hold-to-reroll interaction | [ ] | |
| P2-17 | Rarity / discount badges + tooltips | [ ] | |
| P2-18 | Reroll cost scaling feedback | [ ] | |
| P2-19 | Playwright smoke tests | [ ] | |
| P2-20 | Boss pattern screenshot capture | [ ] | |
| P2-21 | Failure artifact export (images + seed JSON) | [ ] | |
| P2-22 | Shop categorization & layout reorg | [ ] | |
| P2-23 | Settings menu grouping | [ ] | |
| P2-24 | Client telemetry schema (local export) | [ ] | |
| P2-25 | Bundle size budget enforcement | [ ] | |
| P2-26 | Automated accessibility scan (axe-core) | [ ] | |
| P2-27 | Telegraph safety coverage harness | [ ] | |
| P2-XC | Exit criteria met (patterns, accessibility, smoke green) | [ ] | Gate |

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
