// Shared utility to patch compiled ESM output under dist-baseline so Node's
// ESM loader can resolve extension-less relative imports produced from TS.
// - Appends .js to relative imports missing an extension.
// - Converts directory imports (./engine) to explicit ./engine/index.js
// Idempotent: running multiple times won't duplicate extensions.
import fs from 'node:fs';
import path from 'node:path';

function transformSource(filePath, src) {
  function mapSpec(spec) {
    if (spec.endsWith('.js')) return spec; // already explicit
    // If spec already ends with /index treat as needing .js
    const fileDir = path.dirname(filePath);
    const abs = path.resolve(fileDir, spec);
    try {
      if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
        return spec + '/index.js';
      }
    } catch {}
    return spec + '.js';
  }
  let updated = src.replace(/from\s+(["'])(\.\.?\/[^"';]+)\1/g, (m, q, spec) => `from ${q}${mapSpec(spec)}${q}`);
  updated = updated.replace(/import\s+(["'])(\.\.?\/[^"';]+)\1/g, (m, q, spec) => `import ${q}${mapSpec(spec)}${q}`);
  // Fix any accidental directory name turned into .js (e.g., engine.js when directory)
  updated = updated.replace(/(["'])(\.\.?\/[^"';]+)\.js\1/g, (m, q, spec) => {
    const fileDir = path.dirname(filePath);
    const abs = path.resolve(fileDir, spec);
    if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
      return `${q}${spec}/index.js${q}`;
    }
    return m;
  });
  return updated;
}

export function patchEsmImports(rootDir) {
  if (!fs.existsSync(rootDir)) return { patched: 0 };
  let patched = 0;
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p); else if (p.endsWith('.js')) {
        const txt = fs.readFileSync(p, 'utf8');
        const upd = transformSource(p, txt);
        if (upd !== txt) { fs.writeFileSync(p, upd); patched++; }
      }
    }
  }
  walk(rootDir);
  return { patched };
}

export default patchEsmImports;