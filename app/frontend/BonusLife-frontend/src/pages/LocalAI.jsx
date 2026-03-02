import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Sparkles, Sun, HelpCircle, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import {
  localAIGetHealthTip,
  localAIAnswerScenario,
  getMyAssessments,
} from '../services/api';

const TIP_STORAGE_KEY = 'bonuslife_local_ai_tip';
const SCENARIO_HISTORY_KEY = 'bonuslife_local_ai_scenario_history';
const SCENARIO_HISTORY_MAX = 10;

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function loadStoredTip() {
  try {
    const raw = localStorage.getItem(TIP_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.date !== getTodayDate()) return null;
    return data.tip || null;
  } catch {
    return null;
  }
}

function saveStoredTip(date, tip) {
  try {
    localStorage.setItem(TIP_STORAGE_KEY, JSON.stringify({ date, tip }));
  } catch (_) {}
}

function loadScenarioHistory() {
  try {
    const raw = localStorage.getItem(SCENARIO_HISTORY_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.slice(0, SCENARIO_HISTORY_MAX) : [];
  } catch {
    return [];
  }
}

function saveScenarioHistory(list) {
  try {
    localStorage.setItem(SCENARIO_HISTORY_KEY, JSON.stringify(list.slice(0, SCENARIO_HISTORY_MAX)));
  } catch (_) {}
}

/** Strip disclaimer lines from displayed answer (e.g. "Disclaimer: ..." or "This is not medical advice."). */
function stripDisclaimer(text) {
  if (!text || typeof text !== 'string') return text;
  let out = text;
  const disclaimerStart = out.search(/\bDisclaimer\s*:/i);
  if (disclaimerStart !== -1) {
    out = out.slice(0, disclaimerStart);
  }
  out = out.replace(/\n*This is not medical advice\.?\s*$/i, '').trim();
  out = out.replace(/\n*Consult with your healthcare provider[^.]*\.?\s*$/i, '').trim();
  return out.trim();
}

const LocalAI = ({ language = 'english' }) => {
  const [searchParams] = useSearchParams();
  const section = searchParams.get('section'); // 'tip' | 'scenario' | null (both)
  const isTr = language === 'turkish';
  const lang = isTr ? 'turkish' : 'english';

  const [tip, setTip] = useState('');
  const [tipLoading, setTipLoading] = useState(false);

  const [scenario, setScenario] = useState('');
  const [scenarioResult, setScenarioResult] = useState('');
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [scenarioHistory, setScenarioHistory] = useState([]);
  const [historyExpandedId, setHistoryExpandedId] = useState(null);
  const [latestAssessment, setLatestAssessment] = useState(null);

  useEffect(() => {
    getMyAssessments(1)
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) setLatestAssessment(list[0]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setScenarioHistory(loadScenarioHistory());
  }, []);

  useEffect(() => {
    const stored = loadStoredTip();
    if (stored) setTip(stored);
    else setTip('');
  }, []);

  const t = isTr
    ? {
        badge: 'Yerel Yapay Zeka',
        title: 'Yerel AI',
        subtitle: 'Günlük sağlık ipucu alın ve size özel "ya… olursa" cevaplarını keşfedin.',
        tipTitle: 'Günün sağlık ipucu',
        getTip: "Günün ipucunu al",
        getNewTip: 'Yeni ipucu al',
        scenarioTitle: 'Ya… olursa?',
        scenarioPlaceholder: 'örn. Kan şekerimi 20 düşürürsem ne olur?',
        usingAssessment: 'Son değerlendirmeniz bağlam için kullanılıyor.',
        askScenario: 'Cevap al',
        previousQuestions: 'Önceki sorular',
      }
    : {
        badge: 'Local AI',
        title: 'Local AI',
        subtitle: 'Get a daily health tip and explore "what if" answers tailored to you.',
        tipTitle: 'Health tip of the day',
        getTip: "Get today's tip",
        getNewTip: 'Get a new tip',
        scenarioTitle: 'What if…?',
        scenarioPlaceholder: 'e.g. What if I lower my glucose by 20?',
        usingAssessment: 'Using your last assessment for context.',
        askScenario: 'Get answer',
        previousQuestions: 'Previous questions',
      };

  const onGetTip = async () => {
    const today = getTodayDate();
    const stored = loadStoredTip();
    if (stored) {
      setTip(stored);
      return;
    }
    setTipLoading(true);
    setTip('');
    try {
      const res = await localAIGetHealthTip(lang);
      const text = res.tip || res.detail || '';
      setTip(text);
      saveStoredTip(today, text);
    } catch (e) {
      setTip(e.message || '');
    } finally {
      setTipLoading(false);
    }
  };

  const onGetNewTip = async () => {
    setTipLoading(true);
    setTip('');
    try {
      const res = await localAIGetHealthTip(lang);
      const text = res.tip || res.detail || '';
      setTip(text);
      saveStoredTip(getTodayDate(), text);
    } catch (e) {
      setTip(e.message || '');
    } finally {
      setTipLoading(false);
    }
  };

  const onScenario = async () => {
    if (!scenario.trim()) return;
    const question = scenario.trim();
    setScenarioLoading(true);
    setScenarioResult('');
    try {
      const res = await localAIAnswerScenario(question, latestAssessment || undefined, lang);
      const answer = res.answer || res.detail || '';
      setScenarioResult(answer);
      const next = [{ scenario: question, answer }, ...scenarioHistory];
      setScenarioHistory(next);
      saveScenarioHistory(next);
    } catch (e) {
      setScenarioResult(e.message || '');
    } finally {
      setScenarioLoading(false);
    }
  };

  const showTip = section !== 'scenario';
  const showScenario = section !== 'tip';

  // When viewing a single section, show that feature name instead of "Local AI"
  const headerBadge = section === 'tip' ? (isTr ? 'İpucu' : 'Tip') : section === 'scenario' ? (isTr ? 'Senaryo' : 'Scenario') : t.badge;
  const headerTitle = section === 'tip' ? t.tipTitle : section === 'scenario' ? t.scenarioTitle : t.title;
  const headerSubtitle = section === 'tip' ? (isTr ? 'Günlük sağlık ipucu alın.' : 'Get your daily health tip.') : section === 'scenario' ? (isTr ? 'Size özel "ya… olursa" cevaplarını keşfedin.' : 'Explore "what if" answers tailored to you.') : t.subtitle;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-32 pb-16">
      <div className="text-center mb-12 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-5 py-2 mb-5">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-[11px] font-extrabold text-cyan-400 uppercase tracking-[0.15em]">{headerBadge}</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-3 tracking-tight">{headerTitle}</h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">{headerSubtitle}</p>
      </div>

      <div className="space-y-10">
        {/* Health tip */}
        {showTip && (
        <section className="gradient-border rounded-2xl overflow-hidden">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Sun className="w-6 h-6 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-white">{t.tipTitle}</h2>
            </div>
            <button
              type="button"
              onClick={tip ? onGetNewTip : onGetTip}
              disabled={tipLoading}
              className="btn-primary inline-flex items-center gap-2"
            >
              {tipLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {tip ? t.getNewTip : t.getTip}
            </button>
            {tip ? (
              <div className="mt-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] border-l-4 border-l-amber-500 text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                {tip}
              </div>
            ) : null}
          </div>
        </section>
        )}

        {/* Scenario */}
        {showScenario && (
        <section className="gradient-border rounded-2xl overflow-hidden">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <HelpCircle className="w-6 h-6 text-violet-400" />
              </div>
              <h2 className="text-xl font-bold text-white">{t.scenarioTitle}</h2>
            </div>
            <textarea
              value={scenario}
              onChange={(e) => {
                setScenario(e.target.value);
                setScenarioResult('');
              }}
              placeholder={t.scenarioPlaceholder}
              className="input-field w-full min-h-[100px] resize-y mb-4"
              disabled={scenarioLoading}
              rows={3}
            />
            <button
              type="button"
              onClick={onScenario}
              disabled={scenarioLoading || !scenario.trim()}
              className="btn-primary inline-flex items-center gap-2"
            >
              {scenarioLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {t.askScenario}
            </button>
            {scenarioResult ? (
              <div className="mt-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] border-l-4 border-l-violet-500 text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                {stripDisclaimer(scenarioResult)}
              </div>
            ) : null}
            {scenarioHistory.length > 0 ? (
              <div className="mt-6 pt-4 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setHistoryExpandedId(historyExpandedId ? null : 'history')}
                  className="flex items-center gap-2 text-gray-400 hover:text-violet-400 text-sm font-medium"
                >
                  {historyExpandedId ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {t.previousQuestions} ({scenarioHistory.length})
                </button>
                {historyExpandedId ? (
                  <ul className="mt-2 space-y-2">
                    {scenarioHistory.map((item, idx) => (
                      <li key={idx} className="relative p-3 pr-10 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm">
                        <p className="text-violet-300 font-medium mb-1">Q: {item.scenario}</p>
                        <p className="text-gray-400 whitespace-pre-wrap">{stripDisclaimer(item.answer)}</p>
                        <button
                          type="button"
                          onClick={() => {
                            const next = scenarioHistory.filter((_, i) => i !== idx);
                            setScenarioHistory(next);
                            saveScenarioHistory(next);
                          }}
                          className="absolute top-3 right-3 p-1.5 rounded-md text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title={isTr ? 'Sil' : 'Delete'}
                          aria-label={isTr ? 'Sil' : 'Delete'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
        )}
      </div>
    </div>
  );
};

export default LocalAI;
