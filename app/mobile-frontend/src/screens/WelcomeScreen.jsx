/**
 * WelcomeScreen — Clinical Calm · Bonus Life AI
 * Brand hero + value prop + auth entry points
 */
import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  Animated, Platform, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const { width: SW } = Dimensions.get('window');

/* ── Design tokens ──────────────────────────────────────────────────────────── */
const T = {
  cream:     '#F5F1E8',
  cream2:    '#EFE9DC',
  ink:       '#1A1A1A',
  inkSub:    '#6B6A63',
  inkMute:   '#9A9890',
  sage:      '#234B3E',
  sage2:     '#2D5F4E',
  sageSoft:  '#E3EAE4',
  peachSoft: '#F7E3D4',
  heart:     '#C95D5D',
  amber:     '#B4781E',
  line:      '#E2DCCC',
};

/* ── Brand mark ─────────────────────────────────────────────────────────────── */
function BrandMark({ size = 34 }) {
  return (
    <View style={[bm.wrap, { width: size, height: size, borderRadius: size * 0.29 }]}>
      <Text style={[bm.letter, { fontSize: size * 0.52 }]}>B</Text>
    </View>
  );
}
const bm = StyleSheet.create({
  wrap:   { backgroundColor: T.sage, alignItems: 'center', justifyContent: 'center' },
  letter: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic', fontWeight: '700', color: '#FFFFFF', lineHeight: undefined },
});

/* ── Hero card ──────────────────────────────────────────────────────────────── */
function HeroCard() {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 3000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 3000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={hc.card}>
      {/* Tint blobs */}
      <View style={hc.blobSage} />
      <View style={hc.blobPeach} />

      {/* Venn diagram */}
      <View style={hc.diagram}>
        <Animated.View style={[hc.ring, hc.ringLeft,  { transform: [{ scale: pulse }] }]} />
        <Animated.View style={[hc.ring, hc.ringRight, { transform: [{ scale: pulse }] }]} />
        {/* Center overlap mark */}
        <View style={hc.centerDot}>
          <Ionicons name="heart" size={14} color={T.sage} />
        </View>
        {/* Floating dots */}
        <View style={[hc.dot, { top: 28, left: 38, backgroundColor: T.sage }]} />
        <View style={[hc.dot, { top: 55, right: 32, backgroundColor: T.heart, width: 6, height: 6 }]} />
        <View style={[hc.dot, { bottom: 32, left: 55, backgroundColor: T.amber, width: 5, height: 5 }]} />
        <View style={[hc.dot, { bottom: 20, right: 48, backgroundColor: T.sage, opacity: 0.5 }]} />
      </View>
    </View>
  );
}
const CARD_W = Math.min(SW - 48, 360);
const hc = StyleSheet.create({
  card:      { width: CARD_W, height: 180, backgroundColor: T.sageSoft, borderRadius: 20, overflow: 'hidden', alignSelf: 'center', marginBottom: 36, borderWidth: 1, borderColor: T.line },
  blobSage:  { position: 'absolute', top: -40, left: -40,  width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(35,75,62,0.1)' },
  blobPeach: { position: 'absolute', bottom: -30, right: -30, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(247,227,212,0.6)' },
  diagram:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  ring:      { position: 'absolute', width: 110, height: 110, borderRadius: 55, borderWidth: 1.5, borderColor: T.sage + '50' },
  ringLeft:  { left: CARD_W / 2 - 80, backgroundColor: 'rgba(35,75,62,0.08)' },
  ringRight: { left: CARD_W / 2 - 38, backgroundColor: 'rgba(247,227,212,0.25)' },
  centerDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: T.sage, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 },
  dot:       { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
});

/* ── Feature bullet ─────────────────────────────────────────────────────────── */
function Bullet({ color, children }) {
  return (
    <View style={bu.row}>
      <View style={[bu.dot, { backgroundColor: color }]} />
      <Text style={bu.text}>{children}</Text>
    </View>
  );
}
const bu = StyleSheet.create({
  row:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  dot:  { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  text: { fontSize: 13.5, color: T.inkSub, lineHeight: 20, flex: 1 },
});

/* ── Screen ─────────────────────────────────────────────────────────────────── */
export default function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { continueAsGuest } = useAuth();

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Nav row */}
        <View style={s.navRow}>
          <BrandMark size={34} />
          <Text style={s.navName}>Bonus Life</Text>
        </View>

        {/* Hero card */}
        <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
          <HeroCard />
        </Animated.View>

        {/* Heading */}
        <Animated.View style={[s.headingWrap, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <Text style={s.h1}>Know your health.</Text>
          <Text style={[s.h1, s.h1Accent]}>Live longer.</Text>
          <Text style={s.sub}>
            AI-guided risk checks for diabetes, heart, kidney, and more — in minutes, not months.
          </Text>
        </Animated.View>

        {/* Bullets */}
        <View style={s.bullets}>
          <Bullet color={T.sage}>8 clinically informed assessments</Bullet>
          <Bullet color={T.heart}>Personalised health score, updated weekly</Bullet>
          <Bullet color={T.amber}>Private by design. Your data, your rules.</Bullet>
        </View>

        {/* CTA */}
        <View style={s.ctaWrap}>
          <Pressable
            style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.88 }]}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={s.primaryBtnText}>Get started</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </Pressable>

          <Pressable
            style={({ pressed }) => [s.secondaryBtn, pressed && { opacity: 0.7 }]}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={s.secondaryBtnText}>I already have an account</Text>
          </Pressable>

          <Pressable style={s.guestBtn} onPress={continueAsGuest}>
            <Text style={s.guestBtnText}>Continue as Guest</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: T.cream },
  scroll: { paddingHorizontal: 24 },

  navRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 32 },
  navName:{ fontSize: 16, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic', fontWeight: '700', color: T.ink, letterSpacing: -0.3 },

  headingWrap: { marginBottom: 24 },
  h1:          { fontSize: 34, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontWeight: '400', color: T.ink, letterSpacing: -0.8, lineHeight: 40 },
  h1Accent:    { color: T.sage, fontStyle: 'italic' },
  sub:         { fontSize: 14, color: T.inkSub, lineHeight: 22, marginTop: 12 },

  bullets: { marginBottom: 36 },

  ctaWrap:        { gap: 10 },
  primaryBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 14, backgroundColor: T.sage, shadowColor: T.sage, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 20, elevation: 6 },
  primaryBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', letterSpacing: 0.2 },

  secondaryBtn:     { height: 52, borderRadius: 14, borderWidth: 1, borderColor: T.line, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  secondaryBtnText: { fontSize: 14.5, fontWeight: '600', color: T.sage },

  guestBtn:     { alignItems: 'center', paddingVertical: 10 },
  guestBtnText: { fontSize: 13, color: T.inkMute, fontWeight: '500' },
});
