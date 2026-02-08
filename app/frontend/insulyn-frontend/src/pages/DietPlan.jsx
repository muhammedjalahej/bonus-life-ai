import React, { useState } from 'react';
import {
  Salad, Download, Calculator, Loader2, AlertTriangle, CheckCircle,
  UtensilsCrossed, ShoppingCart, Lightbulb, BarChart3, Clock, Sparkles,
  Apple, Dumbbell,
} from 'lucide-react';
import { API_BASE_URL } from '../config/constants';

const DietPlan = ({ language = 'english' }) => {
  const [formData, setFormData] = useState({
    age: '', weight: '', height: '', gender: '', dietaryPreference: 'balanced',
    healthConditions: '', activityLevel: 'moderate', goals: 'diabetes_prevention',
    allergies: '', typicalDay: '',
  });
  const [dietPlan, setDietPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const update = (f, v) => setFormData(p => ({ ...p, [f]: v }));

  const generateDietPlan = async () => {
    setLoading(true); setError(''); setSuccess('');
    try {
      const d = { ...formData }; delete d.bmi; delete d.bmi_category;
      const r = await fetch(`${API_BASE_URL}/api/v1/diet-plan/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d),
      });
      if (!r.ok) throw new Error((await r.json()).detail || 'Failed');
      setDietPlan(await r.json()); setSuccess('Plan generated!');
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const bmi = formData.weight && formData.height ? (formData.weight / ((formData.height / 100) ** 2)).toFixed(1) : null;
  const bmiCat = bmi ? (bmi < 18.5 ? 'Underweight' : bmi <= 24.9 ? 'Normal' : bmi <= 29.9 ? 'Overweight' : 'Obese') : '';

  const calories = (() => {
    if (!formData.weight || !formData.height || !formData.age || !formData.gender || !formData.activityLevel) return null;
    const bmr = formData.gender === 'male'
      ? 88.362 + 13.397 * formData.weight + 4.799 * formData.height - 5.677 * formData.age
      : 447.593 + 9.247 * formData.weight + 3.098 * formData.height - 4.330 * formData.age;
    const mul = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
    return Math.round(bmr * (mul[formData.activityLevel] || 1.55));
  })();

  const valid = formData.age && formData.weight && formData.height && formData.gender;

  const Input = ({ label, field, type = 'text', required, hint, ...rest }) => (
    <div>
      <label className="block text-sm font-semibold text-gray-300 mb-2">
        {label} {required && <span className="text-emerald-400">*</span>}
      </label>
      <input type={type} value={formData[field]} onChange={(e) => update(field, e.target.value)}
        className="input-field" {...rest} />
      {hint && <p className="text-[11px] text-gray-600 mt-1.5">{hint}</p>}
    </div>
  );

  const Select = ({ label, field, options, required }) => (
    <div>
      <label className="block text-sm font-semibold text-gray-300 mb-2">
        {label} {required && <span className="text-emerald-400">*</span>}
      </label>
      <select value={formData[field]} onChange={(e) => update(field, e.target.value)} className="select-field">
        <option value="">Select...</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-32 pb-16">
      {/* Header */}
      <div className="text-center mb-14 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-5 py-2 mb-5">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-[11px] font-extrabold text-amber-400 uppercase tracking-[0.15em]">AI Nutrition</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-3 tracking-tight">Diet Planner</h1>
        <p className="text-gray-500 max-w-md mx-auto">Personalized AI-generated meal plans for diabetes prevention and management.</p>
      </div>

      {error && <div className="flex items-center gap-3 p-4 mb-8 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm animate-fade-in-up"><AlertTriangle className="w-5 h-5 shrink-0" />{error}</div>}
      {success && <div className="flex items-center gap-3 p-4 mb-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm animate-fade-in-up"><CheckCircle className="w-5 h-5 shrink-0" />{success}</div>}

      <div className="gradient-border animate-fade-in-up">
        <div className="card p-8 sm:p-10 rounded-[1.25rem]">
          {/* Section 1: Body Metrics */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <Calculator className="w-5 h-5 text-cyan-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Body Metrics</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <Input label="Age" field="age" type="number" required />
              <Input label="Weight (kg)" field="weight" type="number" required />
              <Input label="Height (cm)" field="height" type="number" required />
              <Select label="Gender" field="gender" required options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} />
            </div>
          </div>

          {/* Live metrics */}
          {(bmi || calories) && (
            <div className="grid grid-cols-3 gap-4 mb-10">
              {bmi && (
                <div className="card p-4 text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-[0.15em] font-bold mb-1">BMI</p>
                  <p className={`text-2xl font-black ${bmiCat === 'Normal' ? 'text-emerald-400' : bmiCat === 'Overweight' ? 'text-amber-400' : 'text-red-400'}`}>{bmi}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{bmiCat}</p>
                </div>
              )}
              {calories && (
                <div className="card p-4 text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-[0.15em] font-bold mb-1">Daily Calories</p>
                  <p className="text-2xl font-black text-cyan-400">{calories}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">kcal/day</p>
                </div>
              )}
              <div className="card p-4 text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-[0.15em] font-bold mb-1">Goal</p>
                <p className="text-lg font-black text-violet-400 capitalize">{formData.goals.replace(/_/g, ' ')}</p>
              </div>
            </div>
          )}

          {/* Section 2: Preferences */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-amber-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Preferences</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <Select label="Diet Type" field="dietaryPreference" options={[
                { value: 'balanced', label: 'Balanced' }, { value: 'vegetarian', label: 'Vegetarian' },
                { value: 'non-vegetarian', label: 'Non-Vegetarian' }, { value: 'vegan', label: 'Vegan' },
                { value: 'mediterranean', label: 'Mediterranean' }, { value: 'low_carb', label: 'Low Carb' },
                { value: 'diabetic_friendly', label: 'Diabetic Friendly' },
              ]} />
              <Select label="Activity Level" field="activityLevel" options={[
                { value: 'sedentary', label: 'Sedentary' }, { value: 'light', label: 'Light' },
                { value: 'moderate', label: 'Moderate' }, { value: 'active', label: 'Active' },
                { value: 'very_active', label: 'Very Active' },
              ]} />
              <Select label="Goal" field="goals" options={[
                { value: 'diabetes_prevention', label: 'Diabetes Prevention' }, { value: 'blood_sugar_control', label: 'Blood Sugar Control' },
                { value: 'weight_loss', label: 'Weight Loss' }, { value: 'weight_gain', label: 'Weight Gain' },
                { value: 'maintenance', label: 'Maintenance' }, { value: 'gestational_diabetes', label: 'Gestational Diabetes' },
              ]} />
            </div>
          </div>

          {/* Section 3: Additional Info */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-violet-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Additional Info</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <Input label="Health Conditions" field="healthConditions" placeholder="e.g., high BP" />
              <Input label="Allergies" field="allergies" placeholder="e.g., gluten" />
              <Input label="Daily Routine" field="typicalDay" placeholder="e.g., wake 7AM" />
            </div>
          </div>

          <div className="text-center">
            <button onClick={generateDietPlan} disabled={loading || !valid} className="btn-primary text-base px-10 py-4">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UtensilsCrossed className="w-5 h-5" />}
              {loading ? 'Generating...' : 'Generate Diet Plan'}
            </button>
          </div>
        </div>
      </div>

      {/* Result */}
      {dietPlan && (
        <div className="gradient-border mt-10 animate-fade-in-up">
          <div className="card p-8 sm:p-10 rounded-[1.25rem]">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Salad className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">Your Diet Plan</h2>
                  <p className="text-sm text-gray-500">Generated by AI based on your profile</p>
                </div>
              </div>
              <button className="btn-ghost text-xs"><Download className="w-4 h-4" /> PDF</button>
            </div>

            <div className="space-y-8">
              {dietPlan.overview && (
                <div>
                  <div className="flex items-center gap-2.5 mb-3"><BarChart3 className="w-5 h-5 text-emerald-400" /><h3 className="font-bold text-white">Overview</h3></div>
                  <p className="text-sm text-gray-400 whitespace-pre-line leading-relaxed">{dietPlan.overview}</p>
                </div>
              )}
              {dietPlan.daily_plan && (
                <div>
                  <div className="flex items-center gap-2.5 mb-3"><UtensilsCrossed className="w-5 h-5 text-amber-400" /><h3 className="font-bold text-white">Daily Meals</h3></div>
                  <p className="text-sm text-gray-400 whitespace-pre-line leading-relaxed">{dietPlan.daily_plan}</p>
                </div>
              )}
              {dietPlan.grocery_list && (
                <div>
                  <div className="flex items-center gap-2.5 mb-3"><ShoppingCart className="w-5 h-5 text-cyan-400" /><h3 className="font-bold text-white">Groceries</h3></div>
                  <p className="text-sm text-gray-400 whitespace-pre-line leading-relaxed">{dietPlan.grocery_list}</p>
                </div>
              )}
              {dietPlan.important_notes && (
                <div className="card p-5 bg-blue-500/[0.04] border-blue-500/10">
                  <div className="flex items-center gap-2.5 mb-2"><Lightbulb className="w-5 h-5 text-blue-400" /><h4 className="font-bold text-blue-300">Important Notes</h4></div>
                  <p className="text-sm text-blue-300/80 whitespace-pre-line leading-relaxed">{dietPlan.important_notes}</p>
                </div>
              )}
              {dietPlan.nutritional_info && (
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Calories', value: dietPlan.nutritional_info.daily_calories, unit: 'kcal' },
                    { label: 'Protein', value: dietPlan.nutritional_info.protein_grams, unit: 'g' },
                    { label: 'Carbs', value: dietPlan.nutritional_info.carbs_grams, unit: 'g' },
                    { label: 'Fat', value: dietPlan.nutritional_info.fat_grams, unit: 'g' },
                  ].map((n, i) => (
                    <div key={i} className="card p-4 text-center">
                      <p className="text-[10px] text-gray-500 uppercase tracking-[0.15em] font-bold mb-1">{n.label}</p>
                      <p className="text-xl font-black gradient-text">{n.value}</p>
                      <p className="text-[10px] text-gray-600">{n.unit}</p>
                    </div>
                  ))}
                </div>
              )}
              {dietPlan.timestamp && (
                <p className="text-[10px] text-gray-600 flex items-center gap-1.5"><Clock className="w-3 h-3" /> {new Date(dietPlan.timestamp).toLocaleString()} | {dietPlan.generation_time}s</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DietPlan;
