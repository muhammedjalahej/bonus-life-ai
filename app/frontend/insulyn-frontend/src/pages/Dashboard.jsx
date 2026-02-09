import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, MessageSquare, Mic, Salad, AlertTriangle, User, FileText, UtensilsCrossed,
  Loader2, ChevronRight, Camera, X, Check, Upload, Download, Share2, RefreshCw,
  Megaphone, ArrowRight, Shield, Bell, GitCompare, Heart, Apple, AlertCircle,
  Search, Calendar, Eye, Clock, Trash2,
} from 'lucide-react';
import { ROUTES, getAvatarUrl } from '../config/constants';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';

const cardLinks = [
  { path: ROUTES.TEST, labelEn: 'Assessment', labelTr: 'Değerlendirme', icon: Activity },
  { path: ROUTES.CHAT, labelEn: 'AI Chat', labelTr: 'Yapay Zeka Sohbet', icon: MessageSquare },
  { path: ROUTES.VOICE_CHAT, labelEn: 'Voice Chat', labelTr: 'Sesli Sohbet', icon: Mic },
  { path: ROUTES.DIET_PLAN, labelEn: 'Diet Plan', labelTr: 'Diyet Planı', icon: Salad },
  { path: ROUTES.EMERGENCY, labelEn: 'Emergency', labelTr: 'Acil', icon: AlertTriangle },
];

// Friendly labels for diet plan goal (stored as e.g. diabetes_prevention)
const DIET_GOAL_LABELS = {
  en: { diabetes_prevention: 'Diabetes Prevention', blood_sugar_control: 'Blood Sugar Control', weight_loss: 'Weight Loss', weight_gain: 'Weight Gain', maintenance: 'Maintenance', gestational_diabetes: 'Gestational Diabetes' },
  tr: { diabetes_prevention: 'Diyabet Önleme', blood_sugar_control: 'Kan Şekeri Kontrolü', weight_loss: 'Kilo Verme', weight_gain: 'Kilo Alma', maintenance: 'Koruma', gestational_diabetes: 'Gestasyonel Diyabet' },
};
const dietGoalDisplay = (goal, isTr) => (DIET_GOAL_LABELS[isTr ? 'tr' : 'en'][goal] || (goal || '').replace(/_/g, ' ')) || (isTr ? 'Diyet planı' : 'Diet plan');

// Consistent time format: "8:51 PM" (no leading zero, uppercase AM/PM)
const formatTime = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

