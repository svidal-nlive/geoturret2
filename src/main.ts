import { GameOrchestrator, eventBus } from './engine';
import './content/initialContent';
import { createGameState } from './state/gameState';
import { createPlayerSystem } from './systems/playerSystem';
import { createInputSystem } from './systems/inputSystem';
import { createEnemySystem } from './systems/enemySystem';
import { createBulletSystem } from './systems/bulletSystem';
import { createCollisionSystem } from './systems/collisionSystem';
import { createRenderSystem } from './systems/renderSystem';
import { listPalettes, getPalette, auditPalettesForContrast } from './content/theme/palettes';
import { createCameraSystem } from './systems/cameraSystem';
import { createWaveSystem } from './systems/waveSystem';
import { createParallaxSystem } from './systems/parallaxSystem';
import { createFairnessSystem } from './systems/fairnessSystem';
import { createGrazeSystem } from './systems/grazeSystem';
import { createOverdriveSystem } from './systems/overdriveSystem';
import { createBossSystem, BossSystemSummary } from './systems/bossSystem';
import { createEconomySystem } from './systems/economySystem';
import { createSurvivabilitySystem } from './systems/survivabilitySystem';
import { createAudioManager } from './audio/audioManager';

// RNG shim removed: all randomness now routed through orchestrator-provided RNG.

// URL / persistence
const url = new URL(window.location.href);
const seed = url.searchParams.get('seed') || 'dev-seed';
const autoPause = url.searchParams.get('autopause') === '1';
const ls = (typeof localStorage !== 'undefined') ? localStorage : undefined;
const urlTheme = url.searchParams.get('theme');
const urlMotion = url.searchParams.get('motion');
const urlPattern = url.searchParams.get('pattern'); // optional explicit boss pattern id
const urlLaneIntensity = url.searchParams.get('laneIntensity');

// Authoritative state object (kept stable reference so systems retain pointer)
const gameState = createGameState();

const orchestrator = new GameOrchestrator({ seed, fixedStep: 1/60, summarySource: () => ({
  kills: gameState.kills,
  wave: gameState.wave,
  grazeCount: gameState.grazeCount,
  overdriveMeter: gameState.overdriveMeter,
  overdriveActive: gameState.overdriveActive,
  fairness: gameState.fairness,
  parallaxLayers: gameState.parallax?.layers?.map(l => { const ext = l as any; return { depth: ext.depth, color: ext.color, tileSize: ext.tileSize, step: ext.step }; }) || []
}) });

orchestrator.register(createInputSystem());
orchestrator.register(createCameraSystem(gameState));
orchestrator.register(createPlayerSystem(gameState));
orchestrator.register(createWaveSystem(gameState));
orchestrator.register(createEnemySystem(gameState));
orchestrator.register(createBulletSystem(gameState));
orchestrator.register(createCollisionSystem(gameState));
orchestrator.register(createRenderSystem(gameState));
orchestrator.register(createParallaxSystem(gameState));
orchestrator.register(createFairnessSystem(gameState));
orchestrator.register(createGrazeSystem(gameState));
orchestrator.register(createOverdriveSystem(gameState));
orchestrator.register(createEconomySystem(gameState));
orchestrator.register(createSurvivabilitySystem(gameState));
// Boss system (Phase 2 content). Allow explicit ?pattern= override for screenshot / automation harness.
const bossSummary: BossSystemSummary = { bossActive: false };
orchestrator.register(createBossSystem(bossSummary, gameState, { triggerWave: 1, patternId: urlPattern || undefined, seed }));
// Expose minimal boss debug API for automation (screenshots, CI artifacts)
(window as any).boss = {
  summary: () => ({ ...bossSummary }),
  abort: () => { bossSummary.bossAbortRequested = true; }
};

// Audio manager (non-system; lightweight update in loop)
const audioMgr = createAudioManager(gameState, 1);

// Fairness API (must be after gameState defined; uses dynamic reference so survives reset)
(window as any).fairness = {
  get: () => ({ ...gameState.fairness }),
  reset: () => { gameState.fairness.exposures = 0; gameState.fairness.minSafeWidth = Infinity; gameState.fairness.recentHits = 0; gameState.fairness.cumulativeUnsafeTime = 0; }
};

// Apply persisted / URL preferences
function clampLaneIntensity(v: any) { const n = parseFloat(v); if (!isFinite(n)) return; return Math.min(1, Math.max(0.1, n)); }
if (urlTheme) gameState.theme = urlTheme as any; else if (ls) { const t = ls.getItem('theme'); if (t) gameState.theme = t as any; }
if (urlMotion) gameState.motionReduction = urlMotion === '1' || urlMotion === 'true'; else if (ls) { const m = ls.getItem('motionReduction'); if (m) gameState.motionReduction = m === 'true'; }
if (urlLaneIntensity) { const c = clampLaneIntensity(urlLaneIntensity); if (c) gameState.safeLaneHighlightIntensity = c; }
else if (ls) { const s = ls.getItem('safeLaneIntensity'); if (s) { const c = clampLaneIntensity(s); if (c) gameState.safeLaneHighlightIntensity = c; } }

