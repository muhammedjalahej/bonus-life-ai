/**
 * ForgotPasswordScreen — Clinical Calm · Bonus Life AI
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as api from '../services/api';

/* ── Design tokens ──────────────────────────────────────────────────────────── */
const T = {
  cream:   '#F5F1E8',
  ink:     '#1A1A1A',
  inkSub:  '#6B6A63',
  inkMute: '#9A9890',
  sage:    '#234B3E',
  heart:   '#C95D5D',
  line:    '#E2DCCC',
  inputBg: '#FBF7EC',
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
  letter: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic', fontWeight: '700', color: '#FFFFFF' },
});

export default function ForgotPasswordScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [error,   setError]   = useState('');
  const [sent,    setSent]    = useState(false);

  const submit = async () => {
    if (!email.trim()) { setError('Email is required'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Enter a valid email address'); return; }
    setError('');
    setLoading(true);
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
    } catch (e) {
      Alert.alert('Error', e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Nav */}
          <View style={s.navRow}>
            <BrandMark size={34} />
            <Text style={s.navName}>Bonus Life</Text>
          </View>

          {/* Icon ring */}
          <View style={s.iconRing}>
            <Ionicons name="mail-outline" size={26} color={T.sage} />
          </View>

          {/* Heading */}
          <Text style={s.eyebrow}>ACCOUNT RECOVERY</Text>
          <Text style={s.h1}>Forgot your{'\n'}<Text style={s.h1Accent}>password?</Text></Text>
          <Text style={s.sub}>
            {sent
              ? 'We\'ve sent a reset link to your email address. Check your inbox and follow the instructions.'
              : 'Enter your email address and we\'ll send you a link to reset your password.'
            }
          </Text>

          {!sent && (
            <>
              {/* Email input */}
              <Text style={s.fieldLabel}>Email</Text>
              <View style={[s.inputWrap, focused && s.inputFocus, !!error && s.inputError]}>
                <Ionicons name="mail-outline" size={17} color={focused ? T.sage : T.inkMute} style={{ marginHorizontal: 14 }} />
                <TextInput
                  style={s.input}
                  placeholder="you@example.com"
                  placeholderTextColor={T.inkMute}
                  value={email}
                  onChangeText={(v) => { setEmail(v); setError(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={submit}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                />
              </View>
              {!!error && <Text style={s.errorText}>{error}</Text>}

              {/* CTA */}
              <Pressable
                style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.88 }, loading && { opacity: 0.7 }]}
                onPress={submit}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#FFFFFF" />
                  : <>
                      <Text style={s.primaryBtnText}>Send reset link</Text>
                      <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                    </>
                }
              </Pressable>
            </>
          )}

          {sent && (
            <View style={s.successCard}>
              <Ionicons name="checkmark-circle" size={22} color={T.sage} />
              <Text style={s.successText}>Check your inbox</Text>
            </View>
          )}

          {/* Back */}
          <Pressable style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={15} color={T.inkMute} />
            <Text style={s.backText}>Back to sign in</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: T.cream },
  scroll: { paddingHorizontal: 24 },

  navRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 48 },
  navName: { fontSize: 16, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic', fontWeight: '700', color: T.ink, letterSpacing: -0.3 },

  iconRing: { width: 58, height: 58, borderRadius: 17, backgroundColor: 'rgba(35,75,62,0.1)', borderWidth: 1.5, borderColor: 'rgba(35,75,62,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },

  eyebrow:  { fontSize: 11, fontWeight: '700', color: T.inkSub, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10 },
  h1:       { fontSize: 34, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontWeight: '400', color: T.ink, letterSpacing: -0.8, lineHeight: 40, marginBottom: 12 },
  h1Accent: { color: T.sage, fontStyle: 'italic' },
  sub:      { fontSize: 14, color: T.inkSub, lineHeight: 22, marginBottom: 32 },

  fieldLabel: { fontSize: 11, fontWeight: '700', color: T.inkSub, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 8 },
  inputWrap:  { flexDirection: 'row', alignItems: 'center', height: 50, backgroundColor: T.inputBg, borderRadius: 14, borderWidth: 1, borderColor: T.line },
  inputFocus: { backgroundColor: '#FFFFFF', borderColor: T.sage },
  inputError: { borderColor: T.heart, backgroundColor: '#FFF8F8' },
  input:      { flex: 1, fontSize: 14.5, color: T.ink, paddingRight: 14, outlineWidth: 0, outlineStyle: 'none' },
  errorText:  { fontSize: 12, color: T.heart, marginTop: 6, marginLeft: 2, marginBottom: 14 },

  primaryBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 14, backgroundColor: T.sage, marginTop: 22, shadowColor: T.sage, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 6 },
  primaryBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', letterSpacing: 0.2 },

  successCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(35,75,62,0.08)', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(35,75,62,0.15)', marginTop: 8 },
  successText: { fontSize: 14, fontWeight: '600', color: T.sage },

  backBtn:  { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 28, paddingVertical: 8, justifyContent: 'center' },
  backText: { fontSize: 13.5, color: T.inkMute, fontWeight: '500' },
});
