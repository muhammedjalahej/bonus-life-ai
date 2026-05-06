import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  AlertTriangle, CheckCircle, Loader2, Activity, Target, Stethoscope, RotateCcw, Sparkles, LayoutDashboard, Droplets, ArrowLeft,
} from 'lucide-react';
import * as apiService from '../services/api';
import { haptic } from '../utils/haptics';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../config/constants';
import { LiquidMetalButton } from '../components/ui/LiquidMetalButton';
import { VOICE_FILL_EVENT, VOICE_CLEAR_FIELD_EVENT, VOICE_FORM_NEXT_EVENT } from '../components/VoiceAgent';
import { NumberField as _NumberField } from '../components/ui/NumberField';
const FormField = (props) => <_NumberField {...props} accentColor="violet" />;

function ToggleField({ label, value, onChange, options = [['0', 'No'], ['1', 'Yes']], hint }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-300">{label}</label>
      <div className="flex gap-2">
        {options.map(([val, display]) => (
          <button
            key={val}
            type="button"
            onClick={() => onChange(val)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition ${
              value === val
                ? 'border-violet-500/50 bg-violet-500/[0.07] text-violet-300/80'
                : 'border-white/10 bg-white/[0.03] text-gray-400 hover:border-white/20'
            }`}
          >
            {display}
          </button>
        ))}
      </div>
      {hint && <p className="text-[11px] text-gray-600">{hint}</p>}
    </div>
  );
}

function SectionHeader({ title, icon: Icon }) {
  return (
    <div className="col-span-full flex items-center gap-3 pt-2 pb-1 border-b border-white/5 mb-1">
      {Icon && <Icon className="w-4 h-4 text-violet-300/60" />}
      <span className="text-xs font-bold uppercase tracking-widest text-violet-300/50">{title}</span>
    </div>
  );
}

const DEFAULT_FORM = {
  age: '', blood_pressure: '',
  specific_gravity: '1.02', albumin: '0', sugar: '0',
  red_blood_cells: '0', pus_cell: '0', pus_cell_clumps: '0', bacteria: '0',
  blood_glucose_random: '120', blood_urea: '25', serum_creatinine: '1.0',
  sodium: '140', potassium: '4.5', hemoglobin: '', packed_cell_volume: '',
  white_blood_cell_count: '7800', red_blood_cell_count: '',
  hypertension: '0', diabetes_mellitus: '0', coronary_artery_disease: '0',
  appetite: '1', pedal_edema: '0', anemia: '0',
};

const CKDTest = ({ language = 'english' }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isTr = language === 'turkish';

  // Voice agent: fill fields
  useEffect(() => {
    const allowed = ['age', 'blood_pressure', 'blood_glucose_random', 'blood_urea', 'serum_creatinine', 'sodium', 'potassium', 'hemoglobin', 'packed_cell_volume', 'white_blood_cell_count', 'red_blood_cell_count'];
    const handler = (e) => {
      const { field, value } = e.detail || {};
      if (field && allowed.includes(field) && value != null)
        setFormData((prev) => ({ ...prev, [field]: String(value) }));
    };
    window.addEventListener(VOICE_FILL_EVENT, handler);
    return () => window.removeEventListener(VOICE_FILL_EVENT, handler);
  }, []);

  useEffect(() => {
    const allowed = ['age', 'blood_pressure', 'blood_glucose_random', 'blood_urea', 'serum_creatinine', 'sodium', 'potassium', 'hemoglobin', 'packed_cell_volume', 'white_blood_cell_count', 'red_blood_cell_count'];
    const handler = (e) => {
      const { field } = e.detail || {};
      if (field && allowed.includes(field))
        setFormData((prev) => ({ ...prev, [field]: '' }));
    };
    window.addEventListener(VOICE_CLEAR_FIELD_EVENT, handler);
    return () => window.removeEventListener(VOICE_CLEAR_FIELD_EVENT, handler);
  }, []);

  const handleSubmitRef = useRef(() => {});

  const set = (key) => (e) => setFormData((p) => ({ ...p, [key]: e.target.value }));
  const setToggle = (key) => (val) => setFormData((p) => ({ ...p, [key]: val }));

  const num = (v, def) => (v === '' || v == null ? def : parseFloat(String(v).replace(',', '.')));
  const int = (v, def) => (v === '' || v == null ? def : parseInt(String(v), 10));

  const handleSubmit = async () => {
    setError('');
    const required = ['age', 'blood_pressure', 'hemoglobin', 'packed_cell_volume', 'red_blood_cell_count'];
    for (const k of required) {
      if (formData[k] === '' || formData[k] == null) {
        setError(isTr ? 'Lütfen zorunlu alanları doldurun.' : 'Please fill all required fields (marked with *).');
        return;
      }
    }
    const payload = {
      age: num(formData.age, 0),
      blood_pressure: num(formData.blood_pressure, 80),
      specific_gravity: num(formData.specific_gravity, 1.02),
      albumin: int(formData.albumin, 0),
      sugar: int(formData.sugar, 0),
      red_blood_cells: int(formData.red_blood_cells, 0),
      pus_cell: int(formData.pus_cell, 0),
      pus_cell_clumps: int(formData.pus_cell_clumps, 0),
      bacteria: int(formData.bacteria, 0),
      blood_glucose_random: num(formData.blood_glucose_random, 120),
      blood_urea: num(formData.blood_urea, 25),
      serum_creatinine: num(formData.serum_creatinine, 1.0),
      sodium: num(formData.sodium, 140),
      potassium: num(formData.potassium, 4.5),
      hemoglobin: num(formData.hemoglobin, 13),
      packed_cell_volume: num(formData.packed_cell_volume, 40),
      white_blood_cell_count: num(formData.white_blood_cell_count, 7800),
      red_blood_cell_count: num(formData.red_blood_cell_count, 5),
      hypertension: int(formData.hypertension, 0),
      diabetes_mellitus: int(formData.diabetes_mellitus, 0),
      coronary_artery_disease: int(formData.coronary_artery_disease, 0),
      appetite: int(formData.appetite, 1),
      pedal_edema: int(formData.pedal_edema, 0),
      anemia: int(formData.anemia, 0),
      language,
    };

    setLoading(true);
    setSubmitted(true);
    try {
      const data = await apiService.runCKDAssessment(payload);
      haptic('success');
      setResult(data);
    } catch (err) {
      setError(err.message || 'Request failed');
      setSubmitted(false);
    } finally {
      setLoading(false);
    }
  };

  handleSubmitRef.current = handleSubmit;

  useEffect(() => {
    const onNext = () => { if (!result && !loading) handleSubmitRef.current(); };
    window.addEventListener(VOICE_FORM_NEXT_EVENT, onNext);
    return () => window.removeEventListener(VOICE_FORM_NEXT_EVENT, onNext);
  }, [result, loading]);

  const handleNewTest = () => {
    setResult(null); setError(''); setSubmitted(false);
    setFormData(DEFAULT_FORM);
  };

  const prediction = result?.prediction || '';
  const confidence = ((result?.confidence ?? 0) * 100).toFixed(1);
  const factors = result?.risk_analysis?.key_factors || [];
  const recs = result?.recommendations || {};
  const isCKD = prediction === 'CKD';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-32 pb-16">
      {/* Back to Dashboard */}
      <button onClick={() => navigate(ROUTES.DASHBOARD)}
        className="flex items-center gap-2 mb-8 text-sm text-white/70 hover:text-white transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Dashboard
      </button>

      <div className="text-center mb-10 animate-fade-in-up">
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-3 tracking-tight">
          {isTr ? 'Kronik Böbrek Hastalığı Testi' : 'Chronic Kidney Disease Assessment'}
        </h1>
        <p className="text-gray-500 max-w-md mx-auto">
          {isTr
            ? 'Klinik değerlerinizi girin; YZ destekli CKD risk analizi alın.'
            : 'Enter your clinical values for AI-powered CKD risk analysis using 24 biomarkers.'}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" /> {error}
        </div>
      )}

      <div className="gradient-border animate-fade-in-up">
        <div className="card p-8 sm:p-10 rounded-[1.25rem]">
          {!submitted || !result ? (
            <>
              <div className="mb-8">
                <h2 className="text-xl font-bold text-white">
                  {isTr ? 'Kronik Böbrek Hastalığı Değerlendirmesi' : 'CKD Risk Assessment'}
                </h2>
              </div>

              {loading ? (
                <div className="flex flex-col items-center py-24 gap-6">
                  <Loader2 className="w-12 h-12 text-violet-400 animate-spin" />
                  <p className="text-gray-400 font-medium">{isTr ? 'Analiz ediliyor...' : 'Analyzing...'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                  {/* ── Patient Info ── */}
                  <SectionHeader title={isTr ? 'Hasta Bilgisi' : 'Patient Info'} icon={Activity} />
                  <FormField label={isTr ? 'Yaş' : 'Age'} value={formData.age} onChange={set('age')} required placeholder="e.g. 48" hint="years" />
                  <FormField label={isTr ? 'Kan Basıncı (mmHg)' : 'Blood Pressure (mmHg)'} value={formData.blood_pressure} onChange={set('blood_pressure')} required placeholder="e.g. 80" hint="diastolic mmHg" />

                  {/* ── Urine Tests ── */}
                  <SectionHeader title={isTr ? 'İdrar Testleri' : 'Urine Tests'} icon={Droplets} />
                  <FormField label={isTr ? 'Spesifik Ağırlık' : 'Specific Gravity'} value={formData.specific_gravity} onChange={set('specific_gravity')} placeholder="1.02" hint="1.000 – 1.030" />
                  <FormField label={isTr ? 'Albumin (0–5)' : 'Albumin (0–5)'} value={formData.albumin} onChange={set('albumin')} placeholder="0" hint="0=none, 5=severe" />
                  <FormField label={isTr ? 'Şeker (0–5)' : 'Sugar (0–5)'} value={formData.sugar} onChange={set('sugar')} placeholder="0" />
                  <ToggleField label={isTr ? 'Kırmızı Kan Hücreleri' : 'Red Blood Cells (urine)'} value={formData.red_blood_cells} onChange={setToggle('red_blood_cells')} options={[['0', isTr ? 'Normal' : 'Normal'], ['1', isTr ? 'Anormal' : 'Abnormal']]} />
                  <ToggleField label={isTr ? 'Pü Hücresi' : 'Pus Cell'} value={formData.pus_cell} onChange={setToggle('pus_cell')} options={[['0', isTr ? 'Normal' : 'Normal'], ['1', isTr ? 'Anormal' : 'Abnormal']]} />
                  <ToggleField label={isTr ? 'Pü Hücresi Kümeleri' : 'Pus Cell Clumps'} value={formData.pus_cell_clumps} onChange={setToggle('pus_cell_clumps')} options={[['0', isTr ? 'Yok' : 'Not Present'], ['1', isTr ? 'Var' : 'Present']]} />
                  <ToggleField label={isTr ? 'Bakteri' : 'Bacteria'} value={formData.bacteria} onChange={setToggle('bacteria')} options={[['0', isTr ? 'Yok' : 'Not Present'], ['1', isTr ? 'Var' : 'Present']]} />

                  {/* ── Blood Tests ── */}
                  <SectionHeader title={isTr ? 'Kan Testleri' : 'Blood Tests'} icon={Activity} />
                  <FormField label={isTr ? 'Rastgele Kan Şekeri (mg/dL)' : 'Blood Glucose Random (mg/dL)'} value={formData.blood_glucose_random} onChange={set('blood_glucose_random')} placeholder="121" hint="50–500 mg/dL" />
                  <FormField label={isTr ? 'Kan Üresi (mg/dL)' : 'Blood Urea (mg/dL)'} value={formData.blood_urea} onChange={set('blood_urea')} placeholder="36" hint="5–200 mg/dL" />
                  <FormField label={isTr ? 'Serum Kreatinin (mg/dL)' : 'Serum Creatinine (mg/dL)'} value={formData.serum_creatinine} onChange={set('serum_creatinine')} placeholder="1.2" hint="0.1–20 mg/dL" />
                  <FormField label={isTr ? 'Sodyum (mEq/L)' : 'Sodium (mEq/L)'} value={formData.sodium} onChange={set('sodium')} placeholder="140" hint="100–160 mEq/L" />
                  <FormField label={isTr ? 'Potasyum (mEq/L)' : 'Potassium (mEq/L)'} value={formData.potassium} onChange={set('potassium')} placeholder="4.5" hint="2.0–10.0 mEq/L" />
                  <FormField label={isTr ? 'Hemoglobin (g/dL)' : 'Hemoglobin (g/dL)'} value={formData.hemoglobin} onChange={set('hemoglobin')} required placeholder="e.g. 15.4" hint="3–20 g/dL" />
                  <FormField label={isTr ? 'Hematokrit (%)' : 'Packed Cell Volume (%)'} value={formData.packed_cell_volume} onChange={set('packed_cell_volume')} required placeholder="e.g. 44" hint="10–60 %" />
                  <FormField label={isTr ? 'Beyaz Kan Hücresi (/mm³)' : 'White Blood Cell Count (/mm³)'} value={formData.white_blood_cell_count} onChange={set('white_blood_cell_count')} placeholder="7800" hint="2000–30000" />
                  <FormField label={isTr ? 'Kırmızı Kan Hücresi Sayısı (M/mm³)' : 'Red Blood Cell Count (M/mm³)'} value={formData.red_blood_cell_count} onChange={set('red_blood_cell_count')} required placeholder="e.g. 5.2" hint="1.0–8.0 M/mm³" />

                  {/* ── Medical History ── */}
                  <SectionHeader title={isTr ? 'Tıbbi Geçmiş' : 'Medical History'} icon={Stethoscope} />
                  <ToggleField label={isTr ? 'Hipertansiyon' : 'Hypertension'} value={formData.hypertension} onChange={setToggle('hypertension')} options={[['0', isTr ? 'Hayır' : 'No'], ['1', isTr ? 'Evet' : 'Yes']]} />
                  <ToggleField label={isTr ? 'Diyabet' : 'Diabetes Mellitus'} value={formData.diabetes_mellitus} onChange={setToggle('diabetes_mellitus')} options={[['0', isTr ? 'Hayır' : 'No'], ['1', isTr ? 'Evet' : 'Yes']]} />
                  <ToggleField label={isTr ? 'Koroner Arter Hastalığı' : 'Coronary Artery Disease'} value={formData.coronary_artery_disease} onChange={setToggle('coronary_artery_disease')} options={[['0', isTr ? 'Hayır' : 'No'], ['1', isTr ? 'Evet' : 'Yes']]} />
                  <ToggleField label={isTr ? 'İştah' : 'Appetite'} value={formData.appetite} onChange={setToggle('appetite')} options={[['0', isTr ? 'Zayıf' : 'Poor'], ['1', isTr ? 'İyi' : 'Good']]} />
                  <ToggleField label={isTr ? 'Pedalada Ödem' : 'Pedal Edema'} value={formData.pedal_edema} onChange={setToggle('pedal_edema')} options={[['0', isTr ? 'Hayır' : 'No'], ['1', isTr ? 'Evet' : 'Yes']]} />
                  <ToggleField label={isTr ? 'Anemi' : 'Anemia'} value={formData.anemia} onChange={setToggle('anemia')} options={[['0', isTr ? 'Hayır' : 'No'], ['1', isTr ? 'Evet' : 'Yes']]} />
                </div>
              )}

              {!loading && (
                <div className="mt-8 flex gap-4">
                  <LiquidMetalButton onClick={handleSubmit} disabled={loading} width={200}>
                    <Activity className="w-4 h-4" />
                    {isTr ? 'Analiz Yap' : 'Run CKD Analysis'}
                  </LiquidMetalButton>
                </div>
              )}
            </>
          ) : (
            <>
              {loading ? (
                <div className="flex flex-col items-center py-24 gap-6">
                  <Loader2 className="w-12 h-12 text-violet-400 animate-spin" />
                  <p className="text-gray-400 font-medium">{isTr ? 'Analiz ediliyor...' : 'Analyzing...'}</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {result?.executive_summary && (
                    <div className="gradient-border">
                      <div className="card p-6 rounded-[1.25rem] bg-white/[0.02]">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-violet-500/[0.07] flex items-center justify-center shrink-0">
                            <Stethoscope className="w-5 h-5 text-violet-300/70" />
                          </div>
                          <div>
                            <h3 className="font-bold text-white mb-2 text-lg">{isTr ? 'Özet' : 'Summary'}</h3>
                            <div className="text-sm text-gray-400 leading-relaxed">
                              <ReactMarkdown components={{ p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>, strong: ({ children }) => <strong className="font-semibold text-gray-200">{children}</strong> }}>
                                {result.executive_summary}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`card p-7 border-2 ${isCKD ? 'border-red-500/20 bg-red-500/[0.04]' : 'border-violet-500/20 bg-violet-500/[0.04]'}`}>
                      <Target className={`w-6 h-6 mb-4 ${isCKD ? 'text-red-400' : 'text-violet-400'}`} />
                      <div className={`text-5xl font-black mb-2 ${isCKD ? 'text-red-400' : 'text-violet-400'}`}>{confidence}%</div>
                      <div className={`text-xl font-bold mb-3 ${isCKD ? 'text-red-300' : 'text-violet-300'}`}>{prediction}</div>
                      <p className="text-xs text-gray-500">{isTr ? 'Model güven skoru' : 'Model confidence score'}</p>
                    </div>

                    <div className="card p-7">
                      <h3 className="font-bold text-white mb-4 text-lg">{isTr ? 'Risk Faktörleri' : 'Key Risk Factors'}</h3>
                      {factors.length > 0 ? (
                        <ul className="space-y-3">
                          {factors.map((f, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <span className={`badge mt-0.5 ${(f.severity || '').toLowerCase().includes('high') ? 'bg-red-500/20 text-red-400' : (f.severity || '').toLowerCase().includes('moderate') ? 'bg-amber-500/20 text-amber-400' : 'bg-violet-500/[0.12] text-violet-300/80'}`}>
                                {f.severity || 'Info'}
                              </span>
                              <span className="text-sm text-gray-300">{f.factor}</span>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="text-sm text-gray-500">No major factors identified.</p>}
                    </div>
                  </div>

                  {recs.lifestyle_changes && recs.lifestyle_changes.length > 0 && (
                    <div className="card p-6">
                      <h3 className="font-bold text-white mb-4 text-lg">{isTr ? 'Öneriler' : 'Recommendations'}</h3>
                      <ul className="list-disc list-inside space-y-2 text-sm text-gray-400">
                        {recs.lifestyle_changes.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                      {recs.medical_followup && (
                        <p className="mt-4 text-sm text-violet-300/50 italic border-t border-white/5 pt-3">{recs.medical_followup}</p>
                      )}
                    </div>
                  )}

                  {user && (
                    <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-violet-500/[0.06] border border-violet-500/15">
                      <CheckCircle className="w-5 h-5 text-violet-400 shrink-0" />
                      <span className="text-sm text-violet-300/70">{isTr ? 'Hesabınıza kaydedildi.' : 'Saved to your account.'}</span>
                      <Link to={ROUTES.DASHBOARD} className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-300/80 hover:text-violet-300 transition">
                        <LayoutDashboard className="w-4 h-4" /> {isTr ? "Dashboard'da görüntüle" : 'View in Dashboard'}
                      </Link>
                    </div>
                  )}

                  <button type="button" onClick={handleNewTest} className="btn-secondary flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" /> {isTr ? 'Yeni Değerlendirme' : 'New Assessment'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CKDTest;
