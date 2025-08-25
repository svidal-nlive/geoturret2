#!/usr/bin/env bash
set -euo pipefail

# ci-full.sh
# Local reproduction of (most) GitHub Actions pipeline stages in a single serial run.
# Usage: bash scripts/ci-full.sh [--fast]
#   --fast : Skips long-running simulation battery, boss perf attribution, and perf baseline checks.

FAST=0
if [[ "${1-}" == "--fast" ]]; then
  FAST=1
  echo "[ci-full] FAST mode enabled (skipping long perf/sim stages)"
fi

section() { echo -e "\n==================== $1 ====================\n"; }

fail=0
golden_diff_fail=0

patterns=(
  laser-cross
  safe-lane-volley
  multi-beam-intersect
  future-converge
  spiral-barrage
  pre-laser-arc-preview
  laser-arc-sweep
)

start_ts=$(date +%s)

section "Install (npm ci)"
npm ci

section "Lint (TS + MD)"
npm run lint

section "Typecheck"
npm run typecheck

section "Unit / Integration Tests"
npm test

if [[ $FAST -eq 0 ]]; then
  section "Simulation Battery"
  npm run ci:sim:battery
  section "Boss Simulation Check"
  npm run ci:sim:boss
else
  echo "[skip] Simulation battery & boss sim (fast mode)"
fi

if [[ $FAST -eq 0 ]]; then
  section "Performance Check"
  npm run perf:check
  section "Boss Perf Attribution Check"
  npm run boss:perf:check || fail=1
else
  echo "[skip] perf & boss perf checks (fast mode)"
fi

section "Golden Record Current Run"
npm run golden:record

section "Golden Diff"
set +e
npm run golden:diff
golden_status=$?
set -e
if [[ $golden_status -ne 0 ]]; then
  echo "[ci-full] Golden diff detected (exit code preserved but continuing to gather more artifacts)"
  golden_diff_fail=1
fi

section "Golden Monitor"
set +e
npm run golden:monitor
monitor_status=$?
set -e
if [[ $monitor_status -ne 0 ]]; then
  echo "[ci-full] Golden monitor differences present"
fi

section "Size Regression"
npm run size:regression

section "Vulnerability Enforcement"
npm run vuln:enforce

section "Roadmap Sync"
npm run ci:roadmap-sync || true

section "VersionMap Diff"
npm run golden:versionmap:diff || true

section "PR Comment Summary Aggregation"
npm run pr:comment:summary || true

section "Playwright Browsers Install"
npx playwright install --with-deps chromium

section "Smoke (Playwright)"
npm run ci:smoke

section "Accessibility Scan"
npm run a11y:scan || fail=1

section "Pattern Screenshots"
mkdir -p artifacts/patterns
for p in "${patterns[@]}"; do
  echo "[pattern] $p"
  node scripts/pattern-screenshot.mjs --pattern "$p" --out "artifacts/patterns/$p.png" || { echo "[error] pattern screenshot failed: $p"; fail=1; }
done

elapsed=$(( $(date +%s) - start_ts ))
section "Summary"
echo "Elapsed: ${elapsed}s"
if [[ $golden_diff_fail -eq 1 ]]; then
  echo "Golden diffs present (see artifacts/golden-diff-summary.md)"
fi

# Exit with failure if any critical stage failed or golden diff present (match CI gate behavior)
if [[ $fail -ne 0 || $golden_diff_fail -ne 0 ]]; then
  echo "[ci-full] FAIL" >&2
  exit 1
fi
echo "[ci-full] SUCCESS"
