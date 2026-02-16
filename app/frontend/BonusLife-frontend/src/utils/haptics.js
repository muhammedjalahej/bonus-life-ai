/**
 * Web-safe haptic feedback (navigator.vibrate). No-op when disabled or unsupported (e.g. iOS).
 */
const STORAGE_KEY = 'bonuslife_ux_haptics';

export function isHapticsEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setHapticsEnabled(enabled) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
  } catch {}
}

function isVibrateSupported() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

/**
 * Fire a short haptic pulse. Only runs when haptics are enabled in UX Settings and browser supports it.
 * @param { 'light' | 'medium' | 'success' | 'error' } [pattern] - optional pattern name (light/medium = single short; success/error = double)
 */
export function haptic(pattern = 'light') {
  if (!isHapticsEnabled() || !isVibrateSupported()) return;
  try {
    if (pattern === 'success' || pattern === 'error') {
      navigator.vibrate([10, 50, 10]);
    } else {
      navigator.vibrate(10);
    }
  } catch {}
}
