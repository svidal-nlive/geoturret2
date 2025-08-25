/** Theme palette registry (Phase 2 accessibility/theming). */
export interface Palette {
  id: string;
  bg: string;
  playerStroke: string;
  bullet: string;
  patternProjectile: string;
  enemy: string;
  bossStroke: string;
  bossHpBack: string;
  bossHpFront: string;
  parallaxLow: string;
  parallaxMid: string;
  particleSpark: string;
  particleEmber: string;
  particleTrail: string;
  particleGeneric: string;
  safeLaneSafe: string;
  safeLaneHazard: string;
}

const defaultPalette: Palette = {
  id: 'default',
  bg: '#000',
  playerStroke: '#0af',
  bullet: '#ff0',
  patternProjectile: '#0ff',
  enemy: '#f44',
  bossStroke: '#fff',
  bossHpBack: '#400',
  bossHpFront: '#e22',
  parallaxLow: '#113',
  parallaxMid: '#225',
  particleSpark: '#ffd54a',
  particleEmber: '#ff8733',
  particleTrail: '#8cf',
  particleGeneric: '#fa4'
  , safeLaneSafe: '#2f4', safeLaneHazard: '#f42'
};

const highContrast: Palette = {
  id: 'highContrast',
  bg: '#000',
  playerStroke: '#ffffff',
  bullet: '#ffff00',
  patternProjectile: '#00ffff',
  enemy: '#ff5555',
  bossStroke: '#ffffff',
  bossHpBack: '#222',
  bossHpFront: '#ff2222',
  parallaxLow: '#333333',
  parallaxMid: '#666666',
  particleSpark: '#ffffff',
  particleEmber: '#ffcc33',
  particleTrail: '#ffffff',
  particleGeneric: '#ffffff'
  , safeLaneSafe: '#00ffc8', safeLaneHazard: '#ff0044'
};

// Deuteranopia-friendly palette (greens shifted, rely on cyan/magenta separation)
const deuteranopia: Palette = {
  id: 'deuteranopia',
  bg: '#000',
  playerStroke: '#00baff',
  bullet: '#ffd400',
  patternProjectile: '#00ffee',
  enemy: '#ff4d7a',
  bossStroke: '#ffffff',
  bossHpBack: '#222',
  bossHpFront: '#ff4d7a',
  parallaxLow: '#102030',
  parallaxMid: '#203a55',
  particleSpark: '#ffe680',
  particleEmber: '#ff9966',
  particleTrail: '#78d7ff',
  particleGeneric: '#ffaa55',
  safeLaneSafe: '#33ffb0',
  safeLaneHazard: '#ff0044'
};

// Protanopia-friendly palette (reds adjusted brighter / more yellow to differentiate)
const protanopia: Palette = {
  id: 'protanopia',
  bg: '#000',
  playerStroke: '#00c8ff',
  bullet: '#fff200',
  patternProjectile: '#00fff6',
  enemy: '#ff6b4d',
  bossStroke: '#ffffff',
  bossHpBack: '#1e1e1e',
  bossHpFront: '#ff6b4d',
  parallaxLow: '#112233',
  parallaxMid: '#2a3d55',
  particleSpark: '#ffe680',
  particleEmber: '#ffae66',
  particleTrail: '#7dd9ff',
  particleGeneric: '#ffbb66',
  safeLaneSafe: '#33ffd2',
  safeLaneHazard: '#ff0044'
};

// Tritanopia-friendly palette (blue/yellow separation improved)
const tritanopia: Palette = {
  id: 'tritanopia',
  bg: '#000',
  playerStroke: '#00b0ff',
  bullet: '#ffde33',
  patternProjectile: '#00ffb8',
  enemy: '#ff4466',
  bossStroke: '#ffffff',
  bossHpBack: '#202020',
  bossHpFront: '#ff4466',
  parallaxLow: '#122020',
  parallaxMid: '#234040',
  particleSpark: '#ffd966',
  particleEmber: '#ff9444',
  particleTrail: '#66d0ff',
  particleGeneric: '#ffaa55',
  safeLaneSafe: '#33ffe0',
  safeLaneHazard: '#ff0044'
};

// High contrast dark palette variant emphasizing WCAG AA+ contrasts for HUD elements
const highContrastDark: Palette = {
  id: 'highContrastDark',
  bg: '#000',
  playerStroke: '#ffffff',
  bullet: '#ffe600',
  patternProjectile: '#00fff6',
  enemy: '#ff4d4d',
  bossStroke: '#ffffff',
  bossHpBack: '#111111',
  bossHpFront: '#ff2a2a',
  parallaxLow: '#101010',
  parallaxMid: '#242424',
  particleSpark: '#ffffff',
  particleEmber: '#ffb347',
  particleTrail: '#c2ecff',
  particleGeneric: '#ffdd55',
  safeLaneSafe: '#2dffb5',
  safeLaneHazard: '#ff2d6b'
};

const palettes: Record<string, Palette> = {
  [defaultPalette.id]: defaultPalette,
  [highContrast.id]: highContrast,
  [deuteranopia.id]: deuteranopia,
  [protanopia.id]: protanopia,
  [tritanopia.id]: tritanopia
  , [highContrastDark.id]: highContrastDark
};

export function getPalette(id: string | undefined): Palette {
  return (id && palettes[id]) || defaultPalette;
}

export function listPalettes(): string[] { return Object.keys(palettes); }

// Simple contrast heuristic (relative luminance) for automated checks
export function relativeLuminance(hex: string): number {
  const mFull = /^#?([0-9a-f]{6})$/i.exec(hex);
  let hex6 = mFull ? mFull[1] : undefined;
  if (!hex6) {
    const mShort = /^#?([0-9a-f]{3})$/i.exec(hex);
    if (mShort) {
      hex6 = mShort[1].split('').map(c=>c+c).join('');
    }
  }
  if (!hex6) return 0;
  const int = parseInt(hex6, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  const toLin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const rl = toLin(r), gl = toLin(g), bl = toLin(b);
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

export function contrastRatio(a: string, b: string): number {
  const L1 = relativeLuminance(a);
  const L2 = relativeLuminance(b);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function listPalettesDetailed(): Palette[] { return Object.values(palettes); }

// Automated accessibility audit for palette contrasts.
export interface PaletteContrastReport { id: string; issues: string[]; summary: string; }
export function auditPalettesForContrast(bgContrastTarget = 4.5): PaletteContrastReport[] {
  const reports: PaletteContrastReport[] = [];
  for (const p of listPalettesDetailed()) {
    const issues: string[] = [];
    // Evaluate key foreground vs bg
    const fgKeys: (keyof Palette)[] = ['playerStroke','bullet','patternProjectile','enemy','bossStroke','bossHpFront','particleSpark','particleEmber','particleTrail','particleGeneric','safeLaneSafe','safeLaneHazard'];
    for (const k of fgKeys) {
      const ratio = contrastRatio(p.bg, p[k]);
      if (ratio < bgContrastTarget) issues.push(`${k} contrast ${ratio.toFixed(2)} (<${bgContrastTarget})`);
    }
    // Boss HP foreground vs background bar
    const hpRatio = contrastRatio(p.bossHpBack, p.bossHpFront);
    if (hpRatio < 3) issues.push(`bossHpFront vs bossHpBack contrast ${hpRatio.toFixed(2)} (<3)`);
    reports.push({ id: p.id, issues, summary: issues.length ? `${issues.length} issues` : 'OK' });
  }
    return reports;
}

if (typeof window !== 'undefined') {
  (window as any).paletteAudit = () => auditPalettesForContrast();
}
