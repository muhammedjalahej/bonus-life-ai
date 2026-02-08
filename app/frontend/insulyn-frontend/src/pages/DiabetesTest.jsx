import React, { useState } from 'react';
import {
  AlertTriangle, CheckCircle, Loader2, ArrowRight, ArrowLeft, RotateCcw,
  Heart, Activity, Apple, Dumbbell, Leaf, Calendar, Stethoscope, Target,
  TrendingUp, Clock, Droplets, Users, GraduationCap, Sparkles,
} from 'lucide-react';
import { API_BASE_URL } from '../config/constants';

const DiabetesTest = ({ language = 'english' }) => {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    pregnancies: '', glucose: '', blood_pressure: '', skin_thickness: '',
    insulin: '', weight: '', height: '', diabetes_pedigree_function: '', age: '',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const t = language === 'turkish' ? {
    title: 'Risk Değerlendirmesi', steps: ['Kişisel', 'Sağlık Verileri', 'Sonuçlar'],
    next: 'Devam', back: 'Geri', submit: 'Analiz Et', newTest: 'Yeni Değerlendirme', loading: 'Analiz ediliyor...',
  } : {
    title: 'Risk Assessment', steps: ['Personal', 'Health Metrics', 'Results'],
    next: 'Continue', back: 'Back', submit: 'Analyze', newTest: 'New Assessment', loading: 'Analyzing...',
  };

  const onChange = (f) => (e) => setFormData({ ...formData, [f]: e.target.value });

  const handleSubmit = async () => {
    setLoading(true); setError('');
    try {
      if (!formData.glucose || !formData.blood_pressure || !formData.weight || !formData.height || !formData.age)
        throw new Error('Please fill all required fields');

      const response = await fetch(`${API_BASE_URL}/api/v1/diabetes-assessment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pregnancies: parseInt(formData.pregnancies) || 0, glucose: parseFloat(formData.glucose),
          blood_pressure: parseFloat(formData.blood_pressure), skin_thickness: parseFloat(formData.skin_thickness) || 20,
          insulin: parseFloat(formData.insulin) || 80, weight: parseFloat(formData.weight),
          height: parseFloat(formData.height), diabetes_pedigree_function: parseFloat(formData.diabetes_pedigree_function) || 0.5,
          age: parseInt(formData.age), language,
        }),
      });
      if (!response.ok) { const d = await response.json(); throw new Error(d.detail || 'Failed'); }
      setResult(await response.json());
      setStep(2);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleNewTest = () => {
    setStep(0); setResult(null); setError('');
    setFormData({ pregnancies: '', glucose: '', blood_pressure: '', skin_thickness: '', insulin: '', weight: '', height: '', diabetes_pedigree_function: '', age: '' });
  };

  const risk = result?.risk_level || result?.risk_analysis?.risk_level || 'Unknown';
  const prob = ((result?.probability || result?.risk_analysis?.probability || 0) * 100).toFixed(1);
  const factors = result?.key_factors || result?.risk_analysis?.key_factors || [];
  const metrics = result?.health_metrics || {};
  const recs = result?.recommendations || {};
  const isHigh = risk.toLowerCase().includes('high');
  const isMod = risk.toLowerCase().includes('moderate');

  const Field = ({ label, field, required, hint, icon: Icon }) => (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-300">
        {label} {required && <span className="text-emerald-400">*</span>}
      </label>
      <div className="relative">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />}
        <input type="number" value={formData[field]} onChange={onChange(field)}
          className={`input-field ${Icon ? 'pl-11' : ''} ${required && !formData[field] ? 'border-red-500/20' : ''}`}
          placeholder={`Enter ${label.toLowerCase()}`} />
      </div>
      {hint && <p className="text-[11px] text-gray-600">{hint}</p>}
    </div>
  );

  const canNext0 = formData.age;
  const canNext1 = formData.glucose && formData.blood_pressure && formData.weight && formData.height;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-32 pb-16">
      {/* Top section */}
      <div className="text-center mb-14 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-5 py-2 mb-5">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span className="text-[11px] font-extrabold text-blue-400 uppercase tracking-[0.15em]">AI-Powered Analysis</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-3 tracking-tight">{t.title}</h1>
        <p className="text-gray-500 max-w-md mx-auto">Enter your health metrics for an AI-driven diabetes risk analysis.</p>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-4 mt-10">
          {t.steps.map((s, i) => (
            <React.Fragment key={i}>
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-500
                  ${i < step ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' :
                    i === step ? 'bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/30 scale-110' :
                    'bg-white/[0.04] text-gray-600 border border-white/[0.08]'}`}>
                  {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-sm font-medium hidden sm:block ${i <= step ? 'text-white' : 'text-gray-600'}`}>{s}</span>
              </div>
              {i < t.steps.length - 1 && (
                <div className={`w-16 h-[2px] rounded-full transition-all duration-500 ${i < step ? 'bg-emerald-500' : 'bg-white/[0.06]'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 mb-8 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm animate-fade-in-up">
          <AlertTriangle className="w-5 h-5 shrink-0" /> {error}
        </div>
      )}

      {/* Content */}
      <div className="gradient-border animate-fade-in-up">
        <div className="card p-8 sm:p-10 rounded-[1.25rem]">
          {step === 0 && (
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/10 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-pink-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Personal Information</h2>
                  <p className="text-sm text-gray-500">Basic details for your assessment</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Field label="Number of Pregnancies" field="pregnancies" hint="Enter 0 if not applicable" icon={Users} />
                <Field label="Age" field="age" required hint="Required" icon={Calendar} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/10 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Health Metrics</h2>
                  <p className="text-sm text-gray-500">Clinical measurements and vitals</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Field label="Glucose (mg/dL)" field="glucose" required hint="Fasting blood sugar" icon={Droplets} />
                <Field label="Blood Pressure (mmHg)" field="blood_pressure" required hint="Systolic" icon={Activity} />
                <Field label="Skin Thickness (mm)" field="skin_thickness" hint="Triceps skinfold" />
                <Field label="Insulin (mu U/ml)" field="insulin" hint="2-Hour serum" />
                <Field label="Weight (kg)" field="weight" required />
                <Field label="Height (cm)" field="height" required />
                <div className="sm:col-span-2">
                  <Field label="Diabetes Pedigree Function" field="diabetes_pedigree_function" hint="Family history score (0.0 - 2.5)" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <>
              {loading ? (
                <div className="flex flex-col items-center py-24 gap-6">
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                    <div className="absolute inset-2 rounded-full border-2 border-cyan-500/10 border-b-cyan-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                    <div className="absolute inset-0 flex items-center justify-center"><Activity className="w-7 h-7 text-emerald-400 animate-pulse" /></div>
                  </div>
                  <p className="text-gray-400 font-medium">{t.loading}</p>
                </div>
              ) : result && (
                <div className="space-y-8 stagger">
                  {/* Executive Summary */}
                  {result.executive_summary && (
                    <div className="gradient-border animate-fade-in-up">
                      <div className="card p-6 rounded-[1.25rem] bg-white/[0.02]">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                            <Stethoscope className="w-5 h-5 text-emerald-400" />
                          </div>
                          <div>
                            <h3 className="font-bold text-white mb-2 text-lg">Executive Summary</h3>
                            <p className="text-sm text-gray-400 leading-relaxed">{result.executive_summary}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Risk + Factors */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`card p-7 border-2 animate-fade-in-up ${isHigh ? 'border-red-500/20 bg-red-500/[0.04]' : isMod ? 'border-amber-500/20 bg-amber-500/[0.04]' : 'border-emerald-500/20 bg-emerald-500/[0.04]'}`}>
                      <Target className={`w-6 h-6 mb-4 ${isHigh ? 'text-red-400' : isMod ? 'text-amber-400' : 'text-emerald-400'}`} />
                      <div className={`text-5xl font-black mb-2 ${isHigh ? 'text-red-400' : isMod ? 'text-amber-400' : 'text-emerald-400'}`}>{prob}%</div>
                      <div className={`text-sm font-bold mb-3 ${isHigh ? 'text-red-300' : isMod ? 'text-amber-300' : 'text-emerald-300'}`}>{risk}</div>
                      <p className="text-xs text-gray-500">Probability of developing type 2 diabetes</p>
                    </div>

                    <div className="card p-7 animate-fade-in-up">
                      <AlertTriangle className="w-6 h-6 text-amber-400 mb-4" />
                      <h3 className="font-bold text-white mb-4 text-lg">Key Risk Factors</h3>
                      {factors.length > 0 ? (
                        <ul className="space-y-3">
                          {factors.map((f, i) => {
                            const sev = (f.severity || '').toLowerCase();
                            return (
                              <li key={i} className="flex items-start gap-3">
                                <span className={`badge mt-0.5 ${sev.includes('high') ? 'bg-red-500/20 text-red-400' : sev.includes('moderate') ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                  {f.severity || 'Info'}
                                </span>
                                <span className="text-sm text-gray-300">{f.factor}</span>
                              </li>
                            );
                          })}
                        </ul>
                      ) : <p className="text-sm text-gray-500">No significant risk factors.</p>}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-5 animate-fade-in-up">
                    {[
                      { label: 'BMI', value: metrics.bmi || 'N/A', sub: metrics.bmi_category || '---' },
                      { label: 'Metabolic Age', value: metrics.metabolic_age || 'N/A', sub: 'years' },
                      { label: 'Health Score', value: `${metrics.health_score || 0}/100`, sub: `${metrics.health_score || 0}%`, bar: metrics.health_score },
                    ].map((m, i) => (
                      <div key={i} className="card p-6 text-center">
                        <p className="text-[10px] text-gray-500 uppercase tracking-[0.15em] mb-3 font-bold">{m.label}</p>
                        <p className="text-3xl font-black gradient-text">{m.value}</p>
                        {m.bar !== undefined && (
                          <div className="w-full bg-white/[0.04] rounded-full h-1.5 mt-4">
                            <div className="h-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-1000" style={{ width: `${m.bar}%` }} />
                          </div>
                        )}
                        {!m.bar && <p className="text-xs text-gray-500 mt-1">{m.sub}</p>}
                      </div>
                    ))}
                  </div>

                  {/* Recommendations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in-up">
                    <div className="card p-6">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                        <Apple className="w-5 h-5 text-emerald-400" />
                      </div>
                      <h4 className="font-bold text-white mb-2">Nutrition</h4>
                      <p className="text-sm text-gray-400 leading-relaxed">Low-glycemic foods, portion control, whole grains. Limit added sugars and processed food.</p>
                    </div>
                    <div className="card p-6">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                        <Dumbbell className="w-5 h-5 text-blue-400" />
                      </div>
                      <h4 className="font-bold text-white mb-2">Fitness</h4>
                      <p className="text-sm text-gray-400 leading-relaxed">150 min/week moderate aerobic activity. Strength training 2-3x/week.</p>
                    </div>
                  </div>

                  {recs.lifestyle_changes && (
                    <div className="card p-6 animate-fade-in-up">
                      <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4">
                        <Leaf className="w-5 h-5 text-violet-400" />
                      </div>
                      <h4 className="font-bold text-white mb-4">Lifestyle Changes</h4>
                      <ul className="space-y-2.5">
                        {recs.lifestyle_changes.map((c, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-gray-400">
                            <CheckCircle className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" /> {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Timeline */}
                  <div className="grid grid-cols-3 gap-5 animate-fade-in-up">
                    {[
                      { label: 'Immediate', icon: Clock, items: ['Consult doctor', 'Monitor glucose', 'Start walking'], color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/10' },
                      { label: '30 Days', icon: Calendar, items: ['Diet changes', 'Exercise routine', 'Weekly tracking'], color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/10' },
                      { label: '90 Days', icon: TrendingUp, items: ['Reassess metrics', 'Adjust plan', 'Follow-up visit'], color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/10' },
                    ].map((p, i) => (
                      <div key={i} className={`card p-5 border ${p.border}`}>
                        <div className={`w-9 h-9 rounded-lg ${p.bg} flex items-center justify-center mb-3`}>
                          <p.icon className={`w-4 h-4 ${p.color}`} />
                        </div>
                        <p className={`text-xs font-extrabold ${p.color} mb-3 uppercase tracking-wider`}>{p.label}</p>
                        <ul className="space-y-2">
                          {p.items.map((item, j) => (
                            <li key={j} className="text-[12px] text-gray-400 flex items-start gap-2">
                              <CheckCircle className={`w-3.5 h-3.5 mt-0.5 ${p.color} shrink-0`} />{item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <div className="text-center pt-6">
                    <button onClick={handleNewTest} className="btn-secondary"><RotateCcw className="w-4 h-4" />{t.newTest}</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Nav buttons */}
      {step < 2 && (
        <div className="flex justify-between mt-8">
          <button onClick={() => setStep(s => s - 1)} disabled={step === 0} className="btn-ghost disabled:opacity-20">
            <ArrowLeft className="w-4 h-4" /> {t.back}
          </button>
          <button onClick={step === 1 ? handleSubmit : () => setStep(s => s + 1)}
            disabled={loading || (step === 0 && !canNext0) || (step === 1 && !canNext1)} className="btn-primary">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {step === 1 ? (loading ? t.loading : t.submit) : t.next}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      )}
    </div>
  );
};

export default DiabetesTest;
