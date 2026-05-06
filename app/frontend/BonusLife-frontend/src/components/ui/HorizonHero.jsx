import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap, MessageSquare, ArrowRight, CheckCircle2,
} from 'lucide-react';
import { ROUTES } from '../../config/constants';

/* ── Lazy-load heavy deps ── */
let THREE, gsap, ScrollTrigger, EffectComposer, RenderPass, UnrealBloomPass;

const loadDeps = async () => {
  const [threeModule, gsapModule, composerModule, renderModule, bloomModule] = await Promise.all([
    import('three'),
    import('gsap'),
    import('three/examples/jsm/postprocessing/EffectComposer.js'),
    import('three/examples/jsm/postprocessing/RenderPass.js'),
    import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
  ]);
  const { ScrollTrigger: ST } = await import('gsap/ScrollTrigger');
  THREE = threeModule;
  gsap = gsapModule.gsap;
  ScrollTrigger = ST;
  EffectComposer = composerModule.EffectComposer;
  RenderPass = renderModule.RenderPass;
  UnrealBloomPass = bloomModule.UnrealBloomPass;
  gsap.registerPlugin(ScrollTrigger);
};

export function HorizonHero({ language }) {
  const navigate  = useNavigate();
  const containerRef  = useRef(null);
  const canvasRef     = useRef(null);
  const titleRef      = useRef(null);
  const subtitleRef   = useRef(null);
  const scrollProgRef = useRef(null);
  const ctaRef        = useRef(null);

  const smoothCam = useRef({ x: 0, y: 30, z: 100 });
  const [scrollProg, setScrollProg] = useState(0);
  const [section, setSection]       = useState(0);
  const [ready, setReady]           = useState(false);
  const TOTAL = 2;

  const refs = useRef({
    scene: null, camera: null, renderer: null, composer: null,
    stars: [], nebula: null, mountains: [], animId: null,
    targetX: 0, targetY: 30, targetZ: 300, locations: [],
  });

  const isTr = language === 'turkish';

  const SECTIONS = [
    {
      title: 'BONUS LIFE AI',
      sub1:  null,
      sub2:  null,
    },
    {
      title: isTr ? 'SAĞLIK AI' : 'HEALTH AI',
      sub1:  isTr ? 'Klinik kaliteli yapay zeka ile'         : 'With clinical-grade artificial intelligence,',
      sub2:  isTr ? 'kronik hastalıkları erken tespit edin'  : 'detect chronic conditions before symptoms appear',
    },
    {
      title: isTr ? 'DAHA UZUN YAŞA' : 'LIVE LONGER',
      sub1:  isTr ? 'Kişiselleştirilmiş sağlık önerileri,'  : 'Personalised health recommendations,',
      sub2:  isTr ? 'daha uzun ve sağlıklı bir hayat için'  : 'powered by your own health data and AI',
    },
  ];

  /* ─── Three.js init ─── */
  useEffect(() => {
    let cancelled = false;

    loadDeps().then(() => {
      if (cancelled || !canvasRef.current) return;
      const r = refs.current;

      r.scene = new THREE.Scene();
      r.scene.fog = new THREE.FogExp2(0x000000, 0.00025);

      r.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
      r.camera.position.set(0, 20, 100);

      r.renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true, alpha: true });
      r.renderer.setSize(window.innerWidth, window.innerHeight);
      r.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      r.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      r.renderer.toneMappingExposure = 0.5;

      r.composer = new EffectComposer(r.renderer);
      r.composer.addPass(new RenderPass(r.scene, r.camera));
      r.composer.addPass(new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight), 0.8, 0.4, 0.85
      ));

      createStars(r);
      createNebula(r);
      createMountains(r);
      createAtmosphere(r);

      r.locations = r.mountains.map(m => m.position.z);
      animate(r);
      setReady(true);
    });

    const handleResize = () => {
      const r = refs.current;
      if (!r.camera || !r.renderer) return;
      r.camera.aspect = window.innerWidth / window.innerHeight;
      r.camera.updateProjectionMatrix();
      r.renderer.setSize(window.innerWidth, window.innerHeight);
      r.composer?.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelled = true;
      const r = refs.current;
      if (r.animId) cancelAnimationFrame(r.animId);
      window.removeEventListener('resize', handleResize);
      r.stars.forEach(s => { s.geometry.dispose(); s.material.dispose(); });
      r.mountains.forEach(m => { m.geometry.dispose(); m.material.dispose(); });
      if (r.nebula) { r.nebula.geometry.dispose(); r.nebula.material.dispose(); }
      r.renderer?.dispose();
    };
  }, []);

  /* ─── GSAP entrance ─── */
  useEffect(() => {
    if (!ready || !gsap) return;
    const tl = gsap.timeline();
    if (titleRef.current) {
      tl.from(titleRef.current.querySelectorAll('.tc'), {
        y: 180, opacity: 0, duration: 1.4, stagger: 0.04, ease: 'power4.out',
      });
    }
    if (subtitleRef.current) {
      tl.from(subtitleRef.current.querySelectorAll('.sl'), {
        y: 40, opacity: 0, duration: 0.9, stagger: 0.18, ease: 'power3.out',
      }, '-=0.9');
    }
    if (ctaRef.current) {
      tl.from(ctaRef.current, { opacity: 0, y: 30, duration: 0.7, ease: 'power2.out' }, '-=0.5');
    }
    if (scrollProgRef.current) {
      tl.from(scrollProgRef.current, { opacity: 0, y: 30, duration: 0.8, ease: 'power2.out' }, '-=0.4');
    }
    return () => tl.kill();
  }, [ready]);

  /* ─── Scroll ─── */
  useEffect(() => {
    const onScroll = () => {
      const r = refs.current;
      const container = containerRef.current;
      if (!container) return;
      // Progress relative to the hero container only
      const heroScrollable = container.scrollHeight - window.innerHeight;
      const heroScrollY    = Math.max(0, window.scrollY - container.offsetTop);
      const prog = Math.min(heroScrollY / Math.max(heroScrollable, 1), 1);
      setScrollProg(prog);

      const totalProg = prog * TOTAL;
      const sec = Math.min(Math.floor(totalProg), TOTAL - 1);
      const secProg = totalProg % 1;
      setSection(sec);

      const cams = [
        { x: 0, y: 30, z: 300 },
        { x: 0, y: 40, z: -50 },
        { x: 0, y: 50, z: -700 },
      ];
      const cur  = cams[sec]     || cams[0];
      const next = cams[sec + 1] || cur;

      r.targetX = cur.x + (next.x - cur.x) * secProg;
      r.targetY = cur.y + (next.y - cur.y) * secProg;
      r.targetZ = cur.z + (next.z - cur.z) * secProg;

      r.mountains.forEach((m, i) => {
        if (prog > 0.7) { m.position.z = 600000; }
        else { m.position.z = r.locations[i]; }
      });
      if (r.nebula) r.nebula.position.z = r.mountains[3]?.position.z ?? -200;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ─── Scene builders ─── */
  function createStars(r) {
    const COUNT = 5000;
    for (let layer = 0; layer < 3; layer++) {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(COUNT * 3);
      const col = new Float32Array(COUNT * 3);
      const sz  = new Float32Array(COUNT);
      for (let j = 0; j < COUNT; j++) {
        const rad = 200 + Math.random() * 800;
        const th  = Math.random() * Math.PI * 2;
        const ph  = Math.acos(Math.random() * 2 - 1);
        pos[j*3]   = rad * Math.sin(ph) * Math.cos(th);
        pos[j*3+1] = rad * Math.sin(ph) * Math.sin(th);
        pos[j*3+2] = rad * Math.cos(ph);
        const c = new THREE.Color();
        const t = Math.random();
        if (t < 0.7)       c.setHSL(0,   0, 0.8 + Math.random() * 0.2);
        else if (t < 0.87) c.setHSL(0.75, 0.5, 0.85); // violet tint
        else               c.setHSL(0.55, 0.5, 0.85); // cyan tint
        col[j*3]=c.r; col[j*3+1]=c.g; col[j*3+2]=c.b;
        sz[j] = Math.random() * 2 + 0.5;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
      geo.setAttribute('size',     new THREE.BufferAttribute(sz, 1));

      const mat = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 }, depth: { value: layer } },
        vertexShader: `
          attribute float size; attribute vec3 color;
          varying vec3 vColor; uniform float time; uniform float depth;
          void main() {
            vColor = color;
            vec3 p = position;
            float a = time * 0.05 * (1.0 - depth * 0.3);
            mat2 rot = mat2(cos(a),-sin(a),sin(a),cos(a));
            p.xy = rot * p.xy;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = size * (300.0 / -mv.z);
            gl_Position  = projectionMatrix * mv;
          }`,
        fragmentShader: `
          varying vec3 vColor;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            gl_FragColor = vec4(vColor, 1.0 - smoothstep(0.0, 0.5, d));
          }`,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const pts = new THREE.Points(geo, mat);
      r.scene.add(pts);
      r.stars.push(pts);
    }
  }

  function createNebula(r) {
    const geo = new THREE.PlaneGeometry(8000, 4000, 100, 100);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color(0x4c1d95) }, // violet
        color2: { value: new THREE.Color(0x0e7490) }, // cyan
        opacity: { value: 0.25 },
      },
      vertexShader: `
        varying vec2 vUv; varying float vEl; uniform float time;
        void main() {
          vUv = uv; vec3 p = position;
          float el = sin(p.x*0.01+time)*cos(p.y*0.01+time)*20.0;
          p.z += el; vEl = el;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
        }`,
      fragmentShader: `
        uniform vec3 color1; uniform vec3 color2;
        uniform float opacity; uniform float time;
        varying vec2 vUv; varying float vEl;
        void main() {
          float m = sin(vUv.x*10.0+time)*cos(vUv.y*10.0+time);
          vec3 col = mix(color1,color2,m*0.5+0.5);
          float a = opacity*(1.0-length(vUv-0.5)*2.0);
          gl_FragColor = vec4(col, a*(1.0+vEl*0.01));
        }`,
      transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
    });
    r.nebula = new THREE.Mesh(geo, mat);
    r.nebula.position.z = -1050;
    r.scene.add(r.nebula);
  }

  function createMountains(r) {
    const layers = [
      { z: -50,  h: 60,  color: 0x1a1a2e, opacity: 1   },
      { z: -100, h: 80,  color: 0x16213e, opacity: 0.8 },
      { z: -150, h: 100, color: 0x0f3460, opacity: 0.6 },
      { z: -200, h: 120, color: 0x0a3d62, opacity: 0.4 },
    ];
    layers.forEach((l, idx) => {
      const pts = [];
      const SEG = 50;
      for (let i = 0; i <= SEG; i++) {
        const x = (i / SEG - 0.5) * 1000;
        const y = Math.sin(i * 0.1) * l.h + Math.sin(i * 0.05) * l.h * 0.5 + Math.random() * l.h * 0.2 - 100;
        pts.push(new THREE.Vector2(x, y));
      }
      pts.push(new THREE.Vector2(5000, -300));
      pts.push(new THREE.Vector2(-5000, -300));
      const shape = new THREE.Shape(pts);
      const geo   = new THREE.ShapeGeometry(shape);
      const mat   = new THREE.MeshBasicMaterial({ color: l.color, transparent: true, opacity: l.opacity, side: THREE.DoubleSide });
      const mesh  = new THREE.Mesh(geo, mat);
      mesh.position.z = l.z;
      mesh.position.y = l.z;
      mesh.userData  = { baseZ: l.z, idx };
      r.scene.add(mesh);
      r.mountains.push(mesh);
    });
  }

  function createAtmosphere(r) {
    const geo = new THREE.SphereGeometry(600, 32, 32);
    const mat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: `
        varying vec3 vNormal;
        void main() { vNormal = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `
        varying vec3 vNormal; uniform float time;
        void main() {
          float i = pow(0.7-dot(vNormal,vec3(0,0,1)),2.0);
          vec3 atm = vec3(0.49,0.24,0.93)*i; // violet atmosphere
          atm *= sin(time*2.0)*0.1+0.9;
          gl_FragColor = vec4(atm, i*0.25);
        }`,
      side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true,
    });
    r.scene.add(new THREE.Mesh(geo, mat));
  }

  function animate(r) {
    r.animId = requestAnimationFrame(() => animate(r));
    const t = Date.now() * 0.001;

    r.stars.forEach(s => { if (s.material.uniforms) s.material.uniforms.time.value = t; });
    if (r.nebula?.material.uniforms) r.nebula.material.uniforms.time.value = t * 0.5;

    if (r.camera) {
      const sf = 0.05;
      smoothCam.current.x += (r.targetX - smoothCam.current.x) * sf;
      smoothCam.current.y += (r.targetY - smoothCam.current.y) * sf;
      smoothCam.current.z += (r.targetZ - smoothCam.current.z) * sf;
      r.camera.position.set(
        smoothCam.current.x + Math.sin(t * 0.1) * 2,
        smoothCam.current.y + Math.cos(t * 0.15) * 1,
        smoothCam.current.z,
      );
      r.camera.lookAt(0, 10, -600);
    }

    r.mountains.forEach((m, i) => {
      m.position.x = Math.sin(t * 0.1) * 2 * (1 + i * 0.5);
    });

    r.composer?.render();
  }

  /* ─── Content for current section ─── */
  const secData = SECTIONS[Math.min(section, SECTIONS.length - 1)];

  return (
    <>
      <style>{`
        .hz-container   { position: relative; width: 100vw; margin-left: calc(50% - 50vw); background: #02020f; }
        .hz-sticky-wrap { position: sticky; top: 0; height: 100vh; overflow: hidden; }
        .hz-canvas      { position: absolute; inset: 0; width: 100%; height: 100%; display: block; z-index: 0; pointer-events: none; }
        .hz-sticky      { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10; }
        .hz-title       { font-size: clamp(3.5rem, 12vw, 10rem); font-weight: 900; letter-spacing: -0.02em; line-height: 1; text-align: center; overflow: hidden; display: flex; flex-wrap: wrap; justify-content: center; }
        .tc           { display: inline-block; background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(167,139,250,0.85) 50%, rgba(6,182,212,0.8) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .tc-space     { width: 0.3em; display: inline-block; }
        .hz-sub       { text-align: center; margin-top: 1.5rem; }
        .sl           { display: block; font-size: clamp(0.9rem, 2vw, 1.15rem); color: rgba(255,255,255,0.45); letter-spacing: 0.04em; line-height: 1.8; }
        .hz-progress  { position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 1rem; z-index: 20; }
        .hz-track     { width: 120px; height: 2px; background: rgba(255,255,255,0.1); border-radius: 999px; overflow: hidden; }
        .hz-fill      { height: 100%; background: linear-gradient(90deg, #7C3AED, #06B6D4); border-radius: 999px; transition: width 0.1s; }
        .hz-counter   { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.15em; color: rgba(255,255,255,0.3); }
        .hz-scroll-lbl{ font-size: 0.6rem; font-weight: 700; letter-spacing: 0.2em; color: rgba(255,255,255,0.25); }
        .hz-sections  { position: relative; z-index: 5; }
        .hz-section   { height: 100vh; }
        .hz-cta       { display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center; margin-top: 2.5rem; }
        .hz-btn-primary {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.85rem 2rem; border-radius: 0.75rem;
          background: linear-gradient(135deg, #7C3AED, #06B6D4);
          color: white; font-weight: 700; font-size: 0.95rem;
          border: none; cursor: pointer; transition: all 0.2s;
          box-shadow: 0 0 25px rgba(124,58,237,0.35);
          font-family: 'Figtree','Inter',sans-serif;
        }
        .hz-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(124,58,237,0.5); }
        .hz-btn-ghost  {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.85rem 2rem; border-radius: 0.75rem;
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.75); font-weight: 600; font-size: 0.95rem;
          border: 1px solid rgba(255,255,255,0.1); cursor: pointer; transition: all 0.2s;
          font-family: 'Figtree','Inter',sans-serif;
        }
        .hz-btn-ghost:hover { background: rgba(255,255,255,0.08); border-color: rgba(124,58,237,0.4); color: white; }
        .hz-trust { display: flex; flex-wrap: wrap; gap: 1.5rem; justify-content: center; margin-top: 1.5rem; }
        .hz-trust-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: rgba(255,255,255,0.35); }
      `}</style>

      <div ref={containerRef} className="hz-container" style={{ fontFamily: "'Figtree','Inter',sans-serif" }}>

        {/* Single sticky wrapper — keeps canvas + overlay contained to hero only */}
        <div className="hz-sticky-wrap">
          <canvas ref={canvasRef} className="hz-canvas" />

          {/* Content overlay */}
          <div className="hz-sticky">
          <h1 ref={titleRef} className="hz-title">
            {secData.title.split('').map((ch, i) =>
              ch === ' '
                ? <span key={i} className="tc-space" />
                : <span key={i} className="tc">{ch}</span>
            )}
          </h1>

          {/* Subtitle — hidden on first section (intro), shown on scroll */}
          {secData.sub1 && (
            <div ref={subtitleRef} className="hz-sub">
              <span className="sl">{secData.sub1}</span>
              <span className="sl">{secData.sub2}</span>
            </div>
          )}


          {/* Trust badges — on last section */}
          {section === 2 && (
            <div className="hz-trust">
              {(isTr
                ? ['Ücretsiz başla', 'Kredi kartı yok', 'Gizlilik öncelikli']
                : ['Free to start', 'No credit card', 'Privacy-first']
              ).map(lbl => (
                <span key={lbl} className="hz-trust-item">
                  <CheckCircle2 style={{ width: 14, height: 14, color: '#A78BFA' }} />
                  {lbl}
                </span>
              ))}
            </div>
          )}
        </div>{/* end hz-sticky */}
        </div>{/* end hz-sticky-wrap */}

        {/* Spacer — scroll distance for camera animation */}
        <div style={{ height: `${TOTAL * 100}vh` }} />

        {/* Scroll progress indicator */}
        <div ref={scrollProgRef} className="hz-progress">
          <span className="hz-scroll-lbl">SCROLL</span>
          <div className="hz-track">
            <div className="hz-fill" style={{ width: `${scrollProg * 100}%` }} />
          </div>
          <span className="hz-counter">
            {String(section + 1).padStart(2,'0')} / {String(TOTAL).padStart(2,'0')}
          </span>
        </div>
      </div>
    </>
  );
}
