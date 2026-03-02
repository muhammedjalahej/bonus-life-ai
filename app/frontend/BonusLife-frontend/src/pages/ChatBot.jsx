import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Send, Bot, User, Trash2, RefreshCw, AlertTriangle,
  Loader2, Wifi, WifiOff, Sparkles,
} from 'lucide-react';
import { API_BASE_URL } from '../config/constants';
import { getStoredToken } from '../services/api';

const ChatBot = ({ language = 'english' }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [error, setError] = useState('');
  const [backendStatus, setBackendStatus] = useState('checking');
  const [llmProvider, setLlmProvider] = useState('Groq');
  const [retryCount, setRetryCount] = useState(0);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [latestAssessment, setLatestAssessment] = useState(null);

  const isTr = language === 'turkish';
  const t = isTr ? {
    badge: 'Canlı Yapay Zeka Sohbeti', title: 'Yapay Zeka Diyabet Uzmanı', subtitle: 'Diyabet önleme, yönetim ve tedavi hakkında uzman yanıtlar alın.',
    online: `Çevrimiçi -- ${llmProvider} LLM`, connecting: 'Bağlanıyor...', offline: 'Çevrimdışı',
    placeholder: 'Diyabet hakkında soru sorun...', placeholderWaiting: 'Bağlantı bekleniyor...',
    thinking: 'Düşünüyor...', you: 'Siz', ai: 'Yapay Zeka', error: 'Hata', live: 'Canlı',
    close: 'Kapat', connectionError: 'Bağlantı hatası. Lütfen sunucunun çalıştığından emin olun.',
    requestTimeout: 'İstek zaman aşımı',
    unavailable: 'Yapay zeka uzmanı şu an kullanılamıyor. Lütfen daha sonra tekrar deneyin veya acil tıbbi konularda bir sağlık kuruluşuna başvurun.',
  } : {
    badge: 'Live AI Chat', title: 'AI Diabetes Specialist', subtitle: 'Get expert answers about diabetes prevention, management, and treatment.',
    online: `Online -- ${llmProvider} LLM`, connecting: 'Connecting...', offline: 'Offline',
    placeholder: 'Ask about diabetes...', placeholderWaiting: 'Waiting for connection...',
    thinking: 'Thinking...', you: 'You', ai: 'AI', error: 'Error', live: 'Live',
    close: 'Close', connectionError: 'Connection failed. Please check if the backend is running.',
    requestTimeout: 'Request timeout',
    unavailable: 'Our AI specialist is currently unavailable. Please try again later or consult a healthcare provider.',
  };

  // Feature f7: Load latest assessment for context
  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/users/me/assessments?limit=1`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) setLatestAssessment(data[0]);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => { initializeConversation(); checkBackendConnection(); }, [language]);
  // Scroll only the messages container to bottom so the page doesn't jump to the footer
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const checkBackendConnection = async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/health`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setBackendStatus('connected');
      setError('');
      const provider = data?.services?.llm_provider;
      if (provider) setLlmProvider(provider);
    } catch (err) { setBackendStatus('disconnected'); setError(isTr ? 'Bağlantı başarısız.' : `Connection failed: ${err.message}`); }
  };

  const initializeConversation = () => {
    setConversationId(`conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    setMessages([{
      text: isTr
        ? "Merhaba! Diyabet konusunda yapay zeka asistanınızım. Diyabet önleme, risk faktörleri, tedavi ve yaşam tarzı hakkındaki sorularınızı yanıtlayabilirim."
        : "Hello! I'm your AI diabetes specialist. Ask me anything about diabetes prevention, risk factors, treatment, or lifestyle management.",
      sender: 'bot', timestamp: new Date(), id: Date.now(), isSystem: true,
    }]);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = { text: input, sender: 'user', timestamp: new Date(), id: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(`${API_BASE_URL}/api/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input, language, conversation_context: 'diabetes_medical_advice',
          conversation_id: conversationId, require_llm: true, timestamp: new Date().toISOString(), message_type: 'user_query',
          // Feature f7: pass latest assessment context
          ...(latestAssessment ? {
            user_context: `Patient's latest assessment: Risk level: ${latestAssessment.risk_level}, Probability: ${(latestAssessment.probability * 100).toFixed(0)}%, Summary: ${(latestAssessment.executive_summary || '').slice(0, 200)}`
          } : {}),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        let msg = `HTTP ${response.status}`;
        try { const d = await response.json(); msg = d.detail || d.message || msg; } catch { msg = (await response.text()) || msg; }
        throw new Error(msg);
      }

      const data = await response.json();
      if (!data || (!data.response && !data.message)) throw new Error('Empty response');
      const llmResponse = data.response || data.message || data;
      const showErrorDetail = data.error_detail && (llmResponse || '').toLowerCase().includes('technical difficulties');

      setMessages(prev => [...prev, {
        text: showErrorDetail ? `${llmResponse}\n\n[Debug: ${data.error_detail}]` : llmResponse,
        sender: 'bot',
        timestamp: new Date(),
        id: Date.now() + 1,
        isLLMResponse: true,
        isError: showErrorDetail,
        suggestions: data.suggestions || generateSuggestions(language, llmResponse),
      }]);
      setBackendStatus('connected');
      setRetryCount(0);
    } catch (err) {
      const msg = err.name === 'AbortError' ? t.requestTimeout : err.message;
      setError(msg);
      setBackendStatus('disconnected');
      setRetryCount(r => r + 1);
      const displayMsg = (msg && msg.toLowerCase().includes('unavailable')) ? t.unavailable : (isTr ? `${t.connectionError}\n${msg}` : `Connection error: ${msg}\nPlease check if the backend is running.`);
      setMessages(prev => [...prev, { text: displayMsg, sender: 'bot', timestamp: new Date(), id: Date.now() + 1, isError: true }]);
    } finally { setLoading(false); }
  };

  const generateSuggestions = (lang, r) => {
    const l = (r || '').toLowerCase();
    if (lang === 'turkish') {
      if (l.includes('kan şekeri') || l.includes('glukoz') || l.includes('blood sugar') || l.includes('glucose')) return ['Normal kan şekeri aralıkları?', 'Kan şekerini kontrol eden besinler'];
      if (l.includes('risk') || l.includes('önle') || l.includes('prevent')) return ['Yaşam tarzı değişiklikleri?', 'Erken uyarı belirtileri'];
      if (l.includes('diyet') || l.includes('beslenme') || l.includes('diet') || l.includes('nutrition')) return ['Örnek öğün planları', 'Glisemik indeks açıklaması'];
      return ['Daha fazla açıkla', 'Güncel araştırmalar?', 'Tedavi seçenekleri?'];
    }
    if (l.includes('blood sugar') || l.includes('glucose')) return ['Normal blood sugar ranges?', 'Foods for blood sugar control'];
    if (l.includes('risk') || l.includes('prevent')) return ['Lifestyle changes?', 'Early warning signs'];
    if (l.includes('diet') || l.includes('nutrition')) return ['Sample meal plans', 'Glycemic index explained'];
    return ['Explain more', 'Latest research?', 'Treatment options?'];
  };

  const handleQuick = (q) => { setInput(q); setTimeout(() => { if (backendStatus === 'connected') handleSend(); }, 100); };
  const connected = backendStatus === 'connected';

  const quickQuestions = isTr
    ? ['Diyabet patofizyolojisi', 'Tedavi gelişmeleri', 'Diyet önerileri', 'Egzersiz faydaları', 'Komplikasyonlar', 'Ruh sağlığı etkisi']
    : ['Diabetes pathophysiology', 'Treatment advancements', 'Diet recommendations', 'Exercise benefits', 'Complications', 'Mental health impact'];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-36 pb-8 min-h-[calc(100vh-10rem)] flex flex-col">
      {/* Page header - compact */}
      <div className="text-center mb-4 shrink-0 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-[0.15em]">{t.badge}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white mb-1 tracking-tight">{t.title}</h1>
        <p className="text-gray-500 text-sm max-w-md mx-auto">{t.subtitle}</p>
      </div>

      <div className="gradient-border animate-fade-in-up flex-1 flex flex-col min-h-0">
        <div className="card overflow-hidden rounded-[1.25rem] flex-1 flex flex-col min-h-0">
          {/* Chat header */}
          <div className="p-4 sm:p-5 border-b border-white/[0.05] shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#060611]
                    ${connected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-amber-400'}`} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Bonus Life AI</h2>
                  <p className={`text-xs font-medium ${connected ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {connected ? t.online : `${t.connecting} ${retryCount > 0 ? `(${retryCount})` : ''}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={checkBackendConnection} className="btn-ghost p-2.5 rounded-xl"><RefreshCw className="w-4 h-4" /></button>
                <button onClick={() => { initializeConversation(); setError(''); }} className="btn-ghost p-2.5 rounded-xl"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Quick questions */}
            <div className="flex flex-wrap gap-2 mt-3">
              {quickQuestions.map((q, i) => (
                <button key={i} onClick={() => handleQuick(q)} disabled={!connected || loading}
                  className="badge bg-white/[0.03] border border-white/[0.07] text-gray-500 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20 transition-all cursor-pointer disabled:opacity-30">
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Messages - fills remaining space, scrolls internally */}
          <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-4 sm:space-y-6">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''} animate-fade-in-up`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  msg.sender === 'user' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' :
                  msg.isError ? 'bg-red-500/15 border border-red-500/20' :
                  'bg-gradient-to-br from-emerald-500/15 to-cyan-500/15 border border-emerald-500/15'
                }`}>
                  {msg.sender === 'user' ? <User className="w-4 h-4 text-white" /> :
                    <Bot className={`w-4 h-4 ${msg.isError ? 'text-red-400' : 'text-emerald-400'}`} />}
                </div>

                <div className={`max-w-[75%] rounded-2xl p-4 ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-br from-blue-500/15 to-indigo-500/15 border border-blue-500/15 rounded-tr-md'
                    : msg.isError
                    ? 'bg-red-500/[0.06] border border-red-500/15 rounded-tl-md'
                    : 'bg-white/[0.02] border border-white/[0.05] rounded-tl-md'
                }`}>
                  <div className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed chat-message-content">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold text-gray-100">{children}</strong>,
                        ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
                        li: ({ children }) => <li className="ml-1">{children}</li>,
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>

                  {msg.suggestions?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/[0.04] flex flex-wrap gap-1.5">
                      {msg.suggestions.map((s, i) => (
                        <button key={i} onClick={() => handleQuick(s)} disabled={!connected}
                          className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all cursor-pointer text-[11px]">
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2.5">
                    <span className="text-[10px] text-gray-600 font-medium">
                      {msg.sender === 'user' ? t.you : msg.isError ? t.error : t.ai}
                      {msg.isLLMResponse && <span className="text-emerald-500 ml-1.5">{t.live}</span>}
                    </span>
                    <span className="text-[10px] text-gray-600">{msg.timestamp.toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 animate-fade-in-up">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl rounded-tl-md p-4 flex items-center gap-3">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">{t.thinking}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 sm:p-5 border-t border-white/[0.04] shrink-0">
            <div className="flex gap-3">
              <textarea value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && connected) { e.preventDefault(); handleSend(); } }}
                disabled={loading || !connected}
                placeholder={connected ? t.placeholder : t.placeholderWaiting}
                rows={1} className="input-field resize-none flex-1" />
              <button onClick={handleSend} disabled={loading || !input.trim() || !connected} className="btn-primary px-5 rounded-xl">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <div className={`mt-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.15em] ${connected ? 'text-emerald-500' : 'text-amber-500'}`}>
              {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {connected ? t.online : t.offline}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4">
          <div className="card flex items-center gap-3 p-4 border-red-500/20">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-300 flex-1">{error}</p>
            <button onClick={() => setError('')} className="text-red-400 text-xs font-bold hover:text-red-300 transition-colors">{t.close}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBot;
