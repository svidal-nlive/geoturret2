// Lazy HUD / Settings initialization extracted from main.ts for modular loading.
// This file intentionally pulls DOM-heavy and optional UX wiring to allow the core game loop
// (simulation systems + rendering) to ship in a smaller initial bundle.
import { GameOrchestrator } from '../engine';
import type { GameState } from '../state/gameState';

export interface InitHudOptions {
  audioMgr?: { getDuckingEnabled(): boolean; setDuckingEnabled(v: boolean): void; getMasterVolume(): number; setMasterVolume(v: number): void; } | null;
  applyMotionPref(): void;
  listPalettes(): string[];
  auditPalettesForContrast(): { id: string; issues: any[] }[];
  getPaletteTheme(): string;
  setPaletteTheme(id: string): void;
  isThemeAutoEnabled(): boolean;
  setThemeAutoEnabled(on: boolean): void;
  getThemeAutoMode(): string;
  setThemeAutoMode(mode: 'onChange' | 'perFrame'): void;
  getThemeAutoIntervalSeconds(): number;
  setThemeAutoIntervalSeconds(s: number): void;
}

export function initHud(orchestrator: GameOrchestrator, state: GameState, opts: InitHudOptions) {
  // Guard: DOM only
  if (typeof document === 'undefined') return;
  const ls = (typeof localStorage !== 'undefined') ? localStorage : undefined;
  let hudVisible = true;
  try { const v = ls?.getItem('hudVisible'); if (v === '0') hudVisible = false; } catch {}
  const hudToggleBtn = document.getElementById('hud-toggle-btn') as HTMLButtonElement | null;
  const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement | null;
  const settingsPanel = document.getElementById('settings-panel') as HTMLDivElement | null;
  const motionChk = document.getElementById('opt-motion-reduction') as HTMLInputElement | null;
  const audioDuckChk = document.getElementById('opt-audio-duck') as HTMLInputElement | null;
  const parallaxDisableChk = document.getElementById('opt-parallax-disable') as HTMLInputElement | null;
  const masterVolSlider = document.getElementById('opt-master-volume') as HTMLInputElement | null;
  const masterVolVal = document.getElementById('opt-master-volume-val') as HTMLSpanElement | null;
  const safeLaneSlider = document.getElementById('opt-safe-lane') as HTMLInputElement | null;
  const safeLaneVal = document.getElementById('opt-safe-lane-val') as HTMLSpanElement | null;
  const coinAnnounceChk = document.getElementById('opt-coin-announce') as HTMLInputElement | null;
  const themeSelect = document.getElementById('opt-theme-select') as HTMLSelectElement | null;
  const themeAutoChk = document.getElementById('opt-theme-auto') as HTMLInputElement | null;
  const themeAuditStatus = document.getElementById('opt-theme-audit-status') as HTMLSpanElement | null;

  function applySettingsUI() {
    if (motionChk) motionChk.checked = !!state.motionReduction;
    if (audioDuckChk && opts.audioMgr) audioDuckChk.checked = opts.audioMgr.getDuckingEnabled();
    if (parallaxDisableChk) {
      const stored = ls?.getItem('parallaxDisabled');
      parallaxDisableChk.checked = stored === '1';
    }
    if (masterVolSlider && opts.audioMgr) { masterVolSlider.value = String(opts.audioMgr.getMasterVolume()); if (masterVolVal) masterVolVal.textContent = (+masterVolSlider.value).toFixed(2); }
    if (safeLaneSlider) { const val = state.safeLaneHighlightIntensity ?? 1; safeLaneSlider.value = String(val); if (safeLaneVal) safeLaneVal.textContent = val.toFixed(1); }
    if (themeSelect && themeSelect.options.length === 0) {
      for (const id of opts.listPalettes()) { const opt = document.createElement('option'); opt.value = id; opt.textContent = id; themeSelect.appendChild(opt); }
    }
    if (themeSelect) themeSelect.value = opts.getPaletteTheme();
    if (themeAutoChk) themeAutoChk.checked = opts.isThemeAutoEnabled();
    if (themeAuditStatus) {
      const rep = opts.auditPalettesForContrast().find(r => r.id === opts.getPaletteTheme());
      if (rep) {
        themeAuditStatus.textContent = rep.issues.length ? `${rep.issues.length} contrast issue${rep.issues.length>1?'s':''}` : 'OK';
        themeAuditStatus.style.color = rep.issues.length ? '#ff7043' : '#2dffb5';
      }
    }
  }
  applySettingsUI();

  if (hudToggleBtn) {
    const apply = () => { hudToggleBtn.setAttribute('aria-pressed', hudVisible ? 'true':'false'); hudToggleBtn.setAttribute('aria-label', hudVisible ? 'Hide HUD':'Show HUD'); };
    apply();
    hudToggleBtn.addEventListener('click', () => {
      hudVisible = !hudVisible; const hudRoot = document.getElementById('hud'); const hudTop = document.getElementById('hud-top'); const hudBottom = document.getElementById('hud-bottom');
      if (hudRoot) hudRoot.classList.toggle('hud-hidden', !hudVisible);
      if (hudTop) hudTop.classList.toggle('hud-hidden', !hudVisible);
      if (hudBottom) hudBottom.classList.toggle('hud-hidden', !hudVisible);
      if (ls) ls.setItem('hudVisible', hudVisible ? '1':'0');
      apply();
    });
  }

  if (motionChk) motionChk.addEventListener('change', () => { state.motionReduction = motionChk.checked; opts.applyMotionPref(); });
  if (audioDuckChk && opts.audioMgr) audioDuckChk.addEventListener('change', () => opts.audioMgr!.setDuckingEnabled(audioDuckChk.checked));
  if (masterVolSlider && opts.audioMgr) masterVolSlider.addEventListener('input', () => { opts.audioMgr!.setMasterVolume(parseFloat(masterVolSlider.value)); if (masterVolVal) masterVolVal.textContent = (+masterVolSlider.value).toFixed(2); });
  if (safeLaneSlider) safeLaneSlider.addEventListener('input', () => { const v = parseFloat(safeLaneSlider.value); state.safeLaneHighlightIntensity = v; if (safeLaneVal) safeLaneVal.textContent = v.toFixed(1); if (ls) ls.setItem('safeLaneIntensity', String(v)); });
  if (themeSelect) themeSelect.addEventListener('change', () => { opts.setPaletteTheme(themeSelect.value); applySettingsUI(); });
  if (themeAutoChk) themeAutoChk.addEventListener('change', () => { opts.setThemeAutoEnabled(themeAutoChk.checked); applySettingsUI(); });
  const rChange = document.getElementById('opt-theme-auto-mode-change') as HTMLInputElement | null;
  const rFrame = document.getElementById('opt-theme-auto-mode-frame') as HTMLInputElement | null;
  if (rChange) rChange.addEventListener('change', () => { if (rChange.checked) { opts.setThemeAutoMode('onChange'); applySettingsUI(); } });
  if (rFrame) rFrame.addEventListener('change', () => { if (rFrame.checked) { opts.setThemeAutoMode('perFrame'); applySettingsUI(); } });
  const intervalSlider = document.getElementById('opt-theme-auto-interval') as HTMLInputElement | null;
  if (intervalSlider) intervalSlider.addEventListener('input', () => { opts.setThemeAutoIntervalSeconds(parseInt(intervalSlider.value,10)); const valEl = document.getElementById('opt-theme-auto-interval-val') as HTMLSpanElement | null; if (valEl) valEl.textContent = intervalSlider.value + 's'; });
}
