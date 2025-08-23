# Geoturret 2 – Development & Deployment Instructions

This document defines the agreed workflow for implementing changes, validating them, rebuilding, and deploying the stack (Docker Compose v2). Follow it strictly to keep velocity high and regressions low.

---

## 1. Prerequisites

- Node.js 20.x (local dev)
- npm (or pnpm/yarn – choose one and stay consistent; examples assume npm)
- Docker Engine + Docker Compose v2 (`docker compose version` shows >= v2)
- Modern browser (Chrome / Firefox) for manual smoke tests

Optional (recommended):

- Make (if you add a `Makefile` with shortcuts later)
- Playwright (for smoke/E2E when tests are added)

---

## 2. Repository Structure (Planned v2)

```text
geoturret2/
  PRD.md
  ROADMAP.md
  instructions.md (this file)
  (future) src/ ... (modularized systems)
  (future) tests/ (unit + simulation + smoke harness)
  (future) docker-compose.yml (service: geoturret2)
  (future) Dockerfile (multi-stage: build -> nginx runtime)
```

Refer to `PRD.md` and `ROADMAP.md` before starting any feature—if it is not listed, add it to the roadmap first.

---

## 3. Implementation Cycle (Single Feature / Change)

1. Plan
   - Identify target roadmap item (Phase + bullet).
   - Define “mini acceptance criteria” (1–3 bullet points) and edge cases.
   - Update `ROADMAP_CHECKLIST.md`: mark target item `[>]` (In progress) before coding.
   - For UI/HUD tasks ensure reference to `UI_WIREFRAMES.md` section or updated sketch is included in PR before implementation.
2. Branch
   - Create a feature branch: `git checkout -b feat/<short-name>`.
3. Implement (Minimal Slice)
   - Add or modify only the modules needed (avoid premature generalization).
   - Keep hot-path code allocation free where possible.
4. Local Validation (Incremental)
   - Type check: `npm run typecheck` (or `tsc --noEmit`).
   - Lint (if configured): `npm run lint`.
   - Unit tests: `npm test -- --runInBand` (or your runner).
   - Simulation test (headless waves): `npm run sim:test` (future script) – must pass deterministically with seed.
   - Updated/new tests required for new public behavior.
5. Manual Smoke (Pre-Container)
   - `npm run dev` – run through new feature quickly (arena→boss if applicable).
   - Confirm no console errors.
6. Commit & Push
   - Conventional message: `feat: add deterministic RNG wrapper` or `fix: correct overdrive decay edge case`.
7. Container Build & Stack Validation (Mandatory Before PR)
   - Production build: `npm run build`.
   - Build image: `docker build -t geoturret2:dev .` (or `docker compose build`).
   - Launch stack: `docker compose up -d --build`.
   - Health check:
     - `docker compose ps` (STATUS should be "Up"; health if configured).
     - `docker compose logs -f geoturret2` (no crash loops or unhandled errors).
     - Browser: `https://gt2.vectorhost.net` (or local reverse proxy host) loads without 404; open devtools console -> no errors.
   - Optional CLI probe: `curl -I https://gt2.vectorhost.net` (expect 200 / 304).
8. Performance Sanity
   - FPS overlay (dev mode) should remain green majority of time (frame update < budget). If not, profile before PR.
9. Open Pull Request

- Include summary, acceptance criteria, test evidence (seed + simulation run output), and any perf notes.
- Update `ROADMAP_CHECKLIST.md`: mark completed items `[x]` in the same PR (or `[~]` if partial) with a dated note in Update Log.

1. Review & Merge

- Ensure CI (lint/tests/simulation docker build) passes before merging.

1. Post-Merge Checklist Hygiene

- Verify `main` reflects updated statuses; if a merge squash lost checklist edits, open a fast follow-up PR.
- Add any newly discovered follow-up tasks to the appropriate phase (or Backlog) in both `ROADMAP.md` (narrative) and `ROADMAP_CHECKLIST.md` (tabular) using `[ ]` status.

Repeat steps 3–10 for iterative slices rather than batching large changes.

### 3.a CI Pipeline Stages (Planned)

