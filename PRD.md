# Geoturret 2 ("GeoTurret v2") – Product Requirements Document (PRD)

## 1. Executive Summary

Geoturret 2 (GT2) is the next evolution of the browser-based circular arena + boss scroller hybrid shooter originally built as a performant, minimalist TypeScript + Canvas arcade experience. v1 successfully delivered a deep mechanical core (progressive waves, shop economy, upgrades, wave modifiers, cinematic boss encounters, accessibility and performance instrumentation). v2 focuses on replayability, clarity, modernization of the code architecture, extensibility for future content, and improved onboarding + accessibility while keeping the instant‑play, no-login, low-latency feel.

Primary pillars:

1. Replay Depth: Meta progression, richer boss phase logic, new enemy archetypes & wave modifier synergies.
2. Legibility & Fairness: Stronger telegraphs, readable damage feedback, scalable accessibility modes.
3. Extensibility: Modular systems (enemy behaviors, patterns, wave mods, upgrades) with data-driven definitions and test coverage.
4. Performance & Stability: Deterministic simulation option, object pooling expansion, automated smoke / regression tests (CI), responsive mobile UX.
5. Low Friction Deployment: Simple container + Traefik routing at `gt2.vectorhost.net`, build-time optimizations, future PWA/offline support.

### Alpha Progress (Implemented Snapshot – Aug 2025)

The following foundational pieces are already in place in the repo:

- Deterministic fixed-step orchestrator requiring explicit seed (no implicit RNG fallback).
- Typed event bus (events: `frame`, `perfSample`, `snapshot`, `waveStart`, `error`).
- Object pooling integrated for enemies & bullets with deterministic reuse tests.
- Performance governance toolchain: baseline & enforcement scripts using adaptive histograms (timing percentiles) + memory delta & growth percentile thresholds (CI enforced with optional margin).
- Run snapshot schema v2 with integrity hash (content registries) and lightweight summary (`kills`, `wave`).
- Content registries + deterministic hash (djb2) included in snapshot for data integrity tracking.
- Wave system scaffold (kill-target progression, scalable target curve, `waveStart` event emission).
- Dev harness HUD shows seed, frame, time, kills, wave, pool utilization; profiler toggle & single-step controls.
- CI workflow executing unit + deterministic tests and performance threshold check.

These foundations de-risk upcoming module extraction, wave modifier refactors, and replay / analytics work.

## 2. Target Audience & Personas

- Arcade Enthusiast: Wants skill expression, boss variety, pattern mastery.
- Casual / Mobile Player: Short sessions, clarity, friendly pacing presets.
- Tinkerer / QA / Dev: Wants debug overlays, deterministic seeds, pattern test harness.
- Accessibility-Focused Player: Needs colorblind-safe palettes, motion reduction, clearer telegraphs, optional audio cues.

## 3. Current (v1) Feature Inventory (Baseline Audit)

### Core Loop

- Circular arena defense: survive waves; enemy spawn budget per wave; difficulty escalates; every 10th wave transitions to scroller-style boss battle.
- Shop / upgrades system (reroll economy, luck, explosive rounds, ricochet, pierce, spread/ROF).
- Powerups (RAPID, SPREAD, SLOW, SHIELD, SCOREX, BOMB, DRONE) with timed effects and stacking rules.
- Coins and magnet upgrade; localStorage persistence for settings.

### Enemies / Behaviors

- Standard geometries: circle, square, triangle, pentagon, (hex rare), sniper (telegraph > shot), orbiter (dash windup/burst), shielder (aura shield pulses), boss (phases, pods, armor/shield layers, patterns).
- Boss pods, shield & armor break VFX, phase banners, multi-phase scaling.

### Combat Systems

- Bullet pooling, ricochet, explosive splash, pierce; object pooling for bullets, particles, enemy shots.
- Graze mechanic builds Overdrive (temporary ROF / damage boost).
- Wave modifiers implemented: drift (wind), fog (visual), regen (hp), storm (hazard), gravity well, mirror walls (shots reflect). Gating off for bosses.

### Cinematics & UX

- Boss intro/outro letterbox, parallax stars, camera easing, stingers, HUD transitions, toast notifications.
- Accessibility: colorblind palette option, high contrast text, safe-lane telegraph (laser), damage numbers aggregation, shield/armor HP ring clarity, FPS overlay, shake toggle.

### Developer / QA Tooling

- Presets: Arcade / Chill / Hardcore / Mayhem.
- Jump to wave, seed gear/coins, force boss, force specific phase/pattern, perf overlays, stress particle toggle, GOD MODE, gating toggles for wave mods.

