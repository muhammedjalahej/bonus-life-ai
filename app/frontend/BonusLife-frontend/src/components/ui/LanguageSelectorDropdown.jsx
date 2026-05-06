import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Check } from "lucide-react";

const FlagUS = () => (
  <svg width="20" height="14" viewBox="0 0 20 14" style={{ borderRadius: 3, flexShrink: 0, display: 'block' }}>
    <rect width="20" height="14" fill="#B22234"/>
    {[1,3,5,7,9,11,13].map(y => <rect key={y} y={y} width="20" height="1" fill="white"/>)}
    <rect width="8" height="7" fill="#3C3B6E"/>
    {[[1,1],[3,1],[5,1],[7,1],[2,3],[4,3],[6,3],[1,5],[3,5],[5,5],[7,5]].map(([cx,cy]) => (
      <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="0.6" fill="white"/>
    ))}
  </svg>
);

const FlagTR = () => (
  <svg width="20" height="14" viewBox="0 0 20 14" style={{ borderRadius: 3, flexShrink: 0, display: 'block' }}>
    <rect width="20" height="14" fill="#E30A17"/>
    <circle cx="8" cy="7" r="3.3" fill="white"/>
    <circle cx="9.2" cy="7" r="2.6" fill="#E30A17"/>
    <polygon points="12.5,7 14.2,7.55 15.3,7 14.2,6.45" fill="white"/>
    <polygon points="12.5,7 13.6,8.1 14.7,7.6" fill="white"/>
    <polygon points="12.5,7 13.6,5.9 14.7,6.4" fill="white"/>
  </svg>
);

const LANGUAGES = [
  { value: "english", label: "English", Flag: FlagUS },
  { value: "turkish", label: "Türkçe",  Flag: FlagTR },
];

export function LanguageSelectorDropdown({ language, setLanguage }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const current = LANGUAGES.find(l => l.value === language) || LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative w-full" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          "flex items-center gap-2 w-full px-3 py-2 text-sm rounded-none",
          "bg-transparent border-none cursor-pointer transition-colors",
          "text-white/50 hover:text-white/70 hover:bg-white/[0.04]",
        )}
      >
        <current.Flag />
        <span className="flex-1 text-left font-semibold text-[0.81rem]">{current.label}</span>
        <ChevronDown
          className="w-3 h-3 text-white/25 shrink-0 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>

      {/* Dropdown — opens upward */}
      {open && (
        <div
          className={cn(
            "absolute bottom-full left-0 right-0 mb-1 rounded-xl overflow-hidden",
            "border border-white/[0.1]",
            "animate-fade-in-up"
          )}
          style={{
            background: "linear-gradient(160deg, rgba(32,32,32,0.98) 0%, rgba(10,10,10,0.99) 100%)",
            backdropFilter: "blur(48px) saturate(200%)",
            boxShadow: "0 -12px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          {LANGUAGES.map((lang, i) => {
            const active = current.value === lang.value;
            return (
              <div key={lang.value}>
                {i > 0 && <div className="h-px mx-2" style={{ background: "rgba(255,255,255,0.05)" }} />}
                <button
                  type="button"
                  onClick={() => { setLanguage(lang.value); setOpen(false); }}
                  className={cn(
                    "flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-left transition-colors",
                    active
                      ? "bg-white/[0.07]"
                      : "hover:bg-white/[0.05]"
                  )}
                >
                  <lang.Flag />
                  <span className={cn(
                    "flex-1 font-semibold text-[0.82rem]",
                    active ? "text-white/90" : "text-white/40"
                  )}>
                    {lang.label}
                  </span>
                  {active && <Check className="w-3.5 h-3.5 text-white/50 shrink-0" />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
