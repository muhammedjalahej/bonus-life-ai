import React, { useState, useEffect, useCallback, useRef, useId } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { haptic } from '../utils/haptics';
import {
  Users, FileText, UtensilsCrossed, BarChart3, Loader2, ChevronRight,
  Search, RefreshCw, Download, Trash2, UserCheck, UserX, ShieldCheck, ShieldOff,
  X, AlertTriangle, Check, ChevronDown, ChevronUp, Eye, Plus, Megaphone,
  Settings, Clock, CheckCircle, XCircle, Server, Mail, StickyNote, Send,
  CreditCard, Brain, Droplets, LogOut, Heart, Copy, PieChart, BarChart2,
  Activity, UserPlus, Shield, TrendingUp,
} from 'lucide-react';
import { getAvatarUrl, ROUTES } from '../config/constants';
import { buildAndDownloadSignedPDF, buildAndDownloadSignedHeartPDF, buildAndDownloadSignedCKDPDF, buildAndDownloadSignedMriPDF } from '../utils/assessmentPdf';
import apiService from '../services/api';
import { MiniCalendar } from '../components/ui/MiniCalendar';
import { useAuth } from '../context/AuthContext';
import { playValueTone, playCategoryTone } from '../utils/sonification';
import {
  adminGetUsers, adminGetUserProfile, adminGetStats, adminGetAssessments, adminDeleteUser, adminUpdateUser,
  adminCreateUser, adminBulkAction, adminGetChartData, adminGetAuditLog, adminClearAuditLog,
  adminGetAnnouncements, adminCreateAnnouncement, adminUpdateAnnouncement, adminDeleteAnnouncement,
  adminGetSettings, adminUpdateSetting, adminGetSystemHealth,
  adminGetSubscriptionStats, adminGetSubscriptions,
  adminUpdateUserNotes, adminSendEmail, adminBulkEmail, adminGetCKDAssessments,
  adminDeleteAssessment, adminClearAssessments, adminDeleteCKDAssessment, adminClearCKDAssessments,
  adminGetHeartAssessments, adminGetBrainMRIAnalyses, adminGetDietPlans,
  adminDeleteHeartAssessment, adminClearHeartAssessments,
  adminDeleteBrainMRI, adminClearBrainMRI,
  adminDeleteDietPlan, adminClearDietPlans,
  adminResetUserPassword,
} from '../services/api';

/* ===================== REUSABLE COMPONENTS ===================== */

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  useEffect(() => { haptic(type === 'error' ? 'error' : 'success'); }, [type]);
  const colors = { success: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-600', error: 'bg-red-500/20 border-red-500/30 text-red-400', info: 'bg-blue-500/20 border-blue-500/30 text-blue-400' };
  const live = type === 'error' ? 'assertive' : 'polite';
  return (
    <div role="status" aria-live={live} aria-atomic="true" className={`fixed bottom-6 right-6 z-[80] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border ${colors[type] || colors.info}`}>
      {type === 'success' ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
      <span className="text-sm font-medium">{message}</span>
      <button type="button" onClick={onClose} className="ml-2 hover:opacity-70 focus:outline-none" aria-label="Close"><X className="w-4 h-4" /></button>
    </div>
  );
}

function Modal({ isOpen, onClose, title, children, width = 'max-w-md' }) {
  const titleId = useId();
  const containerRef = useFocusTrap(isOpen, onClose);
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]" onClick={onClose} aria-hidden />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] w-full ${width} max-h-[85vh] overflow-auto`}
      >
        <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 id={titleId} className="text-lg font-semibold text-gray-900">{title}</h3>
            <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg focus:outline-none" aria-label="Close"><X className="w-5 h-5 text-gray-500" /></button>
          </div>
          {children}
        </div>
      </div>
    </>
  );
}

function UserAvatar({ user, size = 'sm' }) {
  const s = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  if (user.avatar_url) return <img src={getAvatarUrl(user.avatar_url)} alt="" className={`${s} rounded-full object-cover`} />;
  const i = (user.full_name || user.email || '?').slice(0, 2).toUpperCase();
  return <div className={`${s} rounded-full bg-gray-100 flex items-center justify-center font-medium text-gray-500`}>{i}</div>;
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="p-5 rounded-xl bg-white border border-gray-200 animate-pulse">
          <div className="h-4 bg-white/[0.06] rounded w-1/2 mb-3" /><div className="h-8 bg-white/[0.06] rounded w-1/3" />
        </div>
      ))}
    </div>
  );
}

