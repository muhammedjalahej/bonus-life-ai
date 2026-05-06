import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Salad, ArrowLeft, Calendar } from 'lucide-react';
import { ROUTES } from '../config/constants';

const DIET_GOAL_LABELS = {
  en: { diabetes_prevention: 'Diabetes Prevention', blood_sugar_control: 'Blood Sugar Control', weight_loss: 'Weight Loss', weight_gain: 'Weight Gain', maintenance: 'Maintenance', gestational_diabetes: 'Gestational Diabetes' },
  tr: { diabetes_prevention: 'Diyabet Önleme', blood_sugar_control: 'Kan Şekeri Kontrolü', weight_loss: 'Kilo Verme', weight_gain: 'Kilo Alma', maintenance: 'Koruma', gestational_diabetes: 'Gestasyonel Diyabet' },
};
const dietGoalDisplay = (goal, isTr) => (DIET_GOAL_LABELS[isTr ? 'tr' : 'en'][goal] || (goal || '').replace(/_/g, ' ')) || (isTr ? 'Diyet planı' : 'Diet plan');

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

export default function DietPlanReportPage({ language }) {
  const isTr = language === 'turkish';
  const navigate = useNavigate();
  const location = useLocation();
  const dietPlan = location.state?.dietPlan;

  const backToDietPlans = () => {
    navigate(`${ROUTES.DASHBOARD}?tab=diet-plans`);
  };

  if (!dietPlan) {
    return (
      <div className="max-w-2xl mx-auto px-6 pt-32 pb-24">
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-center">
          <p className="text-gray-400 mb-4">{isTr ? 'Diyet planı bulunamadı.' : 'Diet plan not found.'}</p>
          <Link
            to={`${ROUTES.DASHBOARD}?tab=diet-plans`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 border border-violet-500/30 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            {isTr ? 'Diyet planlarıma dön' : 'Back to My Diet Plans'}
          </Link>
        </div>
      </div>
    );
  }

  const p = dietPlan.payload || {};

  return (
    <div className="max-w-2xl mx-auto px-6 pt-32 pb-24">
      <div className="mb-6">
        <button
          type="button"
          onClick={backToDietPlans}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.08] transition focus:outline-none focus:ring-2 focus:ring-violet-500/50"
        >
          <ArrowLeft className="w-4 h-4" />
          {isTr ? 'Diyet planlarıma dön' : 'Back to My Diet Plans'}
        </button>
      </div>

      <div className="p-6 rounded-2xl bg-[#12121f] border border-white/[0.1] shadow-2xl">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/[0.06]">
          <div className="w-11 h-11 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Salad className="w-5 h-5 text-violet-400" />
          </div>
          <h1 className="text-lg font-semibold text-white">{dietGoalDisplay(dietPlan.goal, isTr)}</h1>
        </div>

        <div className="space-y-4">
          {dietPlan.created_at && (
            <p className="text-sm text-gray-500 flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {new Date(dietPlan.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })} · {formatTime(dietPlan.created_at)}
            </p>
          )}

          {p.overview && (
            <div>
              <h4 className="text-sm font-semibold text-violet-400 mb-1">{isTr ? 'Genel Bakış' : 'Overview'}</h4>
              <p className="text-sm text-gray-300 whitespace-pre-line">{p.overview}</p>
            </div>
          )}

          {p.daily_plan && (
            <div>
              <h4 className="text-sm font-semibold text-violet-400 mb-1">{isTr ? 'Günlük Öğünler' : 'Daily Meals'}</h4>
              <p className="text-sm text-gray-300 whitespace-pre-line">{p.daily_plan}</p>
            </div>
          )}

          {p.grocery_list && (
            <div>
              <h4 className="text-sm font-semibold text-violet-400 mb-1">{isTr ? 'Alışveriş Listesi' : 'Grocery List'}</h4>
              <p className="text-sm text-gray-300 whitespace-pre-line">{typeof p.grocery_list === 'string' ? p.grocery_list : JSON.stringify(p.grocery_list, null, 2)}</p>
            </div>
          )}

          {p.important_notes && (
            <div>
              <h4 className="text-sm font-semibold text-blue-400 mb-1">{isTr ? 'Önemli Notlar' : 'Important Notes'}</h4>
              <p className="text-sm text-gray-300 whitespace-pre-line">{p.important_notes}</p>
            </div>
          )}

          {p.nutritional_info && (
            <div className="flex flex-wrap gap-4 pt-2">
              {p.nutritional_info.daily_calories != null && <span className="text-sm text-gray-400">{p.nutritional_info.daily_calories} kcal</span>}
              {p.nutritional_info.protein_grams != null && <span className="text-sm text-gray-400">{p.nutritional_info.protein_grams}g protein</span>}
              {p.nutritional_info.carbs_grams != null && <span className="text-sm text-gray-400">{p.nutritional_info.carbs_grams}g carbs</span>}
              {p.nutritional_info.fat_grams != null && <span className="text-sm text-gray-400">{p.nutritional_info.fat_grams}g fat</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
