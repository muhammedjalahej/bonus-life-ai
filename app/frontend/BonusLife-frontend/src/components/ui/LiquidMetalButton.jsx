import { useEffect, useRef, useState } from "react";

let ShaderMount = null;
let liquidMetalFragmentShader = null;
let shaderLoaded = false;
let shaderLoadAttempted = false;

async function loadShaderLib() {
  if (shaderLoadAttempted) return;
  shaderLoadAttempted = true;
  try {
    const mod = await import("@paper-design/shaders");
    ShaderMount = mod.ShaderMount;
    liquidMetalFragmentShader = mod.liquidMetalFragmentShader;
    shaderLoaded = true;
  } catch {
    shaderLoaded = false;
  }
}

export function LiquidMetalButton({
  children,
  label,
  onClick,
  disabled = false,
  type = "button",
  width = 160,
  height = 46,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState([]);
  const [ready, setReady] = useState(shaderLoaded);
  const shaderRef = useRef(null);
  const shaderMount = useRef(null);
  const buttonRef = useRef(null);
  const rippleId = useRef(0);

  const innerWidth = width - 2;
  const innerHeight = height - 2;

  useEffect(() => {
    loadShaderLib().then(() => setReady(shaderLoaded));
  }, []);

  useEffect(() => {
    if (!ready || !shaderLoaded || !ShaderMount || !liquidMetalFragmentShader) return;

    const styleId = "shader-canvas-style-lmb";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .shader-container-lmb canvas {
          width: 100% !important; height: 100% !important;
          display: block !important; position: absolute !important;
          top: 0 !important; left: 0 !important; border-radius: 100px !important;
        }
        @keyframes lmb-ripple {
          0%   { transform: translate(-50%,-50%) scale(0); opacity: 0.6; }
          100% { transform: translate(-50%,-50%) scale(4); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    if (shaderRef.current) {
      try {
        if (shaderMount.current?.destroy) shaderMount.current.destroy();
        shaderMount.current = new ShaderMount(
          shaderRef.current,
          liquidMetalFragmentShader,
          { u_repetition: 4, u_softness: 0.5, u_shiftRed: 0.3, u_shiftBlue: 0.3,
            u_distortion: 0, u_contour: 0, u_angle: 45, u_scale: 8,
            u_shape: 1, u_offsetX: 0.1, u_offsetY: -0.1 },
          undefined, 0.6
        );
      } catch { /* shader failed silently */ }
    }

    return () => {
      try { if (shaderMount.current?.destroy) { shaderMount.current.destroy(); shaderMount.current = null; } } catch {}
    };
  }, [ready]);

  const handleMouseEnter = () => {
    if (disabled) return;
    setIsHovered(true);
    try { shaderMount.current?.setSpeed?.(1); } catch {}
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsPressed(false);
    try { shaderMount.current?.setSpeed?.(0.6); } catch {}
  };

  const handleClick = (e) => {
    if (disabled) return;
    try {
      shaderMount.current?.setSpeed?.(2.4);
      setTimeout(() => { try { shaderMount.current?.setSpeed?.(isHovered ? 1 : 0.6); } catch {} }, 300);
    } catch {}

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const ripple = { x: e.clientX - rect.left, y: e.clientY - rect.top, id: rippleId.current++ };
      setRipples(prev => [...prev, ripple]);
      setTimeout(() => setRipples(prev => prev.filter(r => r.id !== ripple.id)), 600);
    }
    onClick?.();
  };

  const transition = "all 0.8s cubic-bezier(0.34,1.56,0.64,1)";

  return (
    <div className="relative inline-block" style={{ opacity: disabled ? 0.45 : 1, overflow: 'hidden', borderRadius: '100px', clipPath: 'inset(0 round 100px)' }}>
      <div style={{ perspective: "1000px", perspectiveOrigin: "50% 50%" }}>
        <div style={{ position: "relative", width, height, transformStyle: "preserve-3d", transition }}>

          {/* Label */}
          <div style={{
            position: "absolute", top: 0, left: 0, width, height,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            transformStyle: "preserve-3d", transition,
            transform: "translateZ(20px)", zIndex: 30, pointerEvents: "none",
          }}>
            <span style={{
              fontSize: "14px", color: "#999", fontWeight: 500,
              textShadow: "0px 1px 2px rgba(0,0,0,0.6)",
              transition, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6,
            }}>
              {children || label}
            </span>
          </div>

          {/* Inner dark surface */}
          <div style={{
            position: "absolute", top: 0, left: 0, width, height,
            transformStyle: "preserve-3d", transition,
            transform: `translateZ(10px) ${isPressed ? "translateY(1px) scale(0.98)" : "scale(1)"}`,
            zIndex: 20,
          }}>
            <div style={{
              width: innerWidth, height: innerHeight, margin: "1px",
              borderRadius: "100px",
              background: "linear-gradient(180deg,#1e1e1e 0%,#080808 100%)",
              boxShadow: isPressed ? "inset 0 2px 4px rgba(0,0,0,0.5)" : "none",
              transition,
            }} />
          </div>

          {/* Shader border */}
          <div style={{
            position: "absolute", top: 0, left: 0, width, height,
            transformStyle: "preserve-3d", transition,
            transform: `translateZ(0px) ${isPressed ? "translateY(1px) scale(0.98)" : "scale(1)"}`,
            zIndex: 10,
          }}>
            <div style={{
              height, width, borderRadius: "100px",
              boxShadow: isPressed
                ? "0 0 0 1px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.4)"
                : isHovered
                ? "0 0 0 1px rgba(0,0,0,0.4), 0 8px 20px rgba(0,0,0,0.3)"
                : "0 0 0 1px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.25)",
              transition, background: "transparent",
            }}>
              {ready && shaderLoaded ? (
                <div ref={shaderRef} className="shader-container-lmb"
                  style={{ borderRadius: "100px", overflow: "hidden", position: "relative", width, height }} />
              ) : (
                /* Fallback CSS metallic border when shader unavailable */
                <div style={{
                  width, height, borderRadius: "100px",
                  background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 40%, rgba(255,255,255,0.12) 100%)",
                }} />
              )}
            </div>
          </div>

          {/* Clickable button */}
          <button
            ref={buttonRef}
            type={type}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={() => !disabled && setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            disabled={disabled}
            style={{
              position: "absolute", top: 0, left: 0, width, height,
              background: "transparent", border: "none",
              cursor: disabled ? "not-allowed" : "pointer",
              outline: "none", zIndex: 40,
              transformStyle: "preserve-3d", transform: "translateZ(25px)",
              transition, overflow: "hidden", borderRadius: "100px",
            }}
          >
            {ripples.map(r => (
              <span key={r.id} style={{
                position: "absolute", left: r.x, top: r.y,
                width: 20, height: 20, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 70%)",
                pointerEvents: "none", animation: "lmb-ripple 0.6s ease-out",
              }} />
            ))}
          </button>

        </div>
      </div>
    </div>
  );
}