The CI workflow (introduced by P1-11) will run sequential stages:

1. Lint (markdown, eslint) – fail fast
2. Typecheck – `tsc --noEmit`
3. Unit tests – jest/vitest (seeded where relevant)
4. Simulation – deterministic harness (waves 1–15) producing signature hash
5. Build – production bundle
6. Bundle size – compare gzip size to budget & previous main (±5% threshold)
7. Playwright smoke – load, clear wave, open shop
8. Accessibility scan – axe-core (Phase 2 onward)
9. Artifact publish – built `dist/` + image (tag: `<shortSHA>`)

Failure at any stage halts subsequent stages (except optional a11y warnings pre-enforcement).

### 3.b PR Template (Add `.github/pull_request_template.md`)

Recommended sections:

- Summary (1–2 sentences)
- Linked Roadmap IDs (e.g., P1-12, P2-15a)
- Acceptance Criteria (checked)
- Determinism Seed(s) & Verification Output (if gameplay logic)
- Screenshots / Wireframe Section References (UI changes)
- Performance Notes (frame ms delta if perf-sensitive)
- Checklist Update Included? (Yes/No + rationale if No)
- Risk / Follow-ups

---

## 4. Validation Matrix (What to Run When)

| Change Type | Typecheck | Unit Tests | Simulation | E2E Smoke | Rebuild Image | Compose Up | Health Check |
|-------------|-----------|-----------|------------|-----------|--------------|-----------|--------------|
| Small UI copy/style | ✅ | — | — | Quick manual | Optional | Optional | Quick load |
| Gameplay logic (waves, enemies) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Boss pattern / modifier | ✅ | ✅ | ✅ (all patterns) | ✅ | ✅ | ✅ | ✅ |
| Performance refactor | ✅ | ✅ | ✅ | ✅ | ✅ (compare size) | ✅ | ✅ (monitor logs) |
| Infrastructure (Dockerfile/compose) | ✅ | ✅ (if code touched) | ✅ (if logic) | Smoke | ✅ | ✅ | ✅ |

---

## 5. Deterministic Validation (When Implemented)

For any change affecting randomness:

- Run simulation twice with the same seed; the sequence of enemy types & boss pattern IDs must match. If not, locate unseeded `Math.random` usage and replace with injected RNG.
- Store failing seed in PR description if determinism issue found.

---

## 6. Docker & Compose (v2 Syntax)

Example `docker-compose.yml` (future):

```yaml
services:
  geoturret2:
    build: .
    image: geoturret2:latest
    container_name: geoturret2
    restart: unless-stopped
    labels:
      - traefik.enable=true
      - traefik.http.routers.geoturret2.rule=Host(`gt2.vectorhost.net`)
      - traefik.http.routers.geoturret2.entrypoints=websecure
      - traefik.http.routers.geoturret2.tls.certresolver=letsencrypt
      - traefik.http.services.geoturret2.loadbalancer.server.port=80
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1" ]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s
    networks:
      - web
networks:
  web:
    external: true
```

Notes:

- Use `docker compose` (space) not the legacy `docker-compose` binary.
- If adding environment variables, prefer `.env` file for local overrides (never commit secrets—static game should have none).
- Version stamping: build with `--build-arg GIT_SHA=$(git rev-parse --short HEAD)` (adjust Dockerfile accordingly) and log it on app init.

Common Commands:

```bash
# Build & start
docker compose up -d --build

# Tail logs
docker compose logs -f geoturret2

# Rebuild only after code change
docker compose build geoturret2 && docker compose up -d

# Stop
docker compose down
```

---

## 7. Health Verification Checklist

After each deployment (local or server):

- Container status: `docker compose ps` shows "Up" (and `(healthy)` if healthcheck configured).
- Logs: No repeated stack traces or restart loops.
- Browser load: Game canvas renders; HUD updates wave counter; console has no red errors.
- Performance: FPS overlay stable (no sustained red state after idle).
- Determinism (if relevant feature touched): Same seed yields identical first 3 waves.

If any check fails → rollback (restart previous image tag) or fix immediately before continuing.

