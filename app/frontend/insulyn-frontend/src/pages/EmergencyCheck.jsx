import React, { useState } from 'react';
import {
  AlertTriangle, CheckCircle, XCircle, Stethoscope, Loader2,
  User, Ruler, Weight, Plus, X, ChevronDown, ChevronUp, Phone, Sparkles, Shield,
} from 'lucide-react';
import { API_BASE_URL } from '../config/constants';

const EmergencyCheck = ({ language = 'english' }) => {
  const [selected, setSelected] = useState([]);
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPersonal, setShowPersonal] = useState(false);
  const [personal, setPersonal] = useState({
    age: '', weight: '', height: '',
    existingConditions: [], currentMedications: [],
    newCondition: '', newMedication: '',
  });

  const isTr = language === 'turkish';
  const symptomsList = [
    { id: 'extreme_thirst', en: 'Extreme thirst', tr: 'Aşırı susama', critical: false },
    { id: 'frequent_urination', en: 'Frequent urination', tr: 'Sık idrara çıkma', critical: false },
    { id: 'blurred_vision', en: 'Blurred vision', tr: 'Bulanık görme', critical: false },
    { id: 'fatigue', en: 'Extreme fatigue', tr: 'Aşırı yorgunluk', critical: false },
    { id: 'weight_loss', en: 'Unexplained weight loss', tr: 'Açıklanamayan kilo kaybı', critical: false },
    { id: 'nausea', en: 'Nausea or vomiting', tr: 'Mide bulantısı veya kusma', critical: false },
    { id: 'confusion', en: 'Confusion', tr: 'Zihin karışıklığı', critical: true },
    { id: 'breathing', en: 'Difficulty breathing', tr: 'Nefes almada zorluk', critical: true },
    { id: 'abdominal_pain', en: 'Abdominal pain', tr: 'Karın ağrısı', critical: false },
    { id: 'fruity_breath', en: 'Fruity-smelling breath', tr: 'Meyvemsi nefes kokusu', critical: false },
    { id: 'dizziness', en: 'Dizziness', tr: 'Baş dönmesi', critical: false },
    { id: 'rapid_heartbeat', en: 'Rapid heartbeat', tr: 'Hızlı kalp atışı', critical: true },
  ];
  const symptoms = symptomsList.map(s => ({ ...s, label: isTr ? s.tr : s.en }));

  const t = isTr ? {
    badge: 'Acil Araç', title: 'Belirti Kontrolü', subtitle: 'Aciliyet skorlamalı yapay zeka destekli acil belirti değerlendirmesi.',
    warning: 'Önemli: Bu yalnızca bilgilendirme amaçlıdır. Acil durumlarda hemen 911/112 arayın.',
    selectSymptoms: 'Belirtilerinizi seçin', critical: 'Kritik', selected: 'seçildi', criticalDetected: 'Kritik belirti tespit edildi',
    personalInfo: 'Kişisel Bilgi', optional: '(İsteğe bağlı)', age: 'Yaş', weight: 'Kilo (kg)', height: 'Boy (cm)',
    healthConditions: 'Sağlık Durumları', medications: 'İlaçlar', addCondition: 'Durum ekle', addMedication: 'İlaç ekle',
    getAssessment: 'Değerlendirme Al', assessing: 'Değerlendiriliyor...',
    riskFactors: 'Risk Faktörleri', recommendations: 'Öneriler', nextSteps: 'Sonraki Adımlar',
    criticalTitle: 'KRİTİK -- Acil', highTitle: 'YÜKSEK -- Acil', mediumTitle: 'Yakından İzleyin', lowTitle: 'İzlemeye Devam',
    callNow: '911/112 arayın veya en yakın hastaneye gidin',
    errorFallback: 'Değerlendirme başarısız. Yedek kullanılıyor.',
  } : {
    badge: 'Emergency Tool', title: 'Symptom Checker', subtitle: 'AI-powered emergency symptom assessment with urgency scoring.',
    warning: 'Important: This is informational only. In emergencies, call 911/112 immediately.',
    selectSymptoms: 'Select your symptoms', critical: 'Critical', selected: 'selected', criticalDetected: 'Critical symptom(s) detected',
    personalInfo: 'Personal Info', optional: '(Optional)', age: 'Age', weight: 'Weight (kg)', height: 'Height (cm)',
    healthConditions: 'Health Conditions', medications: 'Medications', addCondition: 'Add condition', addMedication: 'Add medication',
    getAssessment: 'Get Assessment', assessing: 'Assessing...',
    riskFactors: 'Risk Factors', recommendations: 'Recommendations', nextSteps: 'Next Steps',
    criticalTitle: 'CRITICAL -- Emergency', highTitle: 'HIGH -- Urgent', mediumTitle: 'Monitor Closely', lowTitle: 'Continue Monitoring',
    callNow: 'Call 911/112 or go to nearest hospital NOW',
    errorFallback: 'Assessment failed. Using fallback.',
  };

  const toggle = (id) => setSelected(p => p.includes(id) ? p.filter(s => s !== id) : [...p, id]);
  const updatePersonal = (f) => (e) => setPersonal(p => ({ ...p, [f]: e.target.value }));

  const addCondition = () => { if (personal.newCondition.trim()) setPersonal(p => ({ ...p, existingConditions: [...p.existingConditions, p.newCondition.trim()], newCondition: '' })); };
  const removeCondition = (c) => setPersonal(p => ({ ...p, existingConditions: p.existingConditions.filter(x => x !== c) }));
  const addMedication = () => { if (personal.newMedication.trim()) setPersonal(p => ({ ...p, currentMedications: [...p.currentMedications, p.newMedication.trim()], newMedication: '' })); };
  const removeMedication = (m) => setPersonal(p => ({ ...p, currentMedications: p.currentMedications.filter(x => x !== m) }));

  const getLabels = (ids) => ids.map(id => symptomsList.find(s => s.id === id) ? (isTr ? symptomsList.find(s => s.id === id).tr : symptomsList.find(s => s.id === id).en) : id);

  const assess = async () => {
    setLoading(true); setAssessment(null); setError(null);
    try {
      const labels = getLabels(selected);
      const body = {
        symptoms: labels, language,
        age: personal.age ? parseInt(personal.age) : null,
        weight: personal.weight ? parseFloat(personal.weight) : null,
        height: personal.height ? parseFloat(personal.height) : null,
        existing_conditions: personal.existingConditions,
        current_medications: personal.currentMedications,
      };
      const r = await fetch(`${API_BASE_URL}/api/v1/emergency-assessment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setAssessment(await r.json());
    } catch (err) {
      setError(t.errorFallback);
      const hasCrit = selected.some(s => ['breathing', 'confusion', 'rapid_heartbeat'].includes(s));
      const risks = [];
      if (personal.age > 60) risks.push(isTr ? 'İleri yaş' : 'Senior age');
      if (personal.existingConditions.length) risks.push(isTr ? 'Mevcut hastalıklar' : 'Existing conditions');
      setAssessment({
        assessment: hasCrit ? (isTr ? 'ACİL: Hemen tıbbi yardım gerekebilir.' : 'URGENT: Immediate medical attention may be required.') : (isTr ? `${selected.length} belirti tespit edildi. Yakından izleyin.` : `${selected.length} symptom(s) detected. Monitor closely.`),
        urgency_level: hasCrit ? 'critical' : 'medium',
        recommendations: hasCrit ? (isTr ? ['Acil bakım arayın', '911/112 arayın', 'Araç kullanmayın'] : ['Seek emergency care', 'Call 911/112', 'Do not drive']) : (isTr ? ['En kısa sürede doktora gidin', 'Belirtileri izleyin', 'Sıvı tüketin'] : ['See doctor soon', 'Monitor symptoms', 'Stay hydrated']),
        risk_factors: risks.length ? risks : [isTr ? 'Birden fazla belirti' : 'Multiple symptoms'],
        next_steps: hasCrit ? (isTr ? ['Hemen acili arayın'] : ['Call emergency now']) : (isTr ? ['İzleyin', '24 saat içinde kontrol'] : ['Monitor', 'Follow up in 24h']),
      });
    } finally { setLoading(false); }
  };

  const urgencyMap = {
    critical: { bg: 'bg-red-500/[0.06]', border: 'border-red-500/20', badge: 'bg-red-500/20 text-red-400', title: t.criticalTitle },
    high: { bg: 'bg-red-500/[0.06]', border: 'border-red-500/20', badge: 'bg-red-500/20 text-red-400', title: t.highTitle },
    medium: { bg: 'bg-amber-500/[0.06]', border: 'border-amber-500/20', badge: 'bg-amber-500/20 text-amber-400', title: t.mediumTitle },
    low: { bg: 'bg-cyan-500/[0.06]', border: 'border-cyan-500/20', badge: 'bg-cyan-500/20 text-cyan-400', title: t.lowTitle },
  };

  const hasCriticalSelected = selected.some(id => symptoms.find(s => s.id === id)?.critical);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-32 pb-16">
      <div className="text-center mb-14 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-full px-5 py-2 mb-5">
          <Shield className="w-4 h-4 text-red-400" />
          <span className="text-[11px] font-extrabold text-red-400 uppercase tracking-[0.15em]">{t.badge}</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-3 tracking-tight">{t.title}</h1>
        <p className="text-gray-500 max-w-md mx-auto">{t.subtitle}</p>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-4 p-5 mb-8 rounded-xl bg-amber-500/[0.06] border border-amber-500/20 text-amber-300 text-sm animate-fade-in-up">
        <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
        <p>{t.warning}</p>
      </div>

      {error && <div className="flex items-center gap-3 p-4 mb-8 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm animate-fade-in-up"><AlertTriangle className="w-5 h-5 shrink-0" />{error}</div>}

      {/* Symptoms */}
      <div className="gradient-border mb-6 animate-fade-in-up">
        <div className="card p-7 rounded-[1.25rem]">
          <h2 className="font-bold text-white text-lg mb-5">{t.selectSymptoms}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {symptoms.map((s) => {
              const on = selected.includes(s.id);
              return (
                <button key={s.id} onClick={() => toggle(s.id)}
                  className={`flex items-center gap-3 p-4 rounded-xl border text-left text-sm transition-all duration-300
                    ${on
                      ? s.critical ? 'border-red-500/30 bg-red-500/[0.08] text-red-300' : 'border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-300'
                      : 'border-white/[0.05] bg-white/[0.02] text-gray-400 hover:bg-white/[0.04] hover:text-gray-300'}`}>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0
                    ${on ? s.critical ? 'border-red-400 bg-red-500' : 'border-emerald-400 bg-emerald-500' : 'border-gray-600'}`}>
                    {on && <CheckCircle className="w-3 h-3 text-white" />}
                  </div>
                  <span className="flex-1">{s.label}</span>
                  {s.critical && <span className="badge bg-red-500/20 text-red-400 text-[10px]">{t.critical}</span>}
                </button>
              );
            })}
          </div>
          {selected.length > 0 && (
            <div className="mt-5 flex items-center gap-3">
              <span className={`badge ${hasCriticalSelected ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                {selected.length} {t.selected}
              </span>
              {hasCriticalSelected && <span className="text-xs text-red-400 font-bold">{t.criticalDetected}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Personal info */}
      <div className="card p-7 mb-8 animate-fade-in-up">
        <button onClick={() => setShowPersonal(!showPersonal)} className="flex items-center justify-between w-full">
          <h2 className="font-bold text-white text-lg">{t.personalInfo} <span className="text-gray-600 font-normal text-sm">{t.optional}</span></h2>
          {showPersonal ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
        </button>

        {showPersonal && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-3 gap-4">
              {[{ label: t.age, field: 'age', icon: User }, { label: t.weight, field: 'weight', icon: Weight }, { label: t.height, field: 'height', icon: Ruler }].map(({ label, field, icon: Icon }) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-gray-500 mb-2">{label}</label>
                  <div className="relative">
                    <Icon className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-600" />
                    <input type="number" value={personal[field]} onChange={updatePersonal(field)} className="input-field pl-11" />
                  </div>
                </div>
              ))}
            </div>

            {/* Conditions */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">{t.healthConditions}</label>
              <div className="flex flex-wrap gap-2 mb-2.5">
                {personal.existingConditions.map((c, i) => (
                  <span key={i} className="badge bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">{c} <button onClick={() => removeCondition(c)} className="ml-1 hover:text-white"><X className="w-3 h-3" /></button></span>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={personal.newCondition} onChange={updatePersonal('newCondition')}
                  onKeyDown={(e) => e.key === 'Enter' && addCondition()} placeholder={t.addCondition} className="input-field text-sm flex-1" />
                <button onClick={addCondition} className="btn-ghost text-xs px-3"><Plus className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Medications */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">{t.medications}</label>
              <div className="flex flex-wrap gap-2 mb-2.5">
                {personal.currentMedications.map((m, i) => (
                  <span key={i} className="badge bg-violet-500/15 text-violet-400 border border-violet-500/20">{m} <button onClick={() => removeMedication(m)} className="ml-1 hover:text-white"><X className="w-3 h-3" /></button></span>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={personal.newMedication} onChange={updatePersonal('newMedication')}
                  onKeyDown={(e) => e.key === 'Enter' && addMedication()} placeholder={t.addMedication} className="input-field text-sm flex-1" />
                <button onClick={addMedication} className="btn-ghost text-xs px-3"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Assess button */}
      <div className="text-center mb-10">
        <button onClick={assess} disabled={loading || !selected.length} className="btn-danger text-base px-10 py-4">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Stethoscope className="w-5 h-5" />}
          {loading ? t.assessing : t.getAssessment}
        </button>
      </div>

      {/* Results */}
      {assessment && (() => {
        const u = urgencyMap[assessment.urgency_level] || urgencyMap.low;
        return (
          <div className={`card p-7 ${u.bg} ${u.border} border-2 animate-fade-in-up`}>
            <div className={`flex items-center gap-3 p-5 rounded-xl ${u.badge} mb-6`}>
              <AlertTriangle className="w-7 h-7" />
              <h3 className="font-black text-xl">{u.title}</h3>
            </div>

            <p className="text-[15px] text-gray-300 leading-relaxed mb-6">{assessment.assessment}</p>

            {assessment.risk_factors?.length > 0 && (
              <div className="mb-6">
                <h4 className="font-bold text-white mb-3">{t.riskFactors}</h4>
                <ul className="space-y-2">
                  {assessment.risk_factors.map((f, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm text-gray-400"><AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />{f}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mb-6">
              <h4 className="font-bold text-white mb-3">{t.recommendations}</h4>
              <ul className="space-y-2">
                {(assessment.recommendations || []).map((r, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-gray-400">
                    {r.includes('emergency') || r.includes('911') ? <XCircle className="w-4 h-4 text-red-400 shrink-0" /> : <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            {assessment.next_steps?.length > 0 && (
              <div className="mb-6">
                <h4 className="font-bold text-white mb-3">{t.nextSteps}</h4>
                <ul className="space-y-2">
                  {assessment.next_steps.map((s, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm text-gray-400"><CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {['critical', 'high'].includes(assessment.urgency_level) && (
              <div className="flex items-center gap-3 p-5 rounded-xl bg-red-500/15 border border-red-500/25 text-red-300 text-sm font-bold mt-2">
                <Phone className="w-5 h-5" /> {t.callNow}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};

export default EmergencyCheck;
