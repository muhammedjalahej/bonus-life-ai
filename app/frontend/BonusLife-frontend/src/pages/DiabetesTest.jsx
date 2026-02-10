import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle, CheckCircle, Loader2, ArrowRight, ArrowLeft, RotateCcw,
  Heart, Activity, Apple, Dumbbell, Leaf, Calendar, Stethoscope, Target,
  TrendingUp, Clock, Droplets, Users, GraduationCap, Sparkles,
} from 'lucide-react';
import * as apiService from '../services/api';
import { VOICE_FILL_EVENT, VOICE_CLEAR_FIELD_EVENT, VOICE_FORM_NEXT_EVENT, VOICE_FORM_BACK_EVENT } from '../components/VoiceAgent';

/* Stable field component so number inputs keep focus while typing */
function FormField({ label, value, onChange, required, hint, placeholder, icon: Icon, error }) {
  const isNegativeError = !!error;
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-300">
        {label} {required && <span className="text-emerald-400">*</span>}
      </label>
      <div className="relative">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />}
        <input
          type="number"
          value={value ?? ''}
          onChange={onChange}
          className={`input-field ${Icon ? 'pl-11' : ''} ${isNegativeError ? 'border-red-500/50 focus:border-red-500/70 focus:ring-red-500/20' : ''} ${required && !value ? 'border-red-500/20' : ''}`}
          placeholder={placeholder || `Enter ${(label || '').toLowerCase()}`}
        />
      </div>
      {isNegativeError && <p className="text-[11px] text-red-400 font-medium">{error}</p>}
      {hint && !isNegativeError && <p className="text-[11px] text-gray-600">{hint}</p>}
    </div>
  );
}

