import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTour } from './TourContext';
import { Volume2, VolumeX } from 'lucide-react';

const VIEWPORT_MARGIN = 24;
const TOUR_SPEECH_STORAGE_KEY = 'bonuslife_tour_speech';

const FEMALE_VOICE_HINTS = ['zira', 'samantha', 'victoria', 'karen', 'female', 'woman', 'google uk female', 'microsoft zira'];
let tourVoiceCache = null;
function getTourVoice() {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  if (!synth) return null;
  const voices = synth.getVoices();
  if (voices.length === 0) return tourVoiceCache;
  const en = voices.filter((v) => v.lang.startsWith('en'));
  if (en.length === 0) return null;
  if (tourVoiceCache && en.some((v) => v.voiceURI === tourVoiceCache?.voiceURI)) return tourVoiceCache;
  const nameLower = (v) => (v.name || '').toLowerCase();
  const female = en.find((v) => FEMALE_VOICE_HINTS.some((hint) => nameLower(v).includes(hint)));
  const preferred = female || en.find((v) => v.lang.startsWith('en-US')) || en.find((v) => v.lang.startsWith('en-GB')) || en[0];
  tourVoiceCache = preferred;
  return preferred;
}
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => { tourVoiceCache = null; getTourVoice(); };
}

function speakTourStep(title, body) {
  if (!title && !body) return;
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const text = [title, body].filter(Boolean).join('. ');
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.88;
    u.pitch = 1.0;
    const voice = getTourVoice();
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
  } catch (_) {}
}

function stopTourSpeech() {
  try {
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
  } catch (_) {}
}
const TOOLTIP_WIDTH = 384;
const ARROW_SIZE = 10;
const TOOLTIP_EST_HEIGHT = 220;
const ARROW_PADDING = 16;

function getTooltipPosition(targetRect) {
  if (!targetRect) return { top: 120, left: VIEWPORT_MARGIN, above: false, arrowX: TOOLTIP_WIDTH / 2 };
  const w = typeof window !== 'undefined' ? window.innerWidth : 400;
  const maxLeft = w - TOOLTIP_WIDTH - VIEWPORT_MARGIN;
  const targetCenterX = targetRect.left + targetRect.width / 2;
  let left = Math.round(targetCenterX - TOOLTIP_WIDTH / 2);
  left = Math.max(VIEWPORT_MARGIN, Math.min(maxLeft, left));
  const spaceAbove = targetRect.top;
  const needAbove = TOOLTIP_EST_HEIGHT + ARROW_SIZE + 8 + VIEWPORT_MARGIN;
  const above = spaceAbove >= needAbove;
  const top = above
    ? targetRect.top - ARROW_SIZE - 8
    : targetRect.bottom + ARROW_SIZE + 8;
  const minTop = VIEWPORT_MARGIN;
  const maxTop = typeof window !== 'undefined' ? window.innerHeight - TOOLTIP_EST_HEIGHT - VIEWPORT_MARGIN : 400;
  const clampedTop = Math.max(minTop, Math.min(maxTop, top));
  const arrowX = Math.max(ARROW_PADDING + ARROW_SIZE, Math.min(TOOLTIP_WIDTH - ARROW_SIZE - ARROW_PADDING, targetCenterX - left));
  return { top: clampedTop, left, above, arrowX };
}

