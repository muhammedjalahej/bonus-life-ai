import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Play, Sparkles, RefreshCw } from 'lucide-react';
import { getWorkoutVideos } from '../services/api';

const GOALS = [
  { key: 'beginner', labelEn: 'Beginner', labelTr: 'Başlangıç' },
  { key: 'weight_loss', labelEn: 'Weight Loss', labelTr: 'Kilo Verme' },
  { key: '10_min', labelEn: '10 Min', labelTr: '10 Dakika' },
  { key: 'low_impact', labelEn: 'Low Impact', labelTr: 'Düşük Etki' },
  { key: 'strength', labelEn: 'Strength', labelTr: 'Güç' },
];

const WorkoutVideos = ({ language = 'english' }) => {
  const [goal, setGoal] = useState('beginner');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isTr = language === 'turkish';

  const fetchVideos = useCallback((refresh = null) => {
    setLoading(true);
    setError('');
    getWorkoutVideos(goal, refresh)
      .then((res) => setVideos(Array.isArray(res?.videos) ? res.videos : []))
      .catch((err) => setError(err.message || (isTr ? 'Videolar yüklenemedi.' : 'Failed to load videos.')))
      .finally(() => setLoading(false));
  }, [goal, isTr]);

  useEffect(() => { fetchVideos(); }, [goal]);

  const handleRefresh = () => fetchVideos(Date.now());

  const t = isTr
    ? {
        badge: 'Spor',
        title: 'Antrenman Videoları',
        subtitle: 'Hedefinize uygun YouTube antrenman videoları. Başlangıç, kilo verme, 10 dakika veya düşük etkili seçenekler.',
        chooseGoal: 'Hedef seçin',
        refresh: 'Yeni videolar',
        noVideos: 'Bu hedef için video bulunamadı.',
        by: 'Kanal',
      }
    : {
        badge: 'Sport',
        title: 'Workout Videos',
        subtitle: 'YouTube workout videos for your goal. Beginner, weight loss, 10‑min, or low‑impact options.',
        chooseGoal: 'Choose a goal',
        refresh: 'New videos',
        noVideos: 'No videos found for this goal.',
        by: 'Channel',
      };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-32 pb-16">
      <div className="text-center mb-12 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-5 py-2 mb-5">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-[11px] font-extrabold text-amber-400 uppercase tracking-[0.15em]">{t.badge}</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-3 tracking-tight">{t.title}</h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">{t.subtitle}</p>
      </div>

      <div className="mb-8">
        <p className="text-sm font-semibold text-gray-400 mb-3">{t.chooseGoal}</p>
        <div className="flex flex-wrap items-center gap-2">
          {GOALS.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => setGoal(g.key)}
              className={`px-4 py-2.5 rounded-xl font-medium transition border ${
                goal === g.key
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300'
              }`}
            >
              {isTr ? g.labelTr : g.labelEn}
            </button>
          ))}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30 disabled:opacity-50 transition ml-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {t.refresh}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
        </div>
      ) : videos.length === 0 ? (
        <p className="text-gray-500 text-center py-12">{t.noVideos}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
          {videos.map((video) => (
            <div
              key={video.id}
              className="rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-amber-500/30 transition"
            >
              <div className="aspect-video bg-black/40 relative">
                <iframe
                  src={`https://www.youtube.com/embed/${video.id}`}
                  title={video.title || 'Workout video'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded bg-black/60 text-[10px] text-amber-400">
                  <Play className="w-3 h-3" />
                  YouTube
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-white line-clamp-2 mb-1">{video.title}</h3>
                {video.channel && (
                  <p className="text-xs text-gray-500">
                    {t.by}: {video.channel}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkoutVideos;