/* ── Interactive Growth Chart ── */
function GrowthChart({ userRaw, assessRaw }) {
  const [hovered, setHovered] = useState(null); // index
  const svgRef = useRef(null);

  const fillGaps = (raw, days = 30) => {
    const map = {};
    (raw || []).forEach(d => { map[d.date] = d.count; });
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
      const key = d.toISOString().split('T')[0];
      return { date: key, count: map[key] || 0 };
    });
  };

  const userPts  = fillGaps(userRaw, 30);
  const assessPts = fillGaps(assessRaw, 30);
  const totalNewUsers  = userPts.reduce((a, p) => a + p.count, 0);
  const totalNewAssess = assessPts.reduce((a, p) => a + p.count, 0);

  const W = 600, H = 130, padX = 8, padY = 16;
  const maxV = Math.max(...userPts.map(p => p.count), ...assessPts.map(p => p.count), 1);
  const xs = userPts.map((_, i) => padX + (i / (userPts.length - 1)) * (W - padX * 2));
  const uy = userPts.map(p =>  H - padY - ((p.count / maxV) * (H - padY * 2)));
  const ay = assessPts.map(p => H - padY - ((p.count / maxV) * (H - padY * 2)));

  const smooth = (xArr, yArr) => {
    if (xArr.length < 2) return xArr.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${yArr[i]}`).join(' ');
    let d = `M${xArr[0]},${yArr[0]}`;
    for (let i = 1; i < xArr.length; i++) {
      const cp1x = xArr[i-1] + (xArr[i] - xArr[i-1]) / 3;
      const cp2x = xArr[i]   - (xArr[i] - xArr[i-1]) / 3;
      d += ` C${cp1x},${yArr[i-1]} ${cp2x},${yArr[i]} ${xArr[i]},${yArr[i]}`;
    }
    return d;
  };

  const uLine = smooth(xs, uy);
  const aLine = smooth(xs, ay);
  const uArea = `${uLine} L${xs[xs.length-1]},${H} L${xs[0]},${H} Z`;
  const labelIdxs = [0, 7, 14, 21, 29];

  const handleMouseMove = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * W;
    // Find closest x
    let closest = 0, minDist = Infinity;
    xs.forEach((x, i) => { const dist = Math.abs(x - mx); if (dist < minDist) { minDist = dist; closest = i; } });
    setHovered(closest);
  };

  const h = hovered;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">User Growth</p>
          <p className="text-xs text-gray-400 mt-0.5">Registrations & assessments — last 30 days</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-4 h-0.5 rounded-full bg-indigo-500 inline-block" /> Users <span className="font-semibold text-indigo-600">+{totalNewUsers}</span>
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-4 h-0.5 rounded-full bg-emerald-400 inline-block" style={{ borderTop: '2px dashed #34d399', background: 'none', height: 0 }} /> Tests <span className="font-semibold text-emerald-600">+{totalNewAssess}</span>
          </span>
        </div>
      </div>

      <div className="relative select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full cursor-crosshair"
          style={{ height: 130 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHovered(null)}
        >
          <defs>
            <linearGradient id="ug2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Guide lines with Y labels */}
          {[0.25, 0.5, 0.75, 1].map((f, i) => {
            const y = padY + (1 - f) * (H - padY * 2);
            const val = Math.round(f * maxV);
            return (
              <g key={i}>
                <line x1={padX} y1={y} x2={W - padX} y2={y} stroke="#f3f4f6" strokeWidth="1" />
                <text x={padX} y={y - 3} fontSize="8" fill="#d1d5db" textAnchor="start">{val}</text>
              </g>
            );
          })}

          {/* Area + lines */}
          <path d={uArea} fill="url(#ug2)" />
          <path d={aLine} fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 3" />
          <path d={uLine} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Static dots for non-zero days */}
          {xs.map((x, i) => userPts[i].count > 0 && h !== i && (
            <circle key={i} cx={x} cy={uy[i]} r="3" fill="#fff" stroke="#6366f1" strokeWidth="2" />
          ))}
          {xs.map((x, i) => assessPts[i].count > 0 && h !== i && (
            <circle key={`a${i}`} cx={x} cy={ay[i]} r="2.5" fill="#34d399" />
          ))}

          {/* Hover crosshair + highlighted dots */}
          {h != null && (
            <>
              <line x1={xs[h]} y1={padY - 4} x2={xs[h]} y2={H - padY + 4} stroke="#e5e7eb" strokeWidth="1.5" strokeDasharray="3 2" />
              {/* User dot */}
              <circle cx={xs[h]} cy={uy[h]} r="5" fill="#fff" stroke="#6366f1" strokeWidth="2.5" />
              <circle cx={xs[h]} cy={uy[h]} r="2.5" fill="#6366f1" />
              {/* Assess dot */}
              <circle cx={xs[h]} cy={ay[h]} r="4" fill="#fff" stroke="#34d399" strokeWidth="2" />
              <circle cx={xs[h]} cy={ay[h]} r="2" fill="#34d399" />
            </>
          )}
        </svg>

        {/* Floating tooltip */}
        {h != null && (() => {
          const leftPct = (xs[h] / W) * 100;
          const alignRight = leftPct > 65;
          return (
            <div
              className="absolute top-0 pointer-events-none z-10"
              style={{ left: alignRight ? 'auto' : `calc(${leftPct}% + 10px)`, right: alignRight ? `calc(${100 - leftPct}% + 10px)` : 'auto' }}
            >
              <div className="bg-gray-900 text-white rounded-xl px-3 py-2 shadow-xl text-xs whitespace-nowrap">
                <p className="font-semibold text-white/80 mb-1">
                  {new Date(userPts[h].date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
                <div className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                    <span className="text-white/60">New users</span>
                    <span className="font-bold ml-auto pl-4">{userPts[h].count}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-white/60">Assessments</span>
                    <span className="font-bold ml-auto pl-4">{assessPts[h].count}</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2 px-1">
        {labelIdxs.map(i => (
          <span key={i} className={`text-[9px] tabular-nums transition-colors ${hovered === i ? 'text-gray-500 font-semibold' : 'text-gray-300'}`}>
            {new Date(userPts[i]?.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        ))}
      </div>
    </>
  );
}

/* Custom dropdown to replace native <select> */
function Dropdown({ value, onChange, options, className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button onClick={() => setOpen(!open)} type="button"
        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 text-sm hover:border-gray-300 transition min-w-[110px]">
        <span className="truncate">{selected?.label || value}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-[70] min-w-full w-max bg-white border border-gray-200 rounded-xl shadow-2xl py-1 overflow-hidden">
            {options.map(o => (
              <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm transition
                  ${value === o.value ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}>
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* Simple bar chart with optional sonification on hover */
function MiniBarChart({ data, color = 'emerald', label }) {
  if (!data || data.length === 0) return <p className="text-gray-500 text-sm">No data</p>;
  const sliced = data.slice(-14);
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      <div className="flex items-end gap-1 h-24">
        {sliced.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              role="img"
              aria-label={`${d.date}: ${d.count}`}
              className={`w-full rounded-t bg-${color}-500/40 hover:bg-${color}-500/60 transition-all cursor-pointer`}
              style={{ height: `${Math.max((d.count / max) * 100, 4)}%` }}
              title={`${d.date}: ${d.count}`}
              onMouseEnter={() => playValueTone(d.count, max)}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-gray-600 mt-1">
        <span>{data.length > 0 ? data[Math.max(0, data.length - 14)]?.date?.slice(5) : ''}</span>
        <span>{data[data.length - 1]?.date?.slice(5)}</span>
      </div>
    </div>
  );
}

/* Risk pie-like display with sonification on hover */
function RiskDistribution({ data }) {
  if (!data || data.length === 0) return <p className="text-gray-500 text-sm">No data</p>;
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  const getColor = (level) => {
    const l = (level || '').toLowerCase();
    if (l.includes('high')) return { bar: 'bg-red-500', text: 'text-red-600' };
    if (l.includes('moderate') || l.includes('medium')) return { bar: 'bg-amber-400', text: 'text-amber-600' };
    if (l.includes('low') || l.includes('very low')) return { bar: 'bg-emerald-500', text: 'text-emerald-600' };
    return { bar: 'bg-gray-400', text: 'text-gray-500' };
  };
  return (
    <div className="space-y-2.5">
      <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">Risk Level Distribution</p>
      {data.map((d, idx) => {
        const { bar, text } = getColor(d.level);
        return (
          <div
            key={d.level}
            className="flex items-center gap-3 cursor-pointer rounded-lg px-2 py-1 -mx-2 hover:bg-black/[0.03] transition-colors"
            onMouseEnter={() => playCategoryTone(idx, data.length)}
          >
            <span className={`text-xs font-semibold w-20 ${text}`}>{d.level}</span>
            <div className="flex-1 h-2.5 rounded-full bg-black/[0.07] overflow-hidden">
              <div className={`h-full rounded-full ${bar}`} style={{ width: `${(d.count / total) * 100}%` }} />
            </div>
            <span className="text-xs text-gray-500 w-5 text-right font-medium">{d.count}</span>
          </div>
        );
      })}
    </div>
  );
}


/* ===================== MAIN COMPONENT ===================== */

export default function AdminPanel({ language }) {
  const isTr = language === 'turkish';
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try { await logout(); navigate(ROUTES.LOGIN, { replace: true }); } catch (_) {}
  };

  // Tabs: overview | users | assessments | audit | announcements | settings
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => setToast({ message, type });

  // ---------- DATA STATE ----------
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [users, setUsers] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [ckdAssessments, setCKDAssessments] = useState([]);
  const [heartAssessments, setHeartAssessments] = useState([]);
  const [brainMRIAnalyses, setBrainMRIAnalyses] = useState([]);
  const [dietPlans, setDietPlans] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [siteSettings, setSiteSettings] = useState({});
  const [subscriptionStats, setSubscriptionStats] = useState(null);
  const [subscriptionList, setSubscriptionList] = useState([]);
  const [subChartView, setSubChartView] = useState('donut'); // 'bar' | 'donut'
  const [pdfLoading, setPdfLoading] = useState(false);

  // ---------- UI STATE ----------
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [roleFilter, setRoleFilter] = useState('all');
  // Pagination
  const [usersPage, setUsersPage] = useState(1);
  const [assessPage, setAssessPage] = useState(1);
  const [assessSortBy, setAssessSortBy] = useState('newest'); // newest | oldest | high_risk
  const PAGE_SIZE = 15;
  // Reset password modal
  const [resetPwModal, setResetPwModal] = useState({ open: false, user: null });
  const [resetPwValue, setResetPwValue] = useState('');
  // Detail modal for any assessment type
  const [detailModal, setDetailModal] = useState({ open: false, item: null });
  // Styled clear-all confirm
  const [clearAllModal, setClearAllModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, type: '', data: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [assessRiskFilter, setAssessRiskFilter] = useState('all');
  const [assessSearchTerm, setAssessSearchTerm] = useState('');
  const [ckdPredFilter, setCKDPredFilter] = useState('all');
  const [ckdSearchTerm, setCKDSearchTerm] = useState('');
  const [testTypeFilter, setTestTypeFilter] = useState('all'); // 'all' | 'diabetes' | 'ckd'
  const [expandedEngagement, setExpandedEngagement] = useState(null); // index of expanded engagement card
  const [expandedRiskAlert, setExpandedRiskAlert] = useState(null);   // index of expanded risk alert card
  const [selectedCKDAssessment, setSelectedCKDAssessment] = useState(null);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnMsg, setNewAnnMsg] = useState('');
  const [newAnnExpires, setNewAnnExpires] = useState('');
  const [annCalOpen, setAnnCalOpen] = useState(false);
  const annCalAnchorRef = useRef(null);
  // Feature f12: user notes
  const [userProfileModal, setUserProfileModal] = useState({ open: false, userId: null, data: null, loading: false });
  const [notesModal, setNotesModal] = useState({ open: false, user: null });
  const [notesText, setNotesText] = useState('');
  // Feature f13: send email to individual user
  const [emailModal, setEmailModal] = useState({ open: false, user: null });
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  // Feature f14: bulk email
  const [bulkEmailModal, setBulkEmailModal] = useState(false);
  const [bulkEmailSubject, setBulkEmailSubject] = useState('');
  const [bulkEmailBody, setBulkEmailBody] = useState('');
  const [bulkEmailRole, setBulkEmailRole] = useState('all');

  // ---------- FETCH ----------
  const fetchTab = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const [s, c, h] = await Promise.all([adminGetStats(), adminGetChartData(30), adminGetSystemHealth()]);
        setStats(s); setChartData(c); setSystemHealth(h);
      } else if (activeTab === 'users') {
        const d = await adminGetUsers(0, 500);
        setUsers(Array.isArray(d) ? d : []);
      } else if (activeTab === 'assessments') {
        const [d, ckd, heart, brain, diet] = await Promise.all([
          adminGetAssessments(0, 500), adminGetCKDAssessments(0, 500),
          adminGetHeartAssessments(0, 500).catch(() => []),
          adminGetBrainMRIAnalyses(0, 500).catch(() => []),
          adminGetDietPlans(0, 500).catch(() => []),
        ]);
        setAssessments(Array.isArray(d) ? d : []);
        setCKDAssessments(Array.isArray(ckd) ? ckd : []);
        setHeartAssessments(Array.isArray(heart) ? heart : []);
        setBrainMRIAnalyses(Array.isArray(brain) ? brain : []);
        setDietPlans(Array.isArray(diet) ? diet : []);
      } else if (activeTab === 'settings') {
        const [d, h, audit, ann] = await Promise.all([adminGetSettings(), adminGetSystemHealth(), adminGetAuditLog(0, 200), adminGetAnnouncements()]);
        setSiteSettings(d || {});
        setSystemHealth(h);
        setAuditLogs(Array.isArray(audit) ? audit : []);
        setAnnouncements(Array.isArray(ann) ? ann : []);
      } else if (activeTab === 'subscriptions') {
        const [stats, list] = await Promise.all([adminGetSubscriptionStats(), adminGetSubscriptions({ limit: 500 })]);
        setSubscriptionStats(stats || null);
        setSubscriptionList(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      showToast(err.message || 'Load failed', 'error');
    } finally { setLoading(false); }
  }, [activeTab]);

  useEffect(() => { fetchTab(); }, [fetchTab]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); fetchTab(); showToast('Refreshed', 'info'); }
      if (e.key === 'Escape') {
        setUserProfileModal({ open: false, userId: null, data: null, loading: false });
        setResetPwModal({ open: false, user: null });
        setDetailModal({ open: false, item: null });
        setClearAllModal(false);
        setConfirmModal({ open: false, type: '', data: null });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fetchTab]);

  // ---------- USER HELPERS ----------
  const filteredUsers = users
    .filter(u => {
      const term = searchTerm.toLowerCase();
      const matchText = u.email.toLowerCase().includes(term) || (u.full_name || '').toLowerCase().includes(term);
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? u.is_active : !u.is_active);
      return matchText && matchRole && matchStatus;
    })
    .sort((a, b) => {
      let aV = a[sortField], bV = b[sortField];
      if (sortField === 'created_at') { aV = aV ? new Date(aV).getTime() : 0; bV = bV ? new Date(bV).getTime() : 0; }
      if (typeof aV === 'string') aV = aV.toLowerCase();
      if (typeof bV === 'string') bV = bV.toLowerCase();
      if (aV < bV) return sortDir === 'asc' ? -1 : 1;
      if (aV > bV) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const toggleSort = (f) => { if (sortField === f) setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); else { setSortField(f); setSortDir('asc'); } };
  const SortIcon = ({ field }) => sortField !== field ? <ChevronDown className="w-3 h-3 opacity-30" /> : sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  const toggleSelectUser = (id) => setSelectedUserIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = () => {
    if (selectedUserIds.length === filteredUsers.length) setSelectedUserIds([]);
    else setSelectedUserIds(filteredUsers.map(u => u.id));
  };

  const exportCSV = () => {
    const headers = ['ID', 'Email', 'Full Name', 'Role', 'Active', 'Language', 'Created At'];
    const rows = filteredUsers.map(u => [u.id, u.email, u.full_name || '', u.role, u.is_active ? 'Yes' : 'No', u.preferred_language, u.created_at || '']);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `users_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    showToast('CSV exported');
  };

  // ---------- ACTIONS ----------
  const handleDeleteUser = async () => {
    setActionLoading(true);
    try { await adminDeleteUser(confirmModal.data.id); setUsers(p => p.filter(u => u.id !== confirmModal.data.id)); showToast('User deleted'); }
    catch (err) { showToast(err.message || 'Delete failed', 'error'); }
    finally { setActionLoading(false); setConfirmModal({ open: false, type: '', data: null }); }
  };

  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try { await adminUpdateUser(userId, { role: newRole }); setUsers(p => p.map(u => u.id === userId ? { ...u, role: newRole } : u)); showToast('Role updated'); }
    catch (err) { showToast(err.message || 'Failed', 'error'); }
  };

  const handleToggleActive = async (userId, currentActive) => {
    try { await adminUpdateUser(userId, { is_active: !currentActive }); setUsers(p => p.map(u => u.id === userId ? { ...u, is_active: !currentActive } : u)); showToast('Status updated'); }
    catch (err) { showToast(err.message || 'Failed', 'error'); }
  };

  const handleBulkAction = async (action) => {
    if (selectedUserIds.length === 0) return;
    setActionLoading(true);
    try {
      await adminBulkAction(selectedUserIds, action);
      if (action === 'delete') setUsers(p => p.filter(u => !selectedUserIds.includes(u.id)));
      else if (action === 'deactivate') setUsers(p => p.map(u => selectedUserIds.includes(u.id) ? { ...u, is_active: false } : u));
      else setUsers(p => p.map(u => selectedUserIds.includes(u.id) ? { ...u, is_active: true } : u));
      setSelectedUserIds([]);
      showToast(`Bulk ${action} done`);
    } catch (err) { showToast(err.message || 'Failed', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    setActionLoading(true);
    try {
      await adminCreateUser({ email: fd.get('email'), password: fd.get('password'), full_name: fd.get('full_name'), role: fd.get('role') });
      showToast('User created');
      setCreateUserOpen(false);
      fetchTab();
    } catch (err) { showToast(err.message || 'Failed', 'error'); }
    finally { setActionLoading(false); }
  };

  // Announcements
  const handleCreateAnnouncement = async () => {
    if (!newAnnTitle.trim()) return;
    try {
      await adminCreateAnnouncement({ title: newAnnTitle, message: newAnnMsg, is_active: true, expires_at: newAnnExpires || null });
      setNewAnnTitle(''); setNewAnnMsg(''); setNewAnnExpires('');
      showToast('Announcement created');
      fetchTab();
    } catch (err) { showToast(err.message || 'Failed', 'error'); }
  };

  const handleToggleAnnouncement = async (ann) => {
    try { await adminUpdateAnnouncement(ann.id, { title: ann.title, message: ann.message, is_active: !ann.is_active }); fetchTab(); showToast('Updated'); }
    catch (err) { showToast(err.message || 'Failed', 'error'); }
  };

  const handleDeleteAnnouncement = async (id) => {
    try { await adminDeleteAnnouncement(id); fetchTab(); showToast('Deleted'); }
    catch (err) { showToast(err.message || 'Failed', 'error'); }
  };

  // Settings
  const handleToggleSetting = async (key, currentVal) => {
    const newVal = currentVal === 'true' ? 'false' : 'true';
    try { await adminUpdateSetting(key, newVal); setSiteSettings(p => ({ ...p, [key]: newVal })); showToast('Setting updated'); }
    catch (err) { showToast(err.message || 'Failed', 'error'); }
  };

  // Feature f12: save user notes
  const handleSaveNotes = async () => {
    if (!notesModal.user) return;
    setActionLoading(true);
    try {
      await adminUpdateUserNotes(notesModal.user.id, notesText);
      setUsers(prev => prev.map(u => u.id === notesModal.user.id ? { ...u, admin_notes: notesText } : u));
      showToast('Notes saved');
      setNotesModal({ open: false, user: null });
    } catch (err) { showToast(err.message || 'Failed', 'error'); }
    finally { setActionLoading(false); }
  };

  // Feature f13: send email to user
  const handleSendEmail = async () => {
    if (!emailModal.user || !emailSubject.trim()) return;
    setActionLoading(true);
    try {
      await adminSendEmail(emailModal.user.id, emailSubject, emailBody);
      showToast(`Email sent to ${emailModal.user.email}`);
      setEmailModal({ open: false, user: null });
      setEmailSubject(''); setEmailBody('');
    } catch (err) { showToast(err.message || 'Failed to send email', 'error'); }
    finally { setActionLoading(false); }
  };

  // Feature f14: bulk email
  const handleBulkEmailSend = async () => {
    if (!bulkEmailSubject.trim()) return;
    setActionLoading(true);
    try {
      const roleFilter = bulkEmailRole === 'all' ? null : bulkEmailRole;
      const result = await adminBulkEmail(bulkEmailSubject, bulkEmailBody, null, roleFilter);
      showToast(result.message || 'Emails sent');
      setBulkEmailModal(false);
      setBulkEmailSubject(''); setBulkEmailBody('');
    } catch (err) { showToast(err.message || 'Failed', 'error'); }
    finally { setActionLoading(false); }
  };

  // Assessment filters (diabetes)
  const filteredAssessments = assessments.filter(a => {
    const matchRisk = assessRiskFilter === 'all' || a.risk_level === assessRiskFilter;
    const matchSearch = assessSearchTerm === '' || (a.user_email || '').toLowerCase().includes(assessSearchTerm.toLowerCase());
    return matchRisk && matchSearch;
  });

  // CKD assessment filters
  const filteredCKDAssessments = ckdAssessments.filter(a => {
    const matchPred = ckdPredFilter === 'all' || (a.prediction || '').toLowerCase() === ckdPredFilter.toLowerCase();
    const matchSearch = ckdSearchTerm === '' || (a.user_email || '').toLowerCase().includes(ckdSearchTerm.toLowerCase());
    return matchPred && matchSearch;
  });

  // ---------- USER PROFILE ----------
  const openUserProfile = async (u) => {
    // Show modal immediately with basic data from the users list
    const basicData = {
      id: u.id, email: u.email, full_name: u.full_name || '',
      role: u.role, is_active: u.is_active,
      preferred_language: u.preferred_language || 'english',
      avatar_url: u.avatar_url, admin_notes: u.admin_notes || '',
      created_at: u.created_at,
      subscription_tier: u.subscription_tier || 'free',
      subscription_status: u.subscription_status || '',
      stripe_customer_id: null,
      activity: { diabetes: 0, heart: 0, ckd: 0, brain_mri: 0, diet_plans: 0 },
      total_tests: 0, most_used: '—',
    };
    setUserProfileModal({ open: true, userId: u.id, data: basicData, loading: true });
    // Then enrich with full activity data
    try {
      const full = await adminGetUserProfile(u.id);
      setUserProfileModal({ open: true, userId: u.id, data: full, loading: false });
    } catch {
      // Keep the modal open with basic data, just stop the loading spinner
      setUserProfileModal(prev => ({ ...prev, loading: false }));
    }
  };

  // ---------- ASSESSMENT DELETE HANDLERS (component level) ----------
  const handleDeleteAssessmentItem = async (item) => {
    try {
      if (item._type === 'diabetes') {
        await adminDeleteAssessment(item.id);
        setAssessments(p => p.filter(x => x.id !== item.id));
      } else if (item._type === 'ckd') {
        await adminDeleteCKDAssessment(item.id);
        setCKDAssessments(p => p.filter(x => x.id !== item.id));
      } else if (item._type === 'heart') {
        await adminDeleteHeartAssessment(item.id);
        setHeartAssessments(p => p.filter(x => x.id !== item.id));
      } else if (item._type === 'brain') {
        await adminDeleteBrainMRI(item.id);
        setBrainMRIAnalyses(p => p.filter(x => x.id !== item.id));
      } else if (item._type === 'diet') {
        await adminDeleteDietPlan(item.id);
        setDietPlans(p => p.filter(x => x.id !== item.id));
      }
      showToast('Hidden from admin view — user data preserved');
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error');
    }
  };

  const handleResetPassword = async () => {
    if (!resetPwValue || resetPwValue.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
    setActionLoading(true);
    try {
      await adminResetUserPassword(resetPwModal.user.id, resetPwValue);
      showToast('Password reset successfully');
      setResetPwModal({ open: false, user: null }); setResetPwValue('');
    } catch (err) { showToast(err.message || 'Failed', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleClearAllAssessments = async () => {
    setClearAllModal(false);
    setActionLoading(true);
    try {
      if (testTypeFilter === 'all' || testTypeFilter === 'diabetes') { await adminClearAssessments(); setAssessments([]); }
      if (testTypeFilter === 'all' || testTypeFilter === 'ckd') { await adminClearCKDAssessments(); setCKDAssessments([]); }
      if (testTypeFilter === 'all' || testTypeFilter === 'heart') { await adminClearHeartAssessments(); setHeartAssessments([]); }
      if (testTypeFilter === 'all' || testTypeFilter === 'brain') { await adminClearBrainMRI(); setBrainMRIAnalyses([]); }
      if (testTypeFilter === 'all' || testTypeFilter === 'diet') { await adminClearDietPlans(); setDietPlans([]); }
      showToast('Hidden from admin view — user data preserved');
    } catch (err) {
      showToast(err.message || 'Failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };


  /* ===================== RENDER ===================== */

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'assessments', label: 'Assessments', icon: FileText },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
    <div className="fixed inset-0 bg-[#f5f5f7]" style={{ zIndex: 0 }} />
    <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-12" style={{ zIndex: 1 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600 text-xs mt-0.5">Manage users, data, and platform settings</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchTab} disabled={loading} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 transition">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={handleSignOut} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-red-400 hover:bg-red-500/[0.06] border border-gray-200 transition">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl bg-white border border-gray-200 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition
              ${activeTab === t.id ? 'bg-gray-100 text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* ==================== OVERVIEW ==================== */}
      {activeTab === 'overview' && (() => {
        // Derived stats
        const totalRecords = stats ? (
          (stats.total_assessments ?? 0) + (stats.total_heart ?? 0) +
          (stats.total_ckd ?? 0) + (stats.total_brain_mri ?? 0) + (stats.total_diet_plans ?? 0)
        ) : 0;
        const activeRate = stats && stats.total_users > 0
          ? Math.min(100, Math.round((stats.active_users / stats.total_users) * 100)) : 0;

        // Smooth SVG path helper (cubic bezier)
        const smoothPath = (xs, ys) => {
          if (xs.length < 2) return xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ');
          let d = `M${xs[0]},${ys[0]}`;
          for (let i = 1; i < xs.length; i++) {
            const cpx1 = xs[i - 1] + (xs[i] - xs[i - 1]) / 3;
            const cpx2 = xs[i] - (xs[i] - xs[i - 1]) / 3;
            d += ` C${cpx1},${ys[i - 1]} ${cpx2},${ys[i]} ${xs[i]},${ys[i]}`;
          }
          return d;
        };

        // Assessment type breakdown
        const assessTypes = stats ? [
          { l: 'Diabetes', v: stats.total_assessments ?? 0, color: '#60a5fa', filter: 'diabetes' },
          { l: 'Heart', v: stats.total_heart ?? 0, color: '#fb7185', filter: 'heart' },
          { l: 'CKD', v: stats.total_ckd ?? 0, color: '#c084fc', filter: 'ckd' },
          { l: 'Brain MRI', v: stats.total_brain_mri ?? 0, color: '#fbbf24', filter: 'brain' },
          { l: 'Diet Plans', v: stats.total_diet_plans ?? 0, color: '#34d399', filter: 'diet' },
        ] : [];
        const maxAssess = Math.max(...assessTypes.map(a => a.v), 1);

        return (
        <div className="space-y-4">

          {/* ── Hero card ── */}
          <div className="relative overflow-hidden rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, #1e2433 0%, #1a2035 50%, #1c2540 100%)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="pointer-events-none absolute -top-10 -right-10 w-52 h-52 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)' }} />
            <div className="pointer-events-none absolute -bottom-8 left-1/3 w-48 h-32 rounded-full blur-2xl" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)' }} />

            <div className="relative flex items-center gap-4">
              {/* Avatar */}
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-base font-bold text-white/90 shrink-0" style={{ background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(99,102,241,0.3)' }}>
                {(user?.full_name || user?.email || 'A').slice(0, 1).toUpperCase()}
              </div>
              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-semibold mb-0.5">Admin Dashboard</p>
                <h2 className="text-sm font-semibold text-white/90 truncate leading-snug">{user?.full_name || user?.email || 'Admin'}</h2>
                <p className="text-white/30 text-[11px] truncate">{user?.email}</p>
              </div>
              {/* Online + date */}
              <div className="shrink-0 text-right hidden sm:flex flex-col items-end gap-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold" style={{ background: 'rgba(16,185,129,0.12)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.18)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
                </span>
                <p className="text-white/25 text-[10px]">
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>

            {!loading && stats && (
              <div className="relative mt-5 pt-5 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {[
                  { l: 'Total Users',   v: stats.total_users ?? 0,  sub: `${stats.admin_count ?? 0} admin` },
                  { l: 'Active Users',  v: stats.active_users ?? 0, sub: `${activeRate}% rate`, bar: activeRate },
                  { l: 'Total Records', v: totalRecords,              sub: 'all test types' },
                  { l: 'Admins',        v: stats.admin_count ?? 0,  sub: 'full access' },
                ].map((s, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-xl font-bold text-white tabular-nums leading-none">{s.v.toLocaleString()}</p>
                    <p className="text-white/70 text-[11px]">{s.l}</p>
                    {s.bar != null ? (
                      <div className="flex items-center gap-2 pt-0.5">
                        <div className="flex-1 h-px rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
                          <div className="h-full rounded-full" style={{ width: `${s.bar}%`, background: 'rgba(110,231,183,0.8)' }} />
                        </div>
                        <span className="text-[9px] text-white/50 tabular-nums">{s.bar}%</span>
                      </div>
                    ) : (
                      <p className="text-white/40 text-[10px]">{s.sub}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>


          {/* ── Growth Chart ── */}
          {!loading && (
            <div className="p-5 rounded-2xl bg-white border border-gray-100">
              <GrowthChart
                userRaw={chartData?.users_over_time}
                assessRaw={chartData?.assessments_over_time}
              />
            </div>
          )}

          {/* ── Assessment Mix + Recent Activity ── */}
          {!loading && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Assessment Mix */}
              <div className="p-5 rounded-2xl bg-white border border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-900">Assessment Mix</p>
                  <button onClick={() => setActiveTab('assessments')} className="text-[11px] text-gray-400 hover:text-gray-700 transition">View all →</button>
                </div>
                <p className="text-xs text-gray-400 mb-4">Breakdown of submissions by test type</p>
                {(() => {
                  const types = [
                    { l: 'Diabetes', v: stats?.total_assessments ?? 0, color: '#6366f1', bg: 'bg-indigo-50', text: 'text-indigo-600', filter: 'diabetes', icon: FileText },
                    { l: 'Heart', v: stats?.total_heart ?? 0, color: '#f43f5e', bg: 'bg-rose-50', text: 'text-rose-600', filter: 'heart', icon: Heart },
                    { l: 'CKD', v: stats?.total_ckd ?? 0, color: '#8b5cf6', bg: 'bg-purple-50', text: 'text-purple-600', filter: 'ckd', icon: Droplets },
                    { l: 'Brain MRI', v: stats?.total_brain_mri ?? 0, color: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-600', filter: 'brain', icon: Brain },
                    { l: 'Diet Plans', v: stats?.total_diet_plans ?? 0, color: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-600', filter: 'diet', icon: UtensilsCrossed },
                  ];
                  const total = types.reduce((s, t) => s + t.v, 0) || 1;
                  return (
                    <div className="space-y-1">
                      {/* Stacked bar */}
                      <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100 mb-4">
                        {types.filter(t => t.v > 0).map((t, i) => (
                          <div key={i} className="h-full transition-all" style={{ width: `${(t.v / total) * 100}%`, backgroundColor: t.color }} title={`${t.l}: ${t.v}`} />
                        ))}
                      </div>
                      {/* Row per type */}
                      {types.map((t, i) => (
                        <button key={i} onClick={() => { setTestTypeFilter(t.filter); setActiveTab('assessments'); }}
                          className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition group text-left">
                          <div className={`w-7 h-7 rounded-lg ${t.bg} flex items-center justify-center shrink-0`}>
                            <t.icon className={`w-3.5 h-3.5 ${t.text}`} />
                          </div>
                          <span className="text-sm text-gray-700 flex-1">{t.l}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${(t.v / total) * 100}%`, backgroundColor: t.color }} />
                            </div>
                            <span className="text-[11px] text-gray-400 tabular-nums w-5 text-right">{t.v}</span>
                            <span className="text-[10px] text-gray-300 tabular-nums w-7 text-right">{total > 0 ? ((t.v / total) * 100).toFixed(0) : 0}%</span>
                          </div>
                          <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-gray-500 transition shrink-0" />
                        </button>
                      ))}
                      <div className="pt-2 mt-1 border-t border-gray-50 flex justify-between items-center px-2">
                        <span className="text-[11px] text-gray-400">Total submissions</span>
                        <span className="text-sm font-bold text-gray-700">{total}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Recent Activity */}
              <div className="p-4 rounded-2xl bg-white border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-700">Recent Activity</p>
                  <button onClick={() => setActiveTab('assessments')} className="text-[10px] text-gray-300 hover:text-gray-600 transition">View all →</button>
                </div>
                {(() => {
                  const TYPE_COLORS_DOT = { diabetes: '#6366f1', heart: '#f43f5e', ckd: '#8b5cf6', brain: '#f59e0b', diet: '#10b981' };
                  const TYPE_LABELS_S   = { diabetes: 'Diabetes', heart: 'Heart', ckd: 'CKD', brain: 'Brain MRI', diet: 'Diet' };
                  const merged = [
                    ...assessments.map(a => ({ ...a, _type: 'diabetes', _metric: a.risk_level || '—' })),
                    ...heartAssessments.map(a => ({ ...a, _type: 'heart', _metric: a.risk_level || '—' })),
                    ...ckdAssessments.map(a => ({ ...a, _type: 'ckd', _metric: a.prediction || '—' })),
                    ...brainMRIAnalyses.map(a => ({ ...a, _type: 'brain', _metric: a.tumor_class ? a.tumor_class.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()) : '—' })),
                    ...dietPlans.map(a => ({ ...a, _type: 'diet', _metric: (a.goal || '').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()) || '—' })),
                  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);

                  const timeAgo = (ts) => {
                    if (!ts) return '—';
                    const s = Math.floor((Date.now() - new Date(ts)) / 1000);
                    if (s < 60) return `${s}s`;
                    if (s < 3600) return `${Math.floor(s/60)}m`;
                    if (s < 86400) return `${Math.floor(s/3600)}h`;
                    return `${Math.floor(s/86400)}d`;
                  };

                  if (merged.length === 0) return (
                    <div className="h-20 flex items-center justify-center text-gray-200 text-xs">No activity yet</div>
                  );
                  return (
                    <div className="space-y-0.5">
                      {merged.map((a, i) => {
                        const dot = TYPE_COLORS_DOT[a._type] || '#d1d5db';
                        const name = a.user_full_name || a.user_email || 'Unknown';
                        return (
                          <div key={i} className="flex items-center gap-2.5 px-1.5 py-1.5 rounded-lg hover:bg-gray-50 transition cursor-pointer"
                            onClick={() => { setTestTypeFilter(a._type); setActiveTab('assessments'); }}>
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dot }} />
                            <p className="text-[11px] text-gray-700 truncate flex-1">{name}</p>
                            <span className="text-[10px] text-gray-400">{TYPE_LABELS_S[a._type]}</span>
                            <span className="text-[10px] text-gray-300 tabular-nums shrink-0">{timeAgo(a.created_at)}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ── Risk Alerts + Quick Actions ── */}
          {!loading && stats && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* Risk Alerts — expandable */}
              <div className="lg:col-span-2 p-4 rounded-2xl bg-white border border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-900">Risk Alerts</p>
                  <button onClick={() => { setAssessSortBy('high_risk'); setActiveTab('assessments'); }} className="text-[11px] text-gray-400 hover:text-gray-700 transition">View high risk →</button>
                </div>
                <p className="text-xs text-gray-400 mb-3">Click any card to see a breakdown — high-risk & positive findings</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'High Risk Diabetes', value: stats.high_risk_diabetes ?? 0, total: stats.total_assessments ?? 0, color: '#6366f1', bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-700', filter: 'diabetes', desc: 'of all diabetes tests returned high-risk results.' },
                    { label: 'High Risk Heart',    value: stats.high_risk_heart ?? 0,    total: stats.total_heart ?? 0,        color: '#f43f5e', bg: 'bg-rose-50',   border: 'border-rose-100',   text: 'text-rose-700',   filter: 'heart',    desc: 'of heart assessments flagged as high risk.' },
                    { label: 'CKD Positive',       value: stats.positive_ckd ?? 0,       total: stats.total_ckd ?? 0,          color: '#8b5cf6', bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-700', filter: 'ckd',      desc: 'of CKD tests came back with a positive prediction.' },
                    { label: 'Brain Tumor Found',  value: stats.brain_tumor_detected ?? 0, total: stats.total_brain_mri ?? 0,  color: '#f59e0b', bg: 'bg-amber-50',  border: 'border-amber-100',  text: 'text-amber-700',  filter: 'brain',    desc: 'of Brain MRI scans detected a tumor.' },
                  ].map((r, i) => {
                    const pct = r.total > 0 ? Math.round((r.value / r.total) * 100) : 0;
                    const safePct = r.total > 0 ? pct : 0;
                    const isExpanded = expandedRiskAlert === i;
                    // SVG donut params
                    const radius = 22, circ = 2 * Math.PI * radius;
                    const dash = (safePct / 100) * circ;
                    return (
                      <div key={i} className={`rounded-xl border transition-all duration-200 overflow-hidden ${r.bg} ${r.border} ${isExpanded ? 'col-span-2' : ''}`}>
                        {/* Card header — always visible */}
                        <button
                          onClick={() => setExpandedRiskAlert(isExpanded ? null : i)}
                          className="w-full p-3 text-left hover:opacity-80 transition">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-[10px] font-bold uppercase tracking-wide ${r.text}`}>{r.label}</span>
                            <div className="flex items-center gap-1.5">
                              {r.value > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
                              <span className={`text-[10px] ${r.text} opacity-60`}>{isExpanded ? '▲' : '▼'}</span>
                            </div>
                          </div>
                          <p className="text-xl font-black text-gray-900 leading-none">{r.value}</p>
                          <div className="flex items-center gap-1.5 mt-2">
                            <div className="flex-1 h-1 rounded-full bg-white/60 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${safePct}%`, backgroundColor: r.color }} />
                            </div>
                            <span className="text-[10px] text-gray-400 tabular-nums">{safePct}%</span>
                          </div>
                        </button>
                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="px-4 pb-4 flex items-center gap-6 border-t border-white/40">
                            {/* Donut */}
                            <svg width="60" height="60" viewBox="0 0 60 60" className="shrink-0 mt-3">
                              <circle cx="30" cy="30" r={radius} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="5" />
                              <circle cx="30" cy="30" r={radius} fill="none" stroke={r.color} strokeWidth="5"
                                strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
                                transform="rotate(-90 30 30)" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
                              <text x="30" y="34" textAnchor="middle" fontSize="10" fontWeight="800" fill="#111">{safePct}%</text>
                            </svg>
                            {/* Stats */}
                            <div className="flex-1 mt-3 space-y-1">
                              <p className="text-xs text-gray-600"><span className="font-bold text-gray-900">{r.value}</span> of <span className="font-bold text-gray-900">{r.total}</span> {r.desc}</p>
                              <p className="text-[11px] text-gray-400">{r.total - r.value} are low-risk or negative</p>
                              <button
                                onClick={() => { setTestTypeFilter(r.filter); setAssessSortBy('high_risk'); setActiveTab('assessments'); setExpandedRiskAlert(null); }}
                                className={`mt-2 text-[11px] font-semibold ${r.text} hover:underline`}>
                                View records →
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="p-4 rounded-2xl bg-white border border-gray-100 flex flex-col">
                <p className="text-sm font-semibold text-gray-900 mb-1">Quick Actions</p>
                <p className="text-xs text-gray-400 mb-3">Jump to common admin tasks</p>
                <div className="flex flex-col gap-2 flex-1">
                  {[
                    { l: 'Manage Users',     sub: 'View & edit all users',  icon: Users,       tab: 'users',          color: 'bg-blue-50 text-blue-600' },
                    { l: 'Assessments',      sub: 'Browse test records',     icon: FileText,    tab: 'assessments',    color: 'bg-indigo-50 text-indigo-600' },
                    { l: 'Subscriptions',    sub: 'Plans & billing',         icon: CreditCard,  tab: 'subscriptions',  color: 'bg-emerald-50 text-emerald-600' },
                    { l: 'Settings',         sub: 'Flags & audit log',       icon: Settings,    tab: 'settings',       color: 'bg-gray-100 text-gray-600' },
                  ].map((a, i) => (
                    <button key={i} onClick={() => setActiveTab(a.tab)}
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 hover:shadow-sm transition-all text-left group flex-1">
                      <div className={`w-8 h-8 rounded-lg ${a.color} flex items-center justify-center shrink-0`}>
                        <a.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-800 group-hover:text-gray-900">{a.l}</p>
                        <p className="text-[10px] text-gray-400">{a.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ── User Engagement (full width, interactive) ── */}
          {!loading && stats && (() => {
            const totalRecords2 = (stats.total_assessments ?? 0) + (stats.total_heart ?? 0) + (stats.total_ckd ?? 0) + (stats.total_brain_mri ?? 0) + (stats.total_diet_plans ?? 0);
            const avgTests = stats.total_users > 0 ? (totalRecords2 / stats.total_users).toFixed(1) : '0';
            const inactiveUsers = Math.max(0, (stats.total_users + stats.admin_count) - stats.active_users);
            const activeRate = stats.total_users > 0 ? Math.round((stats.active_users / (stats.total_users + stats.admin_count)) * 100) : 0;

            // Per-type test breakdown for chart use
            const typeBreakdown = [
              { label: 'Diabetes', count: stats.total_assessments ?? 0, color: '#6366f1' },
              { label: 'Heart',    count: stats.total_heart ?? 0,        color: '#f43f5e' },
              { label: 'CKD',      count: stats.total_ckd ?? 0,          color: '#8b5cf6' },
              { label: 'Brain',    count: stats.total_brain_mri ?? 0,    color: '#f59e0b' },
              { label: 'Diet',     count: stats.total_diet_plans ?? 0,   color: '#10b981' },
            ];
            const maxTypeCount = Math.max(...typeBreakdown.map(t => t.count), 1);

            const engagementItems = [
              {
                label: 'New Users This Month', value: stats.new_users_this_month ?? 0, sub: 'signups in current month',
                icon: UserPlus, color: 'text-indigo-600', bg: 'bg-indigo-50', barColor: '#6366f1',
                barPct: Math.min(((stats.new_users_this_month ?? 0) / Math.max(stats.total_users, 1)) * 100, 100),
                chartBars: [
                  { label: 'New', count: stats.new_users_this_month ?? 0, color: '#6366f1' },
                  { label: 'Total', count: stats.total_users ?? 0, color: '#c7d2fe' },
                ],
                chartMax: Math.max(stats.total_users ?? 0, 1),
                detail: `${stats.new_users_this_month ?? 0} new vs ${stats.total_users ?? 0} total registered users`,
              },
              {
                label: 'New Tests This Month', value: stats.new_assessments_this_month ?? 0, sub: 'submissions this month',
                icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', barColor: '#10b981',
                barPct: Math.min(((stats.new_assessments_this_month ?? 0) / Math.max(totalRecords2, 1)) * 100, 100),
                chartBars: typeBreakdown,
                chartMax: maxTypeCount,
                detail: 'Breakdown of all tests by type across the platform',
              },
              {
                label: 'Avg Tests / User', value: avgTests, sub: 'tests per registered user',
                icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50', barColor: '#f59e0b',
                barPct: Math.min(parseFloat(avgTests) * 10, 100),
                chartBars: typeBreakdown,
                chartMax: maxTypeCount,
                detail: `${totalRecords2} total records ÷ ${stats.total_users ?? 0} users = ${avgTests} avg`,
              },
              {
                label: 'User Activation Rate', value: `${activeRate}%`, sub: 'of all accounts are active',
                icon: UserCheck, color: 'text-sky-600', bg: 'bg-sky-50', barColor: '#0ea5e9',
                barPct: activeRate,
                chartBars: [
                  { label: 'Active', count: stats.active_users ?? 0, color: '#0ea5e9' },
                  { label: 'Inactive', count: inactiveUsers, color: '#fca5a5' },
                  { label: 'Admins', count: stats.admin_count ?? 0, color: '#8b5cf6' },
                ],
                chartMax: Math.max(stats.total_users ?? 0, 1),
                detail: `${stats.active_users ?? 0} active · ${inactiveUsers} inactive · ${stats.admin_count ?? 0} admins`,
              },
              {
                label: 'Inactive Accounts', value: inactiveUsers, sub: 'accounts currently disabled',
                icon: UserX, color: 'text-red-500', bg: 'bg-red-50', barColor: '#f43f5e',
                barPct: Math.min((inactiveUsers / Math.max(stats.total_users + stats.admin_count, 1)) * 100, 100),
                chartBars: [
                  { label: 'Inactive', count: inactiveUsers, color: '#f43f5e' },
                  { label: 'Active', count: stats.active_users ?? 0, color: '#bbf7d0' },
                ],
                chartMax: Math.max(stats.total_users + stats.admin_count, 1),
                detail: `${inactiveUsers} disabled of ${(stats.total_users ?? 0) + (stats.admin_count ?? 0)} total accounts`,
              },
              {
                label: 'Total Admins', value: stats.admin_count ?? 0, sub: 'users with admin access',
                icon: Shield, color: 'text-violet-600', bg: 'bg-violet-50', barColor: '#8b5cf6',
                barPct: Math.min(((stats.admin_count ?? 0) / Math.max(stats.total_users + stats.admin_count, 1)) * 100, 100),
                chartBars: [
                  { label: 'Admins', count: stats.admin_count ?? 0, color: '#8b5cf6' },
                  { label: 'Users', count: stats.total_users ?? 0, color: '#ddd6fe' },
                ],
                chartMax: Math.max(stats.total_users + stats.admin_count, 1),
                detail: `${stats.admin_count ?? 0} admins out of ${(stats.total_users ?? 0) + (stats.admin_count ?? 0)} total accounts`,
              },
            ];

            return (
              <div className="p-5 rounded-2xl bg-white border border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-900">User Engagement</p>
                  <button onClick={() => setActiveTab('users')} className="text-[11px] text-gray-400 hover:text-gray-700 transition">View users →</button>
                </div>
                <p className="text-xs text-gray-400 mb-4">Click any card to expand — activity & health metrics across the platform</p>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {engagementItems.map((s, i) => {
                    const isExpanded = expandedEngagement === i;
                    const barH = 36; // chart height px
                    return (
                      <div key={i}
                        className={`rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden
                          ${isExpanded ? 'border-gray-300 bg-white shadow-md col-span-2 lg:col-span-1' : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:shadow-sm'}`}
                        onClick={() => setExpandedEngagement(isExpanded ? null : i)}>
                        {/* Card top */}
                        <div className="flex items-start gap-3 p-3.5">
                          <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                            <s.icon className={`w-4 h-4 ${s.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xl font-black text-gray-900 leading-none">{s.value}</p>
                            <p className="text-[10px] text-gray-500 mt-1 leading-tight">{s.label}</p>
                            <div className="mt-2 h-1 rounded-full bg-gray-200 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${s.barPct}%`, backgroundColor: s.barColor }} />
                            </div>
                            <p className="text-[9px] text-gray-300 mt-1">{s.sub}</p>
                          </div>
                          <span className="text-[10px] text-gray-300 mt-1">{isExpanded ? '▲' : '▼'}</span>
                        </div>
                        {/* Expanded mini chart */}
                        {isExpanded && (
                          <div className="px-3.5 pb-3.5 pt-0 border-t border-gray-100">
                            <p className="text-[10px] text-gray-400 mb-2 mt-2">{s.detail}</p>
                            {/* SVG bar chart */}
                            <div className="flex items-end gap-1.5" style={{ height: barH + 20 }}>
                              {s.chartBars.map((b, bi) => {
                                const pctH = s.chartMax > 0 ? Math.max((b.count / s.chartMax) * barH, b.count > 0 ? 3 : 0) : 0;
                                return (
                                  <div key={bi} className="flex flex-col items-center gap-1 flex-1">
                                    <span className="text-[8px] text-gray-400 tabular-nums leading-none">{b.count}</span>
                                    <div className="w-full rounded-t-md transition-all duration-500" style={{ height: pctH, backgroundColor: b.color, minHeight: b.count > 0 ? 3 : 0 }} />
                                    <span className="text-[8px] text-gray-400 truncate w-full text-center leading-none">{b.label}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

        </div>
        );
      })()}

      {/* ==================== USERS ==================== */}
      {activeTab === 'users' && (
        <section className="space-y-4">
          {/* Stats strip */}
          {!loading && users.length > 0 && (() => {
            const total = users.length;
            const active = users.filter(u => u.is_active).length;
            const inactive = total - active;
            const admins = users.filter(u => u.role === 'admin').length;
            const now = new Date();
            const thisMonth = users.filter(u => {
              if (!u.created_at) return false;
              const d = new Date(u.created_at);
              return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
            }).length;
            const activeRate = total > 0 ? Math.round((active / total) * 100) : 0;
            return (
              <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100">
                  {/* Total Users */}
                  <div className="p-5">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-3">Total Users</p>
                    <p className="text-3xl font-black text-gray-900 leading-none">{total}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <div className="flex-1 h-1 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-indigo-400" style={{ width: `${activeRate}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-400 tabular-nums">{activeRate}% active</span>
                    </div>
                  </div>

                  {/* Active vs Inactive */}
                  <div className="p-5">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-3">Status</p>
                    <div className="flex items-end gap-3">
                      <div>
                        <p className="text-3xl font-black text-emerald-600 leading-none">{active}</p>
                        <p className="text-[10px] text-gray-400 mt-1">Active</p>
                      </div>
                      <div className="w-px h-8 bg-gray-100 mb-1" />
                      <div>
                        <p className="text-3xl font-black text-gray-300 leading-none">{inactive}</p>
                        <p className="text-[10px] text-gray-400 mt-1">Inactive</p>
                      </div>
                    </div>
                  </div>

                  {/* Admins */}
                  <div className="p-5">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-3">Admins</p>
                    <p className="text-3xl font-black text-amber-500 leading-none">{admins}</p>
                    <p className="text-[10px] text-gray-400 mt-3">{total - admins} regular user{total - admins !== 1 ? 's' : ''}</p>
                  </div>

                  {/* New This Month */}
                  <div className="p-5">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-3">New This Month</p>
                    <p className="text-3xl font-black text-gray-900 leading-none">{thisMonth}</p>
                    <div className="flex items-center gap-1.5 mt-3">
                      <span className={`w-1.5 h-1.5 rounded-full ${thisMonth > 0 ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                      <p className="text-[10px] text-gray-400">{thisMonth > 0 ? 'Growth this period' : 'No new signups'}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-gray-400" />
            </div>
            <Dropdown value={roleFilter} onChange={setRoleFilter} options={[
              { value: 'all', label: 'All roles' }, { value: 'user', label: 'User' }, { value: 'admin', label: 'Admin' },
            ]} />
            <Dropdown value={statusFilter} onChange={setStatusFilter} options={[
              { value: 'all', label: 'All status' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' },
            ]} />
            <button onClick={exportCSV} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 transition">
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button onClick={() => setCreateUserOpen(true)} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-700 border border-gray-900">
              <Plus className="w-4 h-4" /> Create User
            </button>
          </div>

          {/* Bulk actions bar */}
          {selectedUserIds.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm">
              <span className="font-medium">{selectedUserIds.length} selected</span>
              <div className="flex-1" />
              <button onClick={() => handleBulkAction('activate')} disabled={actionLoading} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition">Activate</button>
              <button onClick={() => handleBulkAction('deactivate')} disabled={actionLoading} className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition">Deactivate</button>
              <button onClick={() => handleBulkAction('delete')} disabled={actionLoading} className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition">Delete</button>
              <button onClick={() => setSelectedUserIds([])} className="p-1.5 rounded-lg hover:bg-white/10 transition"><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-gray-500" /></div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-gray-200 bg-gray-50">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">{searchTerm || roleFilter !== 'all' || statusFilter !== 'all' ? 'No users match filters' : 'No users yet'}</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white shadow-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3.5 w-8">
                      <input type="checkbox" checked={selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0} onChange={toggleSelectAll} className="rounded border-gray-300 accent-gray-900" />
                    </th>
                    <th className="px-4 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-widest cursor-pointer" onClick={() => toggleSort('email')}>
                      <span className="flex items-center gap-1">User <SortIcon field="email" /></span>
                    </th>
                    <th className="px-4 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-widest cursor-pointer hidden sm:table-cell" onClick={() => toggleSort('role')}>
                      <span className="flex items-center gap-1">Role <SortIcon field="role" /></span>
                    </th>
                    <th className="px-4 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-widest hidden md:table-cell">Plan</th>
                    <th className="px-4 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-widest hidden lg:table-cell">Tests</th>
                    <th className="px-4 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-widest hidden lg:table-cell cursor-pointer" onClick={() => toggleSort('created_at')}>
                      <span className="flex items-center gap-1">Joined <SortIcon field="created_at" /></span>
                    </th>
                    <th className="px-4 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-widest hidden sm:table-cell">Status</th>
                    <th className="px-4 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(() => {
                    const testCountMap = {};
                    const highRiskMap = {};
                    const maxTests = { val: 1 };
                    [...assessments, ...heartAssessments].forEach(a => {
                      testCountMap[a.user_id] = (testCountMap[a.user_id] || 0) + 1;
                      if ((a.risk_level || '').toLowerCase().includes('high')) highRiskMap[a.user_id] = true;
                    });
                    [...ckdAssessments].forEach(a => {
                      testCountMap[a.user_id] = (testCountMap[a.user_id] || 0) + 1;
                      if ((a.prediction || '').toLowerCase() === 'ckd') highRiskMap[a.user_id] = true;
                    });
                    [...brainMRIAnalyses].forEach(a => {
                      testCountMap[a.user_id] = (testCountMap[a.user_id] || 0) + 1;
                      if ((a.tumor_class || '').toLowerCase() !== 'no tumor') highRiskMap[a.user_id] = true;
                    });
                    [...dietPlans].forEach(a => { testCountMap[a.user_id] = (testCountMap[a.user_id] || 0) + 1; });
                    maxTests.val = Math.max(...Object.values(testCountMap), 1);

                    const relDate = (iso) => {
                      if (!iso) return '—';
                      const d = new Date(iso), now = new Date();
                      const days = Math.floor((now - d) / 86400000);
                      if (days === 0) return 'Today';
                      if (days === 1) return 'Yesterday';
                      if (days < 30) return `${days}d ago`;
                      if (days < 365) return `${Math.floor(days / 30)}mo ago`;
                      return `${Math.floor(days / 365)}y ago`;
                    };

                    return filteredUsers.slice((usersPage - 1) * PAGE_SIZE, usersPage * PAGE_SIZE).map(u => {
                      const userTestCount = testCountMap[u.id] || 0;
                      const userHasHighRisk = !!highRiskMap[u.id];
                      const testPct = Math.round((userTestCount / maxTests.val) * 100);
                      const isPro = u.subscription_tier === 'pro_monthly' || u.subscription_tier === 'pro_yearly';
                      const planLabel = u.subscription_tier === 'pro_monthly' ? 'Pro Monthly' : u.subscription_tier === 'pro_yearly' ? 'Pro Yearly' : 'Free';
                      const initials = (u.full_name || u.email || '?').slice(0, 2).toUpperCase();
                      const avatarColors = u.role === 'admin'
                        ? 'bg-gray-900 text-white'
                        : userHasHighRisk
                        ? 'bg-red-50 text-red-500 ring-1 ring-red-200'
                        : 'bg-indigo-50 text-indigo-600';
                      return (
                        <tr key={u.id}
                          className={`group transition-colors cursor-pointer ${selectedUserIds.includes(u.id) ? 'bg-indigo-50/60' : 'hover:bg-gray-50/80'}`}
                          onClick={() => openUserProfile(u)}>
                          <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                            <input type="checkbox" checked={selectedUserIds.includes(u.id)} onChange={() => toggleSelectUser(u.id)} className="rounded border-gray-300 accent-gray-900" />
                          </td>

                          {/* User cell */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${avatarColors}`}>
                                {u.avatar_url
                                  ? <img src={u.avatar_url} alt="" className="w-9 h-9 rounded-xl object-cover" />
                                  : initials}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                                  {u.full_name || <span className="text-gray-400 italic">No name</span>}
                                </p>
                                <p className="text-xs text-gray-400 truncate mt-0.5">{u.email}</p>
                                <p className="text-[10px] text-gray-300 font-mono mt-0.5">#{u.id}</p>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="px-4 py-4 hidden sm:table-cell">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${u.role === 'admin' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
                              {u.role === 'admin' && <ShieldCheck className="w-3 h-3" />}
                              {u.role}
                            </span>
                          </td>

                          {/* Plan */}
                          <td className="px-4 py-4 hidden md:table-cell">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${isPro ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                              {isPro && <span className="text-amber-500">★</span>}
                              {planLabel}
                            </span>
                          </td>

                          {/* Tests */}
                          <td className="px-4 py-4 hidden lg:table-cell">
                            <div className="flex items-center gap-2 min-w-[80px]">
                              <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                <div className="h-full rounded-full bg-indigo-400 transition-all"
                                  style={{ width: `${testPct}%` }} />
                              </div>
                              <span className={`text-xs font-bold tabular-nums w-5 text-right ${userTestCount > 0 ? 'text-gray-700' : 'text-gray-300'}`}>{userTestCount}</span>
                              {userHasHighRisk && (
                                <span className="text-[9px] font-bold text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">HIGH RISK</span>
                              )}
                            </div>
                          </td>

                          {/* Joined */}
                          <td className="px-4 py-4 hidden lg:table-cell">
                            <p className="text-xs font-medium text-gray-600">{relDate(u.created_at)}</p>
                            <p className="text-[10px] text-gray-300 mt-0.5">{u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</p>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-4 hidden sm:table-cell">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${u.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-500 border border-red-100'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-red-400'}`} />
                              {u.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openUserProfile(u)} title="View profile"
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button onClick={() => setConfirmModal({ open: true, type: 'delete', data: u })} title="Delete user"
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          )}
          {/* Pagination */}
          {filteredUsers.length > PAGE_SIZE && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} · page {usersPage} of {Math.ceil(filteredUsers.length / PAGE_SIZE)}</p>
              <div className="flex gap-1">
                <button disabled={usersPage === 1} onClick={() => setUsersPage(p => p - 1)} className="px-3 py-1.5 rounded-lg text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition">← Prev</button>
                {Array.from({ length: Math.ceil(filteredUsers.length / PAGE_SIZE) }, (_, i) => i + 1).map(n => (
                  <button key={n} onClick={() => setUsersPage(n)} className={`px-3 py-1.5 rounded-lg text-xs border transition ${n === usersPage ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{n}</button>
                ))}
                <button disabled={usersPage === Math.ceil(filteredUsers.length / PAGE_SIZE)} onClick={() => setUsersPage(p => p + 1)} className="px-3 py-1.5 rounded-lg text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition">Next →</button>
              </div>
            </div>
          )}
          {filteredUsers.length <= PAGE_SIZE && <p className="text-xs text-gray-600">{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}</p>}
        </section>
      )}

      {/* ==================== ASSESSMENTS ==================== */}
      {activeTab === 'assessments' && (() => {
        const TYPE_LABELS = { diabetes: 'Diabetes', ckd: 'CKD', heart: 'Heart', brain: 'Brain MRI', diet: 'Diet' };
        const allItems = [
          ...assessments.map(a => ({ ...a, _type: 'diabetes' })),
          ...ckdAssessments.map(a => ({ ...a, _type: 'ckd' })),
          ...heartAssessments.map(a => ({ ...a, _type: 'heart' })),
          ...brainMRIAnalyses.map(a => ({ ...a, _type: 'brain' })),
          ...dietPlans.map(a => ({ ...a, _type: 'diet' })),
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Risk score helper (0-3: low=0, medium=1, high=2, positive=3)
        const riskScore = (a) => {
          if (a._type === 'diabetes' || a._type === 'heart') {
            const l = (a.risk_level || '').toLowerCase();
            return l.includes('high') ? 3 : l.includes('medium') || l.includes('moderate') ? 2 : 1;
          }
          if (a._type === 'ckd') return (a.prediction || '').toLowerCase() === 'ckd' ? 3 : 1;
          if (a._type === 'brain') return (a.tumor_class || '').toLowerCase() !== 'no tumor' ? 3 : 1;
          return 0;
        };

        const searchLower = assessSearchTerm.toLowerCase();
        const filteredItems = allItems.filter(a => {
          const matchType = testTypeFilter === 'all' || a._type === testTypeFilter;
          const matchSearch = !searchLower || (a.user_email || '').toLowerCase().includes(searchLower) || (a.user_full_name || '').toLowerCase().includes(searchLower);
          return matchType && matchSearch;
        });

        const visibleItems = [...filteredItems].sort((a, b) => {
          if (assessSortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
          if (assessSortBy === 'high_risk') return riskScore(b) - riskScore(a);
          return new Date(b.created_at) - new Date(a.created_at); // newest
        });

        // Risk summary counts
        const highRisk  = filteredItems.filter(a => riskScore(a) >= 3).length;
        const medRisk   = filteredItems.filter(a => riskScore(a) === 2).length;
        const lowRisk   = filteredItems.filter(a => riskScore(a) <= 1 && a._type !== 'diet').length;

        const TYPE_PILL_COLORS = {
          diabetes: 'bg-blue-100 text-blue-700',
          heart: 'bg-rose-100 text-rose-700',
          ckd: 'bg-purple-100 text-purple-700',
          brain: 'bg-indigo-100 text-indigo-700',
          diet: 'bg-teal-100 text-teal-700',
        };

        const formatGoal = (g) => (g || 'Diet Plan').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        const getRiskBadge = (item) => {
          const base = 'px-1.5 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap';
          if (item._type === 'diabetes' || item._type === 'heart') {
            const l = (item.risk_level || '').toLowerCase();
            const cls = l.includes('high') ? 'bg-red-100 text-red-700' : l.includes('medium') || l.includes('moderate') ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';
            return <span className={`${base} ${cls}`}>{item.risk_level || '—'}</span>;
          } else if (item._type === 'ckd') {
            const isPos = (item.prediction || '').toLowerCase() === 'ckd';
            return <span className={`${base} ${isPos ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{item.prediction || '—'}</span>;
          } else if (item._type === 'brain') {
            const tc = (item.tumor_class || 'unknown').toLowerCase();
            return <span className={`${base} capitalize ${tc === 'no tumor' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{item.tumor_class || '—'}</span>;
          }
          return <span className={`${base} bg-teal-50 text-teal-700`}>{formatGoal(item.goal)}</span>;
        };

        const getMetaText = (item) => {
          if (item._type === 'diabetes' || item._type === 'heart') return item.probability != null ? `${(item.probability * 100).toFixed(0)}% risk probability` : '—';
          if (item._type === 'ckd' || item._type === 'brain') return item.confidence != null ? `${(item.confidence * 100).toFixed(0)}% confidence` : '—';
          return formatGoal(item.goal);
        };

        // Per-type analytics for the stats strip
        const typeStats = [
          { key: 'diabetes', label: 'Diabetes',  color: '#6366f1', bg: 'bg-indigo-50',  text: 'text-indigo-700',  total: assessments.length,      highRisk: assessments.filter(a => (a.risk_level || '').toLowerCase().includes('high')).length },
          { key: 'heart',    label: 'Heart',      color: '#f43f5e', bg: 'bg-rose-50',    text: 'text-rose-700',    total: heartAssessments.length,  highRisk: heartAssessments.filter(a => (a.risk_level || '').toLowerCase().includes('high')).length },
          { key: 'ckd',      label: 'CKD',        color: '#8b5cf6', bg: 'bg-purple-50',  text: 'text-purple-700',  total: ckdAssessments.length,    highRisk: ckdAssessments.filter(a => (a.prediction || '').toLowerCase() === 'ckd').length },
          { key: 'brain',    label: 'Brain MRI',  color: '#f59e0b', bg: 'bg-amber-50',   text: 'text-amber-700',   total: brainMRIAnalyses.length,  highRisk: brainMRIAnalyses.filter(a => (a.tumor_class || '').toLowerCase() !== 'no tumor').length },
          { key: 'diet',     label: 'Diet Plans', color: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-700', total: dietPlans.length,         highRisk: 0 },
        ];
        const grandTotal = typeStats.reduce((s, t) => s + t.total, 0);

        return (
          <section className="space-y-3">

            {/* ── Assessment Analytics Strip ── */}
            {grandTotal > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
                <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
                  <p className="text-xs font-semibold text-gray-700">Assessment Breakdown</p>
                  <span className="text-[11px] text-gray-400">{grandTotal} total records</span>
                </div>
                <div className="grid grid-cols-5 divide-x divide-gray-100">
                  {typeStats.map((t) => {
                    const riskPct = t.total > 0 ? Math.round((t.highRisk / t.total) * 100) : 0;
                    const safePct = t.total > 0 ? Math.round((t.total / grandTotal) * 100) : 0;
                    return (
                      <button key={t.key}
                        onClick={() => { setTestTypeFilter(t.key); setAssessPage(1); }}
                        className={`flex flex-col items-center gap-1 px-2 py-3 hover:bg-gray-50 transition group ${testTypeFilter === t.key ? 'bg-gray-50' : ''}`}>
                        <span className={`text-[10px] font-bold ${t.text}`}>{t.label}</span>
                        <span className="text-lg font-black text-gray-900 leading-none">{t.total}</span>
                        {/* Stacked bar: share vs high-risk */}
                        <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden mt-0.5">
                          <div className="h-full flex">
                            <div className="h-full rounded-full" style={{ width: `${riskPct}%`, backgroundColor: t.key === 'diet' ? t.color : '#f87171' }} />
                            <div className="h-full" style={{ width: `${100 - riskPct}%`, backgroundColor: t.color + '40' }} />
                          </div>
                        </div>
                        <span className="text-[9px] text-gray-400">
                          {t.key === 'diet' ? `${safePct}% of all` : `${riskPct}% high risk`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Type filter pills + clear */}
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All', count: allItems.length, color: 'bg-gray-900 text-white', inactive: 'bg-white text-gray-600 border border-gray-200' },
                { value: 'diabetes', label: 'Diabetes', count: assessments.length, color: 'bg-blue-600 text-white', inactive: 'bg-white text-blue-600 border border-blue-200' },
                { value: 'heart', label: 'Heart', count: heartAssessments.length, color: 'bg-rose-500 text-white', inactive: 'bg-white text-rose-500 border border-rose-200' },
                { value: 'ckd', label: 'CKD', count: ckdAssessments.length, color: 'bg-purple-600 text-white', inactive: 'bg-white text-purple-600 border border-purple-200' },
                { value: 'brain', label: 'Brain MRI', count: brainMRIAnalyses.length, color: 'bg-amber-500 text-white', inactive: 'bg-white text-amber-600 border border-amber-200' },
                { value: 'diet', label: 'Diet Plans', count: dietPlans.length, color: 'bg-emerald-600 text-white', inactive: 'bg-white text-emerald-600 border border-emerald-200' },
              ].map(f => (
                <button key={f.value} onClick={() => { setTestTypeFilter(f.value); setAssessPage(1); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${testTypeFilter === f.value ? f.color : f.inactive}`}>
                  {f.label} <span className="ml-1 opacity-70">{f.count}</span>
                </button>
              ))}
              <div className="flex-1" />
              <button onClick={() => setClearAllModal(true)} disabled={actionLoading || visibleItems.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-red-500 hover:bg-red-50 border border-red-200 transition disabled:opacity-40">
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            </div>

            {/* Search + Sort row */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Search by name or email…" value={assessSearchTerm} onChange={e => { setAssessSearchTerm(e.target.value); setAssessPage(1); }}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-gray-400" />
              </div>
              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-1.5">
                {[
                  { v: 'newest', label: 'Newest' },
                  { v: 'oldest', label: 'Oldest' },
                  { v: 'high_risk', label: '⚠ Risk' },
                ].map(s => (
                  <button key={s.v} onClick={() => { setAssessSortBy(s.v); setAssessPage(1); }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${assessSortBy === s.v ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-800'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Risk insights strip */}
            {filteredItems.length > 0 && testTypeFilter !== 'diet' && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-100">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mr-1">Risk Breakdown</span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> High <span className="font-bold ml-0.5">{highRisk}</span>
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Medium <span className="font-bold ml-0.5">{medRisk}</span>
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Low/Neg. <span className="font-bold ml-0.5">{lowRisk}</span>
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden ml-2">
                  {filteredItems.length > 0 && (
                    <div className="h-full flex">
                      <div className="bg-red-400 h-full" style={{ width: `${(highRisk / filteredItems.length) * 100}%` }} />
                      <div className="bg-amber-400 h-full" style={{ width: `${(medRisk / filteredItems.length) * 100}%` }} />
                      <div className="bg-emerald-400 h-full" style={{ width: `${(lowRisk / filteredItems.length) * 100}%` }} />
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 shrink-0">{filteredItems.length} total</span>
              </div>
            )}

            {loading
              ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
              : visibleItems.length === 0
                ? <div className="text-center py-16 rounded-xl border border-gray-200 bg-gray-50">
                    <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No assessments found</p>
                  </div>
                : <ul className="space-y-1.5">
                    {visibleItems.slice((assessPage - 1) * PAGE_SIZE, assessPage * PAGE_SIZE).map(a => {
                      const isHighRisk = riskScore(a) >= 3;
                      return (
                      <li key={`${a._type}-${a.id}`}
                        className={`px-4 py-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${isHighRisk ? 'bg-red-50/40 border-red-100 hover:border-red-200' : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'}`}
                        onClick={() => setDetailModal({ open: true, item: a })}>

                        {/* High-risk accent bar */}
                        {isHighRisk && <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-red-400" style={{ position: 'relative', width: 3, minWidth: 3, borderRadius: 99, alignSelf: 'stretch', background: '#f87171', marginLeft: -4, marginRight: 1 }} />}

                        {/* Type pill */}
                        <span className={`text-[11px] font-bold whitespace-nowrap shrink-0 w-16 text-center py-1 rounded-lg ${TYPE_PILL_COLORS[a._type] || 'bg-gray-100 text-gray-600'}`}>
                          {TYPE_LABELS[a._type] || a._type}
                        </span>

                        {/* Center: name on top, metric + inline badge below */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-gray-800 text-sm font-semibold truncate">{a.user_full_name || a.user_email}</p>
                            {isHighRisk && <span className="text-[9px] font-bold text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full shrink-0">HIGH RISK</span>}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-gray-400 text-[11px] truncate">{getMetaText(a)}</p>
                            {getRiskBadge(a)}
                          </div>
                        </div>

                        {/* Right: date + delete */}
                        <div className="shrink-0 flex items-center gap-2">
                          <p className="text-gray-300 text-[11px] whitespace-nowrap tabular-nums hidden sm:block">
                            {a.created_at ? new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                          </p>
                          <button onClick={e => { e.stopPropagation(); handleDeleteAssessmentItem(a); }} title="Delete"
                            className="p-1.5 rounded-lg text-gray-200 hover:bg-red-50 hover:text-red-500 transition">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </li>
                      );
                    })}
                  </ul>
            }
            {visibleItems.length > PAGE_SIZE && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">{visibleItems.length} results · page {assessPage} of {Math.ceil(visibleItems.length / PAGE_SIZE)}</p>
                <div className="flex gap-1">
                  <button disabled={assessPage === 1} onClick={() => setAssessPage(p => p - 1)} className="px-3 py-1.5 rounded-lg text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">← Prev</button>
                  <button disabled={assessPage === Math.ceil(visibleItems.length / PAGE_SIZE)} onClick={() => setAssessPage(p => p + 1)} className="px-3 py-1.5 rounded-lg text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">Next →</button>
                </div>
              </div>
            )}
            {visibleItems.length <= PAGE_SIZE && <p className="text-xs text-gray-500">{visibleItems.length} result{visibleItems.length !== 1 ? 's' : ''}</p>}
          </section>
        );
      })()}

      {/* Universal Assessment Detail Modal */}
      <Modal isOpen={detailModal.open} onClose={() => setDetailModal({ open: false, item: null })} title="Assessment Details" width="max-w-lg">
        {detailModal.item && (() => {
          const a = detailModal.item;
          const fmt = (s) => (s || '—').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          const TYPE_LABELS   = { diabetes: 'Diabetes Test', ckd: 'CKD Test', heart: 'Heart Test', brain: 'Brain MRI', diet: 'Diet Plan' };
          const TYPE_COLORS   = { diabetes: 'from-amber-500 to-orange-500', ckd: 'from-blue-500 to-cyan-500', heart: 'from-red-500 to-pink-500', brain: 'from-violet-500 to-purple-500', diet: 'from-emerald-500 to-teal-500' };
          const TYPE_ICONS    = { diabetes: Droplets, ckd: Activity, heart: Heart, brain: Brain, diet: UtensilsCrossed };
          const TypeIcon = TYPE_ICONS[a._type] || FileText;

          // Primary metric (value 0-1 or null)
          let metricLabel = null, metricValue = null, metricRaw = null;
          if (a._type === 'diabetes' || a._type === 'heart') {
            metricLabel = 'Risk Level'; metricValue = fmt(a.risk_level);
            metricRaw = a.probability;
          } else if (a._type === 'ckd') {
            metricLabel = 'Prediction'; metricValue = a.prediction || '—';
            metricRaw = a.confidence;
          } else if (a._type === 'brain') {
            metricLabel = 'Tumor Class'; metricValue = fmt(a.tumor_class);
            metricRaw = a.confidence;
          } else if (a._type === 'diet') {
            metricLabel = 'Goal'; metricValue = fmt(a.goal);
          }

          const confLabel = (a._type === 'diabetes' || a._type === 'heart') ? 'Probability' : 'Confidence';
          const confPct = metricRaw != null ? (metricRaw * 100).toFixed(1) : null;

          const assessId = a.assessment_id || (a._type === 'diet' ? `diet-${a.id}` : null);
          const displayName = a.user_full_name || a.user_email || '—';
          const initials = (a.user_full_name || a.user_email || '?').slice(0, 2).toUpperCase();
          const patientUser = { full_name: a.user_full_name, email: a.user_email };

          return (
            <div className="space-y-4 -mt-1">
              {/* Header card */}
              <div className={`rounded-2xl bg-gradient-to-br ${TYPE_COLORS[a._type] || 'from-gray-400 to-gray-600'} p-4 text-white`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <TypeIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-base leading-tight">{TYPE_LABELS[a._type] || a._type}</p>
                      <p className="text-white/70 text-xs mt-0.5">
                        {a.created_at ? new Date(a.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
                      </p>
                    </div>
                  </div>
                  {metricLabel && (
                    <div className="text-right">
                      <p className="text-white/60 text-[10px] uppercase tracking-wider">{metricLabel}</p>
                      <p className="font-bold text-lg leading-tight mt-0.5">{metricValue}</p>
                    </div>
                  )}
                </div>

                {/* Confidence bar */}
                {confPct != null && (
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-white/60 text-[10px] uppercase tracking-wider">{confLabel}</span>
                      <span className="text-white font-bold text-sm">{confPct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/20">
                      <div className="h-full rounded-full bg-white/90 transition-all" style={{ width: `${confPct}%` }} />
                    </div>
                  </div>
                )}
              </div>

              {/* User card */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-gray-600">{initials}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-gray-900 text-sm font-semibold truncate">{displayName}</p>
                  {a.user_full_name && <p className="text-gray-400 text-xs truncate">{a.user_email}</p>}
                </div>
                <div className="ml-auto shrink-0">
                  <span className="text-[10px] text-gray-400 bg-gray-100 rounded-md px-2 py-0.5">ID #{a.user_id || '—'}</span>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">Time</p>
                  <p className="text-gray-700 text-xs font-medium">
                    {a.created_at ? new Date(a.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">Assessment ID</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-gray-700 text-xs font-mono truncate">{assessId || '—'}</p>
                    {assessId && (
                      <button onClick={() => navigator.clipboard.writeText(assessId)} title="Copy ID"
                        className="shrink-0 p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition">
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>


            </div>
          );
        })()}
      </Modal>

      {/* Clear All Assessments confirm */}
      <Modal isOpen={clearAllModal} onClose={() => setClearAllModal(false)} title="Clear All Assessments">
        <p className="text-gray-500 text-sm mb-6">This will hide all <strong className="text-gray-900">{testTypeFilter === 'all' ? '' : testTypeFilter + ' '}assessments</strong> from your admin view. Users keep their data. This cannot be undone.</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setClearAllModal(false)} className="px-4 py-2 rounded-lg text-sm text-gray-500 border border-gray-200">Cancel</button>
          <button onClick={handleClearAllAssessments} disabled={actionLoading} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white flex items-center gap-2">
            {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />} Clear All
          </button>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={resetPwModal.open} onClose={() => { setResetPwModal({ open: false, user: null }); setResetPwValue(''); }} title="Reset Password">
        <p className="text-gray-500 text-sm mb-4">Set a new password for <strong className="text-gray-900">{resetPwModal.user?.email}</strong>.</p>
        <input type="text" placeholder="New password (min 6 chars)" value={resetPwValue} onChange={e => setResetPwValue(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 text-sm focus:outline-none focus:border-gray-400 mb-5" />
        <div className="flex gap-3 justify-end">
          <button onClick={() => { setResetPwModal({ open: false, user: null }); setResetPwValue(''); }} className="px-4 py-2 rounded-lg text-sm text-gray-500 border border-gray-200">Cancel</button>
          <button onClick={handleResetPassword} disabled={actionLoading || resetPwValue.length < 6} className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white flex items-center gap-2 disabled:opacity-40">
            {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />} Reset Password
          </button>
        </div>
      </Modal>

      {/* ==================== SUBSCRIPTIONS ==================== */}
      {activeTab === 'subscriptions' && (
        <section className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-gray-500" /></div>
          ) : (
            <>
              {subscriptionStats && (
                <>
                  {/* Subscription stats — unified card */}
                  {(() => {
                    const total = subscriptionStats.total_users ?? 0;
                    const free = subscriptionStats.free ?? 0;
                    const proM = subscriptionStats.pro_monthly ?? 0;
                    const proY = subscriptionStats.pro_yearly ?? 0;
                    const activeSubs = subscriptionStats.active_subscriptions ?? 0;
                    const proTotal = proM + proY;
                    const proRate = total > 0 ? Math.round((proTotal / total) * 100) : 0;
                    return (
                      <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
                        <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-gray-100">

                          {/* Total Users */}
                          <div className="p-5">
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-3">Total Users</p>
                            <p className="text-3xl font-black text-gray-900 leading-none">{total}</p>
                            <div className="flex items-center gap-2 mt-3">
                              <div className="flex-1 h-1 rounded-full bg-gray-100 overflow-hidden">
                                <div className="h-full rounded-full bg-indigo-400" style={{ width: `${proRate}%` }} />
                              </div>
                              <span className="text-[10px] text-gray-400 tabular-nums">{proRate}% pro</span>
                            </div>
                          </div>

                          {/* Free Plan */}
                          <div className="p-5">
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-3">Free Plan</p>
                            <p className="text-3xl font-black text-gray-500 leading-none">{free}</p>
                            <p className="text-[10px] text-gray-400 mt-3">{total > 0 ? Math.round((free / total) * 100) : 0}% of users</p>
                          </div>

                          {/* Pro Monthly */}
                          <div className="p-5">
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-3">Pro Monthly</p>
                            <p className="text-3xl font-black text-emerald-600 leading-none">{proM}</p>
                            <p className="text-[10px] text-gray-400 mt-3">{total > 0 ? Math.round((proM / total) * 100) : 0}% of users</p>
                          </div>

                          {/* Pro Yearly */}
                          <div className="p-5">
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-3">Pro Yearly</p>
                            <p className="text-3xl font-black text-blue-600 leading-none">{proY}</p>
                            <p className="text-[10px] text-gray-400 mt-3">{total > 0 ? Math.round((proY / total) * 100) : 0}% of users</p>
                          </div>

                          {/* Active Subs */}
                          <div className="p-5">
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-3">Active Subs</p>
                            <p className="text-3xl font-black text-amber-500 leading-none">{activeSubs}</p>
                            <div className="flex items-center gap-1.5 mt-3">
                              <span className={`w-1.5 h-1.5 rounded-full ${activeSubs > 0 ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                              <p className="text-[10px] text-gray-400">{activeSubs > 0 ? 'Billing active' : 'No active billing'}</p>
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })()}
                  {/* Plan Distribution chart */}
                  {subscriptionStats.total_users > 0 && (
                    <div className="p-4 rounded-xl bg-white border border-gray-100">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">Plan Distribution</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{subscriptionStats.total_users} total users</p>
                        </div>
                        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                          <button onClick={() => setSubChartView('donut')} title="Donut view"
                            className={`p-1.5 rounded-md transition ${subChartView === 'donut' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
                            <PieChart className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setSubChartView('bar')} title="Bar view"
                            className={`p-1.5 rounded-md transition ${subChartView === 'bar' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
                            <BarChart2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {(() => {
                        const t = subscriptionStats.total_users || 1;
                        const segments = [
                          { l: 'Free', v: subscriptionStats.free ?? 0, color: '#d1d5db', fill: 'bg-gray-300', text: 'text-gray-600' },
                          { l: 'Pro Monthly', v: subscriptionStats.pro_monthly ?? 0, color: '#34d399', fill: 'bg-emerald-400', text: 'text-emerald-700' },
                          { l: 'Pro Yearly', v: subscriptionStats.pro_yearly ?? 0, color: '#60a5fa', fill: 'bg-blue-400', text: 'text-blue-700' },
                        ];
                        if (subChartView === 'bar') {
                          return (
                            <>
                              <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 mb-3">
                                {segments.filter(s => s.v > 0).map((s, i) => (
                                  <div key={i} className={`${s.fill} h-full transition-all`} style={{ width: `${(s.v / t) * 100}%` }} title={`${s.l}: ${s.v}`} />
                                ))}
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                {segments.map((s, i) => (
                                  <div key={i} className="text-center p-2.5 rounded-lg bg-gray-50">
                                    <div className={`w-2.5 h-2.5 rounded-full ${s.fill} mx-auto mb-1.5`} />
                                    <p className={`text-xl font-bold leading-none ${s.text}`}>{s.v}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">{s.l}</p>
                                    <p className="text-[10px] text-gray-300 mt-0.5">{t > 0 ? ((s.v / t) * 100).toFixed(0) : 0}%</p>
                                  </div>
                                ))}
                              </div>
                            </>
                          );
                        }
                        // Donut chart
                        const R = 52, cx = 70, cy = 70, circ = 2 * Math.PI * R;
                        let offset = 0;
                        const arcs = segments.map(s => {
                          const frac = s.v / t;
                          const dash = frac * circ;
                          const gap = circ - dash;
                          const startOffset = circ - offset;
                          offset += dash;
                          return { ...s, dash, gap, startOffset };
                        });
                        const proTotal = (subscriptionStats.pro_monthly ?? 0) + (subscriptionStats.pro_yearly ?? 0);
                        return (
                          <div className="flex items-center gap-6">
                            <div className="shrink-0">
                              <svg viewBox="0 0 140 140" className="w-36 h-36">
                                <circle cx={cx} cy={cy} r={R} fill="none" stroke="#f3f4f6" strokeWidth="20" />
                                {arcs.filter(a => a.v > 0).map((a, i) => (
                                  <circle key={i} cx={cx} cy={cy} r={R} fill="none"
                                    stroke={a.color} strokeWidth="20"
                                    strokeDasharray={`${a.dash} ${a.gap}`}
                                    strokeDashoffset={a.startOffset}
                                    style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px`, transition: 'stroke-dasharray 0.4s ease' }}
                                  />
                                ))}
                                <text x={cx} y={cy - 7} textAnchor="middle" fontSize="22" fontWeight="700" fill="#111827">{proTotal}</text>
                                <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9" fill="#9ca3af">Pro users</text>
                              </svg>
                            </div>
                            <div className="flex-1 space-y-3">
                              {segments.map((s, i) => (
                                <div key={i} className="flex items-center gap-2.5">
                                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-1">
                                      <span className="text-xs text-gray-600">{s.l}</span>
                                      <span className={`text-xs font-bold ${s.text}`}>{s.v}</span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-gray-100">
                                      <div className="h-full rounded-full transition-all" style={{ width: `${t > 0 ? (s.v / t) * 100 : 0}%`, background: s.color }} />
                                    </div>
                                  </div>
                                  <span className="text-[10px] text-gray-400 w-7 text-right tabular-nums">{t > 0 ? ((s.v / t) * 100).toFixed(0) : 0}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </>
              )}
              <div className="rounded-xl border border-gray-200 overflow-x-auto">
                <table className="w-full text-left min-w-[640px]">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">User</th>
                      <th className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Plan</th>
                      <th className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Renewal</th>
                      <th className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Stripe ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {subscriptionList.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400 text-sm">No subscription data</td></tr>
                    ) : (
                      subscriptionList.map(u => {
                        const isPro = u.subscription_tier === 'pro_monthly' || u.subscription_tier === 'pro_yearly';
                        const tierLabel = u.subscription_tier === 'pro_monthly' ? 'Pro Monthly' : u.subscription_tier === 'pro_yearly' ? 'Pro Yearly' : 'Free';
                        const statusColor = u.subscription_status === 'active' ? 'text-emerald-600 bg-emerald-50' : u.subscription_status === 'canceled' ? 'text-red-500 bg-red-50' : u.subscription_status === 'past_due' ? 'text-amber-600 bg-amber-50' : 'text-gray-500 bg-gray-100';
                        return (
                          <tr key={u.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openUserProfile(u)}>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <UserAvatar user={u} size="sm" />
                                <div>
                                  <p className="text-gray-900 text-sm font-medium">{u.full_name || u.email}</p>
                                  <p className="text-gray-400 text-xs">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isPro ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                {tierLabel}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              {u.subscription_status ? (
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusColor}`}>{u.subscription_status.replace('_', ' ')}</span>
                              ) : <span className="text-gray-300 text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3.5 hidden sm:table-cell">
                              <p className="text-gray-500 text-xs">{u.current_period_end ? new Date(u.current_period_end).toLocaleDateString() : '—'}</p>
                            </td>
                            <td className="px-4 py-3.5 hidden md:table-cell">
                              <p className="text-gray-400 text-xs font-mono truncate max-w-[130px]">{u.stripe_customer_id || '—'}</p>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-600">{subscriptionList.length} users</p>
            </>
          )}
        </section>
      )}


      {/* ==================== SETTINGS ==================== */}
      {activeTab === 'settings' && (
        <section className="space-y-6">
          {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div> : (
            <div className="space-y-6">

              {/* ── Platform Controls ── */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center">
                    <Settings className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-gray-900 text-sm font-bold">Platform Controls</h3>
                    <p className="text-gray-400 text-xs">Global platform feature flags</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { key: 'maintenance_mode', label: 'Maintenance Mode', desc: 'Blocks all non-admin users and shows a maintenance page', icon: AlertTriangle, danger: true },
                    { key: 'allow_signups', label: 'Allow New Signups', desc: 'Permit new users to register accounts', icon: UserCheck },
                  ].map(s => {
                    const isOn = siteSettings[s.key] === 'true';
                    return (
                      <div key={s.key} className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
                        s.danger && isOn
                          ? 'bg-red-50 border-red-200'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            s.danger ? (isOn ? 'bg-red-100' : 'bg-gray-100') : (isOn ? 'bg-emerald-100' : 'bg-gray-100')
                          }`}>
                            <s.icon className={`w-4.5 h-4.5 ${
                              s.danger ? (isOn ? 'text-red-500' : 'text-gray-500') : (isOn ? 'text-emerald-600' : 'text-gray-500')
                            }`} style={{ width: 18, height: 18 }} />
                          </div>
                          <div>
                            <p className={`text-sm font-semibold ${s.danger && isOn ? 'text-red-700' : 'text-gray-900'}`}>{s.label}</p>
                            <p className="text-gray-500 text-xs mt-0.5">{s.desc}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[11px] font-bold ${isOn ? (s.danger ? 'text-red-500' : 'text-emerald-600') : 'text-gray-400'}`}>
                            {isOn ? 'ON' : 'OFF'}
                          </span>
                          <button
                            role="switch"
                            aria-checked={isOn}
                            onClick={() => handleToggleSetting(s.key, siteSettings[s.key] || 'false')}
                            className={`relative w-12 h-6.5 rounded-full transition-colors duration-200 focus:outline-none ${
                              isOn ? (s.danger ? 'bg-red-500' : 'bg-emerald-500') : 'bg-gray-300'
                            }`}
                            style={{ width: 48, height: 26 }}
                          >
                            <span className={`absolute top-[3px] left-[3px] w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                              isOn ? 'translate-x-[22px]' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>


              {/* ── Announcements ── */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                    <Megaphone className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-gray-900 text-sm font-bold">Announcements</h3>
                    <p className="text-gray-400 text-xs">Broadcast messages to all users</p>
                  </div>
                </div>

                {/* New announcement form */}
                <div className="p-5 rounded-2xl bg-white border border-gray-200 space-y-3 mb-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">New Announcement</p>
                  <input
                    type="text"
                    placeholder="Title"
                    value={newAnnTitle}
                    onChange={e => setNewAnnTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:bg-white transition"
                  />
                  <textarea
                    placeholder="Write your message…"
                    value={newAnnMsg}
                    onChange={e => setNewAnnMsg(e.target.value)}
                    rows={2}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:bg-white transition resize-none"
                  />
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 font-medium">Expires</span>
                      <button
                        ref={annCalAnchorRef}
                        type="button"
                        onClick={() => setAnnCalOpen(o => !o)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-700 hover:border-gray-400 transition font-medium"
                      >
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {newAnnExpires ? new Date(newAnnExpires).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Pick a date'}
                      </button>
                      {newAnnExpires && (
                        <button type="button" onClick={() => setNewAnnExpires('')} className="text-xs text-gray-400 hover:text-red-400 transition">Clear</button>
                      )}
                      <MiniCalendar
                        open={annCalOpen}
                        onClose={() => setAnnCalOpen(false)}
                        anchorRef={annCalAnchorRef}
                        isTr={false}
                        centered
                        onDateSelect={(d) => { setNewAnnExpires(d.toISOString()); setAnnCalOpen(false); }}
                      />
                    </div>
                    <button
                      onClick={handleCreateAnnouncement}
                      disabled={!newAnnTitle.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40 transition"
                    >
                      <Plus className="w-4 h-4" /> Publish
                    </button>
                  </div>
                </div>

                {/* Existing announcements */}
                {announcements.length > 0 && (
                  <div className="space-y-2">
                    {announcements.map(a => (
                      <div key={a.id} className="p-4 rounded-2xl bg-white border border-gray-200 hover:border-gray-300 flex items-start justify-between gap-3 transition-all">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${a.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-gray-900 font-semibold text-sm">{a.title}</h4>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${a.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                {a.is_active ? 'Live' : 'Hidden'}
                              </span>
                            </div>
                            <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{a.message}</p>
                            <p className="text-gray-400 text-[11px] mt-1">
                              {a.created_at ? new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                              {a.expires_at && <span className="ml-2 text-amber-500 font-medium">· Expires {new Date(a.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => handleToggleAnnouncement(a)} title={a.is_active ? 'Hide' : 'Show'} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition">
                            {a.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          </button>
                          <button onClick={() => handleDeleteAnnouncement(a.id)} title="Delete" className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Audit Log ── */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="text-gray-900 text-sm font-bold">Audit Log</h3>
                      <p className="text-gray-400 text-xs">{auditLogs.length} entr{auditLogs.length !== 1 ? 'ies' : 'y'} recorded</p>
                    </div>
                  </div>
                  {auditLogs.length > 0 && (
                    <button onClick={() => setConfirmModal({ open: true, type: 'clearAudit', data: null })}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-50 border border-red-200 transition">
                      <Trash2 className="w-3.5 h-3.5" /> Clear All
                    </button>
                  )}
                </div>
                {auditLogs.length === 0 ? (
                  <div className="text-center py-12 rounded-2xl border border-dashed border-gray-200 bg-gray-50">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <Clock className="w-6 h-6 text-gray-300" />
                    </div>
                    <p className="text-gray-500 text-sm font-medium">No actions recorded yet</p>
                    <p className="text-gray-400 text-xs mt-1">Admin activity will appear here</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-left">
                      <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        <tr>
                          <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Admin</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Action</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Target</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Details</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {auditLogs.map(log => {
                          const actionStyles = {
                            delete_user:         'text-red-600 bg-red-50 border border-red-100',
                            bulk_delete:         'text-red-600 bg-red-50 border border-red-100',
                            delete_announcement: 'text-red-600 bg-red-50 border border-red-100',
                            create_user:         'text-emerald-700 bg-emerald-50 border border-emerald-100',
                            create_announcement: 'text-blue-700 bg-blue-50 border border-blue-100',
                            update_user:         'text-gray-700 bg-gray-100 border border-gray-200',
                            update_setting:      'text-violet-700 bg-violet-50 border border-violet-100',
                            update_announcement: 'text-amber-700 bg-amber-50 border border-amber-100',
                            bulk_activate:       'text-emerald-700 bg-emerald-50 border border-emerald-100',
                            bulk_deactivate:     'text-gray-700 bg-gray-100 border border-gray-200',
                            reset_password:      'text-orange-700 bg-orange-50 border border-orange-100',
                          };
                          const actionLabels = {
                            delete_user: 'Deleted user', bulk_delete: 'Bulk deleted', create_user: 'Created user',
                            update_user: 'Updated user', update_setting: 'Changed setting',
                            create_announcement: 'New announcement', delete_announcement: 'Deleted announcement',
                            update_announcement: 'Updated announcement', bulk_activate: 'Bulk activated',
                            bulk_deactivate: 'Bulk deactivated', reset_password: 'Reset password',
                          };
                          const settingLabels = { maintenance_mode: 'Maintenance Mode', allow_signups: 'Allow Signups' };
                          const styleClass = actionStyles[log.action] || 'text-gray-500 bg-gray-100 border border-gray-200';
                          const actionLabel = actionLabels[log.action] || log.action.replace(/_/g, ' ');
                          let targetDisplay = log.target_label || '—';
                          if (log.action === 'update_setting') targetDisplay = settingLabels[log.target_label] || log.target_label;
                          let detailDisplay = (log.details || '—')
                            .replace(/value=true/g, 'Enabled').replace(/value=false/g, 'Disabled')
                            .replace(/True/g, 'Yes').replace(/False/g, 'No');
                          return (
                            <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3.5">
                                <p className="text-gray-800 text-xs font-semibold truncate max-w-[140px]">{log.admin_email}</p>
                              </td>
                              <td className="px-4 py-3.5">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${styleClass}`}>
                                  {actionLabel}
                                </span>
                              </td>
                              <td className="px-4 py-3.5">
                                <p className="text-gray-700 text-xs font-medium truncate max-w-[150px]">{targetDisplay}</p>
                              </td>
                              <td className="px-4 py-3.5 hidden sm:table-cell">
                                <p className="text-gray-400 text-xs truncate max-w-[180px]">{detailDisplay}</p>
                              </td>
                              <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                <p className="text-gray-600 text-xs font-medium">{log.created_at ? new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</p>
                                <p className="text-gray-400 text-[10px] mt-0.5">{log.created_at ? new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}
        </section>
      )}

      {/* ==================== MODALS ==================== */}

      {/* ── User Profile Modal ── */}
      {userProfileModal.open && (() => {
        const p = userProfileModal.data;
        const close = () => setUserProfileModal({ open: false, userId: null, data: null, loading: false });
        const isAdmin = p?.role === 'admin';
        const activityItems = (!p || isAdmin) ? [] : [
          { label: 'Diabetes', key: 'diabetes', color: '#60a5fa' },
          { label: 'Heart',    key: 'heart',    color: '#f87171' },
          { label: 'CKD',      key: 'ckd',      color: '#c084fc' },
          { label: 'Brain MRI', key: 'brain_mri', color: '#fbbf24' },
          { label: 'Diet',     key: 'diet_plans', color: '#34d399' },
        ];
        const maxAct = p && !isAdmin ? Math.max(...activityItems.map(a => p.activity[a.key] || 0), 1) : 1;
        const planLabel = !p ? '' : p.subscription_tier === 'pro_monthly' ? 'Pro Monthly' : p.subscription_tier === 'pro_yearly' ? 'Pro Yearly' : 'Free';
        const accountAgeDays = p?.created_at ? Math.floor((Date.now() - new Date(p.created_at)) / 86400000) : 0;

        return (
          <>
            {/* Backdrop */}
            <div
              onClick={close}
              aria-hidden
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)', zIndex: 80 }}
            />

            {/* Modal panel */}
            <div className="profile-modal-scroll" style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              zIndex: 81, width: '100%', maxWidth: 740, maxHeight: '90vh',
              overflowY: 'auto', borderRadius: 24,
              background: '#f4f6f9',
              boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
              scrollbarWidth: 'none', msOverflowStyle: 'none',
            }}>

              {/* ── Header card ── */}
              {p && (
                <div style={{ position: 'relative', margin: 12, borderRadius: 18, overflow: 'hidden', background: 'linear-gradient(135deg, #1a1f2e 0%, #1e2540 55%, #1a2535 100%)' }}>
                  {/* Orbs */}
                  <div style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', bottom: -20, left: '40%', width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

                  <div style={{ padding: '22px 22px 20px', position: 'relative' }}>
                    {/* Avatar row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                      <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg, #6366f1 0%, #10b981 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 900, color: '#fff', boxShadow: '0 6px 24px rgba(99,102,241,0.45)', flexShrink: 0, letterSpacing: -1 }}>
                        {(p.full_name || p.email || '?').slice(0, 1).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                        <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#fff', letterSpacing: -0.4, lineHeight: 1.2, textTransform: 'uppercase' }}>{p.full_name || '(no name)'}</h3>
                        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.1 }}>{p.email}</p>
                        <p style={{ margin: '3px 0 0', fontSize: 10.5, color: 'rgba(255,255,255,0.28)', fontFamily: 'monospace' }}>
                          ID #{p.id} · Joined {p.created_at ? new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'} · {accountAgeDays}d ago
                        </p>
                        {/* Badges */}
                        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                          <span style={{ padding: '3px 11px', borderRadius: 8, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', background: p.role === 'admin' ? 'rgba(139,92,246,0.35)' : 'rgba(255,255,255,0.1)', color: p.role === 'admin' ? '#c4b5fd' : '#cbd5e1', border: `1px solid ${p.role === 'admin' ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.12)'}` }}>{p.role}</span>
                          <span style={{ padding: '3px 11px', borderRadius: 8, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', background: p.is_active ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: p.is_active ? '#6ee7b7' : '#fca5a5', border: `1px solid ${p.is_active ? 'rgba(52,211,153,0.35)' : 'rgba(252,165,165,0.35)'}` }}>
                            {p.is_active ? '● Active' : '○ Inactive'}
                          </span>
                          {!isAdmin && <span style={{ padding: '3px 11px', borderRadius: 8, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', background: planLabel !== 'Free' ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.08)', color: planLabel !== 'Free' ? '#fcd34d' : '#94a3b8', border: `1px solid ${planLabel !== 'Free' ? 'rgba(252,211,77,0.4)' : 'rgba(255,255,255,0.1)'}` }}>{planLabel === 'Free' ? 'Free Plan' : planLabel}</span>}
                          {userProfileModal.loading && <Loader2 size={12} style={{ color: 'rgba(255,255,255,0.4)', animation: 'spin 1s linear infinite', alignSelf: 'center' }} />}
                        </div>
                      </div>
                    </div>

                    {/* Quick stats row — inside the dark card */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 18 }}>
                      {(isAdmin ? [
                        { label: 'Account Age', value: `${accountAgeDays}d` },
                        { label: '2FA', value: p.totp_enabled ? 'On' : 'Off', accent: p.totp_enabled },
                        { label: 'Language', value: p.preferred_language ? p.preferred_language.charAt(0).toUpperCase() + p.preferred_language.slice(1) : '—' },
                        { label: 'Onboarding', value: p.onboarding_completed ? 'Done' : 'Pending', accent: p.onboarding_completed },
                      ] : [
                        { label: 'Total Tests', value: userProfileModal.loading ? '…' : (p.total_tests || 0) },
                        { label: 'Most Used', value: userProfileModal.loading ? '…' : (p.most_used || '—') },
                        { label: 'Language', value: p.preferred_language ? p.preferred_language.charAt(0).toUpperCase() + p.preferred_language.slice(1) : '—' },
                        { label: 'Sub Status', value: p.subscription_status || 'none', accent: p.subscription_status === 'active' },
                      ]).map(stat => (
                        <div key={stat.label} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: '10px 10px 9px', textAlign: 'center' }}>
                          <p style={{ margin: 0, fontSize: 8.5, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.9, fontWeight: 700 }}>{stat.label}</p>
                          <p style={{ margin: '5px 0 0', fontSize: 14, fontWeight: 800, color: stat.accent === true ? '#6ee7b7' : stat.accent === false ? '#94a3b8' : '#fff', lineHeight: 1 }}>{stat.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Close button */}
                  <button onClick={close} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '5px 7px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={14} />
                  </button>
                </div>
              )}

              {p && (
                <div style={{ padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>

                  {/* ── Activity bars (users only) / Admin analytics ── */}
                  {isAdmin ? (
                    <div style={{ background: '#fff', border: '1px solid #eef0f3', borderRadius: 16, padding: '16px 18px' }}>
                      <p style={{ margin: '0 0 12px', fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>Admin Analytics</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                        {[
                          { icon: '🛡️', label: 'Privileges', value: 'Full Access' },
                          { icon: '🔐', label: '2FA Security', value: p.totp_enabled ? 'Enabled' : 'Not Set' },
                          { icon: '📅', label: 'Member Since', value: p.created_at ? new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—' },
                          { icon: '⏱️', label: 'Account Age', value: accountAgeDays >= 365 ? `${Math.floor(accountAgeDays / 365)}Y ${Math.floor((accountAgeDays % 365) / 30)}M` : `${accountAgeDays}D` },
                          { icon: '🌐', label: 'Language', value: (p.preferred_language || '—').charAt(0).toUpperCase() + (p.preferred_language || '—').slice(1) },
                          { icon: '✅', label: 'Onboarding', value: p.onboarding_completed ? 'Completed' : 'Pending' },
                        ].map(item => (
                          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 14px' }}>
                            <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
                            <div>
                              <p style={{ margin: 0, fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.7, fontWeight: 600 }}>{item.label}</p>
                              <p style={{ margin: '3px 0 0', fontSize: 13, fontWeight: 700, color: '#111827' }}>{item.value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: '#fff', border: '1px solid #eef0f3', borderRadius: 16, padding: '16px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <p style={{ margin: 0, fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>Test Activity</p>
                        {userProfileModal.loading
                          ? <span style={{ fontSize: 10, color: '#d1d5db' }}>Loading…</span>
                          : <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>{p.total_tests} total</span>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {activityItems.map(a => {
                          const val = p.activity[a.key] || 0;
                          const pct = userProfileModal.loading ? 15 : (val / maxAct) * 100;
                          return (
                            <div key={a.key}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                <span style={{ fontSize: 12, color: '#6b7280' }}>{a.label}</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: userProfileModal.loading ? '#d1d5db' : '#111827' }}>{userProfileModal.loading ? '…' : val}</span>
                              </div>
                              <div style={{ height: 5, borderRadius: 99, background: '#e5e7eb', overflow: 'hidden' }}>
                                <div style={{ height: '100%', borderRadius: 99, background: a.color, width: `${pct}%`, opacity: userProfileModal.loading ? 0.3 : 1, transition: 'width .5s ease, opacity .3s' }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── Recent Assessments ── */}
                  {(() => {
                    const TYPE_DOT = { diabetes: '#6366f1', heart: '#f43f5e', ckd: '#8b5cf6', brain: '#f59e0b', diet: '#10b981' };
                    const TYPE_LBL = { diabetes: 'Diabetes', heart: 'Heart', ckd: 'CKD', brain: 'Brain MRI', diet: 'Diet' };
                    const fmt = s => (s || '').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
                    const userTests = [
                      ...assessments.filter(a => a.user_id === p.id).map(a => ({ ...a, _type: 'diabetes', _metric: a.risk_level || '—', _conf: a.probability })),
                      ...heartAssessments.filter(a => a.user_id === p.id).map(a => ({ ...a, _type: 'heart', _metric: a.risk_level || '—', _conf: a.probability })),
                      ...ckdAssessments.filter(a => a.user_id === p.id).map(a => ({ ...a, _type: 'ckd', _metric: a.prediction || '—', _conf: a.confidence })),
                      ...brainMRIAnalyses.filter(a => a.user_id === p.id).map(a => ({ ...a, _type: 'brain', _metric: fmt(a.tumor_class) || '—', _conf: a.confidence })),
                      ...dietPlans.filter(a => a.user_id === p.id).map(a => ({ ...a, _type: 'diet', _metric: fmt(a.goal) || '—', _conf: null })),
                    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6);

                    if (userTests.length === 0) return null;
                    return (
                      <div style={{ background: '#fff', border: '1px solid #eef0f3', borderRadius: 16, padding: '16px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <p style={{ margin: 0, fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>Recent Assessments</p>
                          <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>{userTests.length} shown</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {userTests.map((t, i) => {
                            const dot = TYPE_DOT[t._type] || '#d1d5db';
                            const isHigh = (t._type === 'diabetes' || t._type === 'heart') && (t.risk_level || '').toLowerCase().includes('high')
                              || t._type === 'ckd' && (t.prediction || '').toLowerCase() === 'ckd'
                              || t._type === 'brain' && (t.tumor_class || '').toLowerCase() !== 'no tumor';
                            return (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: isHigh ? '#fff5f5' : '#fff', border: `1px solid ${isHigh ? '#fecaca' : '#e5e7eb'}`, borderRadius: 10, padding: '9px 12px' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', minWidth: 70 }}>{TYPE_LBL[t._type]}</span>
                                <span style={{ fontSize: 12, color: '#6b7280', flex: 1 }}>{t._metric}</span>
                                {t._conf != null && (
                                  <span style={{ fontSize: 11, color: '#9ca3af' }}>{(t._conf * 100).toFixed(0)}%</span>
                                )}
                                {isHigh && <span style={{ fontSize: 9, fontWeight: 700, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 99, padding: '2px 7px' }}>HIGH</span>}
                                <span style={{ fontSize: 10, color: '#d1d5db', flexShrink: 0 }}>
                                  {t.created_at ? new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── Account details ── */}
                  <div style={{ background: '#fff', border: '1px solid #eef0f3', borderRadius: 16, padding: '16px 18px' }}>
                    <p style={{ margin: '0 0 12px', fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>Account Details</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px 24px' }}>
                      {[
                        { l: 'User ID', v: `#${p.id}` },
                        { l: 'Language', v: p.preferred_language ? p.preferred_language.charAt(0).toUpperCase() + p.preferred_language.slice(1) : '—' },
                        { l: 'Plan', v: planLabel },
                        { l: 'Sub. Status', v: p.subscription_status || 'none' },
                        { l: 'Stripe ID', v: p.stripe_customer_id ? p.stripe_customer_id.slice(0, 16) + '…' : '—' },
                        { l: 'Joined', v: p.created_at ? new Date(p.created_at).toLocaleDateString() : '—' },
                      ].map(row => (
                        <div key={row.l} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.6 }}>{row.l}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#111827', fontFamily: 'monospace' }}>{row.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Admin notes ── */}
                  <div>
                    <p style={{ margin: '0 0 8px', fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>Admin Notes</p>
                    <textarea
                      defaultValue={p.admin_notes}
                      onBlur={async (e) => {
                        try { await adminUpdateUserNotes(p.id, e.target.value); showToast('Notes saved'); }
                        catch { showToast('Failed to save notes', 'error'); }
                      }}
                      rows={3}
                      placeholder="Add private notes about this user…"
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: '#fff', border: '1px solid #eef0f3', color: '#111827', fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5, transition: 'border-color .2s' }}
                      onFocus={e => { e.target.style.borderColor = '#6366f1'; }}
                      onBlurCapture={e => { e.target.style.borderColor = '#e5e7eb'; }}
                    />
                  </div>

                  {/* ── Action buttons ── */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '12px 14px', background: '#fff', border: '1px solid #eef0f3', borderRadius: 16 }}>
                    {[
                      {
                        icon: p.is_active ? <UserX size={15} /> : <UserCheck size={15} />,
                        label: p.is_active ? 'Deactivate' : 'Activate',
                        onClick: async () => { await handleToggleActive(p.id, p.is_active); close(); fetchTab(); },
                      },
                      {
                        icon: <ShieldCheck size={15} />,
                        label: p.role === 'admin' ? 'Remove Admin' : 'Make Admin',
                        onClick: async () => { await handleToggleRole(p.id, p.role); close(); fetchTab(); },
                      },
                      {
                        icon: <Mail size={15} />,
                        label: 'Send Email',
                        onClick: () => { close(); setEmailModal({ open: true, user: p }); },
                      },
                      {
                        icon: <ShieldOff size={15} />,
                        label: 'Reset Password',
                        onClick: () => { close(); setResetPwModal({ open: true, user: p }); },
                      },
                    ].map(btn => (
                      <button key={btn.label} onClick={btn.onClick}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background .15s', background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#111827' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#e5e7eb'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#f3f4f6'; }}>
                        {btn.icon}{btn.label}
                      </button>
                    ))}
                    <button onClick={() => { close(); setConfirmModal({ open: true, type: 'delete', data: p }); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginLeft: 'auto', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', transition: 'background .15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; }}>
                      <Trash2 size={15} /> Delete User
                    </button>
                  </div>

                </div>
              )}
            </div>
          </>
        );
      })()}

      {/* Delete confirm */}
      <Modal isOpen={confirmModal.open && confirmModal.type === 'delete'} onClose={() => setConfirmModal({ open: false, type: '', data: null })} title="Delete User">
        <p className="text-gray-500 text-sm mb-6">Are you sure you want to delete <strong className="text-gray-900">{confirmModal.data?.email}</strong>? This cannot be undone.</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setConfirmModal({ open: false, type: '', data: null })} className="px-4 py-2 rounded-lg text-sm text-gray-500 border border-gray-200">Cancel</button>
          <button onClick={handleDeleteUser} disabled={actionLoading} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-gray-900 flex items-center gap-2">
            {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />} Delete
          </button>
        </div>
      </Modal>

      {/* Clear audit log confirm */}
      <Modal isOpen={confirmModal.open && confirmModal.type === 'clearAudit'} onClose={() => setConfirmModal({ open: false, type: '', data: null })} title="Clear Audit Log">
        <p className="text-gray-500 text-sm mb-6">Are you sure you want to clear <strong className="text-gray-900">all {auditLogs.length} log entries</strong>? This cannot be undone.</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setConfirmModal({ open: false, type: '', data: null })} className="px-4 py-2 rounded-lg text-sm text-gray-500 border border-gray-200">Cancel</button>
          <button onClick={async () => { setActionLoading(true); try { await adminClearAuditLog(); setAuditLogs([]); showToast('Audit log cleared'); } catch(err) { showToast(err.message || 'Failed', 'error'); } finally { setActionLoading(false); setConfirmModal({ open: false, type: '', data: null }); } }}
            disabled={actionLoading} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-gray-900 flex items-center gap-2">
            {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />} Clear All
          </button>
        </div>
      </Modal>

      {/* Create user */}
      <Modal isOpen={createUserOpen} onClose={() => setCreateUserOpen(false)} title="Create User">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Email</label>
            <input name="email" type="email" required className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 text-sm focus:outline-none focus:border-gray-400" />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Password</label>
            <input name="password" type="text" required minLength={6} className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 text-sm focus:outline-none focus:border-gray-400" />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Full Name</label>
            <input name="full_name" type="text" className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 text-sm focus:outline-none focus:border-gray-400" />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Role</label>
            <select name="role" defaultValue="user" className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 text-sm">
              <option value="user">User</option><option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setCreateUserOpen(false)} className="px-4 py-2 rounded-lg text-sm text-gray-500 border border-gray-200">Cancel</button>
            <button type="submit" disabled={actionLoading} className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-900 border border-gray-300 flex items-center gap-2">
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />} Create
            </button>
          </div>
        </form>
      </Modal>

      {/* Assessment detail */}
      <Modal isOpen={!!selectedAssessment} onClose={() => setSelectedAssessment(null)} title="Assessment Details">
        {selectedAssessment && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-gray-500">Risk Level</p>
                <span className={`inline-block px-2 py-1 rounded text-sm font-medium mt-1
                  ${selectedAssessment.risk_level === 'High' ? 'bg-red-500/20 text-red-400' : selectedAssessment.risk_level === 'Medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-600'}`}>
                  {selectedAssessment.risk_level}
                </span>
              </div>
              <div><p className="text-xs text-gray-500">Probability</p><p className="text-gray-900 font-medium mt-1">{selectedAssessment.probability != null ? `${(selectedAssessment.probability * 100).toFixed(1)}%` : '—'}</p></div>
            </div>
            <div>
              <p className="text-xs text-gray-500">User</p>
              <p className="text-gray-900 font-medium mt-1">{selectedAssessment.user_full_name || selectedAssessment.user_email || '—'}</p>
              {selectedAssessment.user_full_name && <p className="text-gray-400 text-xs mt-0.5">{selectedAssessment.user_email}</p>}
            </div>
            <div><p className="text-xs text-gray-500">Date</p><p className="text-gray-500 text-sm mt-1">{selectedAssessment.created_at ? new Date(selectedAssessment.created_at).toLocaleString() : '—'}</p></div>
            <div><p className="text-xs text-gray-500">ID</p><p className="text-gray-500 text-sm font-mono mt-1">{selectedAssessment.assessment_id || '—'}</p></div>
          </div>
        )}
      </Modal>

      {/* Feature f12: User Notes Modal */}
      <Modal isOpen={notesModal.open} onClose={() => setNotesModal({ open: false, user: null })} title={`Notes — ${notesModal.user?.email || ''}`}>
        <div className="space-y-4">
          <p className="text-xs text-gray-500">Add private admin notes for this user. Only admins can see these.</p>
          <textarea
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            rows={5}
            placeholder="Type notes here..."
            className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-gray-400 resize-none"
          />
          <div className="flex gap-3 justify-end">
            <button onClick={() => setNotesModal({ open: false, user: null })} className="px-4 py-2 rounded-lg text-sm text-gray-500 border border-gray-200">Cancel</button>
            <button onClick={handleSaveNotes} disabled={actionLoading} className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-900 border border-gray-300 flex items-center gap-2">
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />} Save Notes
            </button>
          </div>
        </div>
      </Modal>

      {/* Feature f13: Send Email Modal */}
      <Modal isOpen={emailModal.open} onClose={() => { setEmailModal({ open: false, user: null }); setEmailSubject(''); setEmailBody(''); }} title={`Email — ${emailModal.user?.email || ''}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Subject</label>
            <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Email subject..."
              className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-gray-400" />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Body</label>
            <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={5} placeholder="Email body..."
              className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-gray-400 resize-none" />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => { setEmailModal({ open: false, user: null }); setEmailSubject(''); setEmailBody(''); }} className="px-4 py-2 rounded-lg text-sm text-gray-500 border border-gray-200">Cancel</button>
            <button onClick={handleSendEmail} disabled={actionLoading || !emailSubject.trim()} className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-gray-900 flex items-center gap-2 disabled:opacity-50">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send Email
            </button>
          </div>
        </div>
      </Modal>

      {/* Feature f14: Bulk Email Modal */}
      <Modal isOpen={bulkEmailModal} onClose={() => { setBulkEmailModal(false); setBulkEmailSubject(''); setBulkEmailBody(''); }} title="Bulk Email" width="max-w-lg">
        <div className="space-y-4">
          <p className="text-xs text-gray-500">Send email to multiple users at once. Uses the configured SMTP email service.</p>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Recipients</label>
            <Dropdown value={bulkEmailRole} onChange={setBulkEmailRole} options={[
              { value: 'all', label: 'All active users' },
              { value: 'user', label: 'Users only' },
              { value: 'admin', label: 'Admins only' },
            ]} className="w-full" />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Subject</label>
            <input type="text" value={bulkEmailSubject} onChange={e => setBulkEmailSubject(e.target.value)} placeholder="Email subject..."
              className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-gray-400" />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Body</label>
            <textarea value={bulkEmailBody} onChange={e => setBulkEmailBody(e.target.value)} rows={6} placeholder="Email body..."
              className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-gray-400 resize-none" />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => { setBulkEmailModal(false); setBulkEmailSubject(''); setBulkEmailBody(''); }} className="px-4 py-2 rounded-lg text-sm text-gray-500 border border-gray-200">Cancel</button>
            <button onClick={handleBulkEmailSend} disabled={actionLoading || !bulkEmailSubject.trim()} className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-gray-900 flex items-center gap-2 disabled:opacity-50">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Send to {bulkEmailRole === 'all' ? 'All' : bulkEmailRole === 'user' ? 'Users' : 'Admins'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
    </>
  );
}
