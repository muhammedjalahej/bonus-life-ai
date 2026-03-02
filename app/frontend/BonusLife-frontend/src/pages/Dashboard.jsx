import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  Activity, MessageSquare, Mic, Salad, AlertTriangle, User, FileText, UtensilsCrossed,
  Loader2, ChevronRight, ChevronDown, Camera, X, Check, Upload, Download, Share2, RefreshCw,
  Megaphone, ArrowRight, Shield, Bell, GitCompare, Heart, Apple, AlertCircle,
  Search, Calendar, Eye, Clock, Trash2, QrCode, ScanFace, Dumbbell, Sun, HelpCircle,
  CreditCard, Sparkles,
} from 'lucide-react';
import { ROUTES, getAvatarUrl } from '../config/constants';
import { useAuth } from '../context/AuthContext';
import apiService, {
  faceEnroll,
  faceStatus,
  faceToggleEnabled,
  confirmSubscription,
} from '../services/api';
import { haptic } from '../utils/haptics';
import { buildAndDownloadSignedPDF, buildAndDownloadSignedHeartPDF } from '../utils/assessmentPdf';
import FluidCard from '../components/FluidCard';

// accent: tailwind border/icon classes (e.g. emerald, amber, blue). primary = slightly emphasized.
const cardLinks = [
  { path: ROUTES.TEST, labelEn: 'Assessment', labelTr: 'Değerlendirme', icon: Activity, accent: 'emerald', primary: true },
  { path: ROUTES.HEART_TEST, labelEn: 'Heart Risk', labelTr: 'Kalp Risk', icon: Heart, accent: 'pink', primary: true },
  { path: ROUTES.CHAT, labelEn: 'AI Chat', labelTr: 'Yapay Zeka Sohbet', icon: MessageSquare, accent: 'blue', primary: true },
  { path: ROUTES.VOICE_CHAT, labelEn: 'Voice Chat', labelTr: 'Sesli Sohbet', icon: Mic, accent: 'blue' },
  { path: ROUTES.DIET_PLAN, labelEn: 'Diet Plan', labelTr: 'Diyet Planı', icon: Salad, accent: 'emerald' },
  { path: ROUTES.MEAL_PHOTO, labelEn: 'Meal Analyzer', labelTr: 'Öğün Analizi', icon: Apple, accent: 'emerald' },
  { path: ROUTES.SPORT, labelEn: 'Workout Videos', labelTr: 'Antrenman Videoları', icon: Dumbbell, accent: 'cyan' },
  { path: ROUTES.SYMPTOM_CHECKER, labelEn: 'Symptom Checker', labelTr: 'Belirti Kontrolü', icon: AlertTriangle, accent: 'amber' },
  { path: ROUTES.VERIFY, labelEn: 'Verify Report', labelTr: 'Rapor Doğrula', icon: QrCode, accent: 'gray' },
  { path: ROUTES.LOCAL_AI_TIP, labelEn: 'Tip of the day', labelTr: 'Günün ipucu', icon: Sun, accent: 'amber' },
  { path: ROUTES.LOCAL_AI_SCENARIO, labelEn: 'What if…?', labelTr: 'Ya… olursa?', icon: HelpCircle, accent: 'cyan' },
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

// Risk level → badge color classes (Low=green, Medium=amber, High=red)
const getRiskBadgeClasses = (riskLevel) => {
  const r = (riskLevel || '').toLowerCase();
  if (r.includes('low') || r.includes('minimal')) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  if (r.includes('medium') || r.includes('moderate')) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  if (r.includes('high') || r.includes('elevated')) return 'bg-red-500/20 text-red-400 border-red-500/30';
  return 'bg-white/[0.08] text-gray-300 border-white/[0.12]';
};
const getRiskBorderClass = (riskLevel) => {
  const r = (riskLevel || '').toLowerCase();
  if (r.includes('low') || r.includes('minimal')) return 'border-l-emerald-500/50';
  if (r.includes('medium') || r.includes('moderate')) return 'border-l-amber-500/50';
  if (r.includes('high') || r.includes('elevated')) return 'border-l-red-500/50';
  return 'border-l-white/10';
};
/** Hover accent by risk (e.g. for Heart cards: green low, red high, like diabetes). */
const getRiskHoverClass = (riskLevel) => {
  const r = (riskLevel || '').toLowerCase();
  if (r.includes('low') || r.includes('minimal')) return 'hover:border-emerald-500/30 hover:text-emerald-400 focus:ring-emerald-500/50';
  if (r.includes('medium') || r.includes('moderate')) return 'hover:border-amber-500/30 hover:text-amber-400 focus:ring-amber-500/50';
  if (r.includes('high') || r.includes('elevated')) return 'hover:border-red-500/30 hover:text-red-400 focus:ring-red-500/50';
  return 'hover:border-white/20 hover:text-gray-300 focus:ring-white/20';
};

// Greeting by time of day (for hero)
const getGreeting = (isTr, name) => {
  const firstName = (name || '').split(/\s+/)[0] || (isTr ? 'Kullanıcı' : 'there');
  const hour = new Date().getHours();
  let timeLabel = isTr ? 'Merhaba' : 'Hi';
  if (hour >= 5 && hour < 12) timeLabel = isTr ? 'Günaydın' : 'Good morning';
  else if (hour >= 12 && hour < 17) timeLabel = isTr ? 'İyi günler' : 'Good afternoon';
  else if (hour >= 17 && hour < 21) timeLabel = isTr ? 'İyi akşamlar' : 'Good evening';
  else timeLabel = isTr ? 'İyi geceler' : 'Good evening';
  return `${timeLabel}, ${firstName}`;
};

export default function Dashboard({ language }) {
  const isTr = language === 'turkish';
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, refreshUser, setUserAvatar } = useAuth();
  const [assessments, setAssessments] = useState([]);
  const [heartAssessments, setHeartAssessments] = useState([]);
  const [dietPlans, setDietPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [announcements, setAnnouncements] = useState([]);
  const [portalLoading, setPortalLoading] = useState(false);
  const [subscriptionConfirmError, setSubscriptionConfirmError] = useState(null);

  // Compare assessments state
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState([]);

  // Filters: assessments (combined diabetes + heart)
  const [assessmentSearch, setAssessmentSearch] = useState('');
  const [assessmentDateFrom, setAssessmentDateFrom] = useState('');
  const [assessmentDateTo, setAssessmentDateTo] = useState('');
  const [assessmentTypeFilter, setAssessmentTypeFilter] = useState('all'); // 'all' | 'diabetes' | 'heart'
  // Filters: diet plans
  const [dietPlanSearch, setDietPlanSearch] = useState('');
  const [dietPlanDateFrom, setDietPlanDateFrom] = useState('');
  const [dietPlanDateTo, setDietPlanDateTo] = useState('');

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
      const [a, h, d, ann] = await Promise.all([
        apiService.getMyAssessments(),
        apiService.getMyHeartAssessments(),
        apiService.getMyDietPlans(),
        apiService.getActiveAnnouncements().catch(() => []),
      ]);
      setAssessments(Array.isArray(a) ? a : []);
      setHeartAssessments(Array.isArray(h) ? h : []);
      setDietPlans(Array.isArray(d) ? d : []);
      setAnnouncements(Array.isArray(ann) ? ann : []);
    } catch (err) {
      setError(err.message || (isTr ? 'Veriler yüklenemedi.' : 'Failed to load data.'));
      setAssessments([]);
      setHeartAssessments([]);
      setDietPlans([]);
    } finally {
      setLoading(false);
    }
  }, [isTr]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Open tab from URL (e.g. /dashboard?tab=assessments when returning from assessment report)
  useEffect(() => {
    const tab = searchParams.get('tab');
    const type = searchParams.get('type');
    if (tab === 'heart-assessments') {
      setActiveTab('assessments');
      setAssessmentTypeFilter('heart');
      setSearchParams({ ...Object.fromEntries(searchParams.entries()), tab: 'assessments', type: 'heart' }, { replace: true });
      return;
    }
    if (tab && ['overview', 'assessments', 'diet-plans', 'subscription', 'profile'].includes(tab)) {
      setActiveTab(tab);
      if (tab === 'assessments') setAssessmentTypeFilter(type === 'diabetes' || type === 'heart' ? type : 'all');
    }
  }, [searchParams, setSearchParams]);

  // After Stripe Checkout success: confirm subscription with session_id then refresh user and clean URL
  useEffect(() => {
    const success = searchParams.get('subscription');
    const sessionId = searchParams.get('session_id');
    if (success !== 'success' || !sessionId) return;
    let cancelled = false;
    setSubscriptionConfirmError(null);
    (async () => {
      try {
        await confirmSubscription(sessionId);
        if (!cancelled) await refreshUser();
      } catch (err) {
        if (!cancelled) setSubscriptionConfirmError(err?.message || (isTr ? 'Abonelik doğrulanamadı.' : 'Could not confirm subscription.'));
      } finally {
        if (!cancelled) setSearchParams({}, { replace: true });
      }
    })();
    return () => { cancelled = true; };
  }, [searchParams, refreshUser, setSearchParams, isTr]);

  // Onboarding: check if user has no assessments (diabetes or heart) = first time
  const totalAssessmentsCount = (assessments?.length || 0) + (heartAssessments?.length || 0);
  const isFirstTime = !loading && totalAssessmentsCount === 0 && !user?.onboarding_completed;
  const dismissOnboarding = async () => {
    try {
      await apiService.updateProfile({ onboarding_completed: true });
      refreshUser();
    } catch {}
  };

  // Signed PDF export (uses shared util)
  const [pdfLoading, setPdfLoading] = useState(null);
  const exportSignedAssessmentPDF = async (assessment) => {
    setPdfLoading(assessment.id);
    try {
      await buildAndDownloadSignedPDF(assessment, user, isTr, apiService);
    } catch (err) {
      const msg = err.message || '';
      const is404 = msg.includes('404');
      const friendly = is404
        ? (isTr ? 'PDF imzalama servisi bulunamadı (404). Backend çalışıyor mu?' : 'PDF signing service not found (404). Is the backend running?')
        : (msg || (isTr ? 'PDF oluşturulamadı.' : 'Could not create PDF.'));
      alert(friendly);
    } finally {
      setPdfLoading(null);
    }
  };

  // Share assessment
  const [shareLoading, setShareLoading] = useState(null);
  const [shareLink, setShareLink] = useState(null);
  const handleShare = async (assessmentId) => {
    setShareLoading(assessmentId);
    try {
      const result = await apiService.shareAssessment(assessmentId);
      const link = `${window.location.origin}/shared/${result.share_token}`;
      setShareLink({ id: assessmentId, link, type: 'diabetes' });
      navigator.clipboard?.writeText(link);
    } catch (err) {
      alert(err.message);
    } finally {
      setShareLoading(null);
    }
  };

  const [deletingId, setDeletingId] = useState(null);
  const exportSignedHeartPDF = async (assessment) => {
    setPdfLoading(assessment.id);
    try {
      await buildAndDownloadSignedHeartPDF(assessment, user, isTr, apiService);
    } catch (err) {
      const msg = err.message || '';
      const is404 = msg.includes('404');
      const friendly = is404
        ? (isTr ? 'PDF imzalama servisi bulunamadı (404).' : 'PDF signing service not found (404).')
        : (msg || (isTr ? 'PDF oluşturulamadı.' : 'Could not create PDF.'));
      alert(friendly);
    } finally {
      setPdfLoading(null);
    }
  };
  const handleShareHeart = async (heartAssessmentId) => {
    setShareLoading(heartAssessmentId);
    try {
      const result = await apiService.shareHeartAssessment(heartAssessmentId);
      const link = `${window.location.origin}/shared/heart/${result.share_token}`;
      setShareLink({ id: heartAssessmentId, link, type: 'heart' });
      navigator.clipboard?.writeText(link);
    } catch (err) {
      alert(err.message);
    } finally {
      setShareLoading(null);
    }
  };
  const handleDeleteHeartAssessment = async (a) => {
    setDeletingId(`h-${a.id}`);
    try {
      await apiService.deleteHeartAssessment(a.id);
      setHeartAssessments(prev => prev.filter(x => x.id !== a.id));
    } catch (err) {
      alert(err.message || (isTr ? 'Silinemedi.' : 'Could not delete.'));
    } finally {
      setDeletingId(null);
    }
  };
  const handleDeleteAssessment = async (a) => {
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
    setDeletingId(`d-${d.id}`);
    try {
      await apiService.deleteDietPlan(d.id);
      setDietPlans(prev => prev.filter(x => x.id !== d.id));
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

  // Combined assessments (diabetes + heart) for list, sorted by date desc
  const combinedAssessments = React.useMemo(() => {
    const diabetes = (assessments || []).map(a => ({ ...a, _type: 'diabetes' }));
    const heart = (heartAssessments || []).map(a => ({ ...a, _type: 'heart' }));
    const list = [...diabetes, ...heart].sort((a, b) => {
      const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tB - tA;
    });
    return list;
  }, [assessments, heartAssessments]);

  // Filtered combined list (type + search + date)
  const filteredAssessments = React.useMemo(() => {
    let list = [...combinedAssessments];
    if (assessmentTypeFilter === 'diabetes') list = list.filter(a => a._type === 'diabetes');
    else if (assessmentTypeFilter === 'heart') list = list.filter(a => a._type === 'heart');
    const q = (assessmentSearch || '').toLowerCase().trim();
    if (q) {
      list = list.filter(a => {
        const matchText = (a.risk_level || '').toLowerCase().includes(q) ||
          (a.executive_summary || '').toLowerCase().includes(q);
        const matchType = (q === 'diabetes' && a._type === 'diabetes') || (q === 'heart' && a._type === 'heart') ||
          (isTr && (q === 'kalp' && a._type === 'heart') || (q === 'diyabet' && a._type === 'diabetes'));
        return matchText || matchType;
      });
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
  }, [combinedAssessments, assessmentTypeFilter, assessmentSearch, assessmentDateFrom, assessmentDateTo, isTr]);

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
    <div className="max-w-5xl mx-auto px-6 pt-32 pb-24">
      <header className="relative rounded-2xl mb-8 p-6 bg-gradient-to-br from-white/[0.04] via-transparent to-emerald-500/[0.04] border border-white/[0.06]">
        <p className="text-sm font-medium text-emerald-400/90 mb-1">{getGreeting(isTr, user?.full_name)}</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
          {isTr ? 'Kontrol Paneli' : 'Dashboard'}
        </h1>
        <p className="text-gray-400">
          {isTr ? 'Araçlara hızlı erişim ve kayıtlarınız' : 'Quick access to tools and your records'}
        </p>
      </header>

      {/* Feature f1: Announcements Banner (dismissible, max-height + fade) */}
      {visibleAnnouncements.length > 0 && (
        <div className="mb-6 relative max-h-48 overflow-y-auto overflow-x-hidden rounded-xl">
          <div className="space-y-2 pr-2">
            {visibleAnnouncements.slice(0, 3).map((ann) => (
              <div key={ann.id} className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 relative">
                <Megaphone className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-amber-300">{ann.title}</p>
                  <p className="text-xs text-amber-400/70 mt-0.5">{ann.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => dismissAnnouncement(ann.id)}
                  className="p-1.5 rounded-lg text-amber-400/70 hover:text-amber-300 hover:bg-amber-500/20 transition shrink-0 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  title={isTr ? 'Kapat (bir daha gösterme)' : 'Dismiss (don\'t show again)'}
                  aria-label={isTr ? 'Duyuruyu kapat' : 'Dismiss announcement'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="sticky bottom-0 left-0 right-0 h-8 pointer-events-none bg-gradient-to-t from-[#060611] to-transparent" aria-hidden="true" />
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
      <div className="relative mb-8">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent" style={{ scrollbarWidth: 'thin' }}>
          {[
            { id: 'overview', labelEn: 'Overview', labelTr: 'Genel Bakış', dataTour: 'dashboard-tab-overview' },
            { id: 'assessments', labelEn: 'My Assessments', labelTr: 'Değerlendirmelerim', dataTour: 'dashboard-tab-assessments' },
            { id: 'diet-plans', labelEn: 'My Diet Plans', labelTr: 'Diyet Planlarım', dataTour: 'dashboard-tab-diet-plans' },
            { id: 'subscription', labelEn: 'My Subscription', labelTr: 'Aboneliğim', dataTour: 'dashboard-tab-subscription' },
            { id: 'profile', labelEn: 'Profile', labelTr: 'Profil', dataTour: 'dashboard-tab-profile' },
          ].map((tab) => (
            <button
              key={tab.id}
              data-tour={tab.dataTour}
              onClick={() => { setActiveTab(tab.id); setSearchParams({ tab: tab.id }, { replace: true }); }}
              className={`px-4 py-2.5 text-sm font-medium rounded-full transition whitespace-nowrap shrink-0 ${activeTab === tab.id ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40' : 'text-gray-500 hover:text-white hover:bg-white/[0.06]'}`}
            >
              {isTr ? tab.labelTr : tab.labelEn}
            </button>
          ))}
        </div>
        <div className="absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-[#060611] to-transparent pointer-events-none" aria-hidden="true" />
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
          <section className="mb-10" data-tour="dashboard-tools">
            <h2 className="text-lg font-semibold text-white mb-4 tracking-tight">{isTr ? 'Araçlar' : 'TOOLS'}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {cardLinks.map(({ path, labelEn, labelTr, icon: Icon, accent, primary }) => {
                const styles = {
                  emerald: { card: 'hover:border-emerald-500/30', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-400' },
                  blue: { card: 'hover:border-blue-500/30', iconBg: 'bg-blue-500/10', iconColor: 'text-blue-400' },
                  cyan: { card: 'hover:border-cyan-500/30', iconBg: 'bg-cyan-500/10', iconColor: 'text-cyan-400' },
                  amber: { card: 'hover:border-amber-500/30', iconBg: 'bg-amber-500/10', iconColor: 'text-amber-400' },
                  gray: { card: 'hover:border-white/20', iconBg: 'bg-white/[0.08]', iconColor: 'text-gray-300' },
                };
                const s = styles[accent] || styles.emerald;
                return (
                  <FluidCard
                    key={path}
                    as={Link}
                    to={path}
                    className={`flex items-center gap-4 p-5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:shadow-lg hover:shadow-black/20 hover:scale-[1.02] transition cursor-grab active:cursor-grabbing ${s.card}`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.iconBg}`}>
                      <Icon className={`w-6 h-6 ${s.iconColor}`} />
                    </div>
                    <span className={`text-white font-medium ${primary ? 'font-semibold' : ''}`}>{isTr ? labelTr : labelEn}</span>
                    <ChevronRight className="w-5 h-5 text-gray-500 ml-auto" />
                  </FluidCard>
                );
              })}
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-white mb-4 tracking-tight">{isTr ? 'Özet' : 'Summary'}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FluidCard className="p-4 rounded-xl bg-gradient-to-br from-white/[0.04] to-emerald-500/[0.06] border border-white/[0.06] cursor-grab active:cursor-grabbing">
                <div className="flex items-center gap-2 text-emerald-400/90 text-sm mb-1">
                  <FileText className="w-4 h-4" /> {isTr ? 'Değerlendirmeler' : 'Assessments'}
                </div>
                {loading ? (
                  <div className="h-8 w-16 rounded bg-white/[0.06] animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold text-white">{totalAssessmentsCount}</p>
                )}
              </FluidCard>
              <FluidCard className="p-4 rounded-xl bg-gradient-to-br from-white/[0.04] to-cyan-500/[0.06] border border-white/[0.06] cursor-grab active:cursor-grabbing">
                <div className="flex items-center gap-2 text-cyan-400/90 text-sm mb-1">
                  <UtensilsCrossed className="w-4 h-4" /> {isTr ? 'Diyet Planları' : 'Diet plans'}
                </div>
                {loading ? (
                  <div className="h-8 w-16 rounded bg-white/[0.06] animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold text-white">{dietPlans.length}</p>
                )}
              </FluidCard>
              <FluidCard className="p-4 rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.06] border border-white/[0.06] cursor-grab active:cursor-grabbing">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                  <Calendar className="w-4 h-4" /> {isTr ? 'Son değerlendirme' : 'Last assessment'}
                </div>
                {loading ? (
                  <div className="h-8 w-20 rounded bg-white/[0.06] animate-pulse" />
                ) : combinedAssessments.length > 0 && combinedAssessments[0].created_at ? (
                  (() => {
                    const last = new Date(combinedAssessments[0].created_at);
                    const now = new Date();
                    const days = Math.floor((now - last) / (24 * 60 * 60 * 1000));
                    const label = days === 0 ? (isTr ? 'Bugün' : 'Today') : days === 1 ? (isTr ? '1 gün önce' : '1 day ago') : isTr ? `${days} gün önce` : `${days} days ago`;
                    return <p className="text-2xl font-bold text-white">{label}</p>;
                  })()
                ) : (
                  <p className="text-lg font-medium text-gray-500">{isTr ? 'Henüz yok' : 'None yet'}</p>
                )}
              </FluidCard>
            </div>
          </section>

          {/* Latest assessment summary (most recent diabetes or heart) */}
          {!loading && combinedAssessments.length > 0 && (() => {
            const latest = combinedAssessments[0];
            const isHeart = latest._type === 'heart';
            const viewRoute = isHeart ? `${ROUTES.DASHBOARD_HEART_ASSESSMENT}/${latest.id}` : `${ROUTES.DASHBOARD_ASSESSMENT}/${latest.id}`;
            const shareMatch = shareLink?.id === latest.id && shareLink?.type === latest._type;
            return (
              <section className="mt-8">
                <h2 className="text-lg font-semibold text-white mb-4">{isTr ? 'Son Değerlendirme' : 'Latest Assessment'}</h2>
                <div className={`p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] border-l-4 ${getRiskBorderClass(latest.risk_level)}`}>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${isHeart ? getRiskBadgeClasses(latest.risk_level) : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>
                          {isHeart ? <Heart className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
                          {isTr ? (isHeart ? 'Kalp' : 'Diyabet') : (isHeart ? 'Heart' : 'Diabetes')}
                        </span>
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium border ${getRiskBadgeClasses(latest.risk_level)}`}>
                          {latest.risk_level} · {(latest.probability * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="text-sm text-gray-400 line-clamp-2 max-w-md mt-2 [&_strong]:font-semibold [&_strong]:text-gray-200">
                        <ReactMarkdown components={{ p: ({ children }) => <span>{children}</span>, strong: ({ children }) => <strong>{children}</strong> }}>{isHeart ? (latest.executive_summary || '') : (latest.executive_summary || '')}</ReactMarkdown>
                      </div>
                      {latest.created_at && <p className="text-xs text-gray-500 mt-1">{new Date(latest.created_at).toLocaleString()}</p>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Link to={isHeart ? ROUTES.HEART_TEST : ROUTES.TEST} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#060611] border border-white/[0.08]">
                        {isTr ? 'Yeni değerlendirme' : 'New assessment'}
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                      <Link to={viewRoute} state={{ assessment: latest }} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-[#060611]" data-tour="dashboard-view-report">
                        {isTr ? 'Görüntüle' : 'View'} <Eye className="w-4 h-4" />
                      </Link>
                      {isHeart ? (
                        (() => {
                          const heartHover = getRiskHoverClass(latest.risk_level);
                          return (
                            <>
                              <button onClick={() => exportSignedHeartPDF(latest)} disabled={pdfLoading === latest.id} className={`p-2 rounded-lg hover:bg-white/[0.05] text-gray-400 ${heartHover} transition focus:outline-none focus:ring-2`} title={isTr ? 'PDF İndir' : 'Download PDF'} aria-label={isTr ? 'PDF İndir' : 'Download PDF'} data-tour="dashboard-download-signed">
                                {pdfLoading === latest.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                              </button>
                              <button onClick={() => handleShareHeart(latest.id)} disabled={shareLoading === latest.id} className={`p-2 rounded-lg hover:bg-white/[0.05] text-gray-400 ${heartHover} transition focus:outline-none focus:ring-2`} title={isTr ? 'Paylaş' : 'Share'} aria-label={isTr ? 'Paylaş' : 'Share'} data-tour="dashboard-share">
                                {shareLoading === latest.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                              </button>
                            </>
                          );
                        })()
                      ) : (
                        <>
                          <button onClick={() => exportSignedAssessmentPDF(latest)} disabled={pdfLoading === latest.id} className="p-2 rounded-lg hover:bg-white/[0.05] text-gray-400 hover:text-emerald-400 transition focus:outline-none focus:ring-2 focus:ring-emerald-500/50" title={isTr ? 'İmzalı PDF İndir' : 'Download Signed PDF'} aria-label={isTr ? 'İmzalı PDF İndir' : 'Download Signed PDF'} data-tour="dashboard-download-signed">
                            {pdfLoading === latest.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                          </button>
                          <button onClick={() => handleShare(latest.id)} disabled={shareLoading === latest.id} className="p-2 rounded-lg hover:bg-white/[0.05] text-gray-400 hover:text-emerald-400 transition focus:outline-none focus:ring-2 focus:ring-emerald-500/50" title={isTr ? 'Doktora Paylaş' : 'Share with Doctor'} aria-label={isTr ? 'Doktora Paylaş' : 'Share with Doctor'} data-tour="dashboard-share">
                            {shareLoading === latest.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {shareMatch && (
                    <div className={`mt-3 p-2 rounded-lg border ${isHeart ? 'bg-pink-500/10 border-pink-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                      <p className={`text-xs ${isHeart ? 'text-pink-400' : 'text-emerald-400'}`}>{isTr ? 'Link panoya kopyalandı:' : 'Link copied to clipboard:'}</p>
                      <p className={`text-xs break-all mt-1 ${isHeart ? 'text-pink-300' : 'text-emerald-300'}`}>{shareLink.link}</p>
                    </div>
                  )}
                </div>
              </section>
            );
          })()}
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${compareMode ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/[0.05] text-gray-400 hover:text-white border border-white/[0.08]'}`}
                  aria-pressed={compareMode}
                  aria-label={isTr ? 'Değerlendirmeleri karşılaştır' : 'Compare assessments'}
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  {isTr ? 'Karşılaştır' : 'Compare'}
                </button>
              )}
            </div>
          </div>

          {/* Type filter: All | Diabetes | Heart */}
          {!loading && totalAssessmentsCount > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { value: 'all', labelEn: 'All', labelTr: 'Tümü' },
                { value: 'diabetes', labelEn: 'Diabetes', labelTr: 'Diyabet' },
                { value: 'heart', labelEn: 'Heart', labelTr: 'Kalp' },
              ].map(({ value, labelEn, labelTr }) => (
                <button
                  key={value}
                  onClick={() => {
                    setAssessmentTypeFilter(value);
                    setSearchParams(prev => {
                      const p = Object.fromEntries(prev.entries());
                      p.tab = 'assessments';
                      if (value === 'all') delete p.type;
                      else p.type = value;
                      return p;
                    }, { replace: true });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${assessmentTypeFilter === value ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/[0.05] text-gray-400 hover:text-white border border-white/[0.08]'}`}
                >
                  {isTr ? labelTr : labelEn}
                </button>
              ))}
            </div>
          )}

          {/* Date + Search filters */}
          {!loading && totalAssessmentsCount > 0 && (
            <>
              <div className="flex flex-wrap gap-3 mb-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" aria-hidden="true" />
                  <input
                    type="text"
                    value={assessmentSearch}
                    onChange={(e) => setAssessmentSearch(e.target.value)}
                    placeholder={isTr ? 'Ara (risk, özet…)' : 'Search (risk, summary…)'}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                    aria-label={isTr ? 'Değerlendirme ara' : 'Search assessments'}
                  />
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <Calendar className="w-4 h-4 text-gray-500" aria-hidden="true" />
                  <input type="date" value={assessmentDateFrom} onChange={(e) => setAssessmentDateFrom(e.target.value)} className="py-2 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" title={isTr ? 'Başlangıç' : 'From'} aria-label={isTr ? 'Başlangıç tarihi' : 'From date'} />
                  <span className="text-gray-500 text-sm">–</span>
                  <input type="date" value={assessmentDateTo} onChange={(e) => setAssessmentDateTo(e.target.value)} className="py-2 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" title={isTr ? 'Bitiş' : 'To'} aria-label={isTr ? 'Bitiş tarihi' : 'To date'} />
                </div>
              </div>
              {(assessmentSearch || assessmentDateFrom || assessmentDateTo) && (
                <div className="flex flex-wrap gap-2 mb-4 items-center">
                  {assessmentSearch && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs border border-emerald-500/25">
                      {isTr ? 'Ara' : 'Search'}: {assessmentSearch}
                      <button type="button" onClick={() => setAssessmentSearch('')} className="hover:bg-emerald-500/20 rounded p-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" aria-label={isTr ? 'Kaldır' : 'Remove'}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {assessmentDateFrom && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.08] text-gray-300 text-xs border border-white/[0.12]">
                      {isTr ? 'Başlangıç' : 'From'}: {assessmentDateFrom}
                      <button type="button" onClick={() => setAssessmentDateFrom('')} className="hover:bg-white/10 rounded p-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" aria-label={isTr ? 'Kaldır' : 'Remove'}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {assessmentDateTo && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.08] text-gray-300 text-xs border border-white/[0.12]">
                      {isTr ? 'Bitiş' : 'To'}: {assessmentDateTo}
                      <button type="button" onClick={() => setAssessmentDateTo('')} className="hover:bg-white/10 rounded p-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" aria-label={isTr ? 'Kaldır' : 'Remove'}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  <button type="button" onClick={() => { setAssessmentSearch(''); setAssessmentDateFrom(''); setAssessmentDateTo(''); }} className="text-xs text-emerald-400 hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 rounded px-2 py-1">
                    {isTr ? 'Filtreleri temizle' : 'Clear all'}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Loading skeleton — matches assessment card layout */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] border-l-4 border-l-white/10 animate-pulse">
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-5 w-28 rounded-lg bg-white/[0.08]" />
                      <div className="h-3 w-full max-w-md rounded bg-white/[0.06]" />
                      <div className="h-3 w-3/4 max-w-xs rounded bg-white/[0.06]" />
                      <div className="h-3 w-32 rounded bg-white/[0.06] mt-1.5" />
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <div className="h-8 w-8 rounded-lg bg-white/[0.06]" />
                      <div className="h-8 w-8 rounded-lg bg-white/[0.06]" />
                      <div className="h-8 w-8 rounded-lg bg-white/[0.06]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : totalAssessmentsCount === 0 ? (
            <div className="text-center py-14 px-6 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02]">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <Activity className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-white font-semibold mb-1">{isTr ? 'Henüz değerlendirme yok' : 'No assessments yet'}</h3>
              <p className="text-gray-400 text-sm max-w-sm mx-auto mb-5">{isTr ? 'Diyabet veya kalp riski değerlendirmenizi yapın.' : 'Take a diabetes or heart risk assessment.'}</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link to={ROUTES.TEST} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-[#060611]">
                  {isTr ? 'Diyabet değerlendirmesi' : 'Diabetes assessment'} <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to={ROUTES.HEART_TEST} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-[#060611]">
                  {isTr ? 'Kalp değerlendirmesi' : 'Heart assessment'} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : filteredAssessments.length === 0 ? (
            <div className="text-center py-10 px-6 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02]">
              <Search className="w-10 h-10 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400 mb-3">{isTr ? 'Filtreye uyan değerlendirme yok.' : 'No assessments match the filters.'}</p>
              <button type="button" onClick={() => { setAssessmentSearch(''); setAssessmentDateFrom(''); setAssessmentDateTo(''); }} className="text-sm text-emerald-400 hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 rounded-lg px-3 py-1.5">
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
                    {comparedAssessments.map((a) => (
                      <div key={a.id} className="space-y-2">
                        <p className="text-xs text-gray-500">{a.created_at ? new Date(a.created_at).toLocaleDateString() : 'N/A'}</p>
                        <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium border ${getRiskBadgeClasses(a.risk_level)}`}>
                          {a.risk_level} · {(a.probability * 100).toFixed(1)}%
                        </span>
                        <div className="text-xs text-gray-400 line-clamp-2 mt-1 [&_strong]:font-semibold [&_strong]:text-gray-200">
                          <ReactMarkdown components={{ p: ({ children }) => <span>{children}</span>, strong: ({ children }) => <strong>{children}</strong> }}>{a.executive_summary}</ReactMarkdown>
                        </div>
                      </div>
                    ))}
                  </div>
                  {(() => {
                    const diff = comparedAssessments[1].probability - comparedAssessments[0].probability;
                    const improved = diff < 0;
                    const pct = (Math.abs(diff) * 100).toFixed(1);
                    return (
                      <div className={`mt-3 p-3 rounded-lg text-sm flex items-center gap-2 ${improved ? 'bg-emerald-500/10 text-emerald-400' : diff > 0 ? 'bg-red-500/10 text-red-400' : 'bg-white/[0.05] text-gray-400'}`}>
                        {diff !== 0 && (
                          <span className="shrink-0" aria-hidden="true">
                            {improved ? <span className="text-emerald-400">↓</span> : <span className="text-red-400">↑</span>}
                          </span>
                        )}
                        {improved
                          ? (isTr ? `Risk ${pct}% azaldı — İyi ilerleme!` : `Risk decreased by ${pct}% — Good progress!`)
                          : diff > 0
                            ? (isTr ? `Risk ${pct}% arttı` : `Risk increased by ${pct}%`)
                            : (isTr ? 'Değişiklik yok' : 'No change')}
                      </div>
                    );
                  })()}
                </div>
              )}
              {compareMode && compareIds.length < 2 && (
                <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
                  <GitCompare className="w-5 h-5 text-amber-400 shrink-0" />
                  <p className="text-sm text-amber-200/90">
                    {isTr ? 'Karşılaştırmak için 2 değerlendirme seçin' : 'Select 2 assessments to compare'}
                  </p>
                </div>
              )}

              <ul className="space-y-3">
                {filteredAssessments.map((a) => {
                  const isHeart = a._type === 'heart';
                  const rowKey = isHeart ? `heart-${a.id}` : a.id;
                  const viewRoute = isHeart ? `${ROUTES.DASHBOARD_HEART_ASSESSMENT}/${a.id}` : `${ROUTES.DASHBOARD_ASSESSMENT}/${a.id}`;
                  const accentHover = isHeart ? getRiskHoverClass(a.risk_level) : 'hover:border-emerald-500/30 hover:text-emerald-400 focus:ring-emerald-500/50';
                  const shareLinkMatch = shareLink?.id === a.id && shareLink?.type === a._type;
                  return (
                    <li
                      key={rowKey}
                      className={`p-4 rounded-xl bg-white/[0.03] border border-l-4 transition ${compareMode && !isHeart && compareIds.includes(a.id) ? 'border-emerald-500/40 bg-emerald-500/5 border-l-emerald-500/60' : `border-white/[0.06] ${getRiskBorderClass(a.risk_level)} ${!compareMode ? 'cursor-pointer ' + accentHover : ''}`}`}
                      onClick={!compareMode ? () => navigate(viewRoute, { state: { assessment: a } }) : undefined}
                      onKeyDown={!compareMode ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(viewRoute, { state: { assessment: a } }); } } : undefined}
                      role={!compareMode ? 'button' : undefined}
                      tabIndex={!compareMode ? 0 : undefined}
                      aria-label={!compareMode ? (isTr ? (isHeart ? 'Kalp değerlendirmesini görüntüle' : 'Değerlendirmeyi görüntüle') : (isHeart ? 'View heart assessment' : 'View assessment')) : undefined}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {compareMode && !isHeart && (
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleCompare(a.id); }}
                              className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${compareIds.includes(a.id) ? 'bg-emerald-500 border-emerald-500' : 'border-white/20 hover:border-emerald-500/50'}`}
                              aria-label={compareIds.includes(a.id) ? (isTr ? 'Karşılaştırmadan çıkar' : 'Deselect from compare') : (isTr ? 'Karşılaştırmaya ekle' : 'Select to compare')}
                            >
                              {compareIds.includes(a.id) && <Check className="w-3 h-3 text-white" />}
                            </button>
                          )}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${isHeart ? getRiskBadgeClasses(a.risk_level) : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>
                                {isHeart ? <Heart className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
                                {isTr ? (isHeart ? 'Kalp' : 'Diyabet') : (isHeart ? 'Heart' : 'Diabetes')}
                              </span>
                              <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium border ${getRiskBadgeClasses(a.risk_level)}`}>
                                {a.risk_level} · {(a.probability * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="text-sm text-gray-400 mt-1 line-clamp-2 max-w-md [&_strong]:font-semibold [&_strong]:text-gray-200">
                              <ReactMarkdown components={{ p: ({ children }) => <span>{children}</span>, strong: ({ children }) => <strong>{children}</strong> }}>{isHeart ? (a.executive_summary || '') : (a.executive_summary || '')}</ReactMarkdown>
                            </div>
                            {a.created_at && (
                              <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(a.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })} · {new Date(a.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </div>
                        </div>
                        {!compareMode && (
                          <div className="flex gap-1 shrink-0 ml-3" onClick={(e) => e.stopPropagation()}>
                            {isHeart ? (
                              <>
                                <button type="button" onClick={(e) => { e.stopPropagation(); exportSignedHeartPDF(a); }} disabled={pdfLoading === a.id} className={`p-1.5 rounded-lg hover:bg-white/[0.05] text-gray-500 ${accentHover} transition focus:outline-none focus:ring-2`} title={isTr ? 'PDF İndir' : 'Download PDF'} aria-label={isTr ? 'PDF İndir' : 'Download PDF'}>
                                  {pdfLoading === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                </button>
                                <button type="button" onClick={(e) => { e.stopPropagation(); handleShareHeart(a.id); }} disabled={shareLoading === a.id} className={`p-1.5 rounded-lg hover:bg-white/[0.05] text-gray-500 ${accentHover} transition focus:outline-none focus:ring-2`} title={isTr ? 'Paylaş' : 'Share'} aria-label={isTr ? 'Paylaş' : 'Share'}>
                                  {shareLoading === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                                </button>
                                <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteHeartAssessment(a); }} disabled={deletingId === `h-${a.id}`} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition focus:outline-none focus:ring-2 focus:ring-red-500/50" title={isTr ? 'Sil' : 'Delete'} aria-label={isTr ? 'Sil' : 'Delete'}>
                                  {deletingId === `h-${a.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </button>
                              </>
                            ) : (
                              <>
                                <button type="button" onClick={(e) => { e.stopPropagation(); exportSignedAssessmentPDF(a); }} disabled={pdfLoading === a.id} className={`p-1.5 rounded-lg hover:bg-white/[0.05] text-gray-500 ${accentHover} transition focus:outline-none focus:ring-2 focus:ring-emerald-500/50`} title={isTr ? 'İmzalı PDF İndir' : 'Download Signed PDF'} aria-label={isTr ? 'İmzalı PDF İndir' : 'Download Signed PDF'}>
                                  {pdfLoading === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                </button>
                                <button type="button" onClick={(e) => { e.stopPropagation(); handleShare(a.id); }} disabled={shareLoading === a.id} className={`p-1.5 rounded-lg hover:bg-white/[0.05] text-gray-500 ${accentHover} transition focus:outline-none focus:ring-2 focus:ring-emerald-500/50`} title={isTr ? 'Paylaş' : 'Share'} aria-label={isTr ? 'Paylaş' : 'Share'}>
                                  {shareLoading === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                                </button>
                                <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteAssessment(a); }} disabled={deletingId === `a-${a.id}`} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition focus:outline-none focus:ring-2 focus:ring-red-500/50" title={isTr ? 'Sil' : 'Delete'} aria-label={isTr ? 'Sil' : 'Delete'}>
                                  {deletingId === `a-${a.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      {shareLinkMatch && (
                        <div className={`mt-2 p-2 rounded-lg border ${isHeart ? getRiskBadgeClasses(a.risk_level) : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                          <p className={`text-xs ${isHeart ? '' : 'text-emerald-400'}`}>{isTr ? 'Link kopyalandı:' : 'Link copied:'}</p>
                          <p className={`text-xs break-all opacity-90 ${isHeart ? '' : 'text-emerald-300'}`}>{shareLink.link}</p>
                        </div>
                      )}
                    </li>
                  );
                })}
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
            <>
              <div className="flex flex-wrap gap-3 mb-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" aria-hidden="true" />
                  <input
                    type="text"
                    value={dietPlanSearch}
                    onChange={(e) => setDietPlanSearch(e.target.value)}
                    placeholder={isTr ? 'Ara (hedef, özet…)' : 'Search (goal, overview…)'}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                    aria-label={isTr ? 'Diyet planı ara' : 'Search diet plans'}
                  />
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <Calendar className="w-4 h-4 text-gray-500" aria-hidden="true" />
                  <input type="date" value={dietPlanDateFrom} onChange={(e) => setDietPlanDateFrom(e.target.value)} className="py-2 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" title={isTr ? 'Başlangıç' : 'From'} aria-label={isTr ? 'Başlangıç tarihi' : 'From date'} />
                  <span className="text-gray-500 text-sm">–</span>
                  <input type="date" value={dietPlanDateTo} onChange={(e) => setDietPlanDateTo(e.target.value)} className="py-2 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" title={isTr ? 'Bitiş' : 'To'} aria-label={isTr ? 'Bitiş tarihi' : 'To date'} />
                </div>
              </div>
              {(dietPlanSearch || dietPlanDateFrom || dietPlanDateTo) && (
                <div className="flex flex-wrap gap-2 mb-4 items-center">
                  {dietPlanSearch && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 text-xs border border-cyan-500/25">
                      {isTr ? 'Ara' : 'Search'}: {dietPlanSearch}
                      <button type="button" onClick={() => setDietPlanSearch('')} className="hover:bg-cyan-500/20 rounded p-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" aria-label={isTr ? 'Kaldır' : 'Remove'}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {dietPlanDateFrom && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.08] text-gray-300 text-xs border border-white/[0.12]">
                      {isTr ? 'Başlangıç' : 'From'}: {dietPlanDateFrom}
                      <button type="button" onClick={() => setDietPlanDateFrom('')} className="hover:bg-white/10 rounded p-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" aria-label={isTr ? 'Kaldır' : 'Remove'}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {dietPlanDateTo && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.08] text-gray-300 text-xs border border-white/[0.12]">
                      {isTr ? 'Bitiş' : 'To'}: {dietPlanDateTo}
                      <button type="button" onClick={() => setDietPlanDateTo('')} className="hover:bg-white/10 rounded p-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" aria-label={isTr ? 'Kaldır' : 'Remove'}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  <button type="button" onClick={() => { setDietPlanSearch(''); setDietPlanDateFrom(''); setDietPlanDateTo(''); }} className="text-xs text-emerald-400 hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 rounded px-2 py-1">
                    {isTr ? 'Filtreleri temizle' : 'Clear all'}
                  </button>
                </div>
              )}
            </>
          )}

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] animate-pulse">
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-4 w-40 rounded bg-white/[0.08]" />
                      <div className="h-3 w-full max-w-md rounded bg-white/[0.06]" />
                      <div className="h-3 w-36 rounded bg-white/[0.06] mt-1.5" />
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <div className="h-9 w-9 rounded-lg bg-white/[0.06]" />
                      <div className="h-9 w-9 rounded-lg bg-white/[0.06]" />
                      <div className="h-9 w-9 rounded-lg bg-white/[0.06]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : dietPlans.length === 0 ? (
            <div className="text-center py-14 px-6 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02]">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-4">
                <Salad className="w-7 h-7 text-cyan-400" />
              </div>
              <h3 className="text-white font-semibold mb-1">{isTr ? 'Henüz diyet planı yok' : 'No diet plans yet'}</h3>
              <p className="text-gray-400 text-sm max-w-sm mx-auto mb-5">{isTr ? 'Hedefinize uygun kişiselleştirilmiş bir diyet planı oluşturun.' : 'Create a personalized diet plan for your goals.'}</p>
              <Link to={ROUTES.DIET_PLAN} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-[#060611]">
                {isTr ? 'Bir plan oluşturun' : 'Create a plan'} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : filteredDietPlans.length === 0 ? (
            <div className="text-center py-10 px-6 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02]">
              <Search className="w-10 h-10 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400 mb-3">{isTr ? 'Filtreye uyan diyet planı yok.' : 'No diet plans match the filters.'}</p>
              <button type="button" onClick={() => { setDietPlanSearch(''); setDietPlanDateFrom(''); setDietPlanDateTo(''); }} className="text-sm text-emerald-400 hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 rounded-lg px-3 py-1.5">
                {isTr ? 'Filtreleri temizle' : 'Clear filters'}
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {filteredDietPlans.map((d) => {
                const payload = d.payload || {};
                return (
                  <li key={d.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] border-l-4 border-l-emerald-500/50 hover:border-emerald-500/30 transition">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white">{dietGoalDisplay(d.goal, isTr)}</p>
                        <p className="text-sm text-gray-400 line-clamp-2 mt-1">{d.overview}</p>
                        {d.created_at && (
                          <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(d.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })} · {formatTime(d.created_at)}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => navigate(`${ROUTES.DASHBOARD_DIET_PLAN}/${d.id}`, { state: { dietPlan: d } })} className="p-2 rounded-lg hover:bg-white/[0.05] text-gray-500 hover:text-emerald-400 transition focus:outline-none focus:ring-2 focus:ring-emerald-500/50" title={isTr ? 'Planı görüntüle' : 'View plan'} aria-label={isTr ? 'Planı görüntüle' : 'View plan'}>
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
                            className="p-2 rounded-lg hover:bg-white/[0.05] text-gray-500 hover:text-emerald-400 transition focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            title={isTr ? 'Alışveriş Listesi' : 'Grocery List'}
                            aria-label={isTr ? 'Alışveriş listesini indir' : 'Download grocery list'}
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => handleDeleteDietPlan(d)} disabled={deletingId === `d-${d.id}`} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition focus:outline-none focus:ring-2 focus:ring-red-500/50" title={isTr ? 'Sil' : 'Delete'} aria-label={isTr ? 'Sil' : 'Delete'}>
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

      {activeTab === 'subscription' && (
        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white tracking-tight">{isTr ? 'Aboneliğim' : 'My subscription'}</h2>
            <p className="text-gray-400 text-sm mt-1">{isTr ? 'Mevcut planınızı görüntüleyin ve yönetin.' : 'View and manage your current plan.'}</p>
          </div>

          {subscriptionConfirmError && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm px-4 py-3 flex items-center justify-between gap-3">
              <span>{subscriptionConfirmError}</span>
              <button type="button" onClick={() => setSubscriptionConfirmError(null)} className="shrink-0 p-1 rounded hover:bg-amber-500/20" aria-label="Dismiss">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <FluidCard className={`overflow-hidden rounded-2xl border cursor-grab active:cursor-grabbing transition-all ${
            (user?.subscription_tier === 'pro_monthly' || user?.subscription_tier === 'pro_yearly')
              ? 'bg-gradient-to-br from-emerald-500/[0.08] via-white/[0.03] to-cyan-500/[0.06] border-emerald-500/25 shadow-lg shadow-emerald-500/5'
              : 'bg-gradient-to-br from-white/[0.04] to-white/[0.02] border-white/[0.08]'
          }`}>
            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                    (user?.subscription_tier === 'pro_monthly' || user?.subscription_tier === 'pro_yearly')
                      ? 'bg-emerald-500/20 ring-2 ring-emerald-500/30'
                      : 'bg-white/[0.08] ring-1 ring-white/[0.1]'
                  }`}>
                    {(user?.subscription_tier === 'pro_monthly' || user?.subscription_tier === 'pro_yearly') ? (
                      <Sparkles className="w-7 h-7 text-emerald-400" />
                    ) : (
                      <CreditCard className="w-7 h-7 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                        (user?.subscription_tier === 'pro_monthly' || user?.subscription_tier === 'pro_yearly')
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-white/[0.1] text-gray-200 border border-white/[0.12]'
                      }`}>
                        {(user?.subscription_tier === 'pro_monthly' || user?.subscription_tier === 'pro_yearly')
                          ? (user.subscription_tier === 'pro_yearly' ? (isTr ? 'Pro (Yıllık) tier' : 'Pro (Yearly) tier') : (isTr ? 'Pro (Aylık) tier' : 'Pro (Monthly) tier'))
                          : (isTr ? 'Ücretsiz tier' : 'Free tier')}
                      </span>
                      {user?.subscription_status === 'active' && (user?.subscription_tier === 'pro_monthly' || user?.subscription_tier === 'pro_yearly') && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                          {isTr ? 'Aktif' : 'Active'}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mt-2">
                      {user?.subscription_status === 'active' && user?.current_period_end
                        ? (isTr ? `Sonraki ödeme: ${new Date(user.current_period_end).toLocaleDateString()}` : `Next billing: ${new Date(user.current_period_end).toLocaleDateString()}`)
                        : (isTr ? 'Tüm araçlar ücretsiz. İstediğiniz zaman Pro\'ya geçebilirsiniz.' : 'All tools are free. Upgrade to Pro anytime for early access to new features.')}
                    </p>
                    {(user?.subscription_tier === 'pro_monthly' || user?.subscription_tier === 'pro_yearly') ? (
                      <p className="text-emerald-400/90 text-xs mt-1.5">{isTr ? 'Yeni özelliklere erken erişim.' : 'Early access to new features.'}</p>
                    ) : (
                      <p className="text-gray-500 text-xs mt-1.5">{isTr ? 'Assessment, Chat, Diyet, Ses ve daha fazlası.' : 'Assessment, Chat, Diet, Voice & more.'}</p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0">
                  {(user?.subscription_tier === 'pro_monthly' || user?.subscription_tier === 'pro_yearly') ? (
                    <button
                      type="button"
                      onClick={async () => {
                        setPortalLoading(true);
                        try {
                          const { url } = await apiService.createPortalSession();
                          if (url) window.location.href = url;
                        } catch (err) {
                          alert(err.message || (isTr ? 'Portal açılamadı.' : 'Could not open portal.'));
                        } finally {
                          setPortalLoading(false);
                        }
                      }}
                      disabled={portalLoading}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.1] hover:bg-white/[0.15] text-white text-sm font-medium border border-white/[0.15] transition focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                      {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {isTr ? 'Aboneliği yönet' : 'Manage subscription'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate(ROUTES.PRICING)}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold shadow-lg shadow-emerald-500/25 border border-emerald-400/30 transition focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-[#060611]"
                    >
                      <Sparkles className="w-4 h-4" />
                      {isTr ? "Pro'ya geç" : 'Upgrade to Pro'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </FluidCard>
        </section>
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
  const [dietDropdownOpen, setDietDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const dietDropdownRef = useRef(null);
  const langDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dietDropdownRef.current && !dietDropdownRef.current.contains(e.target)) setDietDropdownOpen(false);
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target)) setLangDropdownOpen(false);
    }
    if (dietDropdownOpen || langDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dietDropdownOpen, langDropdownOpen]);

  // Feature f15: 2FA state
  const [show2FA, setShow2FA] = useState(false);
  const [twoFAData, setTwoFAData] = useState(null);
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFALoading, setTwoFALoading] = useState(false);

  // Face login
  const [hasFace, setHasFace] = useState(false);
  const [faceEnabled, setFaceEnabled] = useState(false);
  const [faceEnrollLoading, setFaceEnrollLoading] = useState(false);
  const [faceEnrollOpen, setFaceEnrollOpen] = useState(false);
  const [faceCameraActive, setFaceCameraActive] = useState(false);
  const [faceToggleLoading, setFaceToggleLoading] = useState(false);
  const faceVideoRef = useRef(null);
  const faceStreamRef = useRef(null);

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

  useEffect(() => {
    if (!user) return;
    faceStatus().then((r) => {
      setHasFace(!!r.enrolled);
      setFaceEnabled(!!r.enabled);
    }).catch(() => { setHasFace(false); setFaceEnabled(false); });
  }, [user]);

  // Preload face models as soon as the modal opens so Capture is faster
  useEffect(() => {
    if (faceEnrollOpen) {
      import('../utils/faceEmbedding').then((m) => m.preloadFaceModels());
    }
  }, [faceEnrollOpen]);

  const handleFaceToggle = async () => {
    setFaceToggleLoading(true);
    setMessage('');
    try {
      const next = !faceEnabled;
      await faceToggleEnabled(next);
      setFaceEnabled(next);
      showMessage(next ? (isTr ? 'Yüz girişi açıldı.' : 'Face login enabled.') : (isTr ? 'Yüz girişi kapatıldı.' : 'Face login disabled.'));
      // Refetch so UI stays in sync with server
      faceStatus().then((r) => { setHasFace(!!r.enrolled); setFaceEnabled(!!r.enabled); }).catch(() => {});
    } catch (e) {
      const msg = (e && e.message) || '';
      const is404 = /404|not enrolled/i.test(msg);
      showMessage(is404 ? (isTr ? 'Yüz kaydı bulunamadı. Lütfen önce yüz kaydı oluşturun.' : 'Face login not set up. Set it up first.') : (msg || (isTr ? 'Ayar güncellenemedi.' : 'Could not update setting.')), 'error');
      faceStatus().then((r) => { setHasFace(!!r.enrolled); setFaceEnabled(!!r.enabled); }).catch(() => {});
    } finally {
      setFaceToggleLoading(false);
    }
  };

  const startFaceEnrollCamera = async () => {
    if (!faceVideoRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      faceStreamRef.current = stream;
      faceVideoRef.current.srcObject = stream;
      setFaceCameraActive(true);
    } catch (e) {
      showMessage(e.message || (isTr ? 'Kamera erişilemedi.' : 'Camera access denied.'), 'error');
    }
  };

  const captureAndEnrollFace = async () => {
    setFaceEnrollLoading(true);
    setMessage('');
    try {
      const { getFaceEmbedding } = await import('../utils/faceEmbedding');
      const embedding = await getFaceEmbedding(faceVideoRef.current);
      if (!embedding || embedding.length === 0) {
        showMessage(isTr ? 'Yüz algılanamadı.' : 'No face detected.', 'error');
        setFaceEnrollLoading(false);
        return;
      }
      await faceEnroll(embedding);
      if (faceStreamRef.current) faceStreamRef.current.getTracks().forEach((t) => t.stop());
      setFaceCameraActive(false);
      setFaceEnrollOpen(false);
      setHasFace(true);
      showMessage(isTr ? 'Yüz kaydı tamamlandı.' : 'Face enrollment complete.');
    } catch (e) {
      showMessage(e.message || (isTr ? 'Yüz kaydı başarısız.' : 'Face enrollment failed.'), 'error');
    } finally {
      setFaceEnrollLoading(false);
    }
  };

  const closeFaceEnroll = () => {
    if (faceStreamRef.current) faceStreamRef.current.getTracks().forEach((t) => t.stop());
    setFaceCameraActive(false);
    setFaceEnrollOpen(false);
  };

  const showMessage = (msg, type = 'success') => {
    haptic(type === 'error' ? 'error' : 'success');
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
      <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md pb-8">
        <h3 className="text-white font-medium">{isTr ? 'Profil bilgileri' : 'Profile info'}</h3>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{isTr ? 'Ad Soyad' : 'Full name'}</label>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500/50" />
        </div>
        <div ref={langDropdownRef} className="relative">
          <label className="block text-sm text-gray-400 mb-1">{isTr ? 'Dil' : 'Language'}</label>
          <button
            type="button"
            onClick={() => setLangDropdownOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500/50 text-left"
          >
            <span>{preferredLanguage === 'turkish' ? 'Türkçe' : 'English'}</span>
            <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${langDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {langDropdownOpen && (
            <div className="absolute z-20 mt-1 w-full rounded-lg border border-white/[0.08] bg-[#1a1a2e] shadow-xl py-1">
              <button type="button" onClick={() => { setPreferredLanguage('english'); setLangDropdownOpen(false); }} className={`w-full px-4 py-2.5 text-left text-sm transition ${preferredLanguage === 'english' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-200 hover:bg-white/[0.06] hover:text-white'}`}>English</button>
              <button type="button" onClick={() => { setPreferredLanguage('turkish'); setLangDropdownOpen(false); }} className={`w-full px-4 py-2.5 text-left text-sm transition ${preferredLanguage === 'turkish' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-200 hover:bg-white/[0.06] hover:text-white'}`}>Türkçe</button>
            </div>
          )}
        </div>

        {/* Feature f8: Diet preferences */}
        <div className="pt-2">
          <h3 className="text-white font-medium mb-3">{isTr ? 'Diyet Tercihleri' : 'Diet Preferences'}</h3>
          <div className="space-y-4">
            <div ref={dietDropdownRef} className="relative">
              <label className="block text-sm text-gray-400 mb-1">{isTr ? 'Diyet tipi' : 'Dietary preference'}</label>
              <button
                type="button"
                onClick={() => setDietDropdownOpen((o) => !o)}
                className="w-full flex items-center justify-between pl-4 pr-3 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500/50 text-left"
              >
                <span className={dietPref ? 'text-white' : 'text-gray-500'}>
                  {dietPref === 'balanced' ? (isTr ? 'Dengeli' : 'Balanced') : dietPref === 'vegetarian' ? (isTr ? 'Vejetaryen' : 'Vegetarian') : dietPref === 'vegan' ? 'Vegan' : dietPref === 'mediterranean' ? (isTr ? 'Akdeniz' : 'Mediterranean') : dietPref === 'low_carb' ? (isTr ? 'Düşük Karbonhidrat' : 'Low Carb') : dietPref === 'diabetic_friendly' ? (isTr ? 'Diyabet Dostu' : 'Diabetic Friendly') : (isTr ? 'Seçin...' : 'Select...')}
                </span>
                <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${dietDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {dietDropdownOpen && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-white/[0.08] bg-[#1a1a2e] shadow-xl py-1 max-h-56 overflow-y-auto">
                  {[
                    { value: '', labelEn: 'Select...', labelTr: 'Seçin...' },
                    { value: 'balanced', labelEn: 'Balanced', labelTr: 'Dengeli' },
                    { value: 'vegetarian', labelEn: 'Vegetarian', labelTr: 'Vejetaryen' },
                    { value: 'vegan', labelEn: 'Vegan', labelTr: 'Vegan' },
                    { value: 'mediterranean', labelEn: 'Mediterranean', labelTr: 'Akdeniz' },
                    { value: 'low_carb', labelEn: 'Low Carb', labelTr: 'Düşük Karbonhidrat' },
                    { value: 'diabetic_friendly', labelEn: 'Diabetic Friendly', labelTr: 'Diyabet Dostu' },
                  ].map((opt) => (
                    <button
                      key={opt.value || 'empty'}
                      type="button"
                      onClick={() => { setDietPref(opt.value); setDietDropdownOpen(false); }}
                      className={`w-full px-4 py-2.5 text-left text-sm transition ${opt.value === dietPref ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-200 hover:bg-white/[0.06] hover:text-white'}`}
                    >
                      {isTr ? opt.labelTr : opt.labelEn}
                    </button>
                  ))}
                </div>
              )}
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
          </div>
        </div>

        <div className="pt-4">
          <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium disabled:opacity-50 transition">
            {saving ? (isTr ? 'Kaydediliyor…' : 'Saving…') : (isTr ? 'Kaydet' : 'Save')}
          </button>
        </div>
      </form>

      {/* Face login: full control */}
      <div className="space-y-4 max-w-md pt-8 pb-4">
        <h3 className="text-white font-medium">{isTr ? 'Yüz ile giriş' : 'Face login'}</h3>
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-4">
          <div className="flex items-center gap-2">
            <ScanFace className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-gray-300">{isTr ? 'Giriş sayfasında yüzünüzle otomatik giriş yapın.' : 'Sign in on the login page with your face.'}</span>
          </div>
          {!hasFace ? (
            <button type="button" onClick={() => setFaceEnrollOpen(true)} className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-sm font-medium hover:bg-emerald-500/25 transition">
              {isTr ? 'Yüz kaydı oluştur' : 'Set up face login'}
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-sm px-2.5 py-1 rounded-lg ${faceEnabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/[0.06] text-gray-400 border border-white/[0.08]'}`}>
                {faceEnabled ? (isTr ? 'Açık' : 'On') : (isTr ? 'Kapalı' : 'Off')}
              </span>
              <button type="button" onClick={handleFaceToggle} disabled={faceToggleLoading} className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-gray-300 hover:text-white border border-white/[0.08] text-sm font-medium disabled:opacity-50 transition">
                {faceToggleLoading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : (faceEnabled ? (isTr ? 'Kapat' : 'Turn off') : (isTr ? 'Aç' : 'Turn on'))}
              </button>
              <button type="button" onClick={() => setFaceEnrollOpen(true)} className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-sm font-medium hover:bg-emerald-500/25 transition">
                {isTr ? 'Yüz taramasını güncelle' : 'Update face scan'}
              </button>
            </div>
          )}
        </div>
      </div>

      {faceEnrollOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={isTr ? 'Yüz kaydı' : 'Face enrollment'}>
          <div className="rounded-2xl bg-[#0c0c14] border border-white/10 p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-white mb-2">{isTr ? 'Yüzünüzü kaydedin' : 'Set up face login'}</h3>
            <p className="text-sm text-gray-500 mb-4">
              {isTr ? 'Kamerayı açın, kameraya bakın ve Kaydet\'e tıklayın.' : 'Start camera, look at it, then click Capture. First time may take a few seconds.'}
            </p>
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video mb-4">
              <video ref={faceVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            </div>
            <div className="flex gap-2">
              {!faceCameraActive ? (
                <button type="button" onClick={startFaceEnrollCamera} className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {isTr ? 'Kamerayı aç' : 'Start camera'}
                </button>
              ) : (
                <button type="button" onClick={captureAndEnrollFace} disabled={faceEnrollLoading} className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-medium disabled:opacity-50">
                  {faceEnrollLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (isTr ? 'Kaydet' : 'Capture')}
                </button>
              )}
              <button type="button" onClick={closeFaceEnroll} className="py-2.5 px-4 rounded-xl border border-white/20 text-gray-400 hover:text-white">
                {isTr ? 'İptal' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                <p className="text-sm text-gray-400">{isTr ? 'Google Authenticator, Microsoft Authenticator veya Authy gibi bir uygulamada bu gizli anahtarı ekleyin:' : 'Use any TOTP app (e.g. Google Authenticator, Microsoft Authenticator, or Authy) and add this secret key:'}</p>
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

      {/* Message Toast (profile-specific: save success, avatar, etc.) */}
      {message && (
        <div role="status" aria-live={messageType === 'success' ? 'polite' : 'assertive'} aria-atomic="true" className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border animate-pulse
          ${messageType === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-red-500/20 border-red-500/30 text-red-400'}`}>
          {messageType === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
          <span className="text-sm font-medium">{message}</span>
        </div>
      )}
    </div>
  );
}
