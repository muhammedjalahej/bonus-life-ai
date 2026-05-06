import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Bell, BellOff } from 'lucide-react';
import { createReminder } from '@/services/api';

export function MiniCalendar({ open, onClose, isTr, anchorRef, onDateSelect, centered = false }) {
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState('09:00');
  const [status, setStatus] = useState('idle'); // idle | set | past | error
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const timerRef = useRef(null);
  const popoverRef = useRef(null);

  // Position below anchor button (or centered if `centered` prop is set)
  useEffect(() => {
    if (!open || centered) return;
    if (!anchorRef?.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const popupWidth = 300;
    let left = rect.right - popupWidth;
    if (left < 8) left = 8;
    setPos({ top: rect.bottom + 8, left });
  }, [open, anchorRef, centered]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target) &&
        anchorRef?.current && !anchorRef.current.contains(e.target)
      ) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose, anchorRef]);

  // Cleanup timer only when component fully unmounts
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleSetReminder = () => {
    if (!date || !time) return;

    // Build target datetime
    const [hours, minutes] = time.split(':').map(Number);
    const target = new Date(date);
    target.setHours(hours, minutes, 0, 0);

    const ms = target.getTime() - Date.now();
    if (ms <= 0) { setStatus('past'); return; }

    // Clear any existing timer
    if (timerRef.current) clearTimeout(timerRef.current);

    const formattedDate = target.toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
    const formattedTime = target.toLocaleTimeString(isTr ? 'tr-TR' : 'en-US', {
      hour: '2-digit', minute: '2-digit',
    });

    timerRef.current = setTimeout(async () => {
      try {
        const title = isTr
          ? `⏰ Hatırlatıcı — ${formattedDate} ${formattedTime}`
          : `⏰ Reminder — ${formattedDate} at ${formattedTime}`;
        const message = isTr
          ? 'Takvimden ayarladığınız hatırlatıcı zamanı geldi.'
          : 'Your calendar reminder time has arrived.';
        await createReminder(title, message);
      } catch (e) {
        // fail silently — notification still counts as fired
      }
      timerRef.current = null;
    }, ms);

    setStatus('set');
  };

  const handleCancel = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setStatus('idle');
  };

  if (!open) return null;

  const statusMsg =
    status === 'set'
      ? (isTr ? '✓ Hatırlatıcı ayarlandı' : '✓ Reminder set')
      : status === 'past'
      ? (isTr ? 'Seçilen zaman geçmişte' : 'That time has already passed')
      : status === 'error'
      ? (isTr ? 'Bir hata oluştu' : 'Something went wrong')
      : (isTr ? 'Bir tarih ve saat seçin.' : 'Pick a date and time.');

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          zIndex: 99998,
        }}
      />

      {/* Popup */}
      <div
        ref={popoverRef}
        style={centered
          ? { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 300, zIndex: 99999 }
          : { position: 'fixed', top: pos.top, left: pos.left, width: 300, zIndex: 99999 }
        }
      >
        <div
          className="rounded-2xl border border-white/10 overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, rgba(32,32,32,0.97) 0%, rgba(10,10,10,0.99) 100%)',
            backdropFilter: 'blur(48px) saturate(200%)',
            boxShadow: '0 16px 56px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          {/* Calendar */}
          <div className="px-4 pt-4 pb-2">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => { setDate(d); setStatus('idle'); if (onDateSelect && d) onDateSelect(d); }}
              className="bg-transparent p-0 w-full"
              showOutsideDays={false}
              formatters={{
                formatWeekdayName: (d) =>
                  d.toLocaleString(isTr ? 'tr-TR' : 'en-US', { weekday: 'short' }),
              }}
            />
          </div>

          {/* Time input + bell */}
          <div className="flex items-center gap-2 border-t border-white/[0.07] px-4 py-3">
            <Input
              type="time"
              value={time}
              onChange={(e) => { setTime(e.target.value); setStatus('idle'); }}
              className="appearance-none [&::-webkit-calendar-picker-indicator]:hidden text-white/70 text-xs h-8 flex-1"
            />

            {status === 'set' ? (
              <button
                onClick={handleCancel}
                title={isTr ? 'İptal et' : 'Cancel reminder'}
                className="flex items-center gap-1 px-3 h-8 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-colors shrink-0"
              >
                <BellOff className="w-3.5 h-3.5" />
                {isTr ? 'İptal' : 'Cancel'}
              </button>
            ) : (
              <button
                onClick={handleSetReminder}
                disabled={!date || !time}
                title={isTr ? 'Hatırlatıcı kur' : 'Set reminder'}
                className="flex items-center gap-1 px-3 h-8 rounded-lg border border-white/10 bg-white/5 text-white/60 text-xs hover:bg-white/10 hover:text-white transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Bell className="w-3.5 h-3.5" />
                {isTr ? 'Hatırlat' : 'Remind me'}
              </button>
            )}
          </div>

          {/* Status bar */}
          <div className={`px-4 py-2 border-t border-white/[0.05] text-[11px] ${
            status === 'set' ? 'text-emerald-400/80' :
            status === 'past' || status === 'error' ? 'text-red-400/70' :
            'text-white/30'
          }`}>
            {statusMsg}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
