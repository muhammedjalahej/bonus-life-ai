import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Stethoscope, Loader2, MapPin, Activity } from 'lucide-react';
import { ROUTES } from '../config/constants';
import { symptomCheckerPredict } from '../services/api';

export default function SymptomChecker({ language = 'english' }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fever: '', cough: '', fatigue: '', difficultyBreathing: '',
    age: '', gender: '', bloodPressure: '', cholesterol: '',
  });
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isTr = language === 'turkish';
  const t = isTr ? {
    badge: 'Araç', title: 'Belirti Kontrolü', subtitle: 'Belirti ve profil bilgilerinize göre olası durum gruplarını görün.',
    warning: 'Bu yalnızca bilgilendirme amaçlıdır. Teşhis için mutlaka bir sağlık uzmanına başvurun. Acil durumlarda 911/112 arayın.',
    fever: 'Ateş', cough: 'Öksürük', fatigue: 'Yorgunluk', difficultyBreathing: 'Nefes almada zorluk',
    age: 'Yaş', gender: 'Cinsiyet', bloodPressure: 'Kan basıncı', cholesterol: 'Kolesterol',
    yes: 'Evet', no: 'Hayır', male: 'Erkek', female: 'Kadın', high: 'Yüksek', normal: 'Normal',
    getPrediction: 'Tahmin Al', predicting: 'Tahmin ediliyor...', results: 'Olası durum grupları', probability: 'Olasılık',
    possibleConditions: 'Olası hastalıklar', findHospitals: 'Yakındaki hastaneleri bul',
    errorGeneric: 'Tahmin alınamadı. Lütfen tekrar deneyin.', fillAll: 'Lütfen tüm alanları doldurun.',
  } : {
    badge: 'Tool', title: 'Symptom Checker', subtitle: 'See possible condition groups based on your symptoms and profile.',
    warning: 'This is for information only. Always see a healthcare provider for diagnosis. In emergencies, call 911/112.',
    fever: 'Fever', cough: 'Cough', fatigue: 'Fatigue', difficultyBreathing: 'Difficulty breathing',
    age: 'Age', gender: 'Gender', bloodPressure: 'Blood pressure', cholesterol: 'Cholesterol',
    yes: 'Yes', no: 'No', male: 'Male', female: 'Female', high: 'High', normal: 'Normal',
    getPrediction: 'Get prediction', predicting: 'Predicting...', results: 'Possible condition groups', probability: 'Probability',
    possibleConditions: 'Possible conditions', findHospitals: 'Find nearby hospitals',
    errorGeneric: 'Could not get prediction. Please try again.', fillAll: 'Please fill in all fields.',
  };

  const update = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { fever, cough, fatigue, difficultyBreathing, age, gender, bloodPressure, cholesterol } = form;
    if ([fever, cough, fatigue, difficultyBreathing, age, gender, bloodPressure, cholesterol].some((v) => v === '')) {
      setError(t.fillAll);
      return;
    }
    setError(null);
    setPredictions(null);
    setLoading(true);
    try {
      const result = await symptomCheckerPredict({
        fever: parseInt(fever, 10), cough: parseInt(cough, 10), fatigue: parseInt(fatigue, 10),
        difficultyBreathing: parseInt(difficultyBreathing, 10), age: parseFloat(age), gender: parseInt(gender, 10),
        bloodPressure: parseInt(bloodPressure, 10), cholesterol: parseInt(cholesterol, 10),
      });
      setPredictions(result.predictions || []);
    } catch (err) {
      setError(err?.message || t.errorGeneric);
      setPredictions(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-32 pb-16">
      <div className="text-center mb-14 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-5 py-2 mb-5">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-[0.15em]">{t.badge}</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-3 tracking-tight">{t.title}</h1>
        <p className="text-gray-500 max-w-md mx-auto">{t.subtitle}</p>
      </div>
      <div className="flex items-start gap-4 p-5 mb-8 rounded-xl bg-red-500/[0.08] border border-red-500/25 text-red-200 text-sm animate-fade-in-up">
        <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
        <p className="flex-1">{t.warning}</p>
      </div>
      {error && (
        <div className="flex items-center gap-3 p-4 mb-8 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm animate-fade-in-up">
          <AlertTriangle className="w-5 h-5 shrink-0" />{error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="gradient-border mb-6 animate-fade-in-up">
        <div className="card p-7 rounded-[1.25rem]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h2 className="font-bold text-white text-lg mb-4">{isTr ? 'Belirtiler' : 'Symptoms'}</h2>
              <div className="space-y-4">
                {['fever', 'cough', 'fatigue', 'difficultyBreathing'].map((f) => (
                  <div key={f}>
                    <label className="block text-xs font-semibold text-gray-500 mb-2">{t[f]}</label>
                    <select value={form[f]} onChange={update(f)} required className="select-field w-full">
                      <option value="">{isTr ? 'Seçiniz' : 'Select'}</option>
                      <option value="1">{t.yes}</option>
                      <option value="0">{t.no}</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="font-bold text-white text-lg mb-4">{isTr ? 'Profil' : 'Profile'}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2">{t.age}</label>
                  <input type="number" min={0} max={120} value={form.age} onChange={update('age')} required className="input-field w-full" placeholder="e.g. 35" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2">{t.gender}</label>
                  <select value={form.gender} onChange={update('gender')} required className="select-field w-full">
                    <option value="">{isTr ? 'Seçiniz' : 'Select'}</option>
                    <option value="1">{t.male}</option>
                    <option value="0">{t.female}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2">{t.bloodPressure}</label>
                  <select value={form.bloodPressure} onChange={update('bloodPressure')} required className="select-field w-full">
                    <option value="">{isTr ? 'Seçiniz' : 'Select'}</option>
                    <option value="1">{t.high}</option>
                    <option value="0">{t.normal}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2">{t.cholesterol}</label>
                  <select value={form.cholesterol} onChange={update('cholesterol')} required className="select-field w-full">
                    <option value="">{isTr ? 'Seçiniz' : 'Select'}</option>
                    <option value="1">{t.high}</option>
                    <option value="0">{t.normal}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 text-center">
            <button type="submit" disabled={loading} className="btn-primary text-base px-10 py-4 inline-flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Stethoscope className="w-5 h-5" />}
              {loading ? t.predicting : t.getPrediction}
            </button>
          </div>
        </div>
      </form>
      {predictions && predictions.length > 0 && (
        <div className="card p-7 rounded-[1.25rem] bg-emerald-500/[0.06] border border-emerald-500/20 animate-fade-in-up">
          <h3 className="font-bold text-white text-lg mb-5 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" /> {t.results}
          </h3>
          <div className="space-y-4">
            {predictions.map((p, i) => (
              <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium text-white">{p.disease}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-24 h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${Math.round((p.probability || 0) * 100)}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-emerald-400 w-12 text-right">{(p.probability * 100).toFixed(1)}%</span>
                  </div>
                </div>
                {Array.isArray(p.disease_examples ?? p.diseaseExamples) && (p.disease_examples ?? p.diseaseExamples).length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    <span className="text-gray-500">{t.possibleConditions}: </span>
                    {(p.disease_examples ?? p.diseaseExamples).join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-4">{t.warning}</p>
          <div className="mt-5">
            <button type="button" onClick={() => navigate(ROUTES.HOSPITALS)} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-emerald-400 hover:border-emerald-500/30 text-sm font-medium transition-colors">
              <MapPin className="w-4 h-4 shrink-0" /> {t.findHospitals}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
