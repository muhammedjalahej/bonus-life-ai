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

  const symptoms = [
    { id: 'extreme_thirst', label: 'Extreme thirst', critical: false },
    { id: 'frequent_urination', label: 'Frequent urination', critical: false },
    { id: 'blurred_vision', label: 'Blurred vision', critical: false },
    { id: 'fatigue', label: 'Extreme fatigue', critical: false },
    { id: 'weight_loss', label: 'Unexplained weight loss', critical: false },
    { id: 'nausea', label: 'Nausea or vomiting', critical: false },
    { id: 'confusion', label: 'Confusion', critical: true },
    { id: 'breathing', label: 'Difficulty breathing', critical: true },
    { id: 'abdominal_pain', label: 'Abdominal pain', critical: false },
    { id: 'fruity_breath', label: 'Fruity-smelling breath', critical: false },
    { id: 'dizziness', label: 'Dizziness', critical: false },
    { id: 'rapid_heartbeat', label: 'Rapid heartbeat', critical: true },
  ];

  const toggle = (id) => setSelected(p => p.includes(id) ? p.filter(s => s !== id) : [...p, id]);
  const updatePersonal = (f) => (e) => setPersonal(p => ({ ...p, [f]: e.target.value }));

  const addCondition = () => { if (personal.newCondition.trim()) setPersonal(p => ({ ...p, existingConditions: [...p.existingConditions, p.newCondition.trim()], newCondition: '' })); };
  const removeCondition = (c) => setPersonal(p => ({ ...p, existingConditions: p.existingConditions.filter(x => x !== c) }));
  const addMedication = () => { if (personal.newMedication.trim()) setPersonal(p => ({ ...p, currentMedications: [...p.currentMedications, p.newMedication.trim()], newMedication: '' })); };
  const removeMedication = (m) => setPersonal(p => ({ ...p, currentMedications: p.currentMedications.filter(x => x !== m) }));

  const getLabels = (ids) => ids.map(id => symptoms.find(s => s.id === id)?.label || id);

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
      setError('Assessment failed. Using fallback.');
      const hasCrit = selected.some(s => ['breathing', 'confusion', 'rapid_heartbeat'].includes(s));
      const risks = [];
      if (personal.age > 60) risks.push('Senior age');
      if (personal.existingConditions.length) risks.push('Existing conditions');
      setAssessment({
        assessment: hasCrit ? 'URGENT: Immediate medical attention may be required.' : `${selected.length} symptom(s) detected. Monitor closely.`,
        urgency_level: hasCrit ? 'critical' : 'medium',
        recommendations: hasCrit ? ['Seek emergency care', 'Call 911/112', 'Do not drive'] : ['See doctor soon', 'Monitor symptoms', 'Stay hydrated'],
        risk_factors: risks.length ? risks : ['Multiple symptoms'],
        next_steps: hasCrit ? ['Call emergency now'] : ['Monitor', 'Follow up in 24h'],
      });
    } finally { setLoading(false); }
  };

  const urgencyMap = {
    critical: { bg: 'bg-red-500/[0.06]', border: 'border-red-500/20', badge: 'bg-red-500/20 text-red-400', title: 'CRITICAL -- Emergency' },
    high: { bg: 'bg-red-500/[0.06]', border: 'border-red-500/20', badge: 'bg-red-500/20 text-red-400', title: 'HIGH -- Urgent' },
    medium: { bg: 'bg-amber-500/[0.06]', border: 'border-amber-500/20', badge: 'bg-amber-500/20 text-amber-400', title: 'Monitor Closely' },
    low: { bg: 'bg-cyan-500/[0.06]', border: 'border-cyan-500/20', badge: 'bg-cyan-500/20 text-cyan-400', title: 'Continue Monitoring' },
  };

  const hasCriticalSelected = selected.some(id => symptoms.find(s => s.id === id)?.critical);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-32 pb-16">
      <div className="text-center mb-14 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-full px-5 py-2 mb-5">
          <Shield className="w-4 h-4 text-red-400" />
          <span className="text-[11px] font-extrabold text-red-400 uppercase tracking-[0.15em]">Emergency Tool</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-3 tracking-tight">Symptom Checker</h1>
        <p className="text-gray-500 max-w-md mx-auto">AI-powered emergency symptom assessment with urgency scoring.</p>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-4 p-5 mb-8 rounded-xl bg-amber-500/[0.06] border border-amber-500/20 text-amber-300 text-sm animate-fade-in-up">
        <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
        <p><strong>Important:</strong> This is informational only. In emergencies, call 911/112 immediately.</p>
      </div>

      {error && <div className="flex items-center gap-3 p-4 mb-8 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm animate-fade-in-up"><AlertTriangle className="w-5 h-5 shrink-0" />{error}</div>}

      {/* Symptoms */}
      <div className="gradient-border mb-6 animate-fade-in-up">
        <div className="card p-7 rounded-[1.25rem]">
          <h2 className="font-bold text-white text-lg mb-5">Select your symptoms</h2>
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
                  {s.critical && <span className="badge bg-red-500/20 text-red-400 text-[10px]">Critical</span>}
                </button>
              );
            })}
          </div>
          {selected.length > 0 && (
            <div className="mt-5 flex items-center gap-3">
              <span className={`badge ${hasCriticalSelected ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                {selected.length} selected
              </span>
              {hasCriticalSelected && <span className="text-xs text-red-400 font-bold">Critical symptom(s) detected</span>}
            </div>
          )}
        </div>
      </div>

      {/* Personal info */}
      <div className="card p-7 mb-8 animate-fade-in-up">
        <button onClick={() => setShowPersonal(!showPersonal)} className="flex items-center justify-between w-full">
          <h2 className="font-bold text-white text-lg">Personal Info <span className="text-gray-600 font-normal text-sm">(Optional)</span></h2>
          {showPersonal ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
        </button>

        {showPersonal && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-3 gap-4">
              {[{ label: 'Age', field: 'age', icon: User }, { label: 'Weight (kg)', field: 'weight', icon: Weight }, { label: 'Height (cm)', field: 'height', icon: Ruler }].map(({ label, field, icon: Icon }) => (
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
              <label className="block text-xs font-semibold text-gray-500 mb-2">Health Conditions</label>
              <div className="flex flex-wrap gap-2 mb-2.5">
                {personal.existingConditions.map((c, i) => (
                  <span key={i} className="badge bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">{c} <button onClick={() => removeCondition(c)} className="ml-1 hover:text-white"><X className="w-3 h-3" /></button></span>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={personal.newCondition} onChange={updatePersonal('newCondition')}
                  onKeyDown={(e) => e.key === 'Enter' && addCondition()} placeholder="Add condition" className="input-field text-sm flex-1" />
                <button onClick={addCondition} className="btn-ghost text-xs px-3"><Plus className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Medications */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">Medications</label>
              <div className="flex flex-wrap gap-2 mb-2.5">
                {personal.currentMedications.map((m, i) => (
                  <span key={i} className="badge bg-violet-500/15 text-violet-400 border border-violet-500/20">{m} <button onClick={() => removeMedication(m)} className="ml-1 hover:text-white"><X className="w-3 h-3" /></button></span>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={personal.newMedication} onChange={updatePersonal('newMedication')}
                  onKeyDown={(e) => e.key === 'Enter' && addMedication()} placeholder="Add medication" className="input-field text-sm flex-1" />
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
          {loading ? 'Assessing...' : 'Get Assessment'}
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
                <h4 className="font-bold text-white mb-3">Risk Factors</h4>
                <ul className="space-y-2">
                  {assessment.risk_factors.map((f, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm text-gray-400"><AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />{f}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mb-6">
              <h4 className="font-bold text-white mb-3">Recommendations</h4>
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
                <h4 className="font-bold text-white mb-3">Next Steps</h4>
                <ul className="space-y-2">
                  {assessment.next_steps.map((s, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm text-gray-400"><CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {['critical', 'high'].includes(assessment.urgency_level) && (
              <div className="flex items-center gap-3 p-5 rounded-xl bg-red-500/15 border border-red-500/25 text-red-300 text-sm font-bold mt-2">
                <Phone className="w-5 h-5" /> Call 911/112 or go to nearest hospital NOW
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};

export default EmergencyCheck;