// Accessibility APIs
(window as any).accessibility = (window as any).accessibility || {};
(window as any).accessibility.setMotionReduction = (enabled: boolean) => { gameState.motionReduction = !!enabled; if (ls) ls.setItem('motionReduction', String(gameState.motionReduction)); };
(window as any).accessibility.applyMotionPref = () => { document.body.classList.toggle('motion-reduction', !!gameState.motionReduction); if (themeAutoEnabled && themeAutoMode === 'onChange') autoSelectTheme(); }; // modified to trigger theme auto
(window as any).accessibility.getMotionReduction = () => gameState.motionReduction;
(window as any).accessibility.setSafeLaneIntensity = (value: number) => {
  const clamped = clampLaneIntensity(value);
  if (clamped != null) { gameState.safeLaneHighlightIntensity = clamped; if (ls) ls.setItem('safeLaneIntensity', String(clamped)); return clamped; }
  return gameState.safeLaneHighlightIntensity;
};
(window as any).accessibility.getSafeLaneIntensity = () => gameState.safeLaneHighlightIntensity;

// Theme APIs
(window as any).theme = (window as any).theme || {};
(window as any).theme.set = (id: string) => { gameState.theme = id as any; if (ls) ls.setItem('theme', gameState.theme); };
(window as any).theme.get = () => gameState.theme;
(window as any).theme.list = () => listPalettes();
(window as any).theme.getPalette = () => getPalette(gameState.theme);
(window as any).theme.audit = () => auditPalettesForContrast();
let themeAutoEnabled = false;
try { const auto = ls?.getItem('themeAuto'); themeAutoEnabled = auto === '1'; } catch {}
(window as any).theme.setAutoEnabled = (on: boolean) => { themeAutoEnabled = !!on; if (ls) ls.setItem('themeAuto', on ? '1':'0'); if (on) autoSelectTheme(); };
(window as any).theme.isAutoEnabled = () => themeAutoEnabled;
type ThemeAutoMode = 'onChange' | 'perFrame';
let themeAutoMode: ThemeAutoMode = 'onChange';
let themeAutoIntervalMs = 5000; // default 5s
try {
  const m = ls?.getItem('themeAutoMode'); if (m === 'perFrame') themeAutoMode = 'perFrame';
  const iv = ls?.getItem('themeAutoIntervalMs'); if (iv) { const n = parseInt(iv,10); if (n>=1000 && n<=60000) themeAutoIntervalMs = n; }
} catch {}
(window as any).theme.setAutoMode = (mode: ThemeAutoMode) => { themeAutoMode = mode; if (ls) ls.setItem('themeAutoMode', mode); };
(window as any).theme.getAutoMode = () => themeAutoMode;
(window as any).theme.setAutoIntervalSeconds = (s: number) => { const ms = Math.min(60000, Math.max(1000, Math.round(s*1000))); themeAutoIntervalMs = ms; if (ls) ls.setItem('themeAutoIntervalMs', String(ms)); };
(window as any).theme.getAutoIntervalSeconds = () => themeAutoIntervalMs / 1000;
function autoSelectTheme() {
  const report = auditPalettesForContrast();
  const current = report.find(r => r.id === gameState.theme);
  if (current && current.issues.length === 0) return;
  const preferredOrder = ['highContrastDark','highContrast'];
  for (const pref of preferredOrder) {
    const rep = report.find(r => r.id === pref);
    if (rep && rep.issues.length === 0) { gameState.theme = pref as any; if (ls) ls.setItem('theme', gameState.theme); console.log('[Theme][Auto] switched to', pref, 'due to contrast issues in', current?.id); return; }
  }
  const ok = report.find(r => r.issues.length === 0);
  if (ok) { gameState.theme = ok.id as any; if (ls) ls.setItem('theme', gameState.theme); console.log('[Theme][Auto] switched to', ok.id, 'due to contrast issues'); }
}
if (themeAutoEnabled && !urlTheme) { autoSelectTheme(); }

// Runtime control vars
let profiler = false;
let paused = false;
let stepOnce = false;
let hudVisible = true;
let gameOverShown = false;
// Boss phase HUD element
const bossPhaseEl = document.getElementById('hud-boss-phase') as HTMLDivElement | null;
let bossPhaseActive = false;
let bossPhaseStartFrame = 0;
let bossPhaseExpectedFrames: number | null = null; // attempt heuristic
let bossPhaseLabel: 'Preview' | 'Laser Sweep' | null = null;
function setBossPhase(text: string | null) {
  if (!bossPhaseEl) return;
  if (text) {
    bossPhaseEl.textContent = text;
    bossPhaseEl.hidden = false;
  } else {
    bossPhaseEl.hidden = true;
    bossPhaseEl.textContent = '';
  }
}
eventBus.on('bossStart', (e: any) => {
  bossPhaseActive = true;
  bossPhaseStartFrame = orchestrator.getMetrics().frame;
  bossPhaseExpectedFrames = 0; // unknown until we inspect pattern state later
  bossPhaseLabel = 'Preview';
  setBossPhase('Preview');
});
eventBus.on('bossPatternChain', (e: any) => {
  if (!bossPhaseActive) bossPhaseActive = true;
  if (e.to === 'laser-arc-sweep') {
    bossPhaseStartFrame = orchestrator.getMetrics().frame; // reset for sweep stage
    bossPhaseExpectedFrames = 0; // will detect
    bossPhaseLabel = 'Laser Sweep';
    setBossPhase('Laser Sweep');
  }
});
eventBus.on('bossEnd', () => { bossPhaseActive = false; bossPhaseLabel = null; bossPhaseExpectedFrames = null; setBossPhase(null); });

