/**
 * Voice Agent - control the app by voice (navigate, fill fields, print, help, logout, etc.).
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, MessageCircle, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/constants';

const VOICE_FILL_EVENT = 'bonuslife-voice-fill';
const VOICE_CLEAR_FIELD_EVENT = 'bonuslife-voice-clear-field';
const VOICE_FORM_NEXT_EVENT = 'bonuslife-voice-form-next';
const VOICE_FORM_BACK_EVENT = 'bonuslife-voice-form-back';

const FILLER_WORDS = new Set(['um', 'uh', 'the', 'a', 'an', 'and', 'oh', 'so', 'like', 'yeah', 'hmm']);
const MIN_UTTERANCE_LENGTH = 3;

const WAKE_PHRASES = [
  'hey bonus life', 'bonus life', 'ok bonus life', 'okay bonus life',
  'hi bonus life', 'hello bonus life', 'yo bonus life',
  'hey bonus live', 'bonus live',
];
function matchWakePhrase(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.,!?]/g, ' ');
  const normalized = t
    .replace(/\s+/g, ' ')
    .replace(/\bbonus live\b/g, 'bonus life')
    .replace(/\bbonuslife\b/g, 'bonus life')
    .trim();
  const hasBonusLife = normalized.includes('bonus life');
  const withHey = /(hey|hi|hello|ok(ay)?|yo)\s+bonus life/.test(normalized);
  if (hasBonusLife && (normalized.includes('hey ') || normalized.startsWith('bonus life') || withHey)) return true;
  return WAKE_PHRASES.some((phrase) => {
    const p = phrase.replace(/\s+/g, ' ');
    return normalized === p || normalized.endsWith(' ' + p) || normalized.includes(p);
  });
}

const STOP_PHRASES = [
  'thank you', 'thanks', 'thank ya', 'thankyou', 'thank u', 'thx',
  'goodbye', 'bye', 'good bye', 'bye bye', 'good night',
  'stop listening', 'stop', "that's all", 'that is all', 'done', 'never mind', 'nevermind',
];
function matchStopPhrase(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.toLowerCase().trim().replace(/\s+/g, ' ');
  const tNoSpaces = t.replace(/\s+/g, '');
  if (/\b(thank|thanks|bye|goodbye|done|stop)\b/.test(t)) return true;
  return STOP_PHRASES.some((phrase) => {
    const p = phrase.replace(/\s+/g, '');
    return t === phrase || t.endsWith(' ' + phrase) || t.includes(phrase)
      || tNoSpaces.includes(p) || tNoSpaces === p;
  });
}

let preferredVoiceCache = null;
function getPreferredVoice() {
  const voices = window.speechSynthesis?.getVoices() || [];
  if (voices.length === 0) return preferredVoiceCache;
  const en = voices.filter((v) => v.lang.startsWith('en'));
  if (en.length === 0) return null;
  if (preferredVoiceCache && en.some((v) => v.voiceURI === preferredVoiceCache?.voiceURI)) return preferredVoiceCache;
  const preferred = en.find((v) => v.lang.startsWith('en-US')) || en.find((v) => v.lang.startsWith('en-GB')) || en[0];
  preferredVoiceCache = preferred;
  return preferred;
}
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => { preferredVoiceCache = null; getPreferredVoice(); };
}

function speak(text) {
  if (!text || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(String(text));
  u.lang = 'en-US';
  u.rate = 0.92;
  u.pitch = 1.0;
  u.volume = 1.0;
  try {
    const voice = getPreferredVoice();
    if (voice) u.voice = voice;
  } catch (_) {}
  try {
    window.speechSynthesis.speak(u);
  } catch (e) {
    console.warn('SpeechSynthesis.speak failed', e);
  }
}

function playBeep(kind = 'start') {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('voiceBeepEnabled') === '0') return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = kind === 'start' ? 400 : 600;
    o.type = 'sine';
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.08);
  } catch (_) {}
}

const SESSION_GREETING = 'Listening. How can I help you?';

function VoiceAgent() {
  const navigate = useNavigate();
  const { logout: authLogout } = useAuth();
  const [listeningState, setListeningState] = useState(false);
  const setListening = useCallback((value) => {
    listeningRef.current = !!value;
    setListeningState(!!value);
  }, []);
  const listening = listeningState;
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const recognitionRef = useRef(null);
  const isStoppingRef = useRef(false);
  const sessionActiveRef = useRef(false);
  const clearBubbleTimeoutRef = useRef(null);
  const pendingConfirmRef = useRef(null);
  const ariaLiveRef = useRef(null);
  const wakeWordEnabledRef = useRef(true);
  const stopListeningRef = useRef(null);
  const startingRef = useRef(false);
  const listeningRef = useRef(false);

  const announce = useCallback((text) => {
    if (ariaLiveRef.current) {
      ariaLiveRef.current.textContent = text || '';
    }
  }, []);

  const executeCommand = useCallback(async (action, payload) => {
    if (action === 'navigate' && payload?.path) {
      const path = payload.path.startsWith('/') ? payload.path : `/${payload.path}`;
      navigate(path);
    } else if (action === 'fill_field' && payload?.field && payload?.value != null) {
      window.dispatchEvent(new CustomEvent(VOICE_FILL_EVENT, {
        detail: { field: payload.field, value: String(payload.value) },
      }));
    } else if (action === 'clear_field' && payload?.field) {
      window.dispatchEvent(new CustomEvent(VOICE_CLEAR_FIELD_EVENT, {
        detail: { field: payload.field },
      }));
    } else if (action === 'print') {
      window.print();
    } else if (action === 'form_next') {
      window.dispatchEvent(new CustomEvent(VOICE_FORM_NEXT_EVENT));
    } else if (action === 'form_back') {
      window.dispatchEvent(new CustomEvent(VOICE_FORM_BACK_EVENT));
    } else if (action === 'help') {
      const msg = payload?.message || 'You can say things like: Go home, Open assessment, Fill age 35, Continue or Back, Print, Log out, or say Thank you to stop.';
      speak(msg);
      announce(msg);
    } else if (action === 'logout') {
      authLogout();
      navigate('/');
    }
  }, [navigate, authLogout, announce]);

  const processTranscript = useCallback(async (text) => {
    const raw = (text || '').trim();
    if (!raw) return;
    const lower = raw.toLowerCase();
    if (raw.length < MIN_UTTERANCE_LENGTH) return;
    if (FILLER_WORDS.has(lower)) return;

    if (clearBubbleTimeoutRef.current) {
      clearTimeout(clearBubbleTimeoutRef.current);
      clearBubbleTimeoutRef.current = null;
    }

    const pending = pendingConfirmRef.current;
    if (pending) {
      if (/\b(yes|confirm|yeah|sure|ok|okay)\b/.test(lower)) {
        pendingConfirmRef.current = null;
        if (pending.reply) speak(pending.reply);
        await executeCommand(pending.action, pending.payload || {});
        playBeep('command');
      } else if (/\b(no|cancel|nevermind|never mind)\b/.test(lower)) {
        pendingConfirmRef.current = null;
        speak('No problem, cancelled.');
      }
      setLoading(false);
      return;
    }

    setTranscript(raw);
    setLoading(true);
    setError('');
    setPermissionDenied(false);
    const url = import.meta.env.DEV ? '/api/v1/voice-command' : `${API_BASE_URL}/api/v1/voice-command`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: raw }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.detail || `Backend ${res.status}. Is it running on port 8001?`;
        setError(msg);
        speak("I couldn't reach the server. Please check if the app backend is running.");
        setLoading(false);
        return;
      }

      const runOne = async (action, payload, reply) => {
        if (action === 'logout') {
          pendingConfirmRef.current = { action: 'logout', payload: {}, reply: 'Logging out.' };
          speak('Are you sure you want to log out?');
          announce('Are you sure you want to log out?');
          return;
        }
        if (reply) {
          speak(reply);
          announce(reply);
          await new Promise((r) => setTimeout(r, 600));
        }
        await executeCommand(action, payload || {});
        playBeep('command');
      };

      if (data.actions && data.actions.length > 0) {
        for (const item of data.actions) {
          const a = item.action || item;
          const p = item.payload || {};
          const r = item.reply;
          if (a === 'logout') {
            pendingConfirmRef.current = { action: 'logout', payload: {}, reply: 'Logging out.' };
            speak('Are you sure you want to log out?');
            announce('Are you sure you want to log out?');
            setLoading(false);
            return;
          }
          if (r) {
            speak(r);
            announce(r);
            await new Promise((r) => setTimeout(r, 600));
          }
          await executeCommand(a, p);
        }
        playBeep('command');
      } else {
        const action = data.action || 'unknown';
        const payload = data.payload || {};
        const reply = data.reply;
        if (action === 'unknown') {
          speak("I didn't quite get that. Try saying something like \"open assessment\" or \"help\" for ideas.");
          clearBubbleTimeoutRef.current = setTimeout(() => {
            setTranscript('');
            setError('');
            clearBubbleTimeoutRef.current = null;
          }, 2500);
        } else if (action === 'logout') {
          pendingConfirmRef.current = { action: 'logout', payload: {}, reply: 'Logging out.' };
          speak('Are you sure you want to log out?');
          announce('Are you sure you want to log out?');
        } else {
          await runOne(action, payload, reply);
          clearBubbleTimeoutRef.current = setTimeout(() => {
            setTranscript('');
            setError('');
            clearBubbleTimeoutRef.current = null;
          }, 1800);
        }
      }
    } catch (err) {
      setError(err.message || 'Network error. Is the backend running?');
      speak("I couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [executeCommand, announce]);

  const wakeWordEnabled = typeof localStorage !== 'undefined' && localStorage.getItem('voiceWakeWordEnabled') !== '0';
  wakeWordEnabledRef.current = wakeWordEnabled;

  const createRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onresult = (e) => {
      const lastResult = e.results[e.results.length - 1];
      const t = lastResult?.[0]?.transcript?.trim();

      // When listening for wake word, build full transcript from all results (API often splits "Hey Bonus Life" into separate finals)
      if (!sessionActiveRef.current && wakeWordEnabledRef.current) {
        let full = '';
        for (let i = 0; i < e.results.length; i++) {
          const r = e.results[i];
          const text = r[0]?.transcript?.trim();
          if (!text) continue;
          if (r.isFinal) full += text + ' ';
          else if (i === e.results.length - 1) full += text + ' ';
        }
        full = full.trim();
        // Also check last 4 segments in case result list is very long (e.g. after many utterances)
        let recent = '';
        const start = Math.max(0, e.results.length - 4);
        for (let i = start; i < e.results.length; i++) {
          const r = e.results[i];
          const text = r[0]?.transcript?.trim();
          if (text) recent += text + ' ';
        }
        recent = recent.trim();
        const toMatch = recent.length >= 10 ? recent : full;
        if (toMatch && matchWakePhrase(toMatch)) {
          sessionActiveRef.current = true;
          setTimeout(() => setListening(true), 0);
          playBeep('start');
          speak(SESSION_GREETING);
          announce('Listening. Say a command or say thank you to stop.');
        }
        return;
      }

      if (!lastResult || !lastResult.isFinal || !t) return;
      if (sessionActiveRef.current) {
        if (matchStopPhrase(t)) {
          speak("You're welcome. I've stopped listening.");
          announce('Stopped listening.');
          stopListeningRef.current?.();
          return;
        }
        processTranscript(t);
      }
    };

    recognition.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'permission-denied') {
        isStoppingRef.current = true;
        recognitionRef.current = null;
        sessionActiveRef.current = false;
        setListening(false);
        setPermissionDenied(true);
        setError('Microphone access denied.');
        speak("Microphone access was denied. You can allow it in your browser settings, or click Try again to grant access.");
      } else if (e.error === 'audio-capture' || e.error === 'no-speech') {
        if (e.error === 'no-speech') return;
        recognitionRef.current = null;
        setListening(false);
        setError(e.error === 'audio-capture' ? 'No microphone found.' : '');
      } else if (e.error !== 'aborted') {
        recognitionRef.current = null;
        setListening(false);
        setError(e.error || 'Listening error');
      }
    };

    recognition.onend = () => {
      if (!isStoppingRef.current && wakeWordEnabledRef.current) {
        // Short delay before restart so browser is ready; keeps wake word listening alive
        setTimeout(() => {
          try {
            if (recognitionRef.current === recognition) recognition.start();
          } catch (_) {
            recognitionRef.current = null;
            setListening(false);
          }
        }, 150);
      } else {
        setListening(false);
        sessionActiveRef.current = false;
        if (!wakeWordEnabledRef.current) recognitionRef.current = null;
        isStoppingRef.current = false;
      }
    };

    return recognition;
  }, [processTranscript, announce]);

  const startListening = useCallback(() => {
    if (listeningRef.current && recognitionRef.current) return;
    if (startingRef.current) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice not supported in this browser. Try Chrome.');
      startingRef.current = false;
      return;
    }

    startingRef.current = true;
    setError('');
    setTranscript('');
    flushSync(() => {
      setListeningState(true);
      listeningRef.current = true;
    });

    isStoppingRef.current = false;

    setTimeout(() => {
      try {
        let recognition = recognitionRef.current;
        if (recognition) {
          sessionActiveRef.current = true;
          setTimeout(() => {
            playBeep('start');
            speak(SESSION_GREETING);
          }, 200);
          return;
        }

        recognition = createRecognition();
        if (!recognition) {
          setError('Voice not supported in this browser. Try Chrome.');
          setListening(false);
          return;
        }
        recognitionRef.current = recognition;
        sessionActiveRef.current = true;
        try {
          recognition.start();
        } catch (err) {
          recognitionRef.current = null;
          setListening(false);
          setError(err?.message || 'Could not start microphone. Allow mic access and try again.');
          return;
        }
        setTimeout(() => {
          playBeep('start');
          speak(SESSION_GREETING);
        }, 200);
      } finally {
        startingRef.current = false;
      }
    }, 0);
  }, [createRecognition]);

  // Wake-word: recognition starts only when user clicks the button (no auto-start on load).

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setListening(false);
      sessionActiveRef.current = false;
      return;
    }
    sessionActiveRef.current = false;
    setListening(false);
    if (wakeWordEnabled) {
      // Keep recognition running so wake word "Hey Bonus Life" can be heard again
      isStoppingRef.current = false;
    } else {
      isStoppingRef.current = true;
      try {
        recognition.stop();
      } catch (_) {}
    }
  }, [wakeWordEnabled]);

  stopListeningRef.current = stopListening;
  const startListeningRef = useRef(startListening);
  startListeningRef.current = startListening;

  const handleToggle = useCallback(() => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  }, [listening, startListening, stopListening]);

  useEffect(() => {
    const handler = () => startListeningRef.current();
    window.addEventListener('bonuslife-open-voice-agent', handler);
    return () => window.removeEventListener('bonuslife-open-voice-agent', handler);
  }, []);

  return (
    <>
      <div ref={ariaLiveRef} aria-live="polite" aria-atomic="true" className="sr-only" />
      {listening && (
        <div
          className="voice-listening-glow fixed inset-0 pointer-events-none z-40"
          aria-hidden
        />
      )}
      {permissionDenied && (
        <div className="fixed bottom-24 right-6 z-50 rounded-2xl bg-white/95 dark:bg-gray-900/95 border border-gray-200 dark:border-red-500/50 px-4 py-3 shadow-xl max-w-xs voice-agent-card">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm text-red-600 dark:text-red-300 mb-2">Microphone access denied.</p>
              <button type="button" onClick={() => { setPermissionDenied(false); setError(''); startListening(); }} className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline">Try again</button>
            </div>
            <button
              type="button"
              onClick={() => { setPermissionDenied(false); setError(''); }}
              aria-label="Close"
              className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      <div className="fixed bottom-6 right-6 z-[10002] flex flex-col items-end gap-2 pointer-events-none">
        <div className="pointer-events-auto">
        {listening ? (
          <div className="voice-agent-bar flex items-center gap-4 px-5 py-3.5 rounded-2xl bg-white dark:bg-gray-900/95 border border-gray-200 dark:border-white/10 shadow-xl">
            <div className="flex flex-col items-start min-w-0">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Listening</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Connected</span>
            </div>
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
            <button
              type="button"
              onClick={handleToggle}
              aria-label="Stop listening"
              title="Say &quot;Thank you&quot; or click to stop"
              className="w-10 h-10 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors shrink-0"
            >
              <MicOff className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleToggle}
            aria-label="Start voice control"
            title={wakeWordEnabled ? 'Say "Hey Bonus Life" or click to start' : 'Click to start voice control'}
            className="voice-agent-trigger flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <MessageCircle className="w-5 h-5 text-gray-800 dark:text-gray-200 shrink-0" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Talk to Bonus Life</span>
          </button>
        )}
        </div>
      </div>
    </>
  );
}

export default React.memo(VoiceAgent);
export { VOICE_FILL_EVENT, VOICE_CLEAR_FIELD_EVENT, VOICE_FORM_NEXT_EVENT, VOICE_FORM_BACK_EVENT };
