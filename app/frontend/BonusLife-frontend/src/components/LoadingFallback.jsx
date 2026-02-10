import React from 'react';
import { HeartPulse } from 'lucide-react';

const LoadingFallback = ({ language = 'english' }) => {
  const text = language === 'turkish' ? 'Yükleniyor' : 'Loading';
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
        <div className="absolute inset-2 rounded-full border-2 border-cyan-500/20 border-b-cyan-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <HeartPulse className="w-7 h-7 text-emerald-400 animate-pulse" />
        </div>
      </div>
      <p className="text-gray-500 font-medium text-sm tracking-widest uppercase">{text}</p>
    </div>
  );
};

export default LoadingFallback;
