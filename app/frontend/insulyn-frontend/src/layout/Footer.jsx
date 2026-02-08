import React from 'react';
import { HeartPulse, Heart, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../config/constants';

const Footer = ({ language }) => {
  const navigate = useNavigate();

  const t = {
    english: { tagline: 'Empowering Health Through AI', disclaimer: 'Not a substitute for professional medical advice. Always consult healthcare professionals.' },
    turkish: { tagline: 'Yapay Zeka ile Sağlığınızı Güçlendiriyoruz', disclaimer: 'Bu uygulama profesyonel tıbbi tavsiye yerine geçmez. Sağlık durumunuz için mutlaka bir sağlık uzmanına danışın.' },
  }[language] || { tagline: 'Empowering Health Through AI', disclaimer: 'Not a substitute for professional medical advice. Always consult healthcare professionals.' };

  const navLinks = [
    { label: language === 'turkish' ? 'Değerlendirme' : 'Assessment', path: ROUTES.TEST },
    { label: language === 'turkish' ? 'Yapay Zeka Sohbet' : 'AI Chat', path: ROUTES.CHAT },
    { label: language === 'turkish' ? 'Sesli Sohbet' : 'Voice Chat', path: ROUTES.VOICE_CHAT },
    { label: language === 'turkish' ? 'Diyet Planı' : 'Diet Plan', path: ROUTES.DIET_PLAN },
    { label: language === 'turkish' ? 'Acil' : 'Emergency', path: ROUTES.EMERGENCY },
  ];

  return (
    <footer className="relative z-10 border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-14">
          {/* Brand */}
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                <HeartPulse className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-extrabold gradient-text">More Life</span>
                <span className="text-lg font-extrabold text-white ml-1">AI</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">{t.tagline}</p>
            <p className="flex items-center gap-1.5 text-xs text-gray-600">
              {language === 'turkish' ? 'Daha iyi sağlık için' : 'Made with'} <Heart className="w-3 h-3 text-red-500 fill-red-500" /> {language === 'turkish' ? 'ile yapıldı' : 'for better health'}
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-[11px] font-extrabold text-gray-400 mb-5 uppercase tracking-[0.2em]">{language === 'turkish' ? 'Platform' : 'Platform'}</h4>
            <ul className="space-y-3">
              {navLinks.map((link) => (
                <li key={link.path}>
                  <button onClick={() => navigate(link.path)}
                    className="text-sm text-gray-500 hover:text-emerald-400 transition-colors flex items-center gap-2 group">
                    <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Authors */}
          <div>
            <h4 className="text-[11px] font-extrabold text-gray-400 mb-5 uppercase tracking-[0.2em]">{language === 'turkish' ? 'Ekip' : 'Team'}</h4>
            <div className="space-y-3">
              <p className="text-sm text-gray-400">Muhammed Jalahej</p>
              <p className="text-sm text-gray-400">Yazen Emino</p>
            </div>
            <div className="mt-8">
              <p className="text-xs text-gray-600 leading-relaxed">{t.disclaimer}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/[0.04] mt-14 pt-6">
          <p className="text-[11px] text-gray-600 text-center tracking-wide">
            &copy; {new Date().getFullYear()} More Life AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
