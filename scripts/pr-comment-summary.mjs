#!/usr/bin/env node
// Aggregate various CI artifacts into a concise markdown summary for PR comment.
// Sources (if present):
//  - artifacts/golden-diff-summary.md
//  - artifacts/versionmap-diff.json
//  - coverage/coverage-summary.json
//  - artifacts/boss-sim-summary.md
// Outputs: artifacts/pr-comment-summary.md
import fs from 'fs';

function readOptional(p, parser){ try { if (fs.existsSync(p)) return parser?parser(fs.readFileSync(p,'utf8')):fs.readFileSync(p,'utf8'); } catch(_) {} return null; }

const goldenSummary = readOptional('artifacts/golden-diff-summary.md');
const versionMapDiff = readOptional('artifacts/versionmap-diff.json', t=>JSON.parse(t));
const coverage = readOptional('coverage/coverage-summary.json', t=>JSON.parse(t));
const bossSimSummary = readOptional('artifacts/boss-sim-summary.md');

let md = '# Build Summary\n';

if (goldenSummary) {
  md += '\n## Golden Drift\n';
  md += goldenSummary + '\n';
} else {
  md += '\n## Golden Drift\n';
  md += 'No golden differences detected.\n';
}

if (versionMapDiff && versionMapDiff.changes && versionMapDiff.changes.length) {
  md += '\n## VersionMap Changes\n';
  versionMapDiff.changes.forEach(c=> { md += `- ${c}\n`; });
} else {
  md += '\n## VersionMap Changes\nNone\n';
}

if (coverage && coverage.total) {
  const t = coverage.total;
  md += '\n## Test Coverage\n';
  const line = (k)=> t[k]? `${k}: ${t[k].pct}%` : null;
  const parts = ['lines','statements','functions','branches'].map(line).filter(Boolean);
  md += parts.join(' | ') + '\n';
}

if (bossSimSummary) {
  md += '\n## Boss Simulation Summary\n';
  // Boss summary markdown already includes heading; strip first line if it is a heading
  const cleaned = bossSimSummary.split('\n').filter((line,i)=> !(i===0 && line.startsWith('#'))).join('\n').trim();
  md += cleaned + '\n';
}

fs.mkdirSync('artifacts', { recursive: true });
fs.writeFileSync('artifacts/pr-comment-summary.md', md.trim()+"\n");
console.log('[pr-comment-summary] wrote artifacts/pr-comment-summary.md');
