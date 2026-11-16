/* =========================================================
   SETTINGS THAT ARE REMEMBERED ON THIS DEVICE
   (sound, music, vibration, camera zoom, dark mode, alerts)
========================================================= */

const KEY = 'kiddocation-settings';

export const DEFAULT_PREFS = {
  sound: false,
  music: false,
  vibration: false,
  cameraZoom: true,
  darkMode: false,
  notifications: false,
};

export function getPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return { ...DEFAULT_PREFS, ...(saved || {}) };
  } catch (err) {
    return { ...DEFAULT_PREFS };
  }
}

export function setPref(key, value) {
  const next = { ...getPrefs(), [key]: value };

  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch (err) {
    // Storage can be unavailable (private mode); the switch still works for now.
  }

  return next;
}

// Dark mode: the page background turns dark and the cards stay white.
export function applyTheme(prefs = getPrefs()) {
  document.documentElement.dataset.theme = prefs.darkMode ? 'dark' : 'light';
}