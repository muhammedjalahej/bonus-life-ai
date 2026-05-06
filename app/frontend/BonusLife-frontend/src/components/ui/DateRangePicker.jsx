import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, X, Check } from 'lucide-react';

function parseDate(str) {
  if (!str) return undefined;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatShort(date, locale = 'en-US') {
  if (!date) return '';
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

function toYMD(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function DateRangePicker({ from, to, onFromChange, onToChange, isTr }) {
  const [open, setOpen] = useState(false);
  // pending = what the user has selected in the calendar, not yet applied
  const [pending, setPending] = useState({ from: undefined, to: undefined });
  const anchorRef = useRef(null);
  const popoverRef = useRef(null);

  const locale = isTr ? 'tr-TR' : 'en-US';
  const hasRange = from || to;

  // Sync pending to current applied values when popup opens
  useEffect(() => {
    if (open) {
      setPending({ from: parseDate(from), to: parseDate(to) });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target) &&
        anchorRef.current && !anchorRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleApply = () => {
    onFromChange({ target: { value: toYMD(pending.from) } });
    onToChange({ target: { value: toYMD(pending.to) } });
    setOpen(false);
  };

  const handleClear = (e) => {
    e?.stopPropagation();
    onFromChange({ target: { value: '' } });
    onToChange({ target: { value: '' } });
    setPending({ from: undefined, to: undefined });
  };

  const canApply = pending.from && pending.to;
  const pendingLabel = pending.from || pending.to
    ? `${pending.from ? formatShort(pending.from, locale) : '—'} → ${pending.to ? formatShort(pending.to, locale) : '—'}`
    : (isTr ? 'Bir tarih aralığı seçin' : 'Select a date range');

  return (
    <>
      {/* Trigger — icon only */}
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] transition"
        title={isTr ? 'Tarih aralığı' : 'Filter by date range'}
      >
        <CalendarIcon
          className="w-3.5 h-3.5 shrink-0"
          style={{ color: hasRange ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)' }}
        />
        {hasRange && (
          <X
            className="w-3 h-3 text-white/30 hover:text-white/60 cursor-pointer"
            onClick={handleClear}
          />
        )}
      </button>

      {open && createPortal(
        <>
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              zIndex: 99998,
            }}
          />

          {/* Centered popup */}
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 300,
              zIndex: 99999,
            }}
          >
            <div
              className="rounded-2xl border border-white/10 overflow-hidden"
              style={{
                background: 'linear-gradient(160deg, rgba(30,30,30,0.98) 0%, rgba(10,10,10,0.99) 100%)',
                backdropFilter: 'blur(48px) saturate(200%)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
            >
              <div className="px-4 pt-4 pb-2">
                <Calendar
                  mode="range"
                  selected={pending}
                  onSelect={(range) => setPending({ from: range?.from, to: range?.to })}
                  className="bg-transparent p-0 w-full"
                  showOutsideDays={false}
                  classNames={{
                    range_middle: 'range-middle',
                    day_button: [
                      'group-[.range-middle]:!bg-white/[0.10]',
                      'group-[.range-middle]:!text-white',
                      'group-[.range-middle]:hover:!bg-white/[0.18]',
                      'group-[.range-middle]:!rounded-md',
                    ].join(' '),
                  }}
                  formatters={{
                    formatWeekdayName: (d) => d.toLocaleString(locale, { weekday: 'short' }),
                  }}
                />
              </div>

              {/* Footer */}
              <div className="border-t border-white/[0.06] px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-[11px] text-white/35 flex-1 truncate">
                  {pendingLabel}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {(pending.from || pending.to) && (
                    <button
                      type="button"
                      onClick={() => setPending({ from: undefined, to: undefined })}
                      className="text-[11px] text-white/30 hover:text-white/60 transition"
                    >
                      {isTr ? 'Temizle' : 'Clear'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleApply}
                    disabled={!canApply}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-white/[0.08] border border-white/[0.12] text-white/70 hover:bg-white/[0.14] hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Check className="w-3 h-3" />
                    {isTr ? 'Uygula' : 'Apply'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