// HUD & overlay refs
const overlay = document.getElementById('overlay')!;
const canvasEl = document.getElementById('game') as HTMLCanvasElement;
let lastInputWasKeyboard = false;
window.addEventListener('keydown', () => { lastInputWasKeyboard = true; });
window.addEventListener('mousedown', () => { lastInputWasKeyboard = false; });
canvasEl.addEventListener('focus', () => { if (lastInputWasKeyboard) canvasEl.classList.add('focus-ring'); });
canvasEl.addEventListener('blur', () => canvasEl.classList.remove('focus-ring'));
canvasEl.addEventListener('click', () => { if (document.activeElement !== canvasEl) canvasEl.focus(); });

// HUD damage flash
const healthBarEl = document.getElementById('hud-health-bar')?.parentElement;
const armorBarEl = document.getElementById('hud-armor-bar')?.parentElement;
function flash(el: HTMLElement | null) { if (!el) return; const c='damage-flash'; el.classList.remove(c); void el.offsetWidth; el.classList.add(c); }
eventBus.on('playerArmorChanged', e => { if (e.absorbed > 0) flash(armorBarEl as HTMLElement); });
eventBus.on('playerHealthChanged', e => { if (e.delta < 0) flash(healthBarEl as HTMLElement); });

// Load HUD visibility preference
try { const v = ls?.getItem('hudVisible'); if (v === '0') { hudVisible = false; const hudRoot = document.getElementById('hud'); if (hudRoot) hudRoot.classList.add('hud-hidden'); } } catch {}
// Sync button initial state after DOM ready
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
if (hudToggleBtn) {
  const apply = () => {
    hudToggleBtn.setAttribute('aria-pressed', hudVisible ? 'true' : 'false');
    hudToggleBtn.setAttribute('aria-label', hudVisible ? 'Hide HUD' : 'Show HUD');
    const lbl = hudToggleBtn.querySelector('.hud-label'); if (lbl) lbl.textContent = hudVisible ? 'Hide HUD' : 'Show HUD';
  };
  apply();
  hudToggleBtn.addEventListener('click', () => {
    hudVisible = !hudVisible;
    const hudRoot = document.getElementById('hud');
    const hudTop = document.getElementById('hud-top');
    const hudBottom = document.getElementById('hud-bottom');
    if (hudRoot) hudRoot.classList.toggle('hud-hidden', !hudVisible);
    if (hudTop) hudTop.classList.toggle('hud-hidden', !hudVisible);
    if (hudBottom) hudBottom.classList.toggle('hud-hidden', !hudVisible);
    if (ls) ls.setItem('hudVisible', hudVisible ? '1' : '0');
    apply();
  });
}
function applySettingsUI() {
  if (motionChk) motionChk.checked = !!gameState.motionReduction;
  if (audioDuckChk) audioDuckChk.checked = audioMgr.getDuckingEnabled();
  if (coinAnnounceChk) {
    try {
      const stored = ls?.getItem('coinAnnounce');
      coinAnnounceChk.checked = stored == null ? true : stored === '1';
    } catch { coinAnnounceChk.checked = true; }
  }
  if (parallaxDisableChk) {
    const stored = ls?.getItem('parallaxDisabled');
    const disabled = stored === '1';
    parallaxDisableChk.checked = disabled;
    try { (window as any).parallaxSetDisabled(disabled); } catch {}
  }
  if (masterVolSlider) { masterVolSlider.value = String(audioMgr.getMasterVolume()); if (masterVolVal) masterVolVal.textContent = (+masterVolSlider.value).toFixed(2); }
  if (safeLaneSlider) {
    const val = gameState.safeLaneHighlightIntensity ?? 1;
    safeLaneSlider.value = String(val);
    if (safeLaneVal) safeLaneVal.textContent = val.toFixed(1);
  }
  // Populate theme select once
  if (themeSelect && themeSelect.options.length === 0) {
    for (const id of listPalettes()) {
      const opt = document.createElement('option'); opt.value = id; opt.textContent = id; themeSelect.appendChild(opt);
    }
  }
  if (themeSelect) themeSelect.value = gameState.theme;
  if (themeAutoChk) themeAutoChk.checked = !!themeAutoEnabled;
  if (themeAuditStatus) {
    const rep = auditPalettesForContrast().find(r => r.id === gameState.theme);
    if (rep) {
      themeAuditStatus.textContent = rep.issues.length ? `${rep.issues.length} contrast issue${rep.issues.length>1?'s':''}` : 'OK';
      themeAuditStatus.style.color = rep.issues.length ? '#ff7043' : '#2dffb5';
    }
  }
  const mode = (window as any).theme.getAutoMode?.();
  const rChange = document.getElementById('opt-theme-auto-mode-change') as HTMLInputElement | null;
  const rFrame = document.getElementById('opt-theme-auto-mode-frame') as HTMLInputElement | null;
  if (rChange && rFrame) { if (mode === 'perFrame') { rFrame.checked = true; rChange.checked = false; } else { rChange.checked = true; rFrame.checked = false; } }
  const intervalSlider = document.getElementById('opt-theme-auto-interval') as HTMLInputElement | null;
  const intervalVal = document.getElementById('opt-theme-auto-interval-val') as HTMLSpanElement | null;
  if (intervalSlider) {
    intervalSlider.value = String(Math.round((window as any).theme.getAutoIntervalSeconds?.() || 5));
    if (intervalVal) intervalVal.textContent = intervalSlider.value + 's';
    intervalSlider.disabled = mode !== 'perFrame';
  }
}
applySettingsUI();
if (motionChk) motionChk.addEventListener('change', () => { (window as any).accessibility.setMotionReduction(motionChk.checked); (window as any).accessibility.applyMotionPref(); });
if (audioDuckChk) audioDuckChk.addEventListener('change', () => { audioMgr.setDuckingEnabled(audioDuckChk.checked); });
if (parallaxDisableChk) parallaxDisableChk.addEventListener('change', () => { try { (window as any).parallaxSetDisabled(parallaxDisableChk.checked); } catch {}; if (ls) ls.setItem('parallaxDisabled', parallaxDisableChk.checked ? '1':'0'); });
if (masterVolSlider) masterVolSlider.addEventListener('input', () => { audioMgr.setMasterVolume(parseFloat(masterVolSlider.value)); if (masterVolVal) masterVolVal.textContent = (+masterVolSlider.value).toFixed(2); });
if (safeLaneSlider) safeLaneSlider.addEventListener('input', () => { const v = parseFloat(safeLaneSlider.value); (window as any).accessibility.setSafeLaneIntensity(v); if (safeLaneVal) safeLaneVal.textContent = v.toFixed(1); });
if (coinAnnounceChk) coinAnnounceChk.addEventListener('change', () => { coinAnnounceEnabled = coinAnnounceChk.checked; if (ls) ls.setItem('coinAnnounce', coinAnnounceEnabled ? '1':'0'); if (!coinAnnounceEnabled) lastAnnouncedDelta = 0; });
if (themeSelect) themeSelect.addEventListener('change', () => { (window as any).theme.set(themeSelect.value); applySettingsUI(); });
if (themeAutoChk) themeAutoChk.addEventListener('change', () => { (window as any).theme.setAutoEnabled(themeAutoChk.checked); applySettingsUI(); });
const themeAuditBtn = document.getElementById('opt-theme-audit-run');
if (themeAuditBtn) themeAuditBtn.addEventListener('click', () => { const rep = auditPalettesForContrast(); console.table(rep.map(r => ({ id: r.id, issues: r.issues.length }))); applySettingsUI(); });
const rChange = document.getElementById('opt-theme-auto-mode-change') as HTMLInputElement | null;
const rFrame = document.getElementById('opt-theme-auto-mode-frame') as HTMLInputElement | null;
if (rChange) rChange.addEventListener('change', () => { if (rChange.checked) { (window as any).theme.setAutoMode('onChange'); applySettingsUI(); if (themeAutoEnabled) (window as any).accessibility.applyMotionPref(); } });
if (rFrame) rFrame.addEventListener('change', () => { if (rFrame.checked) { (window as any).theme.setAutoMode('perFrame'); applySettingsUI(); } });
const intervalSlider = document.getElementById('opt-theme-auto-interval') as HTMLInputElement | null;
if (intervalSlider) intervalSlider.addEventListener('input', () => { (window as any).theme.setAutoIntervalSeconds(parseInt(intervalSlider.value,10)); const valEl = document.getElementById('opt-theme-auto-interval-val') as HTMLSpanElement | null; if (valEl) valEl.textContent = intervalSlider.value + 's'; });
window.addEventListener('keydown', e => { if (e.key === 'o') { toggleSettings(); } });
window.addEventListener('keydown', e => {
  if (e.key === 'p') { profiler = !profiler; orchestrator.enableProfiler(profiler); }
  if (e.key === 's') { console.log('Snapshot', orchestrator.snapshot()); }
  if (e.key === ' ') { if (!gameOverShown) paused = !paused; }
  if (e.key === '.') { stepOnce = true; }
  if (e.key === 'm') { gameState.motionReduction = !gameState.motionReduction; console.log('[Accessibility] motionReduction =', gameState.motionReduction); if (ls) ls.setItem('motionReduction', String(gameState.motionReduction)); (window as any).accessibility.applyMotionPref(); }
  if (e.key === '-' && e.shiftKey) { audioMgr.setMasterVolume(Math.max(0, audioMgr.getMasterVolume()-0.05)); if (masterVolSlider) { masterVolSlider.value = String(audioMgr.getMasterVolume()); if (masterVolVal) masterVolVal.textContent = (+masterVolSlider.value).toFixed(2); } }
  if (e.key === '=' && e.shiftKey) { audioMgr.setMasterVolume(Math.min(1, audioMgr.getMasterVolume()+0.05)); if (masterVolSlider) { masterVolSlider.value = String(audioMgr.getMasterVolume()); if (masterVolVal) masterVolVal.textContent = (+masterVolSlider.value).toFixed(2); } }
  // Quick dev hotkeys to test safe lane intensity (shift+ [ / ])
  if (e.key === '[' && e.shiftKey) { const cur = gameState.safeLaneHighlightIntensity || 1; const next = Math.max(0.1, +(cur - 0.1).toFixed(2)); gameState.safeLaneHighlightIntensity = next; if (ls) ls.setItem('safeLaneIntensity', String(next)); console.log('[Accessibility] safeLaneIntensity =', next); }
  if (e.key === ']' && e.shiftKey) { const cur = gameState.safeLaneHighlightIntensity || 1; const next = Math.min(1, +(cur + 0.1).toFixed(2)); gameState.safeLaneHighlightIntensity = next; if (ls) ls.setItem('safeLaneIntensity', String(next)); console.log('[Accessibility] safeLaneIntensity =', next); }
  if (e.key === 't') { const ids = listPalettes(); const idx = ids.indexOf(gameState.theme); gameState.theme = ids[(idx + 1) % ids.length] as any; console.log('[Theme] switched to', gameState.theme); if (ls) ls.setItem('theme', gameState.theme); }
  if (e.key === 'T' && e.shiftKey) { const next = themeAutoMode === 'onChange' ? 'perFrame' : 'onChange'; themeAutoMode = next; if (ls) ls.setItem('themeAutoMode', next); console.log('[Theme][AutoMode]', next); }
  if (e.key === 'h') { hudVisible = !hudVisible; const hudRoot = document.getElementById('hud'); const hudTop = document.getElementById('hud-top'); const hudBottom = document.getElementById('hud-bottom'); if (hudRoot) hudRoot.classList.toggle('hud-hidden', !hudVisible); if (hudTop) hudTop.classList.toggle('hud-hidden', !hudVisible); if (hudBottom) hudBottom.classList.toggle('hud-hidden', !hudVisible); if (ls) ls.setItem('hudVisible', hudVisible ? '1' : '0'); if (hudToggleBtn) { hudToggleBtn.setAttribute('aria-pressed', hudVisible ? 'true' : 'false'); hudToggleBtn.setAttribute('aria-label', hudVisible ? 'Hide HUD' : 'Show HUD'); const lbl = hudToggleBtn.querySelector('.hud-label'); if (lbl) lbl.textContent = hudVisible ? 'Hide HUD' : 'Show HUD'; } }
  if (e.key === 'c' && e.shiftKey) { coinAnnounceEnabled = !coinAnnounceEnabled; if (ls) ls.setItem('coinAnnounce', coinAnnounceEnabled ? '1':'0'); if (coinAnnounceChk) coinAnnounceChk.checked = coinAnnounceEnabled; if (!coinAnnounceEnabled) lastAnnouncedDelta = 0; console.log('[Accessibility] coin announcements =', coinAnnounceEnabled); }
});