### Technical

- Stack: TypeScript 5 + Vite + Canvas 2D. Simple state object pattern (mutable), manual object pools, minimal utilities. Audio via Web Audio (bip/swoosh etc.). Dockerized multi-stage build -> Nginx static serve. Traefik routing for domain.

## 4. Key Problems / Opportunities for v2

| Area | Gap / Pain | Opportunity |
|------|------------|-------------|
| Maintainability | Large monolithic `game.ts` (~1.8k lines) mixes systems | Modularize into systems (input, spawning, collisions, wave mods, boss, rendering) or light ECS pattern. |
| Extensibility | Adding new enemy or powerup requires editing multiple inline code paths | Data-driven registries (enemy factory table, powerup config, pattern scripts). |
| Telemetry & Balancing | Manual tuning only | Optional instrumentation / analytics events (local dev log) + balancing harness. |
| Progression | Runs are self-contained | Meta persistence (recent runs, stats, unlock tracks, difficulty ladder). |
| Accessibility | Baseline colorblind + contrast only | Motion reduction, screen reader friendly overlays (ARIA), adjustable telegraph intensity, audio cue toggles. |
| Testing | Manual QA | Headless simulation tests (deterministic RNG), Playwright smoke for UI, unit tests for wave mod math. |
| Performance | Good but scaling risk with new content | Expand pooling (powerups, coins, patterns), micro-profiler overlay, selective animation quality modes. |
| Replay Variety | Limited wave modifier synergy | New combinational mod system & conditional spawn sets (e.g., storm + shielder synergy adjustments). |
| UI Clarity | Coin gain & upgrade status not obvious; shop/settings cluttered | HUD redesign (coin delta feedback, distinct health/armor, upgrade inventory), shop categorization, settings grouping/search. |

## 5. Goals & Non-Goals

### Goals (Release Horizon)

- Refactor architecture into discrete modules with testable boundaries.
- Introduce meta progression (initially: recent runs log + unlockable presets / cosmetics).
- Expand boss system: pattern scripting DSL, pattern fairness metrics, repeatability.
- Expanded accessibility & clarity (telegraphs, audio ducking polish, motion reduction, safe-lane preview marker, color themes).
- Deterministic seed mode (export/import run seed) for sharing runs / repro.
- Revised upgrade economy clarity (rarity badges, reroll UX improvements).
- Wave Mod 2.0: structured (pre, during, post) hooks; balancing tags for fairness.
- Deployment pipeline updates (versioned assets, cache headers, health & basic metrics endpoint even for static host via sidecar or Nginx stub status?).

### Non-Goals (v2 initial scope)

- Multiplayer / networking.
- Cloud account system / server authoritative state.
- Marketplace / real-money commerce.
- Full Roguelite meta tree (only foundation shipped; advanced trees post v2.1).

## 6. Success Metrics / KPIs

- Technical: < 10ms average frame update on mid-range mobile (throttled 4x CPU) through Wave 40; memory stable (< +25% after 20 min session).
- Engagement: +30% median session length vs v1 baseline (once meta log & clarity improvements land).
- Replayability: ≥20% of sessions start a second run within 5 minutes of a game over (local metrics).
- Quality: < 1% of sessions encounter uncaught JS exception (local error capture log for sampling).
- Accessibility: At least 3 distinct accessibility toggles used in >15% of sessions (indicates discoverability & usefulness).
- UI Clarity: ≥90% of internal usability test participants can, within 3 seconds, identify current coins and list at least two active upgrades; coin gain delta visible during scripted gain event.

## 7. Functional Requirements

### Core Gameplay

- Maintain orbit arena waves every wave except multiples of 10 (boss waves). (Initial wave scaffold implemented: kill-threshold progression & `waveStart` event; boss gating TBD.)
- Provide configurable presets (existing + at least 1 new: "Story" or "Practice").
- Maintain Overdrive but surface UI meter with explicit fill indicator.
- Support deterministic seed injection (query param or dev panel).
  - (Deterministic seed already supported via query param / orchestrator construction.)

### Meta & Persistence

- Persist last 5 runs (wave reached, score, build summary, seed). Accessible via a Runs panel.
- Persist unlocked cosmetic / preset flags.

### Shop & Economy

- Reroll interaction: hold-to-reroll (press and hold 0.6s). Show scaling cost preview.
- Discount / rarity badges (color-coded, icon). Provide tooltips / accessible labels.

