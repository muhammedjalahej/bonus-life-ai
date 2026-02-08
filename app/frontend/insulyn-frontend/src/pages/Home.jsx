import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HeartPulse, Activity, MessageSquare, Mic, Salad, AlertTriangle,
  ArrowRight, Sparkles, Brain, Globe, BarChart3, Shield, Zap,
} from 'lucide-react';

const Home = ({ language }) => {
  const navigate = useNavigate();

  const t = {
    english: {
      hero1: 'Your health,',
      hero2: 'redefined by AI.',
      sub: 'Advanced diabetes prevention and management powered by machine learning and real-time AI conversations.',
      cta1: 'Get Risk Assessment', cta2: 'Talk to AI',
    },
    turkish: {
      hero1: 'Sağlığınız,',
      hero2: 'yapay zeka ile yeniden.',
      sub: 'Makine öğrenimi ve gerçek zamanlı yapay zeka görüşmeleriyle desteklenen gelişmiş diyabet önleme ve yönetimi.',
      cta1: 'Risk Değerlendirmesi', cta2: 'AI ile Konuş',
    },
  }[language] || { hero1: 'Your health,', hero2: 'redefined by AI.', sub: '', cta1: 'Get Started', cta2: 'Talk to AI' };

  const features = [
    { icon: Activity, title: 'Risk Assessment', desc: 'ML-powered diabetes prediction with SHAP explainability and comprehensive health metrics analysis.', path: '/test', gradient: 'from-blue-500 to-indigo-600', glowClass: 'glow-blue', iconBg: 'bg-blue-500/10', iconColor: 'text-blue-400', accentColor: 'text-blue-400', featured: true },
    { icon: MessageSquare, title: 'AI Chat', desc: 'Real-time medical conversations powered by Groq LLM for personalized diabetes guidance.', path: '/chat', gradient: 'from-emerald-500 to-teal-600', glowClass: 'glow-emerald', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-400', accentColor: 'text-emerald-400', featured: true },
    { icon: Mic, title: 'Voice Assistant', desc: 'Natural speech interaction in multiple languages.', path: '/voice-chat', gradient: 'from-violet-500 to-purple-600', glowClass: 'glow-violet', iconBg: 'bg-violet-500/10', iconColor: 'text-violet-400', accentColor: 'text-violet-400' },
    { icon: Salad, title: 'Diet Planner', desc: 'Personalized meal plans tailored for glucose management.', path: '/diet-plan', gradient: 'from-amber-500 to-orange-600', glowClass: 'glow-amber', iconBg: 'bg-amber-500/10', iconColor: 'text-amber-400', accentColor: 'text-amber-400' },
    { icon: AlertTriangle, title: 'Symptom Checker', desc: 'Emergency symptom assessment with urgency scoring.', path: '/emergency', gradient: 'from-red-500 to-rose-600', glowClass: 'glow-red', iconBg: 'bg-red-500/10', iconColor: 'text-red-400', accentColor: 'text-red-400' },
  ];

  return (
    <div>
      {/* ════════════════ HERO ════════════════ */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* ── Background orbs ── */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-emerald-500/[0.07] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-cyan-500/[0.06] rounded-full blur-[130px]" />
        <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-violet-500/[0.04] rounded-full blur-[120px]" />

        <div className="max-w-7xl mx-auto px-6 sm:px-10 pt-32 pb-24 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: Text */}
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-5 py-2 mb-10 animate-fade-in-up">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-[0.15em]">AI-Powered Health Platform</span>
              </div>

              <h1 className="text-[3.5rem] sm:text-[4.5rem] lg:text-[5.5rem] font-black leading-[0.95] tracking-[-0.03em] mb-8 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <span className="text-white block">{t.hero1}</span>
                <span className="gradient-text block mt-2">{t.hero2}</span>
              </h1>

              <p className="text-lg sm:text-xl text-gray-400 max-w-lg mb-12 leading-relaxed animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                {t.sub}
              </p>

              <div className="flex flex-wrap gap-4 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                <button onClick={() => navigate('/test')} className="btn-primary text-base px-9 py-4">
                  {t.cta1} <ArrowRight className="w-5 h-5" />
                </button>
                <button onClick={() => navigate('/chat')} className="btn-secondary text-base px-9 py-4">
                  {t.cta2}
                </button>
              </div>
            </div>

            {/* Right: Decorative visual */}
            <div className="hidden lg:flex items-center justify-center animate-fade-in-up" style={{ animationDelay: '400ms' }}>
              <div className="relative w-[400px] h-[400px]">
                {/* Outer ring */}
                <div className="absolute inset-0 rounded-full border border-white/[0.06] animate-pulse-ring" />
                <div className="absolute inset-6 rounded-full border border-emerald-500/10" />
                <div className="absolute inset-12 rounded-full border border-cyan-500/10" />

                {/* Center icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20 flex items-center justify-center backdrop-blur-xl shadow-2xl shadow-emerald-500/10">
                    <HeartPulse className="w-14 h-14 text-emerald-400" />
                  </div>
                </div>

                {/* Orbiting icons */}
                {[
                  { icon: Activity, color: 'from-blue-500 to-indigo-500', delay: '0s' },
                  { icon: Brain, color: 'from-emerald-500 to-teal-500', delay: '-5s' },
                  { icon: Shield, color: 'from-violet-500 to-purple-500', delay: '-10s' },
                  { icon: Zap, color: 'from-amber-500 to-orange-500', delay: '-15s' },
                ].map((item, i) => (
                  <div key={i} className="absolute inset-0 animate-orbit" style={{ animationDelay: item.delay }}>
                    <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg`}>
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                ))}

                {/* Glow behind */}
                <div className="absolute inset-16 rounded-full bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 blur-2xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════ FEATURES ════════════════ */}
      <section className="max-w-7xl mx-auto px-6 sm:px-10 py-28">
        <div className="text-center mb-20">
          <p className="text-sm font-extrabold text-emerald-400 uppercase tracking-[0.2em] mb-4">Platform</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-5 tracking-tight">
            Everything you need,<br /><span className="gradient-text">in one platform.</span>
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto text-lg">Comprehensive AI tools for diabetes prevention, detection, and management.</p>
        </div>

        {/* Featured cards (large) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 stagger">
          {features.filter(f => f.featured).map((f, i) => (
            <button key={i} onClick={() => navigate(f.path)}
              className={`gradient-border glow-card ${f.glowClass} card-hover p-8 text-left group animate-fade-in-up`}>
              <div className="relative z-10">
                <div className={`w-16 h-16 rounded-2xl ${f.iconBg} border border-white/5 flex items-center justify-center mb-6
                                group-hover:scale-110 transition-transform duration-500`}>
                  <f.icon className={`w-8 h-8 ${f.iconColor}`} />
                </div>
                <h3 className="text-2xl font-black text-white mb-3">{f.title}</h3>
                <p className="text-[15px] text-gray-400 mb-6 leading-relaxed">{f.desc}</p>
                <span className={`inline-flex items-center gap-2 text-sm font-bold ${f.accentColor} group-hover:gap-4 transition-all duration-300`}>
                  Get Started <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Smaller cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 stagger">
          {features.filter(f => !f.featured).map((f, i) => (
            <button key={i} onClick={() => navigate(f.path)}
              className={`gradient-border glow-card ${f.glowClass} card-hover p-6 text-left group animate-fade-in-up`}>
              <div className="relative z-10">
                <div className={`w-14 h-14 rounded-2xl ${f.iconBg} border border-white/5 flex items-center justify-center mb-5
                                group-hover:scale-110 transition-transform duration-500`}>
                  <f.icon className={`w-7 h-7 ${f.iconColor}`} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 mb-4 leading-relaxed">{f.desc}</p>
                <span className={`inline-flex items-center gap-2 text-sm font-bold ${f.accentColor} group-hover:gap-3 transition-all duration-300`}>
                  Explore <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ════════════════ TECH STACK ════════════════ */}
      <section className="border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-24">
          <p className="text-sm font-extrabold text-gray-500 uppercase tracking-[0.2em] mb-12 text-center">Powered By</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { icon: Brain, title: 'Groq LLM', desc: 'State-of-the-art language model for intelligent, real-time medical conversations.', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { icon: BarChart3, title: 'XGBoost + SHAP', desc: 'Accurate diabetes prediction with full model explainability and feature importance.', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
              { icon: Globe, title: 'Multi-language', desc: 'Accessible in English and Turkish for inclusive healthcare.', color: 'text-violet-400', bg: 'bg-violet-500/10' },
            ].map((item, i) => (
              <div key={i} className="flex gap-5 group">
                <div className={`w-14 h-14 rounded-2xl ${item.bg} border border-white/5 flex items-center justify-center shrink-0
                                group-hover:scale-110 transition-transform duration-300`}>
                  <item.icon className={`w-7 h-7 ${item.color}`} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg mb-1.5">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
