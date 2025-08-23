#!/usr/bin/env node
/**
 * Generate a simple statements coverage badge (SVG) from coverage/coverage-summary.json
 * Created for local README badge without external service. Commit the produced SVG.
 *
 * Usage:
 *   npm run coverage:badge
 */
import fs from 'node:fs';
import path from 'node:path';

const summaryFile = path.resolve('coverage/coverage-summary.json');
const badgeFile = path.resolve('coverage-badge.svg');

function color(pct) {
  if (pct >= 90) return '#4c1';
  if (pct >= 80) return '#97CA00';
  if (pct >= 70) return '#dfb317';
  if (pct >= 60) return '#fe7d37';
  return '#e05d44';
}

function createSvg(pct) {
  const pctText = pct.toFixed(1).replace(/\.0$/, '') + '%';
  const label = 'coverage';
  const labelWidth = 62; // approximate
  const valueWidth = 54; // adjust for text length slightly
  const totalWidth = labelWidth + valueWidth;
  const col = color(pct);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${pctText}">\n  <linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>\n  <mask id="m"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></mask>\n  <g mask="url(#m)">\n    <rect width="${labelWidth}" height="20" fill="#555"/>\n    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${col}"/>\n    <rect width="${totalWidth}" height="20" fill="url(#s)"/>\n  </g>\n  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">\n    <text aria-hidden="true" x="${labelWidth/2*10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)">${label}</text>\n    <text x="${labelWidth/2*10}" y="140" transform="scale(.1)">${label}</text>\n    <text aria-hidden="true" x="${(labelWidth + valueWidth/2)*10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)">${pctText}</text>\n    <text x="${(labelWidth + valueWidth/2)*10}" y="140" transform="scale(.1)">${pctText}</text>\n  </g>\n</svg>`;
}

function run() {
  if (!fs.existsSync(summaryFile)) {
    console.error('[coverage-badge] summary file missing, run coverage first');
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(summaryFile,'utf8'));
  const statementsPct = data.total?.statements?.pct;
  if (typeof statementsPct !== 'number') {
    console.error('[coverage-badge] could not read statements.pct');
    process.exit(1);
  }
  const svg = createSvg(statementsPct);
  fs.writeFileSync(badgeFile, svg);
  console.log('[coverage-badge] wrote', badgeFile, '(', statementsPct.toFixed(2) + '% )');
}

run();