orchestrator.init();
(window as any).accessibility.applyMotionPref();

function toggleSettings(force?: boolean) { if (!settingsPanel || !settingsBtn) return; const show = force != null ? force : settingsPanel.hasAttribute('hidden'); if (show) { settingsPanel.removeAttribute('hidden'); settingsBtn.setAttribute('aria-expanded','true'); applySettingsUI(); } else { settingsPanel.setAttribute('hidden',''); settingsBtn.setAttribute('aria-expanded','false'); } }
if (settingsBtn) settingsBtn.addEventListener('click', () => toggleSettings());
const settingsClose = document.getElementById('settings-close'); if (settingsClose) settingsClose.addEventListener('click', () => toggleSettings(false));

function resetGame() { const keep = { theme: gameState.theme, motion: gameState.motionReduction, lane: gameState.safeLaneHighlightIntensity }; const baseline = createGameState(); for (const k of Object.keys(baseline) as (keyof typeof baseline)[]) { (gameState as any)[k] = (baseline as any)[k]; } gameState.theme = keep.theme as any; gameState.motionReduction = keep.motion; if (keep.lane != null) gameState.safeLaneHighlightIntensity = keep.lane; lastCoins = gameState.coins || 0; coinDeltaAccum = 0; coinDeltaTimer = 0; paused = false; stepOnce = false; gameOverShown = false; gameState.playerDead = false; const go = document.getElementById('game-over'); if (go) { go.classList.remove('visible'); go.setAttribute('hidden',''); } applySettingsUI(); }
eventBus.on('playerDeath', () => { if (gameOverShown) return; gameOverShown = true; paused = true; const go = document.getElementById('game-over'); if (go) { go.removeAttribute('hidden'); go.classList.add('visible'); const set = (k: string, v: string) => { const el = go.querySelector(`[data-k="go-${k}"]`); if (el && el.textContent !== v) el.textContent = v; }; set('kills', String(gameState.kills)); set('wave', String(gameState.wave)); set('coins', String(gameState.coins ?? 0)); const metrics = orchestrator.getMetrics(); set('time', metrics.time.toFixed(2)+'s'); const restartBtn = document.getElementById('btn-restart'); if (restartBtn) restartBtn.addEventListener('click', () => resetGame(), { once: true }); } });