### Boss Enhancements

- Data-driven phase definition: thresholds / triggers array.
- Additional patterns: dual crossing lasers, safe-lane shifting volley, multi-beam intersection.
- Pattern fairness auto adjustments (safe lane widen post-hit, telegraph scaling on performance dips) preserved.

### Wave Modifiers v2

- Mod composition rules (no conflicting pairings, synergy adjustments).
- Pre-wave preview panel shows upcoming mod(s) + icons.
- Logging harness enumerates all mod combos for test.

### Accessibility

- Motion reduction: disable camera shake, parallax, particle cap.
- High contrast + colorblind palettes retained; add dark mode variant.
- Enhanced telegraphs: pre-marker arc for laser safe lane, adjustable intensity.
- Audio ducking for laser telegraph + shield break; global volume slider.

### Performance / Instrumentation

- FPS overlay extended: frame budget breakdown (update vs render ms), object counts.
- Deterministic RNG wrapper with seed serialization (implemented; snapshot v2 exposes RNG state).
- Lightweight micro-profiler around critical loops (dev mode only).
  - (Per-system profiler integrated; histogram-based baseline tooling operational.)

### Testing & QA

- Headless simulation tests (initial set) assert deterministic kill counts & wave progression; expansion to multi-wave / boss scenarios pending.
- Pattern smoke test enumerates each boss pattern once; screenshot capture mid-telegraph for regression diff.
- Playwright smoke: load, start run, complete a wave, open shop.

### Deployment / Infra

- Domain: `gt2.vectorhost.net` via Traefik.
- Docker multi-stage build (Node build -> Nginx).
- Compose service named `geoturret2`.
- Optional staging label variant (e.g., `gt2-stg.vectorhost.net`).
- Version stamping (inject commit hash or build timestamp into footer / console log).

### HUD & UI

- HUD must clearly display: current coins, recent coin gain (delta flash ≥ 1s), turret health and armor as distinct visual elements (separate rings/bars or layered segments), active upgrades with stack counts (icons + accessible labels / tooltips), Overdrive meter, temporary power-up timers, and wave index. (Wave & kills already surfaced in dev overlay; production HUD redesign pending.)
- Coin gain feedback: floating or radial burst plus counter pulse; multiple rapid gains aggregate without flicker.
- Upgrade summary panel: collapsible or persistent strip showing weapon/ship/shield upgrades obtained; deterministic ordering (category then acquisition order).
- Shop reorganization: group items by category (Offense / Defense / Utility / Economy); hold-to-reroll affordance (progress ring + textual hint); reroll cost preview adjacent before activation.
- Settings menu: grouped sections (Gameplay, Accessibility, Audio, Performance); stretch goal: filter/search input.
- All HUD elements meet contrast requirements and remain legible at 100% browser scaling on 1366x768.

## 8. Non-Functional Requirements

| Category | Requirement |
|----------|------------|
| Performance | < 120KB initial JS (gzipped) for core (excl. optional analytics); lazy-load dev/pattern tooling. |
| Latency | First frame < 1.5s on cold mobile 4G. |
| Stability | Zero memory leak growth >5MB over 20 min idle test. |
| Accessibility | WCAG AA contrast for UI text; all toggles keyboard reachable. |
| Internationalization | Non-scoped (English only) – future friendly (no hard-coded concatenated strings in new modules). |
| Privacy | No external tracking by default; optional dev-local metrics only. |
| Security | Static hosting only; no user data storage beyond localStorage. |

## 9. Technical Architecture (v2 Target)

### Proposed Module Breakdown

- `engine/` (loop, timing, scheduler, deterministic RNG)
- `systems/`:
  - input, spawning, enemyAI, bullets, collisions, powerups, particles, waveMods, boss, shop, upgrades, ui/hud, accessibility
- `content/` registries: enemies, powerups, upgrades, waveMods, bossPatterns.
- `state/` root state + serializers (run summary, persistence).
- `tests/` unit + simulation harness.
- `devtools/` overlay panels & pattern runner.

### Deterministic RNG

Wrapper `Rng(seed)` with split capability: `rng.nextFloat()`, `rng.range(min,max)`. Seed stored & exported at run end. (Implemented core; splitting API & range helpers still to add; current snapshot v2 stores raw RNG internal state.)

### Rendering

Continue Canvas 2D (fits minimalist vector aesthetic). Evaluate layering: one canvas for gameplay, optional overlay canvas for telegraphs & HUD particles (simplifies clearing). Avoid premature WebGL complexity; consider internal interface to swap later.