export default function Dashboard({ language }) {
  const isTr = language === 'turkish';
  const { user, refreshUser, setUserAvatar } = useAuth();
  const [assessments, setAssessments] = useState([]);
  const [dietPlans, setDietPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [announcements, setAnnouncements] = useState([]);

  // Compare assessments state
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState([]);

  // Filters: assessments
  const [assessmentSearch, setAssessmentSearch] = useState('');
  const [assessmentDateFrom, setAssessmentDateFrom] = useState('');
  const [assessmentDateTo, setAssessmentDateTo] = useState('');
  // Filters: diet plans
  const [dietPlanSearch, setDietPlanSearch] = useState('');
  const [dietPlanDateFrom, setDietPlanDateFrom] = useState('');
  const [dietPlanDateTo, setDietPlanDateTo] = useState('');
  // View full diet plan modal
  const [selectedDietPlan, setSelectedDietPlan] = useState(null);

  // Dismissed announcement IDs (persisted in localStorage so they don't show again)
  const DISMISSED_ANNOUNCEMENTS_KEY = 'morelife_dismissed_announcements';
  const [dismissedAnnouncementIds, setDismissedAnnouncementIds] = useState(() => {
    try {
      const raw = localStorage.getItem(DISMISSED_ANNOUNCEMENTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const visibleAnnouncements = announcements.filter(a => !dismissedAnnouncementIds.includes(a.id));
  const dismissAnnouncement = (id) => {
    setDismissedAnnouncementIds(prev => {
      const next = prev.includes(id) ? prev : [...prev, id];
      try {
        localStorage.setItem(DISMISSED_ANNOUNCEMENTS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, d, ann] = await Promise.all([
        apiService.getMyAssessments(),
        apiService.getMyDietPlans(),
        apiService.getActiveAnnouncements().catch(() => []),
      ]);
      setAssessments(Array.isArray(a) ? a : []);
      setDietPlans(Array.isArray(d) ? d : []);
      setAnnouncements(Array.isArray(ann) ? ann : []);
    } catch (err) {
      setError(err.message || (isTr ? 'Veriler yüklenemedi.' : 'Failed to load data.'));
      setAssessments([]);
      setDietPlans([]);
    } finally {
      setLoading(false);
    }
  }, [isTr]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Onboarding: check if user has no assessments = first time
  const isFirstTime = !loading && assessments.length === 0 && !user?.onboarding_completed;
  const dismissOnboarding = async () => {
    try {
      await apiService.updateProfile({ onboarding_completed: true });
      refreshUser();
    } catch {}
  };

  // PDF export helper
  const exportAssessmentPDF = (assessment) => {
    const payload = assessment.payload || {};
    const riskFactors = payload.risk_analysis?.risk_factors || [];
    const recommendations = payload.recommendations || {};
    const date = assessment.created_at ? new Date(assessment.created_at).toLocaleString() : 'N/A';

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Assessment Report</title>
<style>body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;padding:20px;color:#333}
h1{color:#059669;border-bottom:2px solid #059669;padding-bottom:8px}
h2{color:#444;margin-top:24px}.badge{display:inline-block;padding:4px 12px;border-radius:8px;font-weight:bold;font-size:18px}
.high{background:#fee2e2;color:#dc2626}.moderate{background:#fef3c7;color:#d97706}
.low{background:#d1fae5;color:#059669}.vlow{background:#ecfdf5;color:#10b981}
.metric{display:inline-block;margin:8px 16px 8px 0;padding:8px 16px;background:#f3f4f6;border-radius:8px}
.footer{margin-top:32px;padding-top:12px;border-top:1px solid #ddd;font-size:12px;color:#888}
ul{padding-left:20px}li{margin:4px 0}</style></head><body>
<h1>Diabetes Risk Assessment Report</h1>
<p><strong>Date:</strong> ${date}</p>
<p><strong>Patient:</strong> ${user?.full_name || user?.email || 'N/A'}</p>
<h2>Risk Level</h2>
<p><span class="badge ${(assessment.risk_level || '').toLowerCase().includes('high') ? 'high' : (assessment.risk_level || '').toLowerCase().includes('moderate') ? 'moderate' : 'low'}">${assessment.risk_level || 'Unknown'}</span></p>
<p><strong>Probability:</strong> ${(assessment.probability * 100).toFixed(1)}%</p>
<h2>Executive Summary</h2>
<p>${assessment.executive_summary || 'No summary available.'}</p>
${riskFactors.length ? `<h2>Key Risk Factors</h2><ul>${riskFactors.map(f => `<li>${typeof f === 'string' ? f : f.factor || f.name || JSON.stringify(f)}</li>`).join('')}</ul>` : ''}
${recommendations.nutrition ? `<h2>Nutrition Recommendations</h2><p>${recommendations.nutrition}</p>` : ''}
${recommendations.fitness ? `<h2>Fitness Recommendations</h2><p>${recommendations.fitness}</p>` : ''}
<div class="footer"><p>Generated by Bonus Life AI Platform. This is not a medical diagnosis. Consult your healthcare provider.</p></div>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (w) {
      w.onload = () => { setTimeout(() => { w.print(); }, 500); };
    } else {
      const a = document.createElement('a');
      a.href = url; a.download = `assessment-${assessment.id}.html`; a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  // Share assessment
  const [shareLoading, setShareLoading] = useState(null);
  const [shareLink, setShareLink] = useState(null);
  const handleShare = async (assessmentId) => {
    setShareLoading(assessmentId);
    try {
      const result = await apiService.shareAssessment(assessmentId);
      const link = `${window.location.origin}/shared/${result.share_token}`;
      setShareLink({ id: assessmentId, link });
      navigator.clipboard?.writeText(link);
    } catch (err) {
      alert(err.message);
    } finally {
      setShareLoading(null);
    }
  };

  const [deletingId, setDeletingId] = useState(null);
  const handleDeleteAssessment = async (a) => {
    if (!window.confirm(isTr ? 'Bu değerlendirmeyi silmek istediğinize emin misiniz?' : 'Are you sure you want to delete this assessment?')) return;
    setDeletingId(`a-${a.id}`);
    try {
      await apiService.deleteAssessment(a.id);
      setAssessments(prev => prev.filter(x => x.id !== a.id));
    } catch (err) {
      alert(err.message || (isTr ? 'Silinemedi.' : 'Could not delete.'));
    } finally {
      setDeletingId(null);
    }
  };
  const handleDeleteDietPlan = async (d) => {
    if (!window.confirm(isTr ? 'Bu diyet planını silmek istediğinize emin misiniz?' : 'Are you sure you want to delete this diet plan?')) return;
    setDeletingId(`d-${d.id}`);
    try {
      await apiService.deleteDietPlan(d.id);
      setDietPlans(prev => prev.filter(x => x.id !== d.id));
      if (selectedDietPlan?.id === d.id) setSelectedDietPlan(null);
    } catch (err) {
      alert(err.message || (isTr ? 'Silinemedi.' : 'Could not delete.'));
    } finally {
      setDeletingId(null);
    }
  };

  // Compare assessments
  const toggleCompare = (id) => {
    setCompareIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const comparedAssessments = compareIds.map(id => assessments.find(a => a.id === id)).filter(Boolean);

  // Filtered lists (date + search)
  const filteredAssessments = React.useMemo(() => {
    let list = [...assessments];
    const q = (assessmentSearch || '').toLowerCase().trim();
    if (q) {
      list = list.filter(a =>
        (a.risk_level || '').toLowerCase().includes(q) ||
        (a.executive_summary || '').toLowerCase().includes(q)
      );
    }
    if (assessmentDateFrom) {
      const from = new Date(assessmentDateFrom);
      from.setHours(0, 0, 0, 0);
      list = list.filter(a => a.created_at && new Date(a.created_at) >= from);
    }
    if (assessmentDateTo) {
      const to = new Date(assessmentDateTo);
      to.setHours(23, 59, 59, 999);
      list = list.filter(a => a.created_at && new Date(a.created_at) <= to);
    }
    return list;
  }, [assessments, assessmentSearch, assessmentDateFrom, assessmentDateTo]);

  const filteredDietPlans = React.useMemo(() => {
    let list = [...dietPlans];
    const q = (dietPlanSearch || '').toLowerCase().trim();
    if (q) {
      list = list.filter(d =>
        (d.goal || '').toLowerCase().includes(q) ||
        (dietGoalDisplay(d.goal, isTr) || '').toLowerCase().includes(q) ||
        (d.overview || '').toLowerCase().includes(q)
      );
    }
    if (dietPlanDateFrom) {
      const from = new Date(dietPlanDateFrom);
      from.setHours(0, 0, 0, 0);
      list = list.filter(d => d.created_at && new Date(d.created_at) >= from);
    }
    if (dietPlanDateTo) {
      const to = new Date(dietPlanDateTo);
      to.setHours(23, 59, 59, 999);
      list = list.filter(d => d.created_at && new Date(d.created_at) <= to);
    }
    return list;
  }, [dietPlans, dietPlanSearch, dietPlanDateFrom, dietPlanDateTo, isTr]);

  // Export my data
  const [exporting, setExporting] = useState(false);
  const handleExportData = async () => {
    setExporting(true);
    try {
      const data = await apiService.exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `morelife-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-24">
      <h1 className="text-3xl font-bold text-white mb-2">
        {isTr ? 'Kontrol Paneli' : 'Dashboard'}
      </h1>
      <p className="text-gray-500 mb-6">
        {isTr ? 'Araçlara hızlı erişim ve kayıtlarınız' : 'Quick access to tools and your records'}
      </p>

      {/* Feature f1: Announcements Banner (dismissible, stays hidden per user) */}
      {visibleAnnouncements.length > 0 && (
        <div className="mb-6 space-y-2">
          {visibleAnnouncements.slice(0, 3).map((ann) => (
            <div key={ann.id} className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 relative">
              <Megaphone className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-amber-300">{ann.title}</p>
                <p className="text-xs text-amber-400/70 mt-0.5">{ann.message}</p>
              </div>
              <button
                type="button"
                onClick={() => dismissAnnouncement(ann.id)}
                className="p-1.5 rounded-lg text-amber-400/70 hover:text-amber-300 hover:bg-amber-500/20 transition shrink-0"
                title={isTr ? 'Kapat (bir daha gösterme)' : 'Dismiss (don\'t show again)'}
                aria-label={isTr ? 'Duyuruyu kapat' : 'Dismiss announcement'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Feature f2: Onboarding prompt for first-time users */}
      {isFirstTime && (
        <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">
                  {isTr ? 'Hoş geldiniz! Sağlık yolculuğunuza başlayın' : 'Welcome! Start your health journey'}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {isTr
                    ? 'İlk değerlendirmenizi alarak diyabet riskinizi öğrenin. Sonuçlarınız yapay zeka sohbetini ve diyet planlarınızı kişiselleştirecektir.'
                    : 'Take your first assessment to learn your diabetes risk. Your results will personalize AI chat and diet plan recommendations.'}
                </p>
                <Link
                  to={ROUTES.TEST}
                  className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition"
                >
                  <Activity className="w-4 h-4" />
                  {isTr ? 'Değerlendirme Yap' : 'Take Assessment'}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
            <button onClick={dismissOnboarding} className="p-1 hover:bg-white/10 rounded-lg shrink-0" title="Dismiss">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-white/[0.06] overflow-x-auto">
        {[
          { id: 'overview', labelEn: 'Overview', labelTr: 'Genel Bakış' },
          { id: 'assessments', labelEn: 'My Assessments', labelTr: 'Değerlendirmelerim' },
          { id: 'diet-plans', labelEn: 'My Diet Plans', labelTr: 'Diyet Planlarım' },
          { id: 'profile', labelEn: 'Profile', labelTr: 'Profil' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition whitespace-nowrap ${activeTab === tab.id ? 'bg-white/[0.06] text-emerald-400 border-b-2 border-emerald-500' : 'text-gray-500 hover:text-white'}`}
          >
            {isTr ? tab.labelTr : tab.labelEn}
          </button>
        ))}
      </div>

      {/* Feature f3: Global error with retry */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-sm text-red-400">{error}</span>
          </div>
          <button onClick={fetchData} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm transition">
            <RefreshCw className="w-3.5 h-3.5" />
            {isTr ? 'Tekrar Dene' : 'Retry'}
          </button>
        </div>
      )}

      {activeTab === 'overview' && (
        <>
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-white mb-4">{isTr ? 'Araçlar' : 'Tools'}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cardLinks.map(({ path, labelEn, labelTr, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-emerald-500/30 hover:bg-white/[0.05] transition"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-emerald-400" />
                  </div>
                  <span className="text-white font-medium">{isTr ? labelTr : labelEn}</span>
                  <ChevronRight className="w-5 h-5 text-gray-500 ml-auto" />
                </Link>
              ))}
            </div>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">{isTr ? 'Özet' : 'Summary'}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                  <FileText className="w-4 h-4" /> {isTr ? 'Değerlendirmeler' : 'Assessments'}
                </div>
                {loading ? (
                  <div className="h-8 w-16 rounded bg-white/[0.06] animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold text-white">{assessments.length}</p>
                )}
              </div>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                  <UtensilsCrossed className="w-4 h-4" /> {isTr ? 'Diyet Planları' : 'Diet plans'}
                </div>
                {loading ? (
                  <div className="h-8 w-16 rounded bg-white/[0.06] animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold text-white">{dietPlans.length}</p>
                )}
              </div>
            </div>
          </section>

          {/* Latest assessment summary */}
          {!loading && assessments.length > 0 && (
            <section className="mt-6">
              <h2 className="text-lg font-semibold text-white mb-4">{isTr ? 'Son Değerlendirme' : 'Latest Assessment'}</h2>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">{assessments[0].risk_level} · {(assessments[0].probability * 100).toFixed(0)}%</p>
                    <p className="text-sm text-gray-500 truncate max-w-md mt-1">{assessments[0].executive_summary}</p>
                    {assessments[0].created_at && <p className="text-xs text-gray-600 mt-1">{new Date(assessments[0].created_at).toLocaleString()}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => exportAssessmentPDF(assessments[0])} className="p-2 rounded-lg hover:bg-white/[0.05] text-gray-400 hover:text-emerald-400 transition" title={isTr ? 'PDF İndir' : 'Download PDF'}>
                      <Download className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleShare(assessments[0].id)} disabled={shareLoading === assessments[0].id} className="p-2 rounded-lg hover:bg-white/[0.05] text-gray-400 hover:text-emerald-400 transition" title={isTr ? 'Doktora Paylaş' : 'Share with Doctor'}>
                      {shareLoading === assessments[0].id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {shareLink?.id === assessments[0].id && (
                  <div className="mt-3 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-xs text-emerald-400">{isTr ? 'Link panoya kopyalandı:' : 'Link copied to clipboard:'}</p>
                    <p className="text-xs text-emerald-300 break-all mt-1">{shareLink.link}</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}

      {activeTab === 'assessments' && (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-white">{isTr ? 'Değerlendirmelerim' : 'My Assessments'}</h2>
            <div className="flex flex-wrap gap-2 items-center">
              {assessments.length >= 2 && (
                <button
                  onClick={() => { setCompareMode(!compareMode); setCompareIds([]); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition ${compareMode ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/[0.05] text-gray-400 hover:text-white border border-white/[0.08]'}`}
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  {isTr ? 'Karşılaştır' : 'Compare'}
                </button>
              )}
            </div>
          </div>

          {/* Date + Search filters */}
          {!loading && assessments.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={assessmentSearch}
                  onChange={(e) => setAssessmentSearch(e.target.value)}
                  placeholder={isTr ? 'Ara (risk, özet…)' : 'Search (risk, summary…)'}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <Calendar className="w-4 h-4 text-gray-500" />
                <input type="date" value={assessmentDateFrom} onChange={(e) => setAssessmentDateFrom(e.target.value)} className="py-2 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-emerald-500/50" title={isTr ? 'Başlangıç' : 'From'} />
                <span className="text-gray-500 text-sm">–</span>
                <input type="date" value={assessmentDateTo} onChange={(e) => setAssessmentDateTo(e.target.value)} className="py-2 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-emerald-500/50" title={isTr ? 'Bitiş' : 'To'} />
              </div>
            </div>
          )}

          {/* Feature f3: Loading skeleton */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] animate-pulse">
                  <div className="h-4 w-40 bg-white/[0.06] rounded mb-2" />
                  <div className="h-3 w-64 bg-white/[0.06] rounded mb-1" />
                  <div className="h-2.5 w-24 bg-white/[0.06] rounded" />
                </div>
              ))}
            </div>
          ) : assessments.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">{isTr ? 'Henüz değerlendirme yok.' : 'No assessments yet.'}</p>
              <Link to={ROUTES.TEST} className="inline-flex items-center gap-2 mt-3 text-sm text-emerald-400 hover:text-emerald-300">
                {isTr ? 'İlk değerlendirmenizi yapın' : 'Take your first assessment'} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : filteredAssessments.length === 0 ? (
            <div className="text-center py-8">
              <Search className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500">{isTr ? 'Filtreye uyan değerlendirme yok.' : 'No assessments match the filters.'}</p>
              <button type="button" onClick={() => { setAssessmentSearch(''); setAssessmentDateFrom(''); setAssessmentDateTo(''); }} className="mt-2 text-sm text-emerald-400 hover:text-emerald-300">
                {isTr ? 'Filtreleri temizle' : 'Clear filters'}
              </button>
            </div>
          ) : (
            <>
              {/* Feature f6: Compare mode */}
              {compareMode && compareIds.length === 2 && comparedAssessments.length === 2 && (
                <div className="mb-6 p-4 rounded-xl bg-white/[0.03] border border-emerald-500/20">
                  <h3 className="text-sm font-semibold text-emerald-400 mb-3">{isTr ? 'Karşılaştırma' : 'Comparison'}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {comparedAssessments.map((a, i) => (
                      <div key={a.id} className="space-y-2">
                        <p className="text-xs text-gray-500">{a.created_at ? new Date(a.created_at).toLocaleDateString() : 'N/A'}</p>
                        <p className="text-white font-medium">{a.risk_level}</p>
                        <p className="text-lg font-bold text-white">{(a.probability * 100).toFixed(1)}%</p>
                        <p className="text-xs text-gray-400 line-clamp-2">{a.executive_summary}</p>
                      </div>
                    ))}
                  </div>
                  {(() => {
                    const diff = comparedAssessments[1].probability - comparedAssessments[0].probability;
                    const improved = diff < 0;
                    return (
                      <div className={`mt-3 p-2 rounded-lg text-sm ${improved ? 'bg-emerald-500/10 text-emerald-400' : diff > 0 ? 'bg-red-500/10 text-red-400' : 'bg-white/[0.05] text-gray-400'}`}>
                        {improved
                          ? (isTr ? `Risk ${(Math.abs(diff) * 100).toFixed(1)}% azaldı — İyi ilerleme!` : `Risk decreased by ${(Math.abs(diff) * 100).toFixed(1)}% — Good progress!`)
                          : diff > 0
                            ? (isTr ? `Risk ${(diff * 100).toFixed(1)}% arttı` : `Risk increased by ${(diff * 100).toFixed(1)}%`)
                            : (isTr ? 'Değişiklik yok' : 'No change')}
                      </div>
                    );
                  })()}
                </div>
              )}
              {compareMode && compareIds.length < 2 && (
                <p className="text-sm text-gray-400 mb-4">
                  {isTr ? 'Karşılaştırmak için 2 değerlendirme seçin' : 'Select 2 assessments to compare'}
                </p>
              )}

              <ul className="space-y-3">
                {filteredAssessments.map((a) => (
                  <li key={a.id} className={`p-4 rounded-xl bg-white/[0.03] border transition ${compareMode && compareIds.includes(a.id) ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/[0.06]'}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {compareMode && (
                          <button
                            onClick={() => toggleCompare(a.id)}
                            className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition ${compareIds.includes(a.id) ? 'bg-emerald-500 border-emerald-500' : 'border-white/20 hover:border-emerald-500/50'}`}
                          >
                            {compareIds.includes(a.id) && <Check className="w-3 h-3 text-white" />}
                          </button>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-white">{a.risk_level} · {(a.probability * 100).toFixed(0)}%</p>
                          <p className="text-sm text-gray-500 truncate max-w-md">{a.executive_summary}</p>
                          {a.created_at && (
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(a.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })} · {new Date(a.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      </div>
                      {!compareMode && (
                        <div className="flex gap-1 shrink-0 ml-3">
                          <button onClick={() => exportAssessmentPDF(a)} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-gray-500 hover:text-emerald-400 transition" title={isTr ? 'PDF İndir' : 'Download PDF'}>
                            <Download className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleShare(a.id)} disabled={shareLoading === a.id} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-gray-500 hover:text-emerald-400 transition" title={isTr ? 'Paylaş' : 'Share'}>
                            {shareLoading === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                          </button>
                          <button onClick={() => handleDeleteAssessment(a)} disabled={deletingId === `a-${a.id}`} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition" title={isTr ? 'Sil' : 'Delete'}>
                            {deletingId === `a-${a.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      )}
                    </div>
                    {shareLink?.id === a.id && (
                      <div className="mt-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-xs text-emerald-400">{isTr ? 'Link kopyalandı:' : 'Link copied:'}</p>
                        <p className="text-xs text-emerald-300 break-all">{shareLink.link}</p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {activeTab === 'diet-plans' && (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-white">{isTr ? 'Diyet Planlarım' : 'My Diet Plans'}</h2>
            <Link to={ROUTES.DIET_PLAN} className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
              {isTr ? 'Yeni plan' : 'New plan'} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Date + Search filters for diet plans */}
          {!loading && dietPlans.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={dietPlanSearch}
                  onChange={(e) => setDietPlanSearch(e.target.value)}
                  placeholder={isTr ? 'Ara (hedef, özet…)' : 'Search (goal, overview…)'}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <Calendar className="w-4 h-4 text-gray-500" />
                <input type="date" value={dietPlanDateFrom} onChange={(e) => setDietPlanDateFrom(e.target.value)} className="py-2 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-emerald-500/50" title={isTr ? 'Başlangıç' : 'From'} />
                <span className="text-gray-500 text-sm">–</span>
                <input type="date" value={dietPlanDateTo} onChange={(e) => setDietPlanDateTo(e.target.value)} className="py-2 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-emerald-500/50" title={isTr ? 'Bitiş' : 'To'} />
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] animate-pulse">
                  <div className="h-4 w-32 bg-white/[0.06] rounded mb-2" />
                  <div className="h-3 w-56 bg-white/[0.06] rounded mb-1" />
                  <div className="h-2.5 w-20 bg-white/[0.06] rounded" />
                </div>
              ))}
            </div>
          ) : dietPlans.length === 0 ? (
            <div className="text-center py-12">
              <Salad className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">{isTr ? 'Henüz diyet planı yok.' : 'No diet plans yet.'}</p>
              <Link to={ROUTES.DIET_PLAN} className="inline-flex items-center gap-2 mt-3 text-sm text-emerald-400 hover:text-emerald-300">
                {isTr ? 'Bir plan oluşturun' : 'Create a plan'} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : filteredDietPlans.length === 0 ? (
            <div className="text-center py-8">
              <Search className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500">{isTr ? 'Filtreye uyan diyet planı yok.' : 'No diet plans match the filters.'}</p>
              <button type="button" onClick={() => { setDietPlanSearch(''); setDietPlanDateFrom(''); setDietPlanDateTo(''); }} className="mt-2 text-sm text-emerald-400 hover:text-emerald-300">
                {isTr ? 'Filtreleri temizle' : 'Clear filters'}
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {filteredDietPlans.map((d) => {
                const payload = d.payload || {};
                return (
                  <li key={d.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white">{dietGoalDisplay(d.goal, isTr)}</p>
                        <p className="text-sm text-gray-500 line-clamp-2">{d.overview}</p>
                        {d.created_at && (
                          <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(d.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })} · {formatTime(d.created_at)}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => setSelectedDietPlan(d)} className="p-2 rounded-lg hover:bg-white/[0.05] text-gray-500 hover:text-emerald-400 transition" title={isTr ? 'Planı görüntüle' : 'View plan'}>
                          <Eye className="w-4 h-4" />
                        </button>
                        {payload.grocery_list && (
                          <button
                            onClick={() => {
                              const text = typeof payload.grocery_list === 'string' ? payload.grocery_list : JSON.stringify(payload.grocery_list, null, 2);
                              const blob = new Blob([text], { type: 'text/plain' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `grocery-list-${d.id}.txt`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                            className="p-2 rounded-lg hover:bg-white/[0.05] text-gray-500 hover:text-emerald-400 transition"
                            title={isTr ? 'Alışveriş Listesi' : 'Grocery List'}
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => handleDeleteDietPlan(d)} disabled={deletingId === `d-${d.id}`} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition" title={isTr ? 'Sil' : 'Delete'}>
                          {deletingId === `d-${d.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* Full diet plan view modal */}
      {selectedDietPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedDietPlan(null)}>
          <div className="bg-[#12121f] border border-white/[0.1] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between shrink-0">
              <h3 className="text-lg font-semibold text-white">{dietGoalDisplay(selectedDietPlan.goal, isTr)}</h3>
              <button onClick={() => setSelectedDietPlan(null)} className="p-2 rounded-lg hover:bg-white/[0.08] text-gray-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {selectedDietPlan.created_at && (
                <p className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {new Date(selectedDietPlan.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })} · {formatTime(selectedDietPlan.created_at)}
                </p>
              )}
              {(() => {
                const p = selectedDietPlan.payload || {};
                return (
                  <>
                    {p.overview && (
                      <div>
                        <h4 className="text-sm font-semibold text-emerald-400 mb-1">{isTr ? 'Genel Bakış' : 'Overview'}</h4>
                        <p className="text-sm text-gray-300 whitespace-pre-line">{p.overview}</p>
                      </div>
                    )}
                    {p.daily_plan && (
                      <div>
                        <h4 className="text-sm font-semibold text-emerald-400 mb-1">{isTr ? 'Günlük Öğünler' : 'Daily Meals'}</h4>
                        <p className="text-sm text-gray-300 whitespace-pre-line">{p.daily_plan}</p>
                      </div>
                    )}
                    {p.grocery_list && (
                      <div>
                        <h4 className="text-sm font-semibold text-emerald-400 mb-1">{isTr ? 'Alışveriş Listesi' : 'Grocery List'}</h4>
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
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <DashboardProfile
          language={language}
          user={user}
          refreshUser={refreshUser}
          setUserAvatar={setUserAvatar}
          handleExportData={handleExportData}
          exporting={exporting}
        />
      )}
    </div>
  );
}

/** Small helper: shows image or falls back to initials if image fails to load. */
function AvatarPreview({ url, initials }) {
  const [err, setErr] = useState(false);
  useEffect(() => { setErr(false); }, [url]);
  if (!url || err) {
    return (
      <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 flex items-center justify-center text-3xl font-bold text-emerald-400 border-2 border-white/[0.08]">
        {initials}
      </div>
    );
  }
  return <img src={url} alt="Preview" className="w-32 h-32 rounded-2xl object-cover border-2 border-white/[0.08]" onError={() => setErr(true)} />;
}

function DashboardProfile({ language, user, refreshUser, setUserAvatar, handleExportData, exporting }) {
  const isTr = language === 'turkish';
  const fileInputRef = useRef(null);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [preferredLanguage, setPreferredLanguage] = useState(user?.preferred_language || 'english');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [avatarInput, setAvatarInput] = useState(user?.avatar_url || '');
  const [showAvatarEdit, setShowAvatarEdit] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [saving, setSaving] = useState(false);

  // Feature f8: Diet preferences
  const [dietPref, setDietPref] = useState(user?.dietary_preference || '');
  const [allergies, setAllergies] = useState(user?.allergies || '');
  const [calorieGoal, setCalorieGoal] = useState(user?.calorie_goal || '');

  // Feature f15: 2FA state
  const [show2FA, setShow2FA] = useState(false);
  const [twoFAData, setTwoFAData] = useState(null);
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFALoading, setTwoFALoading] = useState(false);

  useEffect(() => {
    setAvatarUrl(user?.avatar_url || '');
    setAvatarInput(user?.avatar_url || '');
    setFullName(user?.full_name || '');
    setPreferredLanguage(user?.preferred_language || 'english');
    setDietPref(user?.dietary_preference || '');
    setAllergies(user?.allergies || '');
    setCalorieGoal(user?.calorie_goal || '');
    setAvatarError(false);
  }, [user]);

  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const calorieNegative = calorieGoal !== '' && !isNaN(parseInt(calorieGoal)) && parseInt(calorieGoal) < 0;
    if (calorieNegative) {
      showMessage(isTr ? 'Lütfen negatif olmayan bir sayı girin.' : 'Please enter a positive number.', 'error');
      return;
    }
    setMessage('');
    setSaving(true);
    try {
      await apiService.updateProfile({
        full_name: fullName,
        preferred_language: preferredLanguage,
        dietary_preference: dietPref,
        allergies,
        calorie_goal: calorieGoal ? parseInt(calorieGoal) : null,
      });
      await refreshUser();
      showMessage(isTr ? 'Profil güncellendi.' : 'Profile updated.', 'success');
    } catch (err) {
      showMessage(err.message || (isTr ? 'Güncelleme başarısız.' : 'Update failed.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAvatar = async () => {
    setSaving(true);
    try {
      const url = avatarInput.trim() || null;
      await apiService.updateProfile({ avatar_url: url });
      setAvatarError(false);
      setAvatarUrl(url || '');
      if (setUserAvatar) setUserAvatar(url);
      await refreshUser();
      setShowAvatarEdit(false);
      showMessage(isTr ? 'Profil fotoğrafı güncellendi.' : 'Profile picture updated.', 'success');
    } catch (err) {
      showMessage(err.message || (isTr ? 'Güncelleme başarısız.' : 'Update failed.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setSaving(true);
    try {
      await apiService.updateProfile({ avatar_url: '' });
      if (setUserAvatar) setUserAvatar(null);
      await refreshUser();
      setAvatarUrl('');
      setAvatarInput('');
      setShowAvatarEdit(false);
      showMessage(isTr ? 'Profil fotoğrafı kaldırıldı.' : 'Profile picture removed.', 'success');
    } catch (err) {
      showMessage(err.message || (isTr ? 'Kaldırma başarısız.' : 'Remove failed.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    e.target.value = '';
    setSaving(true);
    try {
      const result = await apiService.uploadAvatar(file);
      const url = result.avatar_url;
      setAvatarError(false);
      setAvatarUrl(url);
      setAvatarInput(url);
      if (setUserAvatar) setUserAvatar(url);
      await refreshUser();
      setShowAvatarEdit(false);
      showMessage(isTr ? 'Profil fotoğrafı yüklendi.' : 'Profile picture uploaded.', 'success');
    } catch (err) {
      showMessage(err.message || (isTr ? 'Yükleme başarısız.' : 'Upload failed.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!currentPassword || !newPassword) {
      showMessage(isTr ? 'Mevcut ve yeni şifre gerekli.' : 'Current and new password required.', 'error');
      return;
    }
    setSaving(true);
    try {
      await apiService.changePassword(currentPassword, newPassword);
      showMessage(isTr ? 'Şifre güncellendi.' : 'Password updated.', 'success');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      showMessage(err.message || (isTr ? 'Şifre güncellenemedi.' : 'Password update failed.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // 2FA handlers
  const handle2FASetup = async () => {
    setTwoFALoading(true);
    try {
      const data = await apiService.setup2FA();
      setTwoFAData(data);
      setShow2FA(true);
    } catch (err) {
      showMessage(err.message || (isTr ? '2FA kurulumu başarısız.' : '2FA setup failed'), 'error');
    } finally {
      setTwoFALoading(false);
    }
  };

  const handle2FAVerify = async () => {
    setTwoFALoading(true);
    try {
      await apiService.verify2FA(twoFACode);
      showMessage(isTr ? '2FA etkinleştirildi.' : '2FA enabled successfully.', 'success');
      setShow2FA(false);
      setTwoFACode('');
      setTwoFAData(null);
      refreshUser();
    } catch (err) {
      showMessage(err.message || (isTr ? 'Doğrulama başarısız.' : 'Verification failed'), 'error');
    } finally {
      setTwoFALoading(false);
    }
  };

  const handle2FADisable = async () => {
    setTwoFALoading(true);
    try {
      await apiService.disable2FA();
      showMessage(isTr ? '2FA devre dışı bırakıldı.' : '2FA disabled.', 'success');
      refreshUser();
    } catch (err) {
      showMessage(err.message || (isTr ? '2FA devre dışı bırakılamadı.' : 'Failed to disable 2FA'), 'error');
    } finally {
      setTwoFALoading(false);
    }
  };

  const initials = (user?.full_name || user?.email || '?').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-8">
      {/* Avatar Section */}
      <div className="flex items-start gap-6">
        <div className="relative group">
          {avatarUrl && !avatarError ? (
            <img
              key={avatarUrl}
              src={getAvatarUrl(avatarUrl)}
              alt="Profile"
              className="w-24 h-24 rounded-2xl object-cover border-2 border-white/[0.08]"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 flex items-center justify-center text-2xl font-bold text-emerald-400 border-2 border-white/[0.08]">
              {initials}
            </div>
          )}
          <button
            onClick={() => { setShowAvatarEdit(true); setAvatarInput(avatarUrl); }}
            className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center shadow-lg transition"
          >
            <Camera className="w-4 h-4 text-white" />
          </button>
        </div>
        <div>
          <h3 className="text-white font-medium text-lg">{user?.full_name || user?.email}</h3>
          <p className="text-gray-500 text-sm">{user?.email}</p>
          <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium
            ${user?.role === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-gray-400'}`}>
            {user?.role || 'user'}
          </span>
        </div>
      </div>

      {/* Avatar Edit Modal */}
      {showAvatarEdit && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setShowAvatarEdit(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
            <div className="bg-[#12121f] border border-white/[0.08] rounded-2xl shadow-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">{isTr ? 'Profil Fotoğrafı' : 'Profile Picture'}</h3>
                <button onClick={() => setShowAvatarEdit(false)} className="p-1 hover:bg-white/[0.05] rounded-lg">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="flex justify-center mb-4">
                {avatarInput ? (
                  <AvatarPreview url={getAvatarUrl(avatarInput)} initials={initials} />
                ) : (
                  <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 flex items-center justify-center text-3xl font-bold text-emerald-400 border-2 border-white/[0.08]">
                    {initials}
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleFileSelect} />
              <div className="space-y-4">
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={saving} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 transition disabled:opacity-50">
                  <Upload className="w-5 h-5" />
                  {isTr ? 'Bilgisayardan yükle' : 'Upload from computer'}
                </button>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{isTr ? 'Veya resim URL' : 'Or image URL'}</label>
                  <input type="url" value={avatarInput} onChange={(e) => setAvatarInput(e.target.value)} placeholder="https://example.com/photo.jpg" className="w-full px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50" />
                </div>
                <div className="flex gap-3">
                  {avatarUrl && (
                    <button onClick={handleRemoveAvatar} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 border border-red-500/20 transition">
                      {isTr ? 'Kaldır' : 'Remove'}
                    </button>
                  )}
                  <button onClick={() => setShowAvatarEdit(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/[0.05] border border-white/[0.08] transition">
                    {isTr ? 'İptal' : 'Cancel'}
                  </button>
                  <button onClick={handleSaveAvatar} disabled={saving} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition flex items-center justify-center gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {isTr ? 'Kaydet' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
        <h3 className="text-white font-medium">{isTr ? 'Profil bilgileri' : 'Profile info'}</h3>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{isTr ? 'Ad Soyad' : 'Full name'}</label>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500/50" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{isTr ? 'Dil' : 'Language'}</label>
          <select value={preferredLanguage} onChange={(e) => setPreferredLanguage(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500/50">
            <option value="english">English</option>
            <option value="turkish">Türkçe</option>
          </select>
        </div>

        {/* Feature f8: Diet preferences */}
        <h3 className="text-white font-medium pt-4">{isTr ? 'Diyet Tercihleri' : 'Diet Preferences'}</h3>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{isTr ? 'Diyet tipi' : 'Dietary preference'}</label>
          <select value={dietPref} onChange={(e) => setDietPref(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500/50">
            <option value="">{isTr ? 'Seçin...' : 'Select...'}</option>
            <option value="balanced">{isTr ? 'Dengeli' : 'Balanced'}</option>
            <option value="vegetarian">{isTr ? 'Vejetaryen' : 'Vegetarian'}</option>
            <option value="vegan">{isTr ? 'Vegan' : 'Vegan'}</option>
            <option value="mediterranean">{isTr ? 'Akdeniz' : 'Mediterranean'}</option>
            <option value="low_carb">{isTr ? 'Düşük Karbonhidrat' : 'Low Carb'}</option>
            <option value="diabetic_friendly">{isTr ? 'Diyabet Dostu' : 'Diabetic Friendly'}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{isTr ? 'Alerjiler / kısıtlamalar' : 'Allergies / restrictions'}</label>
          <input type="text" value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder={isTr ? 'örn. glüten, laktoz' : 'e.g. gluten, lactose'} className="w-full px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{isTr ? 'Günlük kalori hedefi' : 'Daily calorie goal'}</label>
          <input type="number" value={calorieGoal} onChange={(e) => setCalorieGoal(e.target.value)} placeholder={isTr ? 'örn. 2000' : 'e.g. 2000'} className={`w-full px-4 py-2 rounded-lg bg-white/[0.05] border text-white placeholder-gray-500 focus:outline-none ${calorieGoal !== '' && !isNaN(parseInt(calorieGoal)) && parseInt(calorieGoal) < 0 ? 'border-red-500/50 focus:border-red-500/70' : 'border-white/[0.08] focus:border-emerald-500/50'}`} />
          {calorieGoal !== '' && !isNaN(parseInt(calorieGoal)) && parseInt(calorieGoal) < 0 && <p className="text-[11px] text-red-400 font-medium mt-1">{isTr ? 'Lütfen negatif olmayan bir sayı girin.' : 'Please enter a positive number.'}</p>}
        </div>

        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium disabled:opacity-50 transition">
          {saving ? (isTr ? 'Kaydediliyor…' : 'Saving…') : (isTr ? 'Kaydet' : 'Save')}
        </button>
      </form>

      {/* Password Form */}
      <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
        <h3 className="text-white font-medium">{isTr ? 'Şifre değiştir' : 'Change password'}</h3>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{isTr ? 'Mevcut şifre' : 'Current password'}</label>
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500/50" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{isTr ? 'Yeni şifre' : 'New password'}</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500/50" />
        </div>
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium disabled:opacity-50 transition">
          {isTr ? 'Şifreyi güncelle' : 'Update password'}
        </button>
      </form>

      {/* Feature f15: 2FA Section */}
      <div className="space-y-3 max-w-md">
        <h3 className="text-white font-medium">{isTr ? 'İki Aşamalı Doğrulama' : 'Two-Factor Authentication'}</h3>
        <p className="text-sm text-gray-500">{isTr ? 'Hesabınıza ek güvenlik katmanı ekleyin.' : 'Add an extra layer of security to your account.'}</p>
        {user?.totp_enabled ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">{isTr ? '2FA Etkin' : '2FA Enabled'}</span>
            </div>
            <button onClick={handle2FADisable} disabled={twoFALoading} className="px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 border border-red-500/20 transition">
              {isTr ? 'Kapat' : 'Disable'}
            </button>
          </div>
        ) : (
          <>
            <button onClick={handle2FASetup} disabled={twoFALoading} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.05] text-white hover:bg-white/[0.08] border border-white/[0.08] transition">
              {twoFALoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              {isTr ? '2FA Etkinleştir' : 'Enable 2FA'}
            </button>
            {show2FA && twoFAData && (
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                <p className="text-sm text-gray-400">{isTr ? 'Authenticator uygulamanıza bu gizli anahtarı ekleyin:' : 'Add this secret key to your authenticator app:'}</p>
                <code className="block p-2 rounded-lg bg-white/[0.05] text-emerald-400 text-xs break-all">{twoFAData.secret}</code>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{isTr ? 'Doğrulama kodu' : 'Verification code'}</label>
                  <div className="flex gap-2">
                    <input type="text" value={twoFACode} onChange={(e) => setTwoFACode(e.target.value)} placeholder="000000" maxLength={6} className="flex-1 px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500/50" />
                    <button onClick={handle2FAVerify} disabled={twoFALoading || twoFACode.length < 6} className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium disabled:opacity-50 transition">
                      {isTr ? 'Doğrula' : 'Verify'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Feature f11: Export my data */}
      <div className="space-y-3 max-w-md">
        <h3 className="text-white font-medium">{isTr ? 'Verilerim' : 'My Data'}</h3>
        <p className="text-sm text-gray-500">{isTr ? 'Profilinizi, değerlendirmelerinizi ve diyet planlarınızı indirin.' : 'Download your profile, assessments, and diet plans.'}</p>
        <button onClick={handleExportData} disabled={exporting} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.05] text-white hover:bg-white/[0.08] border border-white/[0.08] transition disabled:opacity-50">
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {isTr ? 'Verilerimi İndir' : 'Download My Data'}
        </button>
      </div>

      {/* Message Toast */}
      {message && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border animate-pulse
          ${messageType === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-red-500/20 border-red-500/30 text-red-400'}`}>
          {messageType === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
          <span className="text-sm font-medium">{message}</span>
        </div>
      )}
    </div>
  );
}