let last = performance.now();
let lastCoins = gameState.coins || 0; // last total coins observed
let coinDeltaAccum = 0; // aggregated delta during visibility window
let coinDeltaTimer = 0; // time remaining to show aggregate before clearing
let coinDeltaPeak = 0; // peak absolute aggregate used for intensity scaling
let coinDeltaBumpCooldown = 0; // rate-limit bump animation
let coinDeltaFade = 0; // smooth fade progress (0=hidden,1=fully visible)
let lastAnnouncedDelta = 0; // to avoid duplicate SR announcements
let lastAnnounceTime = 0; // timestamp of last SR announcement
let coinAnnounceEnabled = true; try { const stored = ls?.getItem('coinAnnounce'); if (stored != null) coinAnnounceEnabled = stored === '1'; } catch {}
function spawnCoinBurst(amount: number) { if (gameState.motionReduction) return; const root = document.getElementById('hud-coins'); if (!root) return; const burstCount = Math.min(6, Math.max(3, Math.floor(Math.log2(Math.abs(amount)+1))+2)); for (let i=0;i<burstCount;i++) { const span = document.createElement('span'); span.className = 'coin-burst'; span.textContent = amount > 0 ? '+' : '-'; const ang = (Math.PI * 2 * i / burstCount) + (Math.random()*0.6 - 0.3); const dist = 14 + Math.random()*10; const dx = Math.cos(ang) * dist; const dy = Math.sin(ang) * dist * 0.7 - 10; span.style.setProperty('--dx', dx.toFixed(1)+'px'); span.style.setProperty('--dy', dy.toFixed(1)+'px'); span.style.position = 'absolute'; span.style.left = '100%'; span.style.top = '50%'; span.style.marginLeft = '4px'; span.style.transform = 'translate(-4px,-50%)'; root.appendChild(span); setTimeout(()=> span.remove(), 800); } }
function updateCoinDelta() {
  const step = orchestrator.getStep();
  const current = gameState.coins || 0;
  const hudEl = document.getElementById('hud-coin-delta');
  const srEl = document.getElementById('sr-coin-announce');
  if (current !== lastCoins) {
    const diff = current - lastCoins;
    coinDeltaAccum += diff;
    lastCoins = current;
    coinDeltaTimer = 1.4; // extend slightly for readability
    coinDeltaPeak = Math.max(coinDeltaPeak, Math.abs(coinDeltaAccum));
    if (diff !== 0) spawnCoinBurst(diff);
    if (hudEl && coinDeltaBumpCooldown <= 0) {
      hudEl.classList.remove('bump'); void hudEl.offsetWidth; hudEl.classList.add('bump');
      coinDeltaBumpCooldown = 0.25;
    }
    // Screen reader concise announcement only when total aggregate changes sign or magnitude materially
    if (srEl && coinAnnounceEnabled) {
      const announceThreshold = 1; // minimal change to announce
      const debounceMs = 450; // min interval between announcements
      const nowMs = performance.now();
      if (nowMs - lastAnnounceTime >= debounceMs && Math.abs(coinDeltaAccum - lastAnnouncedDelta) >= announceThreshold) {
        const sign = coinDeltaAccum > 0 ? '+' : '';
        srEl.textContent = `Coins ${sign}${coinDeltaAccum}`;
        lastAnnouncedDelta = coinDeltaAccum;
        lastAnnounceTime = nowMs;
      }
    }
  }
  if (coinDeltaTimer > 0) {
    coinDeltaTimer -= step;
    if (coinDeltaTimer <= 0) {
      // start fade out by allowing fade variable to ease toward 0 while clearing aggregate state
      coinDeltaAccum = 0; coinDeltaPeak = 0; lastAnnouncedDelta = 0;
    }
  }
  if (coinDeltaBumpCooldown > 0) coinDeltaBumpCooldown -= step;
  // Smooth fade logic (approach target visibility based on whether we have an active aggregate)
  const target = (coinDeltaAccum !== 0 && coinDeltaTimer > 0) ? 1 : 0;
  const fadeSpeed = 6; // responsiveness of fade smoothing
  coinDeltaFade += (target - coinDeltaFade) * Math.min(1, fadeSpeed * step);
  if (hudEl) {
    if (coinDeltaFade > 0.01) {
      const sign = coinDeltaAccum > 0 ? '+' : '';
      if (coinDeltaAccum !== 0) hudEl.textContent = sign + coinDeltaAccum;
      hudEl.classList.add('visible');
      // semantic class for spend vs gain
      hudEl.classList.toggle('gain', coinDeltaAccum >= 0);
      hudEl.classList.toggle('spend', coinDeltaAccum < 0);
      // dynamic style intensity using previous peak
      const intensity = coinDeltaPeak > 0 ? Math.min(1, Math.abs(coinDeltaAccum) / coinDeltaPeak) : 0;
      const hue = coinDeltaAccum >= 0 ? 195 : 15;
      const baseSat = coinDeltaAccum >= 0 ? 70 : 80;
      const sat = baseSat + 30 * intensity;
      const baseLight = coinDeltaAccum >= 0 ? 55 : 50;
      const light = baseLight + 15 * intensity;
      const alpha = coinDeltaFade; // fade drives opacity
      if (!gameState.motionReduction) {
        hudEl.style.color = `hsl(${hue} ${sat}% ${light}%)`;
        hudEl.style.opacity = alpha.toFixed(3);
        const glowColor = coinDeltaAccum >= 0 ? '0,170,255' : '255,80,40';
        hudEl.style.filter = `drop-shadow(0 0 ${2 + 4 * intensity}px rgba(${glowColor},${0.25 + 0.45 * intensity * alpha}))`;
      } else {
        hudEl.style.color = coinDeltaAccum >= 0 ? 'hsl(195 60% 60%)' : 'hsl(15 70% 55%)';
        hudEl.style.opacity = alpha.toFixed(3);
        hudEl.style.filter = 'none';
      }
    } else {
      hudEl.textContent = '';
      hudEl.classList.remove('visible','bump','gain','spend');
      hudEl.style.opacity = '0';
    }
  }
}
function loop(now: number) {
  const elapsed = (now - last) / 1000;
  last = now;
  if (!paused) orchestrator.advance(elapsed);
  else if (stepOnce) { orchestrator.advance(orchestrator.getStep()); stepOnce = false; }
  if (themeAutoEnabled && themeAutoMode === 'perFrame') { const t = performance.now(); const lastCheck = (loop as any).__lastThemeCheck || 0; if (t - lastCheck > themeAutoIntervalMs) { autoSelectTheme(); (loop as any).__lastThemeCheck = t; } }
  // Non-system updates
  audioMgr.update(elapsed);
  const metrics = orchestrator.getMetrics();
  overlay.textContent = `seed:${seed}\nframe:${metrics.frame}\ntime:${metrics.time.toFixed(2)}s\n(kills:${gameState.kills} wave:${gameState.wave})${paused ? ' [PAUSED]' : ''}\nE pool: inUse=${gameState.enemyPool.stats().inUse} free=${gameState.enemyPool.stats().free}\nB pool: inUse=${gameState.bulletPool.stats().inUse} free=${gameState.bulletPool.stats().free}\nPP pool: inUse=${gameState.patternProjectilePool.stats().inUse} free=${gameState.patternProjectilePool.stats().free}\nParticle pool: inUse=${gameState.particlePool.stats().inUse} free=${gameState.particlePool.stats().free}` + (profiler && metrics.profiling ? '\n' + Object.entries(metrics.profiling).map(([k,v])=>`${k}:${v.toFixed(3)}ms`).join('\n') : '');
  // HUD updates
  const hudFair = document.getElementById('hud-fairness');
  // Fairness adjustment factor quick display
  const fairAdjEl = document.querySelector('#hud-fairness-adj [data-k="fairAdj"]') as HTMLElement | null;
  if (fairAdjEl) {
    const adj = gameState.fairness.adjustmentFactor ?? 1;
    const txt = adj.toFixed(2);
    if (fairAdjEl.textContent !== txt) fairAdjEl.textContent = txt;
  }
  if (hudFair) {
    const f = gameState.fairness;
    const set = (k: string, v: string) => { const el = hudFair.querySelector(`[data-k="${k}"]`); if (el && el.textContent !== v) el.textContent = v; };
    set('exposures', String(f.exposures));
    set('minWidth', f.minSafeWidth === Infinity ? '–' : f.minSafeWidth.toFixed(2));
    set('unsafe', f.cumulativeUnsafeTime.toFixed(2)+'s');
  }
  const hudBoss = document.getElementById('hud-boss');
  if (hudBoss) {
    const set = (k: string, v: string) => { const el = hudBoss.querySelector(`[data-k="${k}"]`); if (el && el.textContent !== v) el.textContent = v; };
    const patternState: any = (gameState as any).__bossPatternState;
    set('pattern', gameState.currentBossPatternId || '–');
    set('telegraph', patternState ? (patternState.telegraph ? 'yes' : 'no') : '–');
    const hpPct = gameState.bossMaxHealth > 0 ? (gameState.bossHealth / gameState.bossMaxHealth) : 0;
    const bar = hudBoss.querySelector('[data-k="hpBar"]') as HTMLElement | null;
    if (bar) bar.style.width = (hpPct*100).toFixed(1)+'%';
  }
  const coinsEl = document.querySelector('#hud-coins [data-k="coins"]'); if (coinsEl) coinsEl.textContent = String(gameState.coins ?? 0);
  const waveEl = document.querySelector('#hud-wave [data-k="wave"]'); if (waveEl) waveEl.textContent = String(gameState.wave);
  const seedEl = document.querySelector('#hud-seed [data-k="seed"]'); if (seedEl) seedEl.textContent = seed;
  const odBar = document.getElementById('hud-overdrive-bar'); const odPct = Math.round(gameState.overdriveMeter * 100); if (odBar) odBar.style.width = odPct + '%';
  const odPctEl = document.getElementById('hud-overdrive-pct'); if (odPctEl && odPctEl.textContent !== odPct + '%') odPctEl.textContent = odPct + '%';
  const odActiveEl = document.getElementById('hud-overdrive-active'); if (odActiveEl) odActiveEl.textContent = gameState.overdriveActive ? 'active' : 'inactive';
  const odRemainEl = document.getElementById('hud-overdrive-remaining'); if (odRemainEl) odRemainEl.textContent = gameState.overdriveActive ? gameState.overdriveTimeRemaining.toFixed(2)+'s' : '0.00s';
  const odLine = document.getElementById('hud-od-line'); if (odLine) odLine.classList.toggle('overdrive-active', !!gameState.overdriveActive);
  const hp = gameState.playerHealth ?? 0; const hpMax = gameState.playerMaxHealth || 1; const armor = gameState.playerArmor ?? 0; const armorMax = gameState.playerMaxArmor || 1;
  const hpBar = document.getElementById('hud-health-bar'); if (hpBar) hpBar.style.width = Math.min(100, (hp / hpMax) * 100) + '%';
  const hpLbl = document.getElementById('hud-health-label'); if (hpLbl) hpLbl.textContent = `Health ${hp}/${hpMax}`;
  const arBar = document.getElementById('hud-armor-bar'); if (arBar) arBar.style.width = Math.min(100, (armor / armorMax) * 100) + '%';
  const arLbl = document.getElementById('hud-armor-label'); if (arLbl) arLbl.textContent = `Armor ${armor}/${armorMax}`;
  // Dynamic bar state classes
  const hpContainer = hpBar?.parentElement; const arContainer = arBar?.parentElement;
  if (hpContainer) {
    hpContainer.classList.remove('low','critical','dead');
    const pct = hpMax > 0 ? hp / hpMax : 0;
    if (hp <= 0) hpContainer.classList.add('dead');
    else if (pct <= 0.25) {
      hpContainer.classList.add('critical');
      // Dynamic pulse speed: lower health -> faster pulse.
      // Map pct (0..0.25] to duration range [0.55s .. 1.1s]
      const norm = Math.min(1, Math.max(0, pct / 0.25));
      const dur = 0.55 + (1.1 - 0.55) * norm; // health closer to 0 -> ~0.55s
      (hpBar as HTMLElement)?.style.setProperty('--hpPulseDur', dur.toFixed(2)+'s');
    } else if (pct <= 0.55) hpContainer.classList.add('low');
  }
  if (arContainer) {
    arContainer.classList.remove('low');
    const apct = armorMax > 0 ? armor / armorMax : 0;
    if (apct > 0 && apct <= 0.35) arContainer.classList.add('low');
  }
  updateCoinDelta();
  // Boss phase timer & progress
  if (bossPhaseActive) {
    const timerEl = document.getElementById('hud-boss-phase-timer');
    if (timerEl && bossPhaseLabel) {
      const frameNow = metrics.frame;
      const elapsedFrames = frameNow - bossPhaseStartFrame;
      const elapsedSec = elapsedFrames * orchestrator.getStep();
      if (timerEl.hasAttribute('hidden')) timerEl.removeAttribute('hidden');
      // Determine expected frames from live pattern state metadata when available
      const patternState: any = (gameState as any).__bossPatternState;
      if (patternState && patternState.totalFrames && (bossPhaseExpectedFrames == null || bossPhaseExpectedFrames === 0 || patternState.id !== (bossPhaseLabel === 'Preview' ? 'pre-laser-arc-preview':'laser-arc-sweep'))) {
        bossPhaseExpectedFrames = patternState.totalFrames;
      }
      // Fallback heuristic if metadata missing
      if (!bossPhaseExpectedFrames || bossPhaseExpectedFrames === 0) {
        const fallback = bossPhaseLabel === 'Preview' ? 120 * (gameState.fairness.adjustmentFactor||1) : (45 + 120);
        bossPhaseExpectedFrames = fallback;
      }
      timerEl.textContent = elapsedSec.toFixed(1)+'s';
      const progressEl = document.querySelector('#hud-boss-phase-progress') as HTMLDivElement | null;
  const etaEl = document.getElementById('hud-boss-phase-eta');
      if (progressEl) {
        if (progressEl.style.display === 'none') progressEl.style.display = 'inline-block';
        const telegraphFrames = patternState?.telegraphFrames ?? (bossPhaseLabel === 'Preview' ? bossPhaseExpectedFrames : patternState?.telegraphFrames || 0);
        const fireFrames = patternState?.fireFrames ?? (patternState && patternState.totalFrames ? patternState.totalFrames - telegraphFrames : 0);
        const telegraphPct = bossPhaseExpectedFrames ? Math.min(1, telegraphFrames / bossPhaseExpectedFrames) : 0;
        const pct = bossPhaseExpectedFrames ? Math.min(1, elapsedFrames / bossPhaseExpectedFrames) : 0;
        const teleDiv = progressEl.querySelector('.seg.telegraph') as HTMLElement | null;
        const fireDiv = progressEl.querySelector('.seg.fire') as HTMLElement | null;
        if (teleDiv) teleDiv.style.width = (Math.min(pct, telegraphPct) * 100).toFixed(1)+'%';
        if (fireDiv) {
          const fireProgress = pct <= telegraphPct ? 0 : (pct - telegraphPct) / Math.max(0.0001, 1 - telegraphPct);
          // Position fire segment start
          fireDiv.style.transform = `translateX(${(telegraphPct*100).toFixed(3)}%)`;
          fireDiv.style.width = (Math.max(0, Math.min(1, fireProgress)) * (100 - telegraphPct*100)).toFixed(1)+'%';
        }
        if (pct >= 1) progressEl.classList.add('complete');
      }
      if (etaEl) {
        const remainingFrames = bossPhaseExpectedFrames ? Math.max(0, bossPhaseExpectedFrames - elapsedFrames) : 0;
        const remainingSec = remainingFrames * orchestrator.getStep();
        etaEl.textContent = 'ETA ' + remainingSec.toFixed(1) + 's';
        if (etaEl.hasAttribute('hidden')) etaEl.removeAttribute('hidden');
        if (remainingFrames === 0) etaEl.textContent = 'ETA 0.0s';
      }
    }
  } else {
    const timerEl = document.getElementById('hud-boss-phase-timer'); if (timerEl && !timerEl.hasAttribute('hidden')) timerEl.setAttribute('hidden','');
    const etaEl = document.getElementById('hud-boss-phase-eta'); if (etaEl && !etaEl.hasAttribute('hidden')) etaEl.setAttribute('hidden','');
    const progressEl = document.getElementById('hud-boss-phase-progress') as HTMLDivElement | null; if (progressEl) { progressEl.style.display='none'; const bar = progressEl.firstElementChild as HTMLElement | null; if (bar) bar.style.width='0%'; }
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

console.log('[Geoturret2] Dev harness started with seed', seed, autoPause ? '(paused)' : '');
// Signal to automation that boot sequence (script execution) completed
(window as any).__booted = true;
