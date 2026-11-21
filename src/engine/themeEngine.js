import { DEFAULT_USER_PREFS, PREFS_KEY, THEME_PRESETS } from './constants.js';

export function getThemePreset(themeId) {
  return THEME_PRESETS.find((t) => t.id === themeId) || THEME_PRESETS[0];
}

export function normalizeUserPrefs(raw = {}) {
  const safe = raw && typeof raw === 'object' ? raw : {};
  const preset = getThemePreset(safe.themeId);
  return {
    themeId: preset.id,
    compactChat: Boolean(safe.compactChat),
    showTimestamps: safe.showTimestamps !== false,
    autoScrollChat: safe.autoScrollChat !== false,
    showMinimap: safe.showMinimap !== false,
    showNameTags: safe.showNameTags !== false,
    showNightLighting: safe.showNightLighting !== false,
    defaultSpeed: [0, 1, 2].includes(Number(safe.defaultSpeed)) ? Number(safe.defaultSpeed) : 1,
  };
}

export function loadUserPrefs() {
  if (typeof localStorage === 'undefined') {
    return { ...DEFAULT_USER_PREFS };
  }
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_USER_PREFS };
    return normalizeUserPrefs(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_USER_PREFS };
  }
}

export function saveUserPrefs(prefs) {
  const normalized = normalizeUserPrefs(prefs);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(normalized));
    } catch {
      // Ignore quota errors
    }
  }
  return normalized;
}

export function applyThemeAndPrefs(prefs) {
  const normalized = normalizeUserPrefs(prefs);
  if (typeof document === 'undefined') return normalized;
  const root = document.documentElement;
  const preset = getThemePreset(normalized.themeId);
  for (const [cssVar, val] of Object.entries(preset.vars)) {
    root.style.setProperty(cssVar, val);
  }
  root.dataset.theme = preset.id;
  root.classList.toggle('density-compact', normalized.compactChat);
  return normalized;
}
