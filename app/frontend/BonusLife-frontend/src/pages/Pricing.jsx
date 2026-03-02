import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Loader2, Sparkles } from 'lucide-react';
import { ROUTES } from '../config/constants';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';

const plans = [
  {
    id: 'free',
    nameEn: 'Free',
    nameTr: 'Ücretsiz',
    priceEn: '$0',
    priceTr: '₺ 0',
    periodEn: 'forever',
    periodTr: 'süresiz',
    descriptionEn: 'Full access to all health tools. No credit card required.',
    descriptionTr: 'Tüm sağlık araçlarına tam erişim. Kredi kartı gerekmez.',
    featuresEn: ['Risk assessment', 'AI Chat', 'Diet plans', 'Voice assistant', 'Meal analyzer', 'Workout videos', 'All current tools'],
    featuresTr: ['Risk değerlendirmesi', 'Yapay zeka sohbet', 'Diyet planları', 'Sesli asistan', 'Öğün analizi', 'Antrenman videoları', 'Tüm mevcut araçlar'],
    ctaEn: 'Get started',
    ctaTr: 'Başlayın',
    highlighted: false,
  },
  {
    id: 'pro',
    nameEn: 'Pro',
    nameTr: 'Pro',
    priceEn: '$9',
    priceTr: '₺ 299',
    periodEn: '/month',
    periodTr: '/ay',
    periodYearEn: '/year (save 20%)',
    periodYearTr: '/yıl (%20 tasarruf)',
    priceYearEn: '$86',
    priceYearTr: '₺ 2.399',
    descriptionEn: 'Early access to new features we release. You\'ll be first to try new tools when we launch them.',
    descriptionTr: 'Yayınladığımız yeni özelliklere erken erişim. Yeni araçları piyasaya sürdüğümüzde ilk siz denersiniz.',
    featuresEn: ['Everything in Free', 'Early access to new features', 'Support our development', 'Cancel anytime'],
    featuresTr: ['Ücretsizdeki her şey', 'Yeni özelliklere erken erişim', 'Geliştirmemize destek', 'İstediğiniz zaman iptal'],
    ctaEn: 'Upgrade to Pro',
    ctaTr: 'Pro\'ya geç',
    highlighted: true,
  },
];

export default function Pricing({ language }) {
  const isTr = language === 'turkish';
  const navigate = useNavigate();
  const { user } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState('monthly'); // 'monthly' | 'yearly'
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState(null);

  const handleCheckout = async (planId) => {
    if (planId === 'free') {
      navigate(user ? ROUTES.DASHBOARD : ROUTES.REGISTER);
      return;
    }
    if (!user) {
      navigate(ROUTES.LOGIN);
      return;
    }
    setError(null);
    const plan = billingPeriod === 'yearly' ? 'pro_yearly' : 'pro_monthly';
    setLoadingPlan(plan);
    try {
      const { url } = await apiService.createCheckout(plan);
      if (url) window.location.href = url;
      else setError(isTr ? 'Ödeme sayfası alınamadı.' : 'Could not get checkout URL.');
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('404') || msg.includes('Not Found')) {
        setError(isTr ? 'Sunucuya ulaşılamadı. Backend çalışıyor mu? (port 8000)' : 'Cannot reach server. Is the backend running? (port 8000)');
      } else if (msg.includes('503')) {
        setError(isTr ? 'Abonelik yapılandırılmamış. Backend .env dosyasına STRIPE_SECRET_KEY ve price ID\'leri ekleyin.' : 'Subscription not configured. Add STRIPE_SECRET_KEY and price IDs to backend .env.');
      } else if (msg.includes('400') || msg.includes('Invalid plan')) {
        setError(isTr ? 'Geçersiz plan. Backend .env\'de STRIPE_PRICE_ID_PRO_MONTHLY ve STRIPE_PRICE_ID_PRO_YEARLY ayarlayın.' : 'Invalid plan. Set STRIPE_PRICE_ID_PRO_MONTHLY and STRIPE_PRICE_ID_PRO_YEARLY in backend .env.');
      } else {
        setError(err.message || (isTr ? 'Bir hata oluştu.' : 'Something went wrong.'));
      }
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      <div className="fixed inset-0 grid-pattern pointer-events-none" />
      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-28 sm:pt-36 pb-16 sm:pb-24">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            {isTr ? 'Fiyatlandırma' : 'Pricing'}
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            {isTr
              ? 'Tüm araçlar herkese açıktır. Pro üyeler yeni özelliklere erken erişir.'
              : 'All tools are available to everyone. Pro members get early access to new features.'}
          </p>
        </div>

        {/* Billing toggle (only matters for Pro) */}
        <div className="flex justify-center gap-2 mb-10">
          <button
            type="button"
            onClick={() => setBillingPeriod('monthly')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${billingPeriod === 'monthly' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/[0.05] text-gray-400 border border-white/[0.08] hover:text-white'}`}
          >
            {isTr ? 'Aylık' : 'Monthly'}
          </button>
          <button
            type="button"
            onClick={() => setBillingPeriod('yearly')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${billingPeriod === 'yearly' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/[0.05] text-gray-400 border border-white/[0.08] hover:text-white'}`}
          >
            {isTr ? 'Yıllık' : 'Yearly'}
          </button>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plans.map((plan) => {
            const isPro = plan.id === 'pro';
            // Currency: always display in Turkish Lira (₺)
            const price = billingPeriod === 'yearly' && plan.priceYearTr ? plan.priceYearTr : plan.priceTr;
            const period = billingPeriod === 'yearly' && plan.periodYearEn ? (isTr ? plan.periodYearTr : plan.periodYearEn) : (isTr ? plan.periodTr : plan.periodEn);
            const loading = loadingPlan && isPro;

            return (
              <div
                key={plan.id}
                className={`rounded-2xl border p-6 sm:p-8 flex flex-col ${
                  plan.highlighted
                    ? 'bg-gradient-to-br from-emerald-500/[0.08] to-cyan-500/[0.06] border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                    : 'bg-white/[0.03] border-white/[0.08]'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {plan.highlighted && <Sparkles className="w-5 h-5 text-emerald-400" />}
                  <h2 className="text-xl font-semibold text-white">{isTr ? plan.nameTr : plan.nameEn}</h2>
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-bold text-white">{price}</span>
                  <span className="text-gray-400 text-sm">{period}</span>
                </div>
                <p className="text-gray-400 text-sm mb-6">{isTr ? plan.descriptionTr : plan.descriptionEn}</p>
                <ul className="space-y-2 mb-8 flex-1">
                  {(isTr ? plan.featuresTr : plan.featuresEn).map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => handleCheckout(plan.id)}
                  disabled={loading}
                  className={`w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-[#060611] ${
                    plan.highlighted
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                      : 'bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/[0.12]'
                  }`}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    isTr ? plan.ctaTr : plan.ctaEn
                  )}
                </button>
                {plan.id === 'free' && (
                  <p className="text-center text-gray-500 text-xs mt-3">
                    {isTr ? 'Tüm özellikler ücretsiz.' : 'All features are free.'}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-gray-500 text-sm mt-10">
          {isTr ? 'İptal istediğiniz zaman aboneliğinizi yönetin. Özellik kilidi yok.' : 'Cancel anytime from your subscription. No feature gating.'}
        </p>
        {user && (
          <div className="text-center mt-4">
            <Link to={ROUTES.DASHBOARD} className="text-emerald-400 hover:text-emerald-300 text-sm">
              {isTr ? 'Panele dön' : 'Back to Dashboard'}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