### Data-Driven Patterns

Boss patterns defined as JSON-like objects referencing script functions (timelines with telegraph, spawn, beam phases). Validation step ensures fairness constraints (min safe lane width, telegraph >= threshold).

### Testing Strategy

- Unit: spawn budget calc, wave mod drift vector, graze accumulation edge cases.
- Simulation: fast-forward using fixed dt (e.g., 1/120) decoupled from `requestAnimationFrame` (partially implemented via orchestrator advance tests).
- Visual regression (optional future) – store hashed pixel regions of telegraph frames.

### Persistence Layer

Use `localStorage` keys: `gt2_settings_v1`, `gt2_runs_v1`, `gt2_unlocks_v1`. Guard with schema version; on mismatch migrate or reset.

## 10. Docker / Deployment Structure (Planned)

```yaml
services:
  geoturret2:
    build: .
    container_name: geoturret2
    restart: unless-stopped
    labels:
      - traefik.enable=true
      - traefik.http.routers.geoturret2.rule=Host(`gt2.vectorhost.net`)
      - traefik.http.routers.geoturret2.entrypoints=websecure
      - traefik.http.routers.geoturret2.tls.certresolver=letsencrypt
      - traefik.http.services.geoturret2.loadbalancer.server.port=80
    networks:
      - web
networks:
  web:
    external: true
```

(Identical multi-stage Dockerfile pattern to v1; may add build ARG `GIT_SHA` for version stamping.)

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Refactor Regression | Hidden gameplay changes | Incremental extraction + simulation tests before big moves. |
| Scope Creep (meta / progression) | Delays MVP | Phase meta features (Phase 1 = recent runs + simple unlock flags). |
| Performance Regressions (modular overhead) | Frame time spikes | Measure early; keep hot paths minimal allocations; expand pooling. |
| Deterministic Mode Complexity | Inconsistent results w/ time-based effects | Centralize time usage; replace `Math.random` globally in core logic with injected RNG. |
| Visual Accessibility Complexity | Over-designed settings UI | Group into 3 presets + Advanced panel. |

## 12. Open Questions

1. Should boss phases introduce environmental hazards (e.g., rotating walls) or stay purely projectile-based initially?
2. Are cosmetic unlocks purely palette swaps or also particle trail variants? (Performance budget?)
3. Do we want a public seed share URL format (e.g., `?seed=ABC123&mods=...`)?
4. Add offline support (PWA) in initial v2 or post v2.0.1?
5. Add basic privacy-friendly analytics (self-hosted) or skip entirely for v2?

## 13. Phase Plan Overview

- Alpha (Refactor Core): Module extraction, deterministic RNG, basic tests, parity baseline.
- Beta (Content & UX): New boss patterns, telegraph upgrades, reroll UX, Overdrive meter, accessibility panel.
- Release (Meta & Polish): Run log, unlock system, performance tuning, documentation & roadmap validation.
- Post 2.0 (Live Ops): Additional wave mods, elite variants, expanded meta tree, PWA.

## 14. Acceptance Criteria (Sample)

- Starting a run with a fixed seed reproduces enemy types sequence & boss pattern order across sessions.
  - (Partial: enemy spawn & kill counts deterministic for initial scaffold; boss patterns not yet integrated.)
- Overdrive meter visually fills and triggers exactly when graze threshold reached (test harness assertion).
- Shop reroll hold interaction cannot be triggered by quick tap (>= 550ms hold measured via pointer events).
- Wave progression emits `waveStart` event exactly when kill threshold met; target scaling deterministic across seeds.
- All new UI toggles keyboard navigable (tab order includes them, Enter/Space toggles).
- HUD matches `UI_WIREFRAMES.md` layout within reasonable fidelity: coin delta appears ≤100ms after gain, fades after ~1s (aggregated), health & armor visually distinct, upgrades panel displays stack counts.
- Usability test (internal) confirms ≥90% participants can identify current coins & two active upgrades within 3s (UI Clarity metric).

## 15. Appendix – Baseline Performance Observations (v1)

(Estimates based on source patterns; empirical numbers to be gathered during Alpha.)

- Object counts at Wave 15 rarely exceed: enemies < 45, bullets active < 70, particles < 130 (peaks). Good candidate thresholds for early warnings.
- Majority of per-frame cost: enemy movement + bullet collision O(N*M) loops. v2: spatial partition optional (only if needed after profiling).

---

This PRD is a living document; changes tracked via PR comments and CHANGELOG until v2 Release freeze.
