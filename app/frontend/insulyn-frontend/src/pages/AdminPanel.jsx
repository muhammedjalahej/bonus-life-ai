import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, FileText, UtensilsCrossed, BarChart3, Loader2, ChevronRight, Shield,
  Search, RefreshCw, Download, Trash2, UserCheck, UserX, ShieldCheck, ShieldOff,
  X, AlertTriangle, Check, ChevronDown, ChevronUp, Eye, Plus, Megaphone,
  Settings, Activity, Clock, CheckCircle, XCircle, Server, Mail, StickyNote, Send,
} from 'lucide-react';
import { getAvatarUrl } from '../config/constants';
import {
  adminGetUsers, adminGetStats, adminGetAssessments, adminDeleteUser, adminUpdateUser,
  adminCreateUser, adminBulkAction, adminGetChartData, adminGetAuditLog, adminClearAuditLog,
  adminGetAnnouncements, adminCreateAnnouncement, adminUpdateAnnouncement, adminDeleteAnnouncement,
  adminGetSettings, adminUpdateSetting, adminGetSystemHealth,
  adminUpdateUserNotes, adminSendEmail, adminBulkEmail,
} from '../services/api';

/* ===================== REUSABLE COMPONENTS ===================== */

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const colors = { success: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400', error: 'bg-red-500/20 border-red-500/30 text-red-400', info: 'bg-blue-500/20 border-blue-500/30 text-blue-400' };
  return (
    <div className={`fixed bottom-6 right-6 z-[80] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border ${colors[type] || colors.info}`}>
      {type === 'success' ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70"><X className="w-4 h-4" /></button>
    </div>
  );
}

function Modal({ isOpen, onClose, title, children, width = 'max-w-md' }) {
  if (!isOpen) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]" onClick={onClose} />
      <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] w-full ${width} max-h-[85vh] overflow-auto`}>
        <div className="bg-[#12121f] border border-white/[0.08] rounded-2xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <button onClick={onClose} className="p-1 hover:bg-white/[0.05] rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
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
  return <div className={`${s} rounded-full bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 flex items-center justify-center font-medium text-emerald-400`}>{i}</div>;
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] animate-pulse">
          <div className="h-4 bg-white/[0.06] rounded w-1/2 mb-3" /><div className="h-8 bg-white/[0.06] rounded w-1/3" />
        </div>
      ))}
    </div>
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
        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-gray-300 text-sm hover:border-white/[0.15] transition min-w-[110px]">
        <span className="truncate">{selected?.label || value}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-[70] min-w-full w-max bg-[#1a1a2e] border border-white/[0.1] rounded-xl shadow-2xl py-1 overflow-hidden">
            {options.map(o => (
              <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm transition
                  ${value === o.value ? 'bg-amber-500/15 text-amber-400 font-medium' : 'text-gray-300 hover:bg-white/[0.06] hover:text-white'}`}>
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* Simple bar chart */
function MiniBarChart({ data, color = 'emerald', label }) {
  if (!data || data.length === 0) return <p className="text-gray-600 text-sm">No data</p>;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      <div className="flex items-end gap-1 h-24">
        {data.slice(-14).map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`w-full rounded-t bg-${color}-500/40 hover:bg-${color}-500/60 transition-all`}
              style={{ height: `${Math.max((d.count / max) * 100, 4)}%` }}
              title={`${d.date}: ${d.count}`}
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

/* Risk pie-like display */
function RiskDistribution({ data }) {
  if (!data || data.length === 0) return <p className="text-gray-600 text-sm">No data</p>;
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  const colors = { High: 'bg-red-500', Medium: 'bg-amber-500', Low: 'bg-emerald-500', Unknown: 'bg-gray-500' };
  const textColors = { High: 'text-red-400', Medium: 'text-amber-400', Low: 'text-emerald-400', Unknown: 'text-gray-400' };
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 mb-2">Risk Level Distribution</p>
      {data.map(d => (
        <div key={d.level} className="flex items-center gap-3">
          <span className={`text-xs font-medium w-16 ${textColors[d.level] || 'text-gray-400'}`}>{d.level}</span>
          <div className="flex-1 h-3 rounded-full bg-white/[0.06] overflow-hidden">
            <div className={`h-full rounded-full ${colors[d.level] || 'bg-gray-500'}`} style={{ width: `${(d.count / total) * 100}%` }} />
          </div>
          <span className="text-xs text-gray-400 w-8 text-right">{d.count}</span>
        </div>
      ))}
    </div>
  );
}


