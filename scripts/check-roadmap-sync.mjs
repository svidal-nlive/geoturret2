#!/usr/bin/env node
/**
 * Roadmap / Checklist Sync Guard
 * Fails a PR if production code under `src/` changed without a corresponding update to
 * ROADMAP.md or ROADMAP_CHECKLIST.md, unless commit messages contain `no-checklist-change`.
 * Exemptions:
 *  - Changes that touch only test files (*.test.ts) or *.md docs (except instructions.md which still requires sync if code changed)
 */
import { execSync } from 'node:child_process';

function sh(cmd) { return execSync(cmd, { stdio: ['pipe','pipe','ignore'] }).toString().trim(); }

// Ensure we have main to diff against.
try { sh('git fetch origin main --depth=1'); } catch {}

const baseRef = process.env.GITHUB_BASE_REF || 'origin/main';
let diffList;
try { diffList = sh(`git diff --name-only ${baseRef}...HEAD`).split('\n').filter(Boolean); }
catch (e) { console.error('Unable to produce diff list', e.message); process.exit(0); }

// Gather commit messages in range (last 20 as heuristic; GitHub squash merges typical)
let commitsRaw = '';
try { commitsRaw = sh(`git log --pretty=%B -n 20 HEAD`); } catch {}
const exempt = /no-checklist-change/i.test(commitsRaw);

const roadmapChanged = diffList.some(f => f === 'ROADMAP.md' || f === 'ROADMAP_CHECKLIST.md');
// Code changed (exclude pure test changes): any src/ file not matching *.test.*
const codeFiles = diffList.filter(f => f.startsWith('src/'));
const nonTestCodeFiles = codeFiles.filter(f => !/\.test\.[tj]s$/.test(f));

// If no relevant code changes, exit success.
if (nonTestCodeFiles.length === 0) {
  console.log('[roadmap-sync] No non-test code changes detected; skipping');
  process.exit(0);
}

if (roadmapChanged) {
  console.log('[roadmap-sync] Roadmap / checklist update present ✅');
  process.exit(0);
}
if (exempt) {
  console.log('[roadmap-sync] Exemption marker found in commit messages (no-checklist-change) – allowing');
  process.exit(0);
}

console.error('\n[roadmap-sync] ❌ Non-test code changes detected without ROADMAP.md or ROADMAP_CHECKLIST.md update.');
console.error('Changed code files (first 20):');
for (const f of nonTestCodeFiles.slice(0,20)) console.error(' -', f);
console.error('Add roadmap/checklist status flip or include "no-checklist-change" in commit message if truly docs/tool only.');
process.exit(1);
