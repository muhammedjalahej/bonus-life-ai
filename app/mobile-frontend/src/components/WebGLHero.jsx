/**
 * WebGLHero — rainbow sine-wave shader hero
 * - Web (Expo Web):  renders the exact GLSL fragment shader from the web app
 * - Native (iOS/Android): animated LinearGradient fallback
 */
import React, { useRef, useEffect } from 'react';
import { View, Platform, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/* ── GLSL — identical to web app's WebGLHero shader ── */
const VERT_SRC = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAG_SRC = `
  precision highp float;
  uniform vec2  u_resolution;
  uniform float u_time;
  uniform float u_xScale;
  uniform float u_yScale;
  uniform float u_distortion;

  void main() {
    vec2 p = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);
    float d  = length(p) * u_distortion;
    float rx = p.x * (1.0 + d);
    float gx = p.x;
    float bx = p.x * (1.0 - d);
    float red   = 0.05 / abs(p.y + sin((rx + u_time) * u_xScale) * u_yScale);
    float green = 0.05 / abs(p.y + sin((gx + u_time) * u_xScale) * u_yScale);
    float blue  = 0.05 / abs(p.y + sin((bx + u_time) * u_xScale) * u_yScale);
    gl_FragColor = vec4(red, green, blue, 1.0);
  }
`;

function compileShader(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  return sh;
}

/* ── Web canvas component ── */
function WebGLCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return;

    // Build shader program
    const prog = gl.createProgram();
    gl.attachShader(prog, compileShader(gl, gl.VERTEX_SHADER,   VERT_SRC));
    gl.attachShader(prog, compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    // Full-screen quad (triangle strip)
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const aPosLoc = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(aPosLoc);
    gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const uRes  = gl.getUniformLocation(prog, 'u_resolution');
    const uTime = gl.getUniformLocation(prog, 'u_time');
    gl.uniform1f(gl.getUniformLocation(prog, 'u_xScale'),     1.0);
    gl.uniform1f(gl.getUniformLocation(prog, 'u_yScale'),     0.5);
    gl.uniform1f(gl.getUniformLocation(prog, 'u_distortion'), 0.05);

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = canvas.clientWidth  * dpr;
      canvas.height = canvas.clientHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };

    resize();
    window.addEventListener('resize', resize);

    let time = 0;
    let rafId;
    const loop = () => {
      time += 0.01;
      gl.uniform1f(uTime, time);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafId = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  );
}

/* ── Native fallback — Clinical Calm soft blobs ── */
function NativeHero({ children }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 4000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 4000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 20] });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -15] });

  return (
    <View style={n.container}>
      <LinearGradient colors={['#F7F4ED', '#EFECE4']} style={StyleSheet.absoluteFill} />
      {/* Soft sage green blobs */}
      <Animated.View style={[n.orb, n.orbSage,  { transform: [{ translateX }, { translateY }] }]} />
      <Animated.View style={[n.orb, n.orbTan,   { transform: [{ translateX: Animated.multiply(translateX, -1) }, { translateY }] }]} />
      <Animated.View style={[n.orb, n.orbGreen, { transform: [{ translateX }, { translateY: Animated.multiply(translateY, -1) }] }]} />
      {children}
    </View>
  );
}

const n = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F4ED', overflow: 'hidden' },
  orb: { position: 'absolute', borderRadius: 9999, opacity: 0.4 },
  orbSage:  { width: 300, height: 300, top: '10%', left: '-10%',  backgroundColor: 'rgba(45,106,79,0.15)' },
  orbTan:   { width: 250, height: 250, top: '40%', right: '-5%',  backgroundColor: 'rgba(167,137,108,0.12)' },
  orbGreen: { width: 200, height: 200, top: '65%', left: '20%',   backgroundColor: 'rgba(60,120,80,0.1)' },
});

/* ══════════════════════════════════════════════════════════════════════════
   Exported component — web uses real WebGL, native uses gradient orbs
══════════════════════════════════════════════════════════════════════════ */
export default function WebGLHero({ children }) {
  if (Platform.OS === 'web') {
    return (
      <div style={{ position: 'relative', width: '100%', minHeight: '100vh', background: '#000', overflow: 'hidden' }}>
        {/* Rainbow wave shader */}
        <WebGLCanvas />

        {/* Vignette — same as web app */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.65) 100%)',
          pointerEvents: 'none',
        }} />

        {/* Page content */}
        <div style={{ position: 'relative', zIndex: 10, width: '100%' }}>
          {children}
        </div>
      </div>
    );
  }

  return <NativeHero>{children}</NativeHero>;
}
