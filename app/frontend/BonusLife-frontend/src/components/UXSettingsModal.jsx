import React, { useEffect, useState } from 'react';
import { X, Palette, Move, Type, Zap, Volume2, Mic } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useUXSettings } from '../context/UXSettingsContext';
import { API_BASE_URL } from '../config/constants';

const TTS_VOICE_STORAGE_KEY = 'bonuslife_tts_voice_id';

function getVoiceApiBase() {
  if (API_BASE_URL && API_BASE_URL.startsWith('http')) return API_BASE_URL.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.hostname) return `http://${window.location.hostname}:8001`;
  return 'http://127.0.0.1:8001';
}

export default function UXSettingsModal({ isOpen, onClose }) {
  const containerRef = useFocusTrap(isOpen, onClose);
  const [ttsVoices, setTtsVoices] = useState([]);
  const [ttsVoiceLoading, setTtsVoiceLoading] = useState(false);
  const [ttsVoiceId, setTtsVoiceIdState] = useState(() => {
    try { return localStorage.getItem(TTS_VOICE_STORAGE_KEY) || ''; } catch { return ''; }
  });
  const {
    theme,
    motion,
    contrast,
    textSize,
    haptics,
    sound,
    setTheme,
    setMotion,
    setContrast,
    setTextSize,
    setHaptics,
    setSound,
  } = useUXSettings();

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    try { setTtsVoiceIdState(localStorage.getItem(TTS_VOICE_STORAGE_KEY) || ''); } catch {}
    setTtsVoiceLoading(true);
    const base = getVoiceApiBase();
    fetch(`${base}/api/v1/voices`)
      .then((res) => res.ok ? res.json() : Promise.reject(new Error(res.statusText)))
      .then((data) => setTtsVoices(data.voices || []))
      .catch(() => setTtsVoices([]))
      .finally(() => setTtsVoiceLoading(false));
  }, [isOpen]);

  const setTtsVoiceId = (voiceId) => {
    try { localStorage.setItem(TTS_VOICE_STORAGE_KEY, voiceId || ''); } catch {}
    setTtsVoiceIdState(voiceId || '');
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10001]"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ux-settings-title"
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10002] w-full max-w-md max-h-[85vh] overflow-auto"
      >
        <div className="ux-settings-modal bg-[#12121f] border border-white/[0.08] rounded-2xl shadow-2xl p-6 mx-4">
          <div className="flex items-center justify-between mb-6">
            <h2 id="ux-settings-title" className="text-lg font-semibold text-white">
              UX Settings
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-white/[0.05] hover:text-white transition focus:outline-none"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-5">
            {/* Theme */}
            <div className="flex items-center gap-3">
              <Palette className="w-5 h-5 text-gray-500 shrink-0" />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Theme</label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="select-field py-2.5"
                  aria-label="Theme"
                >
                  <option value="default">Default</option>
                  <option value="system">System</option>
                </select>
              </div>
            </div>

            {/* Motion */}
            <div className="flex items-center gap-3">
              <Move className="w-5 h-5 text-gray-500 shrink-0" />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Motion</label>
                <select
                  value={motion}
                  onChange={(e) => setMotion(e.target.value)}
                  className="select-field py-2.5"
                  aria-label="Motion"
                >
                  <option value="auto">Auto (follow system)</option>
                  <option value="reduced">Reduced</option>
                  <option value="full">Full</option>
                </select>
              </div>
            </div>

            {/* High contrast - scaffolding only, no visual change when On */}
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 shrink-0 flex items-center justify-center text-gray-500" aria-hidden>◐</span>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-1.5">High contrast</label>
                <select
                  value={contrast}
                  onChange={(e) => setContrast(e.target.value)}
                  className="select-field py-2.5"
                  aria-label="High contrast"
                >
                  <option value="off">Off</option>
                  <option value="on">On</option>
                </select>
              </div>
            </div>

            {/* Text size */}
            <div className="flex items-center gap-3">
              <Type className="w-5 h-5 text-gray-500 shrink-0" />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Text size</label>
                <select
                  value={textSize}
                  onChange={(e) => setTextSize(e.target.value)}
                  className="select-field py-2.5"
                  aria-label="Text size"
                >
                  <option value="normal">Normal</option>
                  <option value="lg">Large</option>
                </select>
              </div>
            </div>

            {/* Haptics */}
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-gray-500 shrink-0" />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Haptics</label>
                <select
                  value={haptics}
                  onChange={(e) => setHaptics(e.target.value)}
                  className="select-field py-2.5"
                  aria-label="Haptics"
                >
                  <option value="off">Off</option>
                  <option value="on">On</option>
                </select>
              </div>
            </div>

            {/* Chart sounds (sonification) */}
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-gray-500 shrink-0" />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Chart sounds</label>
                <select
                  value={sound}
                  onChange={(e) => setSound(e.target.value)}
                  className="select-field py-2.5"
                  aria-label="Chart sounds"
                >
                  <option value="off">Off</option>
                  <option value="on">On</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Hover chart bars to hear data as sound</p>
              </div>
            </div>

            {/* TTS Voice (voice agent) */}
            <div className="flex items-center gap-3">
              <Mic className="w-5 h-5 text-gray-500 shrink-0" />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Voice assistant voice</label>
                <select
                  value={ttsVoiceId}
                  onChange={(e) => setTtsVoiceId(e.target.value)}
                  className="select-field py-2.5"
                  aria-label="TTS voice"
                  disabled={ttsVoiceLoading}
                >
                  <option value="">Default (backend)</option>
                  {ttsVoices.map((v) => (
                    <option key={v.voice_id} value={v.voice_id}>{v.name || v.voice_id}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">ElevenLabs voice for the voice agent</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
