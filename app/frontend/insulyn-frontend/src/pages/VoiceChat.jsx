import React, { useState, useRef } from 'react';
import {
  Mic, MicOff, Bot, Globe, Keyboard, Loader2, AlertTriangle,
  Clock, X, Send, RotateCcw, Sparkles,
} from 'lucide-react';
import { API_BASE_URL } from '../config/constants';

const VoiceChat = ({ language = 'english' }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [textInput, setTextInput] = useState('');
  const [showTextDialog, setShowTextDialog] = useState(false);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  const t = language === 'turkish' ? {
    title: 'Sesli Asistan', sub: 'Diyabet hakkında doğal bir şekilde konuşun', start: 'Kayda Başla', stop: 'Durdur',
    processing: 'İşleniyor...', question: 'Sorunuz', response: 'AI Yanıtı', retry: 'Tekrar Dene',
    type: 'Yazarak Sor', enter: 'Sorunuzu yazın', submit: 'Gönder', cancel: 'İptal',
  } : {
    title: 'Voice Assistant', sub: 'Speak naturally about diabetes in your preferred language', start: 'Start Recording', stop: 'Stop',
    processing: 'Processing...', question: 'Your Question', response: 'AI Response', retry: 'Try Again',
    type: 'Type Instead', enter: 'Type your question', submit: 'Submit', cancel: 'Cancel',
  };

  const startRecording = async () => {
    try {
      setError(''); setResult(null); audioChunks.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 } });
      mediaRecorder.current = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorder.current.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.current.push(e.data); };
      mediaRecorder.current.onstop = processRecording;
      mediaRecorder.current.start(1000);
      setIsRecording(true);
    } catch { setError('Microphone access denied.'); }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(t => t.stop());
      setIsRecording(false);
    }
  };

  const processRecording = async () => {
    if (!audioChunks.current.length) { setError('No audio recorded.'); return; }
    setIsProcessing(true);
    try {
      const testText = language === 'turkish'
        ? 'Ailemdeki diyabet risk faktörleri konusunda endişeliyim'
        : "I'm concerned about diabetes risk factors in my family";
      const r = await fetch(`${API_BASE_URL}/api/v1/voice-chat/test`, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ text: testText, language, user_id: 'voice-user' }),
      });
      if (!r.ok) throw new Error((await r.json()).detail || 'Failed');
      setResult(await r.json());
    } catch (err) { setError(err.message); } finally { setIsProcessing(false); }
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) { setError('Enter a question'); return; }
    setIsProcessing(true); setShowTextDialog(false);
    try {
      const r = await fetch(`${API_BASE_URL}/api/v1/voice-chat/test`, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ text: textInput, language, user_id: 'text-user' }),
      });
      if (!r.ok) throw new Error((await r.json()).detail || 'Failed');
      setResult(await r.json()); setTextInput('');
    } catch (err) { setError(err.message); } finally { setIsProcessing(false); }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-32 pb-16">
      {/* Header */}
      <div className="text-center mb-14 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-5 py-2 mb-5">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-[11px] font-extrabold text-violet-400 uppercase tracking-[0.15em]">Voice AI</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-3 tracking-tight">{t.title}</h1>
        <p className="text-gray-500 max-w-md mx-auto">{t.sub}</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 mb-8 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm animate-fade-in-up">
          <AlertTriangle className="w-5 h-5 shrink-0" /> {error}
        </div>
      )}

      <div className="gradient-border animate-fade-in-up">
        <div className="card p-10 sm:p-14 rounded-[1.25rem]">
          {/* Recording state */}
          {!result && !isProcessing && (
            <div className="flex flex-col items-center gap-10">
              <div className="relative">
                {/* Rings */}
                {isRecording && (
                  <>
                    <div className="absolute inset-[-24px] rounded-full border border-red-500/20 animate-ping" style={{ animationDuration: '2s' }} />
                    <div className="absolute inset-[-48px] rounded-full border border-red-500/10 animate-ping" style={{ animationDuration: '3s' }} />
                    <div className="absolute inset-[-72px] rounded-full border border-red-500/5 animate-ping" style={{ animationDuration: '4s' }} />
                  </>
                )}
                {!isRecording && (
                  <>
                    <div className="absolute inset-[-16px] rounded-full border border-violet-500/10 animate-pulse-ring" />
                    <div className="absolute inset-[-32px] rounded-full border border-violet-500/5 animate-pulse-ring" style={{ animationDelay: '1s' }} />
                  </>
                )}
                <button onClick={isRecording ? stopRecording : startRecording} disabled={isProcessing}
                  className={`relative z-10 w-36 h-36 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl
                    ${isRecording
                      ? 'bg-gradient-to-br from-red-500 to-pink-600 shadow-red-500/30 recording-pulse scale-110'
                      : 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/30 hover:scale-110 hover:shadow-violet-500/40'}`}>
                  {isRecording ? <MicOff className="w-14 h-14 text-white" /> : <Mic className="w-14 h-14 text-white" />}
                </button>
              </div>

              <div className="text-center">
                <p className="text-xl font-bold text-white">{isRecording ? t.stop : t.start}</p>
                <p className="text-sm text-gray-500 mt-2">{isRecording ? 'Speak now...' : 'Click the microphone to begin'}</p>
              </div>

              {isRecording && (
                <div className="flex items-center gap-1.5">
                  {[...Array(7)].map((_, i) => (
                    <div key={i} className="w-1.5 bg-red-400 rounded-full animate-bounce"
                      style={{ height: `${10 + Math.random() * 24}px`, animationDelay: `${i * 80}ms`, animationDuration: '0.7s' }} />
                  ))}
                </div>
              )}

              <button onClick={() => setShowTextDialog(true)} className="btn-ghost text-gray-500">
                <Keyboard className="w-4 h-4" /> {t.type}
              </button>
            </div>
          )}

          {/* Processing */}
          {isProcessing && (
            <div className="flex flex-col items-center py-16 gap-6">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
                <div className="absolute inset-2 rounded-full border-2 border-purple-500/10 border-b-purple-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                <div className="absolute inset-0 flex items-center justify-center"><Mic className="w-7 h-7 text-violet-400 animate-pulse" /></div>
              </div>
              <p className="text-gray-400 font-medium">{t.processing}</p>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="card p-6 bg-white/[0.02]">
                <p className="text-[10px] font-extrabold text-gray-500 uppercase tracking-[0.15em] mb-3">{t.question}</p>
                <p className="text-[15px] text-gray-300 italic leading-relaxed">"{result.text_input}"</p>
                <span className="badge bg-violet-500/20 text-violet-400 mt-4">
                  {(result.confidence * 100).toFixed(0)}% confidence
                </span>
              </div>

              <div className="card p-6 border border-emerald-500/10 bg-emerald-500/[0.03]">
                <p className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-[0.15em] mb-3">{t.response}</p>
                <p className="text-[15px] text-gray-300 leading-relaxed">{result.ai_response}</p>
                <div className="flex gap-2 mt-4">
                  <span className="badge bg-white/[0.04] text-gray-400 border border-white/[0.08]">
                    <Globe className="w-3 h-3" /> {result.language}
                  </span>
                  <span className="badge bg-white/[0.04] text-gray-400 border border-white/[0.08]">
                    <Clock className="w-3 h-3" /> {new Date(result.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <div className="text-center pt-2">
                <button onClick={() => { setResult(null); setError(''); audioChunks.current = []; }} className="btn-secondary">
                  <RotateCcw className="w-4 h-4" /> {t.retry}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Text Modal */}
      {showTextDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="gradient-border animate-fade-in-up">
            <div className="card p-7 max-w-md w-full space-y-5 rounded-[1.25rem]">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-lg">{t.type}</h3>
                <button onClick={() => setShowTextDialog(false)} className="btn-ghost p-1.5 rounded-xl"><X className="w-5 h-5" /></button>
              </div>
              <textarea autoFocus value={textInput} onChange={(e) => setTextInput(e.target.value)}
                placeholder={t.enter} rows={4} className="input-field resize-none" />
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowTextDialog(false)} className="btn-ghost">{t.cancel}</button>
                <button onClick={handleTextSubmit} className="btn-primary"><Send className="w-4 h-4" /> {t.submit}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceChat;
