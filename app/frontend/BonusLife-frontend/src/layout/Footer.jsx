import React from 'react';
import { HeartPulse, ArrowRight, Activity, MessageSquare, Mic, Apple, AlertTriangle, MapPin, Shield, Brain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../config/constants';

const Footer = ({ language }) => {
  const navigate = useNavigate();
  const isTr = language === 'turkish';

  const tools = [
    { label: isTr ? 'Risk Değerlendirmesi'  : 'Risk Assessment',   path: ROUTES.TEST,             icon: Activity },
    { label: isTr ? 'Yapay Zeka Sohbet'     : 'AI Chat',           path: ROUTES.CHAT,             icon: MessageSquare },
    { label: isTr ? 'Sesli Asistan'         : 'Voice Assistant',   path: ROUTES.VOICE_CHAT,       icon: Mic },
    { label: isTr ? 'Diyet Planı'           : 'Diet Plan',         path: ROUTES.DIET_PLAN,        icon: Apple },
    { label: isTr ? 'Belirti Kontrolü'      : 'Symptom Checker',   path: ROUTES.SYMPTOM_CHECKER,  icon: AlertTriangle },
    { label: isTr ? 'Hastaneler'            : 'Hospitals',         path: ROUTES.HOSPITALS,        icon: MapPin },
    { label: isTr ? 'Beyin MR'             : 'Brain MRI',         path: ROUTES.BRAIN_MRI,        icon: Brain },
    { label: isTr ? 'Rapor Doğrula'        : 'Verify Report',     path: ROUTES.VERIFY,           icon: Shield, dataTour: 'footer-verify' },
  ];

  const company = [
    { label: isTr ? 'Fiyatlandırma' : 'Pricing',    path: ROUTES.PRICING },
    { label: isTr ? 'Giriş Yap'    : 'Sign In',     path: ROUTES.LOGIN },
    { label: isTr ? 'Kayıt Ol'     : 'Register',    path: ROUTES.REGISTER },
  ];

  return (
    <footer className="relative z-10" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>

      {/* Top section */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">

          {/* Brand + tagline */}
          <div className="md:col-span-4 space-y-6">
            <button onClick={() => navigate(ROUTES.HOME)} className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #06B6D4)', boxShadow: '0 0 20px rgba(124,58,237,0.35)' }}>
                <HeartPulse className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-black tracking-tight gradient-text-violet">Bonus Life</span>
                <span className="text-lg font-black tracking-tight text-white ml-1">AI</span>
              </div>
            </button>

            <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
              {isTr
                ? 'Yapay zeka destekli sağlık platformu. Kronik hastalıkları erken tespit edin ve sağlığınızın kontrolünü ele alın.'
                : 'AI-powered health platform. Detect chronic conditions early and take full control of your wellness journey.'}
            </p>

            <button onClick={() => navigate(ROUTES.REGISTER)}
              className="group inline-flex items-center gap-2 text-sm font-bold text-violet-400 hover:text-violet-300 transition-colors">
              {isTr ? 'Ücretsiz başlayın' : 'Get started free'}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Tools */}
          <div className="md:col-span-4">
            <h4 className="text-[11px] font-extrabold text-gray-500 mb-5 uppercase tracking-[0.2em]">
              {isTr ? 'Araçlar' : 'Tools'}
            </h4>
            <ul className="grid grid-cols-2 gap-2">
              {tools.map(({ label, path, icon: Icon, dataTour }) => (
                <li key={path}>
                  <button onClick={() => navigate(path)} data-tour={dataTour}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-200 transition-colors group">
                    <Icon className="w-3.5 h-3.5 text-gray-600 group-hover:text-violet-400 transition-colors flex-shrink-0" />
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Company + Team */}
          <div className="md:col-span-4 grid grid-cols-2 gap-8">
            <div>
              <h4 className="text-[11px] font-extrabold text-gray-500 mb-5 uppercase tracking-[0.2em]">
                {isTr ? 'Platform' : 'Platform'}
              </h4>
              <ul className="space-y-2.5">
                {company.map(({ label, path }) => (
                  <li key={path}>
                    <button onClick={() => navigate(path)}
                      className="text-sm text-gray-500 hover:text-gray-200 transition-colors">
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-[11px] font-extrabold text-gray-500 mb-5 uppercase tracking-[0.2em]">
                {isTr ? 'Ekip' : 'Team'}
              </h4>
              <div className="space-y-2.5">
                <p className="text-sm text-gray-500">Muhammed Jalahej</p>
                <p className="text-sm text-gray-500">Yazen Emino</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-6 flex flex-col sm:flex-row items-center justify-between gap-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <p className="text-[11px] text-gray-700 tracking-wide">
          &copy; {new Date().getFullYear()} Bonus Life AI. {isTr ? 'Tüm hakları saklıdır.' : 'All rights reserved.'}
        </p>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-violet-500" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
          <span className="text-[11px] text-gray-700">{isTr ? 'Yapay zeka ile çalışıyor' : 'Powered by AI'}</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