const DiabetesTest = ({ language = 'english' }) => {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    pregnancies: '', glucose: '', blood_pressure: '', skin_thickness: '',
    insulin: '', weight: '', height: '', diabetes_pedigree_function: '', age: '',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Voice agent: fill form fields by voice command
  useEffect(() => {
    const handler = (e) => {
      const { field, value } = e.detail || {};
      const key = field === 'pedigree' ? 'diabetes_pedigree_function' : field;
      const allowed = ['age', 'weight', 'height', 'pregnancies', 'glucose', 'blood_pressure', 'skin_thickness', 'insulin', 'diabetes_pedigree_function'];
      if (key && allowed.includes(key) && value != null) {
        setFormData((prev) => ({ ...prev, [key]: String(value) }));
      }
    };
    window.addEventListener(VOICE_FILL_EVENT, handler);
    return () => window.removeEventListener(VOICE_FILL_EVENT, handler);
  }, []);

  // Voice agent: clear a form field ("clear blood pressure", "delete age")
  useEffect(() => {
    const handler = (e) => {
      const { field } = e.detail || {};
      const key = field === 'pedigree' ? 'diabetes_pedigree_function' : field;
      const allowed = ['age', 'weight', 'height', 'pregnancies', 'glucose', 'blood_pressure', 'skin_thickness', 'insulin', 'diabetes_pedigree_function'];
      if (key && allowed.includes(key)) {
        setFormData((prev) => ({ ...prev, [key]: '' }));
      }
    };
    window.addEventListener(VOICE_CLEAR_FIELD_EVENT, handler);
    return () => window.removeEventListener(VOICE_CLEAR_FIELD_EVENT, handler);
  }, []);

  const handleSubmitRef = useRef(() => {});

  // Voice agent: continue / next and back on assessment form
  useEffect(() => {
    const onNext = () => {
      setStep((s) => {
        if (s === 0) return 1;
        if (s === 1) {
          handleSubmitRef.current();
          return s;
        }
        return s;
      });
    };
    const onBack = () => setStep((s) => (s > 0 ? s - 1 : s));
    window.addEventListener(VOICE_FORM_NEXT_EVENT, onNext);
    window.addEventListener(VOICE_FORM_BACK_EVENT, onBack);
    return () => {
      window.removeEventListener(VOICE_FORM_NEXT_EVENT, onNext);
      window.removeEventListener(VOICE_FORM_BACK_EVENT, onBack);
    };
  }, []);

  const isTr = language === 'turkish';
  const t = isTr ? {
    title: 'Diyabet Risk Değerlendirmesi', steps: ['Kişisel Bilgiler', 'Sağlık Ölçümleri', 'Sonuçlar'],
    next: 'Devam', back: 'Geri', submit: 'Analiz Yap', newTest: 'Yeni Değerlendirme', loading: 'Analiz ediliyor...',
    badge: 'Yapay Zeka Destekli Analiz',
    subtitle: 'Yapay zeka destekli diyabet risk analizi için sağlık verilerinizi girin.',
    step0Title: 'Kişisel Bilgiler', step0Sub: 'Değerlendirmeniz için temel bilgiler',
    step1Title: 'Sağlık Ölçümleri', step1Sub: 'Klinik ölçümler ve yaşamsal bulgular',
    pregnancies: 'Hamilelik Sayısı', pregnanciesHint: 'Uygulanamıyorsa 0 girin', pregnanciesPlaceholder: 'Sayı girin',
    age: 'Yaş', ageHint: 'Zorunlu', agePlaceholder: 'Yaş girin',
    glucose: 'Glukoz (mg/dL)', glucoseHint: 'Açlık kan şekeri', glucosePlaceholder: 'Değer girin',
    bloodPressure: 'Tansiyon (mmHg)', bloodPressureHint: 'Büyük tansiyon', bloodPressurePlaceholder: 'Değer girin',
    skinThickness: 'Cilt Kalınlığı (mm)', skinThicknessHint: 'Triceps kıvrım', skinThicknessPlaceholder: 'Değer girin',
    insulin: 'İnsülin (mu U/ml)', insulinHint: '2 saatlik serum', insulinPlaceholder: 'Değer girin',
    weight: 'Kilo (kg)', weightPlaceholder: 'Kilo girin',
    height: 'Boy (cm)', heightPlaceholder: 'Boy girin',
    pedigree: 'Diyabet Aile Öyküsü', pedigreeHint: 'Aile öykü puanı (0,0 - 2,5)', pedigreePlaceholder: 'Değer girin',
    requiredError: 'Lütfen zorunlu alanları doldurun.',
    negativeError: 'Lütfen negatif olmayan bir sayı girin.',
    execSummary: 'Özet', probLabel: 'Tip 2 diyabet geliştirme olasılığı',
    keyRiskFactors: 'Önemli Risk Faktörleri', noRiskFactors: 'Önemli risk faktörü yok.',
    bmi: 'VKİ', metabolicAge: 'Metabolik Yaş', years: 'yıl', healthScore: 'Sağlık Puanı',
    nutrition: 'Beslenme', nutritionDesc: 'Düşük glisemik besinler, porsiyon kontrolü, tam tahıllar. İlave şeker ve işlenmiş gıdayı sınırlayın.',
    fitness: 'Fitness', fitnessDesc: 'Haftada 150 dk orta tempolu aerobik. Haftada 2-3 gün kuvvet antrenmanı.',
    lifestyleChanges: 'Yaşam Tarzı Değişiklikleri',
    immediate: 'Acil', immediateItems: ['Doktora danışın', 'Kan şekerini takip edin', 'Yürüyüşe başlayın'],
    days30: '30 Gün', days30Items: ['Diyet değişiklikleri', 'Egzersiz rutini', 'Haftalık takip'],
    days90: '90 Gün', days90Items: ['Metrikleri yeniden değerlendirin', 'Planı güncelleyin', 'Kontrol randevusu'],
  } : {
    title: 'Risk Assessment', steps: ['Personal', 'Health Metrics', 'Results'],
    next: 'Continue', back: 'Back', submit: 'Analyze', newTest: 'New Assessment', loading: 'Analyzing...',
    badge: 'AI-Powered Analysis',
    subtitle: 'Enter your health metrics for an AI-driven diabetes risk analysis.',
    step0Title: 'Personal Information', step0Sub: 'Basic details for your assessment',
    step1Title: 'Health Metrics', step1Sub: 'Clinical measurements and vitals',
    pregnancies: 'Number of Pregnancies', pregnanciesHint: 'Enter 0 if not applicable', pregnanciesPlaceholder: 'Enter number of pregnancies',
    age: 'Age', ageHint: 'Required', agePlaceholder: 'Enter age',
    glucose: 'Glucose (mg/dL)', glucoseHint: 'Fasting blood sugar', glucosePlaceholder: 'Enter value',
    bloodPressure: 'Blood Pressure (mmHg)', bloodPressureHint: 'Systolic', bloodPressurePlaceholder: 'Enter value',
    skinThickness: 'Skin Thickness (mm)', skinThicknessHint: 'Triceps skinfold', skinThicknessPlaceholder: 'Enter value',
    insulin: 'Insulin (mu U/ml)', insulinHint: '2-Hour serum', insulinPlaceholder: 'Enter value',
    weight: 'Weight (kg)', weightPlaceholder: 'Enter weight',
    height: 'Height (cm)', heightPlaceholder: 'Enter height',
    pedigree: 'Diabetes Pedigree Function', pedigreeHint: 'Family history score (0.0 - 2.5)', pedigreePlaceholder: 'Enter value',
    requiredError: 'Please fill all required fields',
    negativeError: 'Please enter a positive number.',
    execSummary: 'Executive Summary', probLabel: 'Probability of developing type 2 diabetes',
    keyRiskFactors: 'Key Risk Factors', noRiskFactors: 'No significant risk factors.',
    bmi: 'BMI', metabolicAge: 'Metabolic Age', years: 'years', healthScore: 'Health Score',
    nutrition: 'Nutrition', nutritionDesc: 'Low-glycemic foods, portion control, whole grains. Limit added sugars and processed food.',
    fitness: 'Fitness', fitnessDesc: '150 min/week moderate aerobic activity. Strength training 2-3x/week.',
    lifestyleChanges: 'Lifestyle Changes',
    immediate: 'Immediate', immediateItems: ['Consult doctor', 'Monitor glucose', 'Start walking'],
    days30: '30 Days', days30Items: ['Diet changes', 'Exercise routine', 'Weekly tracking'],
    days90: '90 Days', days90Items: ['Reassess metrics', 'Adjust plan', 'Follow-up visit'],
  };

  const handleSubmit = async () => {
    setLoading(true); setError('');
    try {
      if (!formData.glucose || !formData.blood_pressure || !formData.weight || !formData.height || !formData.age)
        throw new Error(t.requiredError);
      const numericFields = ['pregnancies', 'age', 'glucose', 'blood_pressure', 'skin_thickness', 'insulin', 'weight', 'height', 'diabetes_pedigree_function'];
      const negativeFields = numericFields.filter(f => {
        const v = formData[f];
        return v !== '' && !isNaN(parseFloat(v)) && parseFloat(v) < 0;
      });
      if (negativeFields.length) throw new Error(t.negativeError);

      const payload = {
        pregnancies: parseInt(formData.pregnancies) || 0,
        glucose: parseFloat(formData.glucose),
        blood_pressure: parseFloat(formData.blood_pressure),
        skin_thickness: parseFloat(formData.skin_thickness) || 20,
        insulin: parseFloat(formData.insulin) || 80,
        weight: parseFloat(formData.weight),
        height: parseFloat(formData.height),
        diabetes_pedigree_function: parseFloat(formData.diabetes_pedigree_function) || 0.5,
        age: parseInt(formData.age),
        language,
      };
      const data = await apiService.predictDiabetesRisk(payload);
      setResult(data);
      setStep(2);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  handleSubmitRef.current = handleSubmit;

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

  const isNegative = (v) => v !== '' && !isNaN(parseFloat(v)) && parseFloat(v) < 0;
  const negErr = t.negativeError;
  const canNext0 = formData.age && !isNegative(formData.age) && !isNegative(formData.pregnancies);
  const canNext1 = formData.glucose && formData.blood_pressure && formData.weight && formData.height
    && !isNegative(formData.glucose) && !isNegative(formData.blood_pressure) && !isNegative(formData.weight) && !isNegative(formData.height)
    && !isNegative(formData.skin_thickness) && !isNegative(formData.insulin) && !isNegative(formData.diabetes_pedigree_function);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-32 pb-16">
      {/* Top section */}
      <div className="text-center mb-14 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-5 py-2 mb-5">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span className="text-[11px] font-extrabold text-blue-400 uppercase tracking-[0.15em]">{t.badge}</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-3 tracking-tight">{t.title}</h1>
        <p className="text-gray-500 max-w-md mx-auto">{t.subtitle}</p>

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
                  <h2 className="text-xl font-bold text-white">{t.step0Title}</h2>
                  <p className="text-sm text-gray-500">{t.step0Sub}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField label={t.pregnancies} value={formData.pregnancies} onChange={(e) => setFormData(prev => ({ ...prev, pregnancies: e.target.value }))} hint={t.pregnanciesHint} placeholder={t.pregnanciesPlaceholder} icon={Users} error={isNegative(formData.pregnancies) ? negErr : undefined} />
                <FormField label={t.age} value={formData.age} onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))} required hint={t.ageHint} placeholder={t.agePlaceholder} icon={Calendar} error={isNegative(formData.age) ? negErr : undefined} />
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
                  <h2 className="text-xl font-bold text-white">{t.step1Title}</h2>
                  <p className="text-sm text-gray-500">{t.step1Sub}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField label={t.glucose} value={formData.glucose} onChange={(e) => setFormData(prev => ({ ...prev, glucose: e.target.value }))} required hint={t.glucoseHint} placeholder={t.glucosePlaceholder} icon={Droplets} error={isNegative(formData.glucose) ? negErr : undefined} />
                <FormField label={t.bloodPressure} value={formData.blood_pressure} onChange={(e) => setFormData(prev => ({ ...prev, blood_pressure: e.target.value }))} required hint={t.bloodPressureHint} placeholder={t.bloodPressurePlaceholder} icon={Activity} error={isNegative(formData.blood_pressure) ? negErr : undefined} />
                <FormField label={t.skinThickness} value={formData.skin_thickness} onChange={(e) => setFormData(prev => ({ ...prev, skin_thickness: e.target.value }))} hint={t.skinThicknessHint} placeholder={t.skinThicknessPlaceholder} error={isNegative(formData.skin_thickness) ? negErr : undefined} />
                <FormField label={t.insulin} value={formData.insulin} onChange={(e) => setFormData(prev => ({ ...prev, insulin: e.target.value }))} hint={t.insulinHint} placeholder={t.insulinPlaceholder} error={isNegative(formData.insulin) ? negErr : undefined} />
                <FormField label={t.weight} value={formData.weight} onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))} required placeholder={t.weightPlaceholder} error={isNegative(formData.weight) ? negErr : undefined} />
                <FormField label={t.height} value={formData.height} onChange={(e) => setFormData(prev => ({ ...prev, height: e.target.value }))} required placeholder={t.heightPlaceholder} error={isNegative(formData.height) ? negErr : undefined} />
                <div className="sm:col-span-2">
                  <FormField label={t.pedigree} value={formData.diabetes_pedigree_function} onChange={(e) => setFormData(prev => ({ ...prev, diabetes_pedigree_function: e.target.value }))} hint={t.pedigreeHint} placeholder={t.pedigreePlaceholder} error={isNegative(formData.diabetes_pedigree_function) ? negErr : undefined} />
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
                            <h3 className="font-bold text-white mb-2 text-lg">{t.execSummary}</h3>
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
                      <p className="text-xs text-gray-500">{t.probLabel}</p>
                    </div>

                    <div className="card p-7 animate-fade-in-up">
                      <AlertTriangle className="w-6 h-6 text-amber-400 mb-4" />
                      <h3 className="font-bold text-white mb-4 text-lg">{t.keyRiskFactors}</h3>
                      {factors.length > 0 ? (
                        <ul className="space-y-3">
                          {factors.map((f, i) => {
                            const sev = (f.severity || '').toLowerCase();
                            return (
                              <li key={i} className="flex items-start gap-3">
                                <span className={`badge mt-0.5 ${sev.includes('high') ? 'bg-red-500/20 text-red-400' : sev.includes('moderate') ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                  {f.severity || (isTr ? 'Bilgi' : 'Info')}
                                </span>
                                <span className="text-sm text-gray-300">{f.factor}</span>
                              </li>
                            );
                          })}
                        </ul>
                      ) : <p className="text-sm text-gray-500">{t.noRiskFactors}</p>}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-5 animate-fade-in-up">
                    {[
                      { label: t.bmi, value: metrics.bmi || 'N/A', sub: metrics.bmi_category || '---' },
                      { label: t.metabolicAge, value: metrics.metabolic_age || 'N/A', sub: t.years },
                      { label: t.healthScore, value: `${metrics.health_score || 0}/100`, sub: `${metrics.health_score || 0}%`, bar: metrics.health_score },
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
                      <h4 className="font-bold text-white mb-2">{t.nutrition}</h4>
                      <p className="text-sm text-gray-400 leading-relaxed">{t.nutritionDesc}</p>
                    </div>
                    <div className="card p-6">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                        <Dumbbell className="w-5 h-5 text-blue-400" />
                      </div>
                      <h4 className="font-bold text-white mb-2">{t.fitness}</h4>
                      <p className="text-sm text-gray-400 leading-relaxed">{t.fitnessDesc}</p>
                    </div>
                  </div>

                  {recs.lifestyle_changes && (
                    <div className="card p-6 animate-fade-in-up">
                      <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4">
                        <Leaf className="w-5 h-5 text-violet-400" />
                      </div>
                      <h4 className="font-bold text-white mb-4">{t.lifestyleChanges}</h4>
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
                      { label: t.immediate, icon: Clock, items: t.immediateItems, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/10' },
                      { label: t.days30, icon: Calendar, items: t.days30Items, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/10' },
                      { label: t.days90, icon: TrendingUp, items: t.days90Items, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/10' },
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
