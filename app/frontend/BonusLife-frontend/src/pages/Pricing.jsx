import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { ROUTES } from '../config/constants';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';
import { PricingSection } from '../components/ui/PricingSection';

export default function Pricing({ language }) {
  const isTr     = language === 'turkish';
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [loadingPlan,   setLoadingPlan]   = useState(null);
  const [error,         setError]         = useState(null);

  const handleCheckout = async (planId) => {
    if (planId === 'free') {
      navigate(user ? ROUTES.DASHBOARD : ROUTES.REGISTER);
      return;
    }
    if (!user) { navigate(ROUTES.LOGIN); return; }
    setError(null);
    const plan = billingPeriod === 'yearly' ? 'pro_yearly' : 'pro_monthly';
    setLoadingPlan(plan);
    try {
      const { url } = await apiService.createCheckout(plan);
      if (url) window.location.href = url;
      else setError(isTr ? 'Ödeme sayfası alınamadı.' : 'Could not get checkout URL.');
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('404') || msg.includes('Not Found'))
        setError(isTr ? 'Sunucuya ulaşılamadı.' : 'Cannot reach server. Is the backend running?');
      else if (msg.includes('503'))
        setError(isTr ? 'Abonelik yapılandırılmamış.' : 'Subscription not configured. Add STRIPE_SECRET_KEY to backend .env.');
      else if (msg.includes('400') || msg.includes('Invalid plan'))
        setError(isTr ? 'Geçersiz plan.' : 'Invalid plan. Set STRIPE_PRICE_IDs in backend .env.');
      else
        setError(err.message || (isTr ? 'Bir hata oluştu.' : 'Something went wrong.'));
    } finally {
      setLoadingPlan(null);
    }
  };

  const plans = [
    {
      id: 'free',
      name: isTr ? 'Ücretsiz' : 'Free',
      description: isTr
        ? 'Tüm yapay zeka sağlık araçlarına tam erişim — kredi kartı yok, sınır yok.'
        : 'Full access to every AI health tool — no credit card, no limits.',
      price: 0,
      yearlyPrice: 0,
      priceTr: 0,
      priceTrYear: 0,
      period: 'mo',
      yearlyPeriod: 'yr',
      periodTr: 'ay',
      yearlyPeriodTr: 'yıl',
      features: isTr
        ? ['Risk değerlendirmesi (diyabet, kalp, böbrek)', 'Yapay zeka sohbet', 'Yapay zeka diyet planları', 'Sesli sağlık asistanı', 'Öğün fotoğrafı analizi', 'Antrenman videoları', 'Beyin MR analizi', 'Tüm mevcut araçlar']
        : ['Risk assessment (diabetes, heart, kidney)', 'AI Health Chat', 'AI Diet plans', 'Voice health assistant', 'Meal photo analyzer', 'Workout videos', 'Brain MRI analysis', 'All current tools'],
      buttonText: isTr ? 'Ücretsiz Başlayın' : 'Get Started Free',
      isPopular: false,
      onClick: () => handleCheckout('free'),
      loading: false,
    },
    {
      id: 'pro',
      name: 'Pro',
      description: isTr
        ? 'Yeni özelliklere yayınlandığı anda erken erişim. İlk siz kullanın.'
        : 'Early access to new features the moment we release them. Be first.',
      price: 9,
      yearlyPrice: 86,
      priceTr: 299,
      priceTrYear: 2399,
      period: 'mo',
      yearlyPeriod: 'yr',
      periodTr: 'ay',
      yearlyPeriodTr: 'yıl',
      features: isTr
        ? ['Ücretsizdeki her şey', 'Yeni özelliklere erken erişim', 'Öncelikli destek', 'Geliştirmemize destek', 'İstediğiniz zaman iptal']
        : ['Everything in Free', 'Early access to new features', 'Priority support', 'Support our development', 'Cancel anytime'],
      buttonText: isTr ? "Pro'ya Geç" : 'Upgrade to Pro',
      isPopular: true,
      onClick: () => handleCheckout('pro'),
      loading: !!loadingPlan,
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#000000', paddingTop: '5rem' }}>
      {/* Error banner */}
      {error && (
        <div className="max-w-md mx-auto mb-0 pt-4 px-4">
          <div className="flex items-center gap-3 p-4 rounded-xl text-sm text-red-400 text-center"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        </div>
      )}

      <PricingSection
        plans={plans}
        isTr={isTr}
        title={isTr ? 'Şeffaf Fiyatlandırma' : 'Simple, Transparent Pricing'}
        description={isTr
          ? 'Tüm araçlar herkese açıktır. Pro üyeler yeni özelliklere erken erişir.'
          : 'Every tool is free for everyone. Pro members get early access to new features.'}
      />

    </div>
  );
}
