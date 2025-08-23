# Golden Standard SaaS Review – Geoturret 2

## Strengths

- Clear Phase-Based Roadmap: Phased (0–4) structure with explicit exit criteria fosters incremental delivery and risk containment.
- Determinism Focus Early: Commitment to a seedable RNG and simulation tests is a strong quality lever for reproducibility and debugging.
- Performance Mindset: Early mention of pooling, frame timing budgets, and micro-profiler overlay reduces late-cycle performance debt.
- Accessibility Intent: Multiple planned modes (motion reduction, color palettes, telegraph intensity) demonstrate inclusive design ethos.
- Data-Driven Direction: Registries for enemies, powerups, modifiers, and patterns build an extensible foundation for content scaling.
- Planning Artifacts Coverage: PRD, Roadmap, Checklist, Instructions, Wireframes—all exist, reducing ambiguity and onboarding friction.
- UI Wireframes Early: Visual alignment before implementation lowers churn on HUD/shop/settings work.
- Separation of Non-Goals: Explicit deferral (multiplayer, server auth, real-money) protects scope boundaries.

## Weaknesses & Recommendations

| Area | Observation | Recommendation | Priority | Impact |
|------|-------------|----------------|----------|--------|
| Business / KPIs | Metrics focus mostly technical; engagement goals lack retention funnel definition. | Add funnel metrics (Run Start → Wave 10 → Boss Clear → New Run) & success thresholds; tie to feature hypotheses. | M | Product clarity |
| Onboarding / First-Run UX | No explicit onboarding flow (e.g., first 30s guidance, tooltip pacing). | Add lightweight contextual hints toggled off after first boss reach; track dismissal. | M | Early retention |
| Observability | No structured logging/metrics plan (only overlays). | Define minimal client events (session start, wave reached, boss pattern fail) behind privacy toggle; aggregate locally for QA export. | H | Balancing & QA |
| Error Tracking | Only console error capture mentioned near Release. | Introduce error boundary + ring buffer earlier (Phase 1) with sampled structured export for bug reports. | H | MTTR |
| CI/CD | No pipeline spec (lint/test/build/perf budgets) beyond narrative. | Add CI stages: lint → unit → simulation → build → bundle size check → Playwright smoke → artifact publish. | H | Deployment reliability |
| Security / Supply Chain | No mention of dependency audit or image scanning. | Add CI step: `npm audit --production` (fail on high), use Trivy or Grype to scan final image in Phase 1. | M | Risk reduction |
| Scalability / Build Size Control | Budget (<120KB) stated but no automated enforcement. | Add bundle size regression gate (e.g., `bundlesize` or custom script) failing on >5% growth or > target. | H | Performance consistency |
| State Schema Evolution | Persistence versioning noted but no migration strategy described. | Add migration function registry with test ensuring forward/backward compatibility or graceful reset. | M | Data integrity |
| Testing Depth | Visual regression & fairness analyzer deferred; risk of UX regressions in patterns. | Introduce snapshot of telegraph mask + min safe lane coverage assertion earlier (Phase 2). | M | Gameplay fairness |
| Documentation Evolution | Instructions lack CI pipeline & observability steps. | Extend instructions with CI stages, logging standards, and PR template checklist. | H | Dev velocity |
| Release Readiness | No rollback/versioning strategy besides tagging. | Define image tagging scheme: `<branch>-<shortSHA>`, promote via tag move; document rollback check list. | M | Incident response |
| Performance Profiling | Micro-profiler mentioned but no metrics taxonomy. | Define standard counters: update ms (avg/p95), render ms, active objects, GC pause (approx), memory snapshot delta. | M | Diagnostic clarity |
| Accessibility Validation | Checklist manual; no automated checks planned. | Integrate axe-core Playwright scan for top flows in Phase 2. | M | A11y reliability |
| Risk Tracking | Risks section static, no mitigation tracking updates. | Add RISK_LOG.md with status & triggers; review weekly. | L | Transparency |

## Quick Wins

1. Add CI placeholder script targets (`npm run ci:lint`, `ci:test`, `ci:build`) now to prevent later churn.
2. Introduce a minimal PR template referencing acceptance criteria, determinism seed, checklist update, and wireframe section link.
3. Add `bundlesize` (or `size-limit`) dev dependency & config early; run in watch once during Phase 1 to baseline.
4. Implement error boundary early that surfaces unobtrusive toast & logs error to ring buffer (max 50 entries) for export.
5. Add `docs/ARCHITECTURE_OVERVIEW.md` (or expand PRD) with high-level module dependency direction arrows (engine <- systems <- content/state) to guide contributions.
6. Include `make verify` (aggregating typecheck + lint + test) to simplify pre-commit habits.
7. Add deterministic RNG wrapper stub before refactor—wrap existing `Math.random` to centralize impending change.
8. Write a simulation harness spec (inputs: seed, waves, expected signature hash) before implementing to lock format.
9. Add a local feature flag mechanism (query param or hash) for staging UI toggles (e.g., `?flags=hudv2`).
10. Insert automated accessibility smoke step (axe-core) into Playwright scaffolding early even if failing—track improvements.

## Suggested Roadmap Adjustments

- Move Error Boundary & Console Capture from Phase 4 to Phase 1 (parallel with deterministic RNG) to shorten mean time to detect early regressions.
- Insert Observability / Telemetry (client event schema + local export) in Phase 2 (Content & Clarity) rather than post content freeze.
- Add CI/CD & Supply Chain tasks (pipeline definition, dependency scan, image scan) to Phase 1.
- Add Bundle Size Guard & Accessibility automation tasks to Phase 2.
- Add Schema Migration testing to Phase 3 (Meta & Persistence).

## Proposed Additional Tasks

| Phase | ID (Draft) | Task |
|-------|------------|------|
| 1 | P1-11 | CI pipeline scaffold (lint, unit, sim, build, size check) |
| 1 | P1-12 | Dependency & container image vulnerability scan |
| 1 | P1-13 | Early error boundary + ring buffer logging |
| 1 | P1-14 | RNG wrapper shim around current random usage (pre-refactor) |
| 2 | P2-24 | Client telemetry schema (waveReached, bossPatternFail, runEnd) local export only |
| 2 | P2-25 | Bundle size budget enforcement (<=120KB gz core) |
| 2 | P2-26 | Automated accessibility scan (axe-core) in Playwright smoke |
| 2 | P2-27 | Telegraph snapshot & safety coverage assertion harness |
| 3 | P3-7 | Persistence migration framework + test (v1→v2) |
| 3 | P3-8 | SLO definition (fps p95, crash rate) & monitoring overlay display |
| 4 | P4-7 | Rollback playbook & tagged image promotion workflow |

## Resource References

- Deterministic RNG Patterns: [PRNG reference implementations](https://github.com/bryc/code/blob/master/jshash/PRNGs.md)
- Bundle Size Guarding: [bundlesize tool](https://github.com/siddharthkp/bundlesize)
- Accessibility Testing (axe-core): [axe-core repo](https://github.com/dequelabs/axe-core)
- Error Boundary Patterns (React-inspired, vanilla adaptation): [React error boundaries guide](https://react.dev/reference/react/Component#catching-rendering-errors)
- Game Telemetry Principles: [Game telemetry design article](https://www.gamedeveloper.com/design/telemetry-in-game-development)

## Follow-Up

Adopt adjustments via PR updating roadmap & checklist. Re-run review after Phase 1 completion to validate risk posture and readiness for content expansion.
