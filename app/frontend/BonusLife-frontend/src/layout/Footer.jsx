import React from 'react';
import { HeartPulse, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../config/constants';

const Footer = ({ language }) => {
  const navigate = useNavigate();

  const navLinks = [
    { label: language === 'turkish' ? 'Değerlendirme' : 'Assessment', path: ROUTES.TEST },
    { label: language === 'turkish' ? 'Yapay Zeka Sohbet' : 'AI Chat', path: ROUTES.CHAT },
    { label: language === 'turkish' ? 'Sesli Sohbet' : 'Voice Chat', path: ROUTES.VOICE_CHAT },
    { label: language === 'turkish' ? 'Diyet Planı' : 'Diet Plan', path: ROUTES.DIET_PLAN },
    { label: language === 'turkish' ? 'Antrenman Videoları' : 'Workout Videos', path: ROUTES.SPORT },
    { label: language === 'turkish' ? 'Acil' : 'Emergency', path: ROUTES.EMERGENCY },
    { label: language === 'turkish' ? 'Rapor Doğrula' : 'Verify Report', path: ROUTES.VERIFY, dataTour: 'footer-verify' },
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
                <span className="text-lg font-extrabold gradient-text">Bonus Life</span>
                <span className="text-lg font-extrabold text-white ml-1">AI</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-[11px] font-extrabold text-gray-400 mb-5 uppercase tracking-[0.2em]">{language === 'turkish' ? 'Platform' : 'Platform'}</h4>
            <ul className="space-y-3">
              {navLinks.map((link) => (
                <li key={link.path}>
                  <button onClick={() => navigate(link.path)}
                    data-tour={link.dataTour}
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
          </div>
        </div>

        <div className="border-t border-white/[0.04] mt-14 pt-6">
          <p className="text-[11px] text-gray-600 text-center tracking-wide">
            &copy; {new Date().getFullYear()} Bonus Life AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