export default function TourOverlay({ language }) {
  const isTr = language === 'turkish';
  const { active, currentStep, currentIndex, steps, next, back, skip } = useTour();
  const [targetRect, setTargetRect] = useState(null);
  const tooltipRef = useRef(null);
  const [speechOn, setSpeechOn] = useState(() => {
    try {
      return typeof localStorage !== 'undefined' && localStorage.getItem(TOUR_SPEECH_STORAGE_KEY) !== '0';
    } catch {
      return true;
    }
  });

  const toggleSpeech = useCallback(() => {
    setSpeechOn((prev) => {
      const on = !prev;
      try {
        localStorage.setItem(TOUR_SPEECH_STORAGE_KEY, on ? '1' : '0');
      } catch (_) {}
      if (!on) stopTourSpeech();
      return on;
    });
  }, []);

  useEffect(() => {
    if (!active || !currentStep) {
      stopTourSpeech();
      return;
    }
    stopTourSpeech();
    const timer = setTimeout(() => {
      if (speechOn) speakTourStep(currentStep.title, currentStep.body);
    }, 400);
    return () => {
      clearTimeout(timer);
      stopTourSpeech();
    };
  }, [active, currentStep?.id, speechOn]);

  useEffect(() => {
    if (!active) stopTourSpeech();
  }, [active]);

  useEffect(() => {
    if (!active || !currentStep) {
      setTargetRect(null);
      return;
    }
    const update = () => {
      const el = document.querySelector(currentStep.selector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        setTargetRect(() => el.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    };
    update();
    const t = setTimeout(update, 400);
    const ro = new ResizeObserver(update);
    const el = document.querySelector(currentStep.selector);
    if (el) ro.observe(el);
    window.addEventListener('scroll', update, true);
    return () => {
      clearTimeout(t);
      ro.disconnect();
      window.removeEventListener('scroll', update, true);
    };
  }, [active, currentStep]);

  if (!active || !currentStep) return null;

  const pos = getTooltipPosition(targetRect);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[10003] pointer-events-auto" aria-modal="true" role="dialog" aria-label="Guided tour">
      <div className="absolute inset-0 bg-black/60" onClick={skip} aria-hidden="true" />
      {/* Spotlight ring around the target so the explained feature is obvious */}
      {targetRect && (
        <div
          className="absolute z-[10002] rounded-lg pointer-events-none ring-2 ring-violet-400/90 ring-offset-2 ring-offset-transparent shadow-[0_0_20px_rgba(124,58,237,0.4)]"
          style={{
            left: targetRect.left - 4,
            top: targetRect.top - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
        />
      )}
      <div
        ref={tooltipRef}
        className="absolute z-10 w-[384px] max-w-[calc(100vw-32px)] rounded-xl p-5 overflow-visible
          bg-[#1a1a28]/95 backdrop-blur-xl
          border border-white/20
          shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset,0_25px_50px_-12px_rgba(0,0,0,0.5),0_0_80px_-20px_rgba(124,58,237,0.15)]
          before:absolute before:inset-0 before:rounded-xl before:pointer-events-none
          before:bg-gradient-to-b before:from-white/10 before:via-transparent before:to-transparent before:opacity-60"
        style={{
          left: pos.left,
          top: pos.top,
          transform: pos.above ? 'translateY(-100%)' : 'translateY(0)',
        }}
      >
        {pos.above ? (
          <div
            className="absolute w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-violet-500 shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
            style={{ left: pos.arrowX, bottom: -ARROW_SIZE, top: 'auto', transform: 'translateX(-50%)' }}
          />
        ) : (
          <div
            className="absolute w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[10px] border-b-violet-500 shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
            style={{ left: pos.arrowX, top: -ARROW_SIZE, bottom: 'auto', transform: 'translateX(-50%)' }}
          />
        )}
        <h3 className="text-lg font-semibold text-white mb-2">{currentStep.title}</h3>
        <p className="text-sm text-gray-400 mb-4">{currentStep.body}</p>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={toggleSpeech}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/20 text-gray-400 text-sm hover:bg-white/5 hover:text-white"
            title={speechOn ? (isTr ? 'Tur sesini kapat' : 'Turn tour voice off') : (isTr ? 'Tur sesini aç' : 'Turn tour voice on')}
          >
            {speechOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{speechOn ? (isTr ? 'Ses açık' : 'Sound on') : (isTr ? 'Ses kapalı' : 'Sound off')}</span>
          </button>
          <button
            type="button"
            onClick={back}
            disabled={isFirst}
            className="px-4 py-2 rounded-lg border border-white/20 text-white text-sm hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none"
          >
            {isTr ? 'Geri' : 'Back'}
          </button>
          <button
            type="button"
            onClick={skip}
            className="px-4 py-2 rounded-lg border border-white/20 text-white text-sm hover:bg-white/5"
          >
            {isTr ? 'Atla' : 'Skip'}
          </button>
          <button
            type="button"
            onClick={next}
            className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm hover:bg-violet-500 px-5"
          >
            {isLast ? (isTr ? 'Bitti' : 'Done') : (isTr ? 'İleri' : 'Next')}
          </button>
        </div>
      </div>
    </div>
  );
}
