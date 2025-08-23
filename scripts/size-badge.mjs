#!/usr/bin/env node
/**
 * Generate a gzip size badge for the production build entry (dist/size-check.js).
 * Uses existing size:build script output. If file missing, runs size:build.
 */
import fs from 'node:fs';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';

const file = 'dist/size-check.js';
const badge = 'size-badge.svg';

function ensureBuild() {
  if (!fs.existsSync(file)) {
    const res = spawnSync('npm', ['run','size:build'], { stdio: 'inherit' });
    if (res.status !== 0) process.exit(res.status||1);
  }
}

function color(kb) {
  if (kb < 50) return '#4c1';
  if (kb < 70) return '#97CA00';
  if (kb < 90) return '#dfb317';
  if (kb < 110) return '#fe7d37';
  return '#e05d44';
}

function makeSvg(label, value, col) {
  const labelWidth = 38; // 'size'
  const valueText = value + ' KB';
  const valueWidth = 60 + (valueText.length > 6 ? 10 : 0);
  const total = labelWidth + valueWidth;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="20" role="img" aria-label="${label}: ${valueText}">\n  <linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>\n  <mask id="m"><rect width="${total}" height="20" rx="3" fill="#fff"/></mask>\n  <g mask="url(#m)">\n    <rect width="${labelWidth}" height="20" fill="#555"/>\n    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${col}"/>\n    <rect width="${total}" height="20" fill="url(#s)"/>\n  </g>\n  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">\n    <text aria-hidden="true" x="${labelWidth/2*10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)">${label}</text>\n    <text x="${labelWidth/2*10}" y="140" transform="scale(.1)">${label}</text>\n    <text aria-hidden="true" x="${(labelWidth + valueWidth/2)*10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)">${valueText}</text>\n    <text x="${(labelWidth + valueWidth/2)*10}" y="140" transform="scale(.1)">${valueText}</text>\n  </g>\n</svg>`;
}

function run() {
  ensureBuild();
  const buf = fs.readFileSync(file);
  const gz = zlib.gzipSync(buf);
  const kb = +(gz.length/1024).toFixed(2);
  const svg = makeSvg('size', kb.toFixed(2), color(kb));
  fs.writeFileSync(badge, svg);
  console.log('[size-badge] wrote', badge, kb+'KB');
}

run();
