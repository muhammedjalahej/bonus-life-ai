/**
 * Data sonification: map chart values to sound (pitch/volume) via Web Audio API.
 * Respects UX setting: bonuslife_ux_settings.sound === 'on'.
 */

const UX_STORAGE_KEY = 'bonuslife_ux_settings';
const MIN_FREQ = 220;
const MAX_FREQ = 880;
const TONE_DURATION = 0.08;
const DEFAULT_VOLUME = 0.15;

let audioContext = null;

function getAudioContext() {
  if (audioContext) return audioContext;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  audioContext = new Ctx();
  return audioContext;
}

function isEnabled() {
  try {
    const raw = localStorage.getItem(UX_STORAGE_KEY);
    if (!raw) return false;
    const o = JSON.parse(raw);
    return o.sound === 'on';
  } catch {
    return false;
  }
}

/**
 * Play a short tone for a data value. Higher value = higher pitch; volume can reflect magnitude.
 * @param {number} value - Current data value (e.g. count)
 * @param {number} [maxValue=1] - Max value for normalizing pitch
 * @param {number} [volume=DEFAULT_VOLUME] - Gain 0–1
 */
export function playValueTone(value, maxValue = 1, volume = DEFAULT_VOLUME) {
  if (!isEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const max = Math.max(maxValue, 1);
  const t = Math.min(1, Math.max(0, value / max));
  const freq = MIN_FREQ + t * (MAX_FREQ - MIN_FREQ);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + TONE_DURATION);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + TONE_DURATION);
}

/**
 * Play a tone for a bar index (e.g. timeline position). Same as playValueTone but with index/total.
 */
export function playIndexTone(index, total, volume = DEFAULT_VOLUME) {
  if (total <= 0) return;
  const value = index + 1;
  const maxValue = total;
  playValueTone(value, maxValue, volume);
}

/**
 * Play a tone for a category (e.g. risk level). Maps category index to pitch.
 */
export function playCategoryTone(categoryIndex, totalCategories, volume = DEFAULT_VOLUME) {
  if (totalCategories <= 0) return;
  const value = categoryIndex + 1;
  playValueTone(value, totalCategories, volume);
}
