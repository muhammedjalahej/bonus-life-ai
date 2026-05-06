/**
 * Nearest hospitals in Turkey (OpenStreetMap). List + map.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation, Phone, ExternalLink, Loader2, ArrowLeft } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ROUTES } from '../config/constants';
import { VOICE_FIND_NEAREST_HOSPITAL } from '../components/VoiceAgent';
import { LiquidMetalButton } from '../components/ui/LiquidMetalButton';
import { useAuth } from '../context/AuthContext';

const TURKEY_CENTER = { lat: 39.0, lon: 32.8 };

export default function FindHospitals({ language }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isTr = language === 'turkish';
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [userLocation, setUserLocation] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [mapError, setMapError] = useState('');

  const fetchHospitals = async (lat, lon) => {
    setLoading(true);
    setError('');
    const radiusM = 15000;
    const query = `[out:json][timeout:25];(node[amenity=hospital](around:${radiusM},${lat},${lon});way[amenity=hospital](around:${radiusM},${lat},${lon}););out center 25;`;
    const mirrors = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
    ];
    let data = null;
    for (const mirror of mirrors) {
      try {
        const res = await fetch(mirror, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(20000),
        });
        if (!res.ok) continue;
        data = await res.json();
        break;
      } catch { continue; }
    }
    if (!data) {
      setError(isTr ? 'Harita verisi alınamadı. Lütfen tekrar deneyin.' : 'Could not load hospital data. Please try again.');
      setHospitals([]);
      setLoading(false);
      return;
    }
    const haversine = (lat1, lon1, lat2, lon2) => {
      const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };
    const seen = new Set();
    const results = (data.elements || []).map(el => {
      const elLat = el.lat ?? el.center?.lat;
      const elLon = el.lon ?? el.center?.lon;
      if (!elLat || !elLon) return null;
      const tags = el.tags || {};
      const name = tags.name || tags['name:en'] || 'Hospital';
      const key = `${elLat},${elLon},${name}`;
      if (seen.has(key)) return null;
      seen.add(key);
      return { name, lat: elLat, lon: elLon, phone: tags.phone || tags['contact:phone'] || null, distance_km: Math.round(haversine(lat, lon, elLat, elLon) * 100) / 100 };
    }).filter(Boolean).sort((a, b) => a.distance_km - b.distance_km).slice(0, 25);
    setHospitals(results);
    setLoading(false);
  };

  const useMyLocation = () => {
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError(isTr ? 'Tarayıcı konum desteklemiyor.' : 'Browser does not support location.');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setUserLocation({ lat, lon });
        fetchHospitals(lat, lon);
      },
      () => {
        setLocationError(isTr ? 'Konum izni reddedildi veya alınamadı.' : 'Location denied or unavailable.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  const useMyLocationRef = useRef(useMyLocation);
  useMyLocationRef.current = useMyLocation;
  useEffect(() => {
    const handler = () => useMyLocationRef.current?.();
    window.addEventListener(VOICE_FIND_NEAREST_HOSPITAL, handler);
    return () => window.removeEventListener(VOICE_FIND_NEAREST_HOSPITAL, handler);
  }, []);

  useEffect(() => {
    if (!mapRef.current || !L || !L.map) return;
    if (mapInstanceRef.current) return;
    setMapError('');
    try {
      const center = userLocation || TURKEY_CENTER;
      const map = L.map(mapRef.current).setView([center.lat, center.lon], 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);
      mapInstanceRef.current = map;
      return () => {
        try { map.remove(); } catch (_) {}
        mapInstanceRef.current = null;
        markersRef.current = [];
      };
    } catch (e) {
      setMapError(e?.message || (isTr ? 'Harita yüklenemedi.' : 'Map could not load.'));
      mapInstanceRef.current = null;
    }
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !L) return;
    try {
      markersRef.current.forEach((m) => { try { m.remove(); } catch (_) {} });
      markersRef.current = [];
      const center = userLocation || TURKEY_CENTER;
      map.setView([center.lat, center.lon], userLocation ? 12 : 6);
      if (userLocation) {
        const userIcon = L.divIcon({ className: 'user-marker', html: '<div style="width:16px;height:16px;border-radius:50%;background:#7C3AED;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>' });
        const m = L.marker([userLocation.lat, userLocation.lon], { icon: userIcon }).addTo(map);
        markersRef.current.push(m);
      }
      hospitals.forEach((h) => {
        const icon = L.divIcon({
          className: 'hospital-marker',
          html: '<div style="width:14px;height:14px;border-radius:2px;background:#ef4444;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>',
        });
        const marker = L.marker([h.lat, h.lon], { icon }).addTo(map);
        marker.bindTooltip(h.name, { permanent: false, direction: 'top' });
        markersRef.current.push(marker);
      });
    } catch (_) {}
  }, [userLocation, hospitals]);

  const openInMaps = (lat, lon, name) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-32 pb-16">
        {/* Back to Dashboard — only for logged-in users */}
        {user && (
          <button onClick={() => navigate(ROUTES.DASHBOARD)}
            className="flex items-center gap-2 mb-6 text-sm text-white/70 hover:text-white transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Dashboard
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-8 animate-fade-in-up">
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            {isTr ? 'Yakındaki Hastaneler' : 'Nearest Hospitals'}
          </h1>
        </div>

        {/* Location CTA */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-4">
          <LiquidMetalButton onClick={useMyLocation} disabled={loading} width={200}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> {isTr ? 'Yükleniyor...' : 'Loading...'}</> : <><Navigation className="w-4 h-4" /> {isTr ? 'Konumumu Kullan' : 'Use my location'}</>}
          </LiquidMetalButton>
          {locationError && <p className="text-sm text-amber-400">{locationError}</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        {/* Map + List — smaller heights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] h-[280px] min-h-[240px] relative">
            <div ref={mapRef} className="w-full h-full" />
            {mapError && (
              <div className="absolute inset-0 flex items-center justify-center p-4 text-center bg-[#060611]/90">
                <p className="text-sm text-amber-400">{mapError}</p>
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden flex flex-col h-[280px] min-h-[240px]">
            <div className="px-3 py-2 border-b border-white/10 bg-white/[0.02]">
              <h2 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                {isTr ? 'Hastane listesi' : 'Hospital list'}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {!userLocation && !loading && (
                <div className="flex items-center justify-center min-h-[120px] px-3">
                  <p className="text-gray-500 text-sm text-center">
                    {isTr ? '"Konumumu Kullan"a tıklayın.' : 'Click "Use my location".'}
                  </p>
                </div>
              )}
              {userLocation && hospitals.length === 0 && !loading && !error && (
                <div className="flex items-center justify-center min-h-[120px] px-3">
                  <p className="text-gray-500 text-sm text-center">
                    {isTr ? 'Bu bölgede hastane bulunamadı.' : 'No hospitals found in this area.'}
                  </p>
                </div>
              )}
              {hospitals.map((h, i) => (
                <div
                  key={`${h.lat}-${h.lon}-${i}`}
                  className="rounded-lg border border-white/10 bg-white/[0.04] p-2.5 hover:bg-white/[0.06] hover:border-white/15 transition-colors"
                >
                  <div className="flex gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm leading-snug break-words">{h.name}</p>
                      {h.address && (
                        <p className="text-xs text-gray-400 mt-0.5 break-words line-clamp-2">
                          {h.address}
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0">
                        <span className="text-[11px] font-medium" style={{ color: '#9ca3af' }}>{h.distance_km} km</span>
                        {h.phone && (
                          <a href={`tel:${h.phone}`} className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-violet-400 transition-colors">
                            <Phone className="w-3 h-3 shrink-0" /> {h.phone}
                          </a>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openInMaps(h.lat, h.lon, h.name)}
                      className="shrink-0 self-start p-2 rounded-lg text-gray-400 hover:text-gray-200 transition-all"
                      style={{ background: 'rgba(255,255,255,0.03)' }}
                      title={isTr ? 'Yol tarifi al' : 'Get directions'}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