/* ===================== MAIN COMPONENT ===================== */

export default function AdminPanel({ language }) {
  const isTr = language === 'turkish';

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
  const [auditLogs, setAuditLogs] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [siteSettings, setSiteSettings] = useState({});

  // ---------- UI STATE ----------
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, type: '', data: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [assessRiskFilter, setAssessRiskFilter] = useState('all');
  const [assessSearchTerm, setAssessSearchTerm] = useState('');
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnMsg, setNewAnnMsg] = useState('');
  // Feature f12: user notes
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
        const d = await adminGetAssessments(0, 500);
        setAssessments(Array.isArray(d) ? d : []);
      } else if (activeTab === 'audit') {
        const d = await adminGetAuditLog(0, 200);
        setAuditLogs(Array.isArray(d) ? d : []);
      } else if (activeTab === 'announcements') {
        const d = await adminGetAnnouncements();
        setAnnouncements(Array.isArray(d) ? d : []);
      } else if (activeTab === 'settings') {
        const [d, h] = await Promise.all([adminGetSettings(), adminGetSystemHealth()]);
        setSiteSettings(d || {});
        setSystemHealth(h);
      }
    } catch (err) {
      showToast(err.message || 'Load failed', 'error');
    } finally { setLoading(false); }
  }, [activeTab]);

  useEffect(() => { fetchTab(); }, [fetchTab]);

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
      await adminCreateAnnouncement({ title: newAnnTitle, message: newAnnMsg, is_active: true });
      setNewAnnTitle(''); setNewAnnMsg('');
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

  // Assessment filters
  const filteredAssessments = assessments.filter(a => {
    const matchRisk = assessRiskFilter === 'all' || a.risk_level === assessRiskFilter;
    const matchSearch = assessSearchTerm === '' || (a.user_email || '').toLowerCase().includes(assessSearchTerm.toLowerCase());
    return matchRisk && matchSearch;
  });


  /* ===================== RENDER ===================== */

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'assessments', label: 'Assessments', icon: FileText },
    { id: 'audit', label: 'Audit Log', icon: Clock },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 pt-24 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center"><Shield className="w-5 h-5 text-amber-400" /></div>
          <div>
            <h1 className="text-xl font-bold text-white">Admin Panel</h1>
            <p className="text-gray-500 text-xs">Manage users, data, and platform settings</p>
          </div>
        </div>
        <button onClick={fetchTab} disabled={loading} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/[0.05] border border-white/[0.08] transition">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition
              ${activeTab === t.id ? 'bg-amber-500/20 text-amber-400 shadow-sm' : 'text-gray-500 hover:text-white hover:bg-white/[0.04]'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* ==================== OVERVIEW ==================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {loading ? <StatsSkeleton /> : stats && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { l: 'Total Users', v: stats.total_users, c: 'emerald', icon: Users },
                  { l: 'Active', v: stats.active_users, c: 'blue', icon: UserCheck },
                  { l: 'Admins', v: stats.admin_count, c: 'amber', icon: Shield },
                  { l: 'Assessments', v: stats.total_assessments, c: 'purple', icon: FileText },
                  { l: 'Diet Plans', v: stats.total_diet_plans, c: 'cyan', icon: UtensilsCrossed },
                ].map((s, i) => (
                  <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-500 text-xs">{s.l}</span>
                      <s.icon className={`w-4 h-4 text-${s.c}-400`} />
                    </div>
                    <p className="text-2xl font-bold text-white">{s.v ?? 0}</p>
                  </div>
                ))}
              </div>

              {/* Charts */}
              {chartData && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <MiniBarChart data={chartData.users_over_time} color="emerald" label="New users (30d)" />
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <MiniBarChart data={chartData.assessments_over_time} color="blue" label="Assessments (30d)" />
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <RiskDistribution data={chartData.risk_distribution} />
                  </div>
                </div>
              )}

              {/* System Health */}
              {systemHealth && (
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center gap-2 mb-3">
                    <Server className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-white">System Health</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { l: 'API', ok: systemHealth.api },
                      { l: 'Database', ok: systemHealth.database },
                      { l: 'LLM', ok: systemHealth.llm },
                      { l: 'Email', ok: systemHealth.email },
                    ].map(s => (
                      <div key={s.l} className="flex items-center gap-2">
                        {s.ok ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                        <span className={`text-sm ${s.ok ? 'text-emerald-400' : 'text-red-400'}`}>{s.l}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ==================== USERS ==================== */}
      {activeTab === 'users' && (
        <section className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50" />
            </div>
            <Dropdown value={roleFilter} onChange={setRoleFilter} options={[
              { value: 'all', label: 'All roles' }, { value: 'user', label: 'User' }, { value: 'admin', label: 'Admin' },
            ]} />
            <Dropdown value={statusFilter} onChange={setStatusFilter} options={[
              { value: 'all', label: 'All status' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' },
            ]} />
            <button onClick={exportCSV} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/[0.05] border border-white/[0.08]"><Download className="w-4 h-4" /> CSV</button>
            <button onClick={() => setBulkEmailModal(true)} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/[0.05] border border-white/[0.08]">
              <Mail className="w-4 h-4" /> Bulk Email
            </button>
            <button onClick={() => setCreateUserOpen(true)} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30">
              <Plus className="w-4 h-4" /> Create User
            </button>
          </div>

          {/* Bulk actions bar */}
          {selectedUserIds.length > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <span className="text-sm text-amber-400 font-medium">{selectedUserIds.length} selected</span>
              <button onClick={() => handleBulkAction('activate')} disabled={actionLoading} className="px-3 py-1 rounded-lg text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">Activate</button>
              <button onClick={() => handleBulkAction('deactivate')} disabled={actionLoading} className="px-3 py-1 rounded-lg text-xs bg-amber-500/20 text-amber-400 hover:bg-amber-500/30">Deactivate</button>
              <button onClick={() => handleBulkAction('delete')} disabled={actionLoading} className="px-3 py-1 rounded-lg text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30">Delete</button>
              <button onClick={() => setSelectedUserIds([])} className="ml-auto text-xs text-gray-400 hover:text-white">Clear</button>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <Users className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500">{searchTerm || roleFilter !== 'all' || statusFilter !== 'all' ? 'No users match filters' : 'No users yet'}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.06] overflow-visible">
              <table className="w-full text-left">
                <thead className="bg-white/[0.04] border-b border-white/[0.06]">
                  <tr>
                    <th className="px-3 py-3 w-8">
                      <input type="checkbox" checked={selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0} onChange={toggleSelectAll}
                        className="rounded border-gray-600 bg-transparent text-amber-500 focus:ring-amber-500" />
                    </th>
                    <th className="px-3 py-3 text-xs font-medium text-gray-400 uppercase cursor-pointer" onClick={() => toggleSort('email')}>
                      <span className="flex items-center gap-1">User <SortIcon field="email" /></span>
                    </th>
                    <th className="px-3 py-3 text-xs font-medium text-gray-400 uppercase cursor-pointer" onClick={() => toggleSort('role')}>
                      <span className="flex items-center gap-1">Role <SortIcon field="role" /></span>
                    </th>
                    <th className="px-3 py-3 text-xs font-medium text-gray-400 uppercase">Status</th>
                    <th className="px-3 py-3 text-xs font-medium text-gray-400 uppercase cursor-pointer" onClick={() => toggleSort('created_at')}>
                      <span className="flex items-center gap-1">Created <SortIcon field="created_at" /></span>
                    </th>
                    <th className="px-3 py-3 text-xs font-medium text-gray-400 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-white/[0.02]">
                      <td className="px-3 py-3">
                        <input type="checkbox" checked={selectedUserIds.includes(u.id)} onChange={() => toggleSelectUser(u.id)}
                          className="rounded border-gray-600 bg-transparent text-amber-500 focus:ring-amber-500" />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar user={u} />
                          <div>
                            <p className="text-white text-sm font-medium">{u.email}</p>
                            <p className="text-gray-500 text-xs">{u.full_name || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${u.role === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-gray-400'}`}>{u.role}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${u.is_active ? 'text-emerald-400' : 'text-red-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-500 text-sm">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setNotesModal({ open: true, user: u }); setNotesText(u.admin_notes || ''); }} title="Notes"
                            className={`p-1.5 rounded-lg transition ${u.admin_notes ? 'text-amber-400 hover:bg-amber-500/10' : 'text-gray-500 hover:bg-white/[0.05] hover:text-white'}`}>
                            <StickyNote className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEmailModal({ open: true, user: u })} title="Send email"
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-500/10 hover:text-blue-400 transition">
                            <Mail className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleToggleRole(u.id, u.role)} title={u.role === 'admin' ? 'Remove admin' : 'Make admin'}
                            className={`p-1.5 rounded-lg transition ${u.role === 'admin' ? 'text-amber-400 hover:bg-amber-500/10' : 'text-gray-500 hover:bg-white/[0.05] hover:text-white'}`}>
                            {u.role === 'admin' ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                          </button>
                          <button onClick={() => handleToggleActive(u.id, u.is_active)} title={u.is_active ? 'Deactivate' : 'Activate'}
                            className={`p-1.5 rounded-lg transition ${u.is_active ? 'text-gray-500 hover:bg-white/[0.05] hover:text-white' : 'text-emerald-400 hover:bg-emerald-500/10'}`}>
                            {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                          <button onClick={() => setConfirmModal({ open: true, type: 'delete', data: u })} title="Delete user"
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-gray-600">{filteredUsers.length} users</p>
        </section>
      )}

      {/* ==================== ASSESSMENTS ==================== */}
      {activeTab === 'assessments' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="text" placeholder="Search by email..." value={assessSearchTerm} onChange={e => setAssessSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50" />
            </div>
            <Dropdown value={assessRiskFilter} onChange={setAssessRiskFilter} options={[
              { value: 'all', label: 'All risk' }, { value: 'High', label: 'High' }, { value: 'Medium', label: 'Medium' }, { value: 'Low', label: 'Low' },
            ]} />
          </div>
          {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
          : filteredAssessments.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <FileText className="w-10 h-10 text-gray-600 mx-auto mb-2" /><p className="text-gray-500">No assessments match</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {filteredAssessments.map(a => (
                <li key={a.id} onClick={() => setSelectedAssessment(a)} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] cursor-pointer transition group flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium
                      ${a.risk_level === 'High' ? 'bg-red-500/20 text-red-400' : a.risk_level === 'Medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      {a.risk_level}
                    </span>
                    <div>
                      <p className="text-white text-sm font-medium">{a.probability != null ? `${(a.probability * 100).toFixed(0)}% risk` : '—'}</p>
                      <p className="text-gray-500 text-xs">{a.user_email} · {a.created_at ? new Date(a.created_at).toLocaleDateString() : ''}</p>
                    </div>
                  </div>
                  <Eye className="w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100 transition" />
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-gray-600">{filteredAssessments.length} assessments</p>
        </section>
      )}

      {/* ==================== AUDIT LOG ==================== */}
      {activeTab === 'audit' && (
        <section className="space-y-4">
          {/* Header bar */}
          {auditLogs.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-gray-500 text-xs">{auditLogs.length} entries</p>
              <button
                onClick={() => setConfirmModal({ open: true, type: 'clearAudit', data: null })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 border border-red-500/20 transition">
                <Trash2 className="w-3.5 h-3.5" /> Clear All
              </button>
            </div>
          )}

          {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
          : auditLogs.length === 0 ? (
            <div className="text-center py-16 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <Clock className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No actions recorded yet</p>
              <p className="text-gray-600 text-xs mt-1">Admin actions like user changes, settings updates, etc. will appear here</p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.06] overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-white/[0.04] border-b border-white/[0.06]">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Admin</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Action</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Target</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase hidden sm:table-cell">Details</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {auditLogs.map(log => {
                    const actionColors = {
                      delete_user: 'text-red-400 bg-red-500/10',
                      bulk_delete: 'text-red-400 bg-red-500/10',
                      create_user: 'text-emerald-400 bg-emerald-500/10',
                      update_user: 'text-blue-400 bg-blue-500/10',
                      update_setting: 'text-amber-400 bg-amber-500/10',
                      create_announcement: 'text-purple-400 bg-purple-500/10',
                      delete_announcement: 'text-red-400 bg-red-500/10',
                      update_announcement: 'text-blue-400 bg-blue-500/10',
                      bulk_activate: 'text-emerald-400 bg-emerald-500/10',
                      bulk_deactivate: 'text-amber-400 bg-amber-500/10',
                    };
                    const actionLabels = {
                      delete_user: 'Deleted user', bulk_delete: 'Bulk deleted', create_user: 'Created user',
                      update_user: 'Updated user', update_setting: 'Changed setting',
                      create_announcement: 'New announcement', delete_announcement: 'Deleted announcement',
                      update_announcement: 'Updated announcement', bulk_activate: 'Bulk activated', bulk_deactivate: 'Bulk deactivated',
                    };
                    const settingLabels = { maintenance_mode: 'Maintenance Mode', allow_signups: 'Allow Signups', announcement_banner: 'Announcement Banner' };
                    const colorClass = actionColors[log.action] || 'text-gray-400 bg-white/[0.06]';
                    const actionLabel = actionLabels[log.action] || log.action.replace(/_/g, ' ');

                    // Format target label nicely
                    let targetDisplay = log.target_label || '—';
                    if (log.action === 'update_setting') targetDisplay = settingLabels[log.target_label] || log.target_label;

                    // Format details nicely
                    let detailDisplay = log.details || '—';
                    if (log.details) {
                      detailDisplay = log.details
                        .replace(/value=true/g, 'Enabled')
                        .replace(/value=false/g, 'Disabled')
                        .replace(/role: /g, 'Role: ')
                        .replace(/active: /g, 'Active: ')
                        .replace(/True/g, 'Yes').replace(/False/g, 'No');
                    }

                    return (
                      <tr key={log.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <p className="text-white text-sm font-medium truncate max-w-[160px]">{log.admin_email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
                            {actionLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-gray-300 text-sm truncate max-w-[180px]">{targetDisplay}</p>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <p className="text-gray-500 text-xs truncate max-w-[200px]">{detailDisplay}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="text-gray-500 text-xs whitespace-nowrap">{log.created_at ? new Date(log.created_at).toLocaleDateString() : ''}</p>
                          <p className="text-gray-600 text-[10px]">{log.created_at ? new Date(log.created_at).toLocaleTimeString() : ''}</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ==================== ANNOUNCEMENTS ==================== */}
      {activeTab === 'announcements' && (
        <section className="space-y-4">
          {/* Create */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-3">
            <h3 className="text-white text-sm font-medium">New Announcement</h3>
            <input type="text" placeholder="Title" value={newAnnTitle} onChange={e => setNewAnnTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50" />
            <textarea placeholder="Message..." value={newAnnMsg} onChange={e => setNewAnnMsg(e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50 resize-none" />
            <button onClick={handleCreateAnnouncement} disabled={!newAnnTitle.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 disabled:opacity-40">
              <Plus className="w-4 h-4 inline mr-1" /> Create
            </button>
          </div>

          {/* List */}
          {loading ? <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
          : announcements.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <Megaphone className="w-10 h-10 text-gray-600 mx-auto mb-2" /><p className="text-gray-500">No announcements</p>
            </div>
          ) : (
            <div className="space-y-2">
              {announcements.map(a => (
                <div key={a.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-medium text-sm">{a.title}</h4>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${a.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {a.is_active ? 'Active' : 'Hidden'}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs mt-1">{a.message}</p>
                    <p className="text-gray-600 text-xs mt-1">{a.created_at ? new Date(a.created_at).toLocaleDateString() : ''}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => handleToggleAnnouncement(a)} className="p-1.5 rounded-lg text-gray-500 hover:bg-white/[0.05] hover:text-white transition" title={a.is_active ? 'Hide' : 'Show'}>
                      {a.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleDeleteAnnouncement(a.id)} className="p-1.5 rounded-lg text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ==================== SETTINGS ==================== */}
      {activeTab === 'settings' && (
        <section className="space-y-4">
          {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div> : (
            <div className="space-y-6">
              {/* Feature Flags */}
              <div>
                <h3 className="text-white text-sm font-semibold mb-3 flex items-center gap-2"><Settings className="w-4 h-4 text-amber-400" /> Feature Flags</h3>
                <div className="space-y-2">
                  {[
                    { key: 'maintenance_mode', label: 'Maintenance Mode', desc: 'Block all non-admin users and show a maintenance page', icon: AlertTriangle, danger: true },
                    { key: 'allow_signups', label: 'Allow Signups', desc: 'Allow new user registrations', icon: UserCheck },
                  ].map(s => {
                    const isOn = siteSettings[s.key] === 'true';
                    return (
                      <div key={s.key} className={`p-4 rounded-xl border flex items-center justify-between
                        ${s.danger && isOn ? 'bg-red-500/[0.05] border-red-500/20' : 'bg-white/[0.03] border-white/[0.06]'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center
                            ${s.danger ? (isOn ? 'bg-red-500/20' : 'bg-white/[0.06]') : (isOn ? 'bg-emerald-500/20' : 'bg-white/[0.06]')}`}>
                            <s.icon className={`w-4 h-4 ${s.danger ? (isOn ? 'text-red-400' : 'text-gray-500') : (isOn ? 'text-emerald-400' : 'text-gray-500')}`} />
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{s.label}</p>
                            <p className="text-gray-500 text-xs">{s.desc}</p>
                          </div>
                        </div>
                        <button onClick={() => handleToggleSetting(s.key, siteSettings[s.key] || 'false')}
                          className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0
                            ${isOn ? (s.danger ? 'bg-red-500' : 'bg-emerald-500') : 'bg-gray-600'}`}>
                          <span className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-md transition-transform duration-200
                            ${isOn ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* System Info */}
              {systemHealth && (
                <div>
                  <h3 className="text-white text-sm font-semibold mb-3 flex items-center gap-2"><Server className="w-4 h-4 text-amber-400" /> System Status</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { l: 'API Server', ok: systemHealth.api },
                      { l: 'Database', ok: systemHealth.database },
                      { l: 'LLM Service', ok: systemHealth.llm },
                      { l: 'Email Service', ok: systemHealth.email },
                    ].map(s => (
                      <div key={s.l} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-2.5">
                        {s.ok ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                        <div>
                          <p className={`text-sm font-medium ${s.ok ? 'text-emerald-400' : 'text-red-400'}`}>{s.ok ? 'Online' : 'Offline'}</p>
                          <p className="text-gray-500 text-[10px]">{s.l}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ==================== MODALS ==================== */}

      {/* Delete confirm */}
      <Modal isOpen={confirmModal.open && confirmModal.type === 'delete'} onClose={() => setConfirmModal({ open: false, type: '', data: null })} title="Delete User">
        <p className="text-gray-400 text-sm mb-6">Are you sure you want to delete <strong className="text-white">{confirmModal.data?.email}</strong>? This cannot be undone.</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setConfirmModal({ open: false, type: '', data: null })} className="px-4 py-2 rounded-lg text-sm text-gray-400 border border-white/[0.08]">Cancel</button>
          <button onClick={handleDeleteUser} disabled={actionLoading} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white flex items-center gap-2">
            {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />} Delete
          </button>
        </div>
      </Modal>

      {/* Clear audit log confirm */}
      <Modal isOpen={confirmModal.open && confirmModal.type === 'clearAudit'} onClose={() => setConfirmModal({ open: false, type: '', data: null })} title="Clear Audit Log">
        <p className="text-gray-400 text-sm mb-6">Are you sure you want to clear <strong className="text-white">all {auditLogs.length} log entries</strong>? This cannot be undone.</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setConfirmModal({ open: false, type: '', data: null })} className="px-4 py-2 rounded-lg text-sm text-gray-400 border border-white/[0.08]">Cancel</button>
          <button onClick={async () => { setActionLoading(true); try { await adminClearAuditLog(); setAuditLogs([]); showToast('Audit log cleared'); } catch(err) { showToast(err.message || 'Failed', 'error'); } finally { setActionLoading(false); setConfirmModal({ open: false, type: '', data: null }); } }}
            disabled={actionLoading} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white flex items-center gap-2">
            {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />} Clear All
          </button>
        </div>
      </Modal>

      {/* Create user */}
      <Modal isOpen={createUserOpen} onClose={() => setCreateUserOpen(false)} title="Create User">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input name="email" type="email" required className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input name="password" type="text" required minLength={6} className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Full Name</label>
            <input name="full_name" type="text" className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Role</label>
            <select name="role" defaultValue="user" className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm">
              <option value="user">User</option><option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setCreateUserOpen(false)} className="px-4 py-2 rounded-lg text-sm text-gray-400 border border-white/[0.08]">Cancel</button>
            <button type="submit" disabled={actionLoading} className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500 text-white flex items-center gap-2">
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
                  ${selectedAssessment.risk_level === 'High' ? 'bg-red-500/20 text-red-400' : selectedAssessment.risk_level === 'Medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {selectedAssessment.risk_level}
                </span>
              </div>
              <div><p className="text-xs text-gray-500">Probability</p><p className="text-white font-medium mt-1">{selectedAssessment.probability != null ? `${(selectedAssessment.probability * 100).toFixed(1)}%` : '—'}</p></div>
            </div>
            <div><p className="text-xs text-gray-500">User</p><p className="text-white mt-1">{selectedAssessment.user_email || '—'}</p></div>
            <div><p className="text-xs text-gray-500">Date</p><p className="text-gray-400 text-sm mt-1">{selectedAssessment.created_at ? new Date(selectedAssessment.created_at).toLocaleString() : '—'}</p></div>
            <div><p className="text-xs text-gray-500">ID</p><p className="text-gray-400 text-sm font-mono mt-1">{selectedAssessment.assessment_id || '—'}</p></div>
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
            className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50 resize-none"
          />
          <div className="flex gap-3 justify-end">
            <button onClick={() => setNotesModal({ open: false, user: null })} className="px-4 py-2 rounded-lg text-sm text-gray-400 border border-white/[0.08]">Cancel</button>
            <button onClick={handleSaveNotes} disabled={actionLoading} className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500 text-white flex items-center gap-2">
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />} Save Notes
            </button>
          </div>
        </div>
      </Modal>

      {/* Feature f13: Send Email Modal */}
      <Modal isOpen={emailModal.open} onClose={() => { setEmailModal({ open: false, user: null }); setEmailSubject(''); setEmailBody(''); }} title={`Email — ${emailModal.user?.email || ''}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Subject</label>
            <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Email subject..."
              className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Body</label>
            <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={5} placeholder="Email body..."
              className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50 resize-none" />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => { setEmailModal({ open: false, user: null }); setEmailSubject(''); setEmailBody(''); }} className="px-4 py-2 rounded-lg text-sm text-gray-400 border border-white/[0.08]">Cancel</button>
            <button onClick={handleSendEmail} disabled={actionLoading || !emailSubject.trim()} className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white flex items-center gap-2 disabled:opacity-50">
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
            <label className="block text-sm text-gray-400 mb-1">Recipients</label>
            <Dropdown value={bulkEmailRole} onChange={setBulkEmailRole} options={[
              { value: 'all', label: 'All active users' },
              { value: 'user', label: 'Users only' },
              { value: 'admin', label: 'Admins only' },
            ]} className="w-full" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Subject</label>
            <input type="text" value={bulkEmailSubject} onChange={e => setBulkEmailSubject(e.target.value)} placeholder="Email subject..."
              className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Body</label>
            <textarea value={bulkEmailBody} onChange={e => setBulkEmailBody(e.target.value)} rows={6} placeholder="Email body..."
              className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50 resize-none" />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => { setBulkEmailModal(false); setBulkEmailSubject(''); setBulkEmailBody(''); }} className="px-4 py-2 rounded-lg text-sm text-gray-400 border border-white/[0.08]">Cancel</button>
            <button onClick={handleBulkEmailSend} disabled={actionLoading || !bulkEmailSubject.trim()} className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white flex items-center gap-2 disabled:opacity-50">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Send to {bulkEmailRole === 'all' ? 'All' : bulkEmailRole === 'user' ? 'Users' : 'Admins'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
