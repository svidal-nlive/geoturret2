#!/usr/bin/env node
/**
 * pattern-screenshot.mjs
 * Capture a deterministic screenshot for a given boss pattern using Playwright.
 * Usage: node scripts/pattern-screenshot.mjs --pattern laser-arc-sweep --seed demo-seed --out artifacts/patterns/laser-arc-sweep.png --frames 420
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { pattern: null, seed: 'screenshot-seed', frames: 360, out: null, headless: true };
  for (let i=0;i<args.length;i++) {
    const a = args[i];
    if (a === '--pattern') out.pattern = args[++i];
    else if (a === '--seed') out.seed = args[++i];
    else if (a === '--frames') out.frames = parseInt(args[++i],10);
    else if (a === '--out') out.out = args[++i];
    else if (a === '--no-headless') out.headless = false;
  }
  if (!out.pattern) {
    console.error('[pattern-screenshot] --pattern required');
    process.exit(1);
  }
  if (!out.out) out.out = `artifacts/patterns/${out.pattern}.png`;
  return out;
}

async function main() {
  const opts = parseArgs();
  const browser = await chromium.launch({ headless: opts.headless });
  const ctx = await browser.newContext({ viewport: { width: 800, height: 600 } });
  const page = await ctx.newPage();
  const url = `http://localhost:4173/?seed=${encodeURIComponent(opts.seed)}&pattern=${encodeURIComponent(opts.pattern)}`;
  // Ensure dev server running (user should run preview or CI webServer already starts it)
  console.log('[pattern-screenshot] navigating', url);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  // Wait until boss pattern active
  await page.waitForFunction(pattern => window.boss && window.boss.summary().bossPattern === pattern, opts.pattern, { timeout: 10000 }).catch(()=>{});
  // Advance frames by waiting real time; fallback to fixed wait
  const ms = Math.round((opts.frames/60)*1000);
  await page.waitForTimeout(ms);
  // Hide HUD for clean pattern frame (optional toggle via opacity)
  await page.evaluate(() => { const hud = document.getElementById('hud'); if (hud) hud.style.opacity = '0'; });
  const clip = { x:0, y:0, width:800, height:600 };
  await fs.promises.mkdir(path.dirname(opts.out), { recursive: true });
  await page.screenshot({ path: opts.out, clip });
  console.log('[pattern-screenshot] wrote', opts.out);
  await browser.close();
}

main().catch(e=>{ console.error('[pattern-screenshot] error', e); process.exit(1); });