---

## 8. Adding Tests (Guidelines)

- Unit tests: Pure functions (spawn budget calc, damage application scaling) – fast & deterministic.
- Simulation tests: Run fixed dt loop until wave N; assert final state (wave number, counts) & no exceptions.
- Smoke/E2E (Playwright): Launch headless, simulate a wave clear, verify HUD updates & shop open.
- Visual (future): Telegraphed laser frame capture hashed (regression alert if diff).

Each new system must ship with at least: 1 positive unit test + 1 edge case + inclusion in simulation harness if it affects progression.

---

## 9. Performance Guardrails

- Avoid per-frame object allocations in tight loops; reuse pools (bullets, particles, coins, enemy shots, pattern projectiles).
- Use constant-time lookups (maps) over repeated linear scans in high-frequency paths.
- Trigger a profiling review if: average update > 8ms on desktop or > 16ms on throttled mobile during Wave ≤ 20.

---

## 10. Accessibility Regression Checks

Before merging any rendering or UI change:

- Color contrast: Use dev tool to ensure text contrast meets WCAG AA.
- Reduced motion mode: With flag on, no camera shake/parallax present.
- Keyboard: Tab order reaches new controls; Enter/Space triggers them.

---

## 11. Release Tagging (When Approaching 2.0)

1. Freeze roadmap items (mark remaining as Post 2.0).
2. Bump version tag (e.g., `v2.0.0-rc1`).
3. Build & push image (if using registry): `docker tag geoturret2:latest registry/gt2:v2.0.0-rc1` (push command depends on infra).
4. Run full validation matrix.
5. Promote RC to final if no blocking issues after soak period.

---

## 12. Troubleshooting Quick Reference

| Symptom | Likely Cause | Action |
|---------|--------------|--------|
| Deterministic test mismatch | Unseeded `Math.random` | Replace with RNG wrapper injection. |
| FPS drops after long session | Pool leak / particle accumulation | Inspect object counts overlay; verify recycle paths. |
| Healthcheck failing | Nginx not serving built assets | Confirm build stage succeeded; check `dist/` copied; inspect container logs. |
| Laser telegraph too short on low FPS | Frame-time scaling not applied | Ensure telegraph durations scale with real elapsed time not frame count. |

---

## 13. Amendment Process

Any deviation from this workflow must be proposed in a PR updating `instructions.md` and approved before adoption.

## 14. Roadmap Checklist Maintenance (Detailed)

The file `ROADMAP_CHECKLIST.md` is the canonical progress ledger. Management rules:

- Source of Truth: Narrative intent lives in `ROADMAP.md`; granular status lives in `ROADMAP_CHECKLIST.md`.
- Single Responsibility per Row: Do not bundle multiple deliverables under one ID; split if scope diverges.
- Atomic Commits: Status flips occur in the same commit/PR as the code change when feasible.
- Date Stamps: Always include `YYYY-MM-DD` when adding a note (UTC assumed) in the Update Log.
- Conflict Resolution: If concurrent PRs edit the same checklist region, rebase and re-apply the minimal diff; avoid overwriting unrelated status changes.
- Cancellation: Strike through the row label and append rationale (e.g., `~~P2-11 Motion reduction mode~~ superseded by global Accessibility refactor`).
- Metrics Sync: Exit criteria gate rows (e.g., `P1-XC`) should only flip `[x]` after verifying all constituent tasks are `[x]` and quality gates satisfied.

Periodic Review (Weekly):

1. Scan for lingering `[>]` older than 7 days – decide to finish, split, or mark `[!]` (blocked) with cause.
2. Ensure no tasks silently drifted in scope; annotate with `[Δ]` if specs changed vs PRD.
3. Add newly emerged tasks (discovered via bugs or design changes) under proper phase; if they risk timeline, flag in PR description.

Automation (Future Consideration):

- Optional script to diff `ROADMAP.md` vs `ROADMAP_CHECKLIST.md` to find missing items.
- CI check ensuring any PR touching `src/` also touches checklist or explicitly states `no-checklist-change` in commit body.

---

End of instructions.
