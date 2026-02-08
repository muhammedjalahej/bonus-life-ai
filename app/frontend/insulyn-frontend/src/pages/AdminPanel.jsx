import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, FileText, UtensilsCrossed, BarChart3, Loader2, ChevronRight, Shield,
} from 'lucide-react';
import { ROUTES } from '../config/constants';
import apiService from '../services/api';

export default function AdminPanel({ language }) {
  const isTr = language === 'turkish';
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        if (activeTab === 'stats') {
          const data = await apiService.adminGetStats();
          if (!cancelled) setStats(data);
        } else if (activeTab === 'users') {
          const data = await apiService.adminGetUsers(0, 100);
          if (!cancelled) setUsers(Array.isArray(data) ? data : []);
        } else if (activeTab === 'assessments') {
          const data = await apiService.adminGetAssessments(0, 100);
          if (!cancelled) setAssessments(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || (isTr ? 'Yükleme hatası' : 'Load failed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab, isTr]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-24">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <Shield className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">
            {isTr ? 'Yönetici Paneli' : 'Admin Panel'}
          </h1>
          <p className="text-gray-500 text-sm">
            {isTr ? 'Kullanıcılar ve platform istatistikleri' : 'Users and platform statistics'}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-8 border-b border-white/[0.06]">
        {[
          { id: 'stats', labelEn: 'Stats', labelTr: 'İstatistikler', icon: BarChart3 },
          { id: 'users', labelEn: 'Users', labelTr: 'Kullanıcılar', icon: Users },
          { id: 'assessments', labelEn: 'Assessments', labelTr: 'Değerlendirmeler', icon: FileText },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition ${activeTab === tab.id ? 'bg-white/[0.06] text-amber-400 border-b-2 border-amber-500' : 'text-gray-500 hover:text-white'}`}
          >
            <tab.icon className="w-4 h-4" />
            {isTr ? tab.labelTr : tab.labelEn}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {activeTab === 'stats' && (
        <section>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
          ) : stats ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                  <Users className="w-5 h-5" /> {isTr ? 'Toplam kullanıcı' : 'Total users'}
                </div>
                <p className="text-3xl font-bold text-white">{stats.total_users ?? 0}</p>
              </div>
              <div className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                  <FileText className="w-5 h-5" /> {isTr ? 'Değerlendirme' : 'Assessments'}
                </div>
                <p className="text-3xl font-bold text-white">{stats.total_assessments ?? 0}</p>
              </div>
              <div className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                  <UtensilsCrossed className="w-5 h-5" /> {isTr ? 'Diyet planı' : 'Diet plans'}
                </div>
                <p className="text-3xl font-bold text-white">{stats.total_diet_plans ?? 0}</p>
              </div>
            </div>
          ) : null}
        </section>
      )}

      {activeTab === 'users' && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">{isTr ? 'Kullanıcı listesi' : 'User list'}</h2>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
          ) : users.length === 0 ? (
            <p className="text-gray-500 py-8">{isTr ? 'Henüz kullanıcı yok.' : 'No users yet.'}</p>
          ) : (
            <div className="rounded-xl border border-white/[0.06] overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-white/[0.04] border-b border-white/[0.06]">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">{isTr ? 'E-posta' : 'Email'}</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">{isTr ? 'Ad' : 'Name'}</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Role</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">{isTr ? 'Aktif' : 'Active'}</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">{isTr ? 'Tarih' : 'Created'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-white font-medium">{u.email}</td>
                      <td className="px-4 py-3 text-gray-400">{u.full_name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${u.role === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-gray-400'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{u.is_active ? (isTr ? 'Evet' : 'Yes') : (isTr ? 'Hayır' : 'No')}</td>
                      <td className="px-4 py-3 text-gray-500 text-sm">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === 'assessments' && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">{isTr ? 'Tüm değerlendirmeler' : 'All assessments'}</h2>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
          ) : assessments.length === 0 ? (
            <p className="text-gray-500 py-8">{isTr ? 'Henüz değerlendirme yok.' : 'No assessments yet.'}</p>
          ) : (
            <ul className="space-y-3">
              {assessments.map((a) => (
                <li key={a.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] flex justify-between items-center">
                  <div>
                    <p className="font-medium text-white">{a.risk_level} · {a.probability != null ? `${(a.probability * 100).toFixed(0)}%` : '—'}</p>
                    <p className="text-sm text-gray-500">{a.user_email} · {a.created_at ? new Date(a.created_at).toLocaleString() : ''}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <p className="mt-8 text-sm text-gray-500">
        <Link to={ROUTES.DASHBOARD} className="text-emerald-400 hover:underline">
          {isTr ? '← Panele dön' : '← Back to Dashboard'}
        </Link>
      </p>
    </div>
  );
}
