import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, MessageSquare, Mic, Salad, AlertTriangle, User, FileText, UtensilsCrossed, Loader2, ChevronRight,
} from 'lucide-react';
import { ROUTES } from '../config/constants';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';

const cardLinks = [
  { path: ROUTES.TEST, labelEn: 'Assessment', labelTr: 'Değerlendirme', icon: Activity },
  { path: ROUTES.CHAT, labelEn: 'AI Chat', labelTr: 'Yapay Zeka Sohbet', icon: MessageSquare },
  { path: ROUTES.VOICE_CHAT, labelEn: 'Voice Chat', labelTr: 'Sesli Sohbet', icon: Mic },
  { path: ROUTES.DIET_PLAN, labelEn: 'Diet Plan', labelTr: 'Diyet Planı', icon: Salad },
  { path: ROUTES.EMERGENCY, labelEn: 'Emergency', labelTr: 'Acil', icon: AlertTriangle },
];

export default function Dashboard({ language }) {
  const isTr = language === 'turkish';
  const { user, refreshUser } = useAuth();
  const [assessments, setAssessments] = useState([]);
  const [dietPlans, setDietPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [a, d] = await Promise.all([apiService.getMyAssessments(), apiService.getMyDietPlans()]);
        if (!cancelled) {
          setAssessments(Array.isArray(a) ? a : []);
          setDietPlans(Array.isArray(d) ? d : []);
        }
      } catch {
        if (!cancelled) { setAssessments([]); setDietPlans([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-24">
      <h1 className="text-3xl font-bold text-white mb-2">
        {isTr ? 'Kontrol Paneli' : 'Dashboard'}
      </h1>
      <p className="text-gray-500 mb-8">
        {isTr ? 'Araçlara hızlı erişim ve kayıtlarınız' : 'Quick access to tools and your records'}
      </p>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-white/[0.06]">
        {[
          { id: 'overview', labelEn: 'Overview', labelTr: 'Genel Bakış' },
          { id: 'assessments', labelEn: 'My Assessments', labelTr: 'Değerlendirmelerim' },
          { id: 'diet-plans', labelEn: 'My Diet Plans', labelTr: 'Diyet Planlarım' },
          { id: 'profile', labelEn: 'Profile', labelTr: 'Profil' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition ${activeTab === tab.id ? 'bg-white/[0.06] text-emerald-400 border-b-2 border-emerald-500' : 'text-gray-500 hover:text-white'}`}
          >
            {isTr ? tab.labelTr : tab.labelEn}
          </button>
        ))}
      </div>

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
                <p className="text-2xl font-bold text-white">{loading ? '…' : assessments.length}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                  <UtensilsCrossed className="w-4 h-4" /> {isTr ? 'Diyet Planları' : 'Diet plans'}
                </div>
                <p className="text-2xl font-bold text-white">{loading ? '…' : dietPlans.length}</p>
              </div>
            </div>
          </section>
        </>
      )}

      {activeTab === 'assessments' && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">{isTr ? 'Değerlendirmelerim' : 'My Assessments'}</h2>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>
          ) : assessments.length === 0 ? (
            <p className="text-gray-500 py-8">{isTr ? 'Henüz değerlendirme yok. Test sayfasından bir tane oluşturun.' : 'No assessments yet. Create one from the Test page.'}</p>
          ) : (
            <ul className="space-y-3">
              {assessments.map((a) => (
                <li key={a.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-white">{a.risk_level} · {(a.probability * 100).toFixed(0)}%</p>
                      <p className="text-sm text-gray-500 truncate max-w-md">{a.executive_summary}</p>
                      {a.created_at && <p className="text-xs text-gray-600 mt-1">{new Date(a.created_at).toLocaleString()}</p>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {activeTab === 'diet-plans' && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">{isTr ? 'Diyet Planlarım' : 'My Diet Plans'}</h2>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>
          ) : dietPlans.length === 0 ? (
            <p className="text-gray-500 py-8">{isTr ? 'Henüz diyet planı yok.' : 'No diet plans yet.'}</p>
          ) : (
            <ul className="space-y-3">
              {dietPlans.map((d) => (
                <li key={d.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="font-medium text-white">{d.goal || (isTr ? 'Diyet planı' : 'Diet plan')}</p>
                  <p className="text-sm text-gray-500 line-clamp-2">{d.overview}</p>
                  {d.created_at && <p className="text-xs text-gray-600 mt-1">{new Date(d.created_at).toLocaleString()}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {activeTab === 'profile' && (
        <DashboardProfile language={language} user={user} refreshUser={refreshUser} />
      )}
    </div>
  );
}

function DashboardProfile({ language, user, refreshUser }) {
  const isTr = language === 'turkish';
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [preferredLanguage, setPreferredLanguage] = useState(user?.preferred_language || 'english');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setMessage('');
    setSaving(true);
    try {
      await apiService.updateProfile({ full_name: fullName, preferred_language: preferredLanguage });
      await refreshUser();
      setMessage(isTr ? 'Profil güncellendi.' : 'Profile updated.');
    } catch (err) {
      setMessage(err.message || (isTr ? 'Güncelleme başarısız.' : 'Update failed.'));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!currentPassword || !newPassword) {
      setMessage(isTr ? 'Mevcut ve yeni şifre gerekli.' : 'Current and new password required.');
      return;
    }
    setSaving(true);
    try {
      await apiService.changePassword(currentPassword, newPassword);
      setMessage(isTr ? 'Şifre güncellendi.' : 'Password updated.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setMessage(err.message || (isTr ? 'Şifre güncellenemedi.' : 'Password update failed.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
        <h3 className="text-white font-medium">{isTr ? 'Profil bilgileri' : 'Profile info'}</h3>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{isTr ? 'Ad Soyad' : 'Full name'}</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{isTr ? 'Dil' : 'Language'}</label>
          <select
            value={preferredLanguage}
            onChange={(e) => setPreferredLanguage(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white"
          >
            <option value="english">English</option>
            <option value="turkish">Türkçe</option>
          </select>
        </div>
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-emerald-500 text-white font-medium disabled:opacity-50">
          {saving ? (isTr ? 'Kaydediliyor…' : 'Saving…') : (isTr ? 'Kaydet' : 'Save')}
        </button>
      </form>

      <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
        <h3 className="text-white font-medium">{isTr ? 'Şifre değiştir' : 'Change password'}</h3>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{isTr ? 'Mevcut şifre' : 'Current password'}</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{isTr ? 'Yeni şifre' : 'New password'}</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white"
          />
        </div>
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-emerald-500 text-white font-medium disabled:opacity-50">
          {isTr ? 'Şifreyi güncelle' : 'Update password'}
        </button>
      </form>

      {message && <p className="text-sm text-gray-400">{message}</p>}
    </div>
  );
}
