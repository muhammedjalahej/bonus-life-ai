/**
 * SignInScreen — Clinical Calm · Bonus Life AI
 * Cream bg · Georgia serif headings · Sage CTAs · Inline validation
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

/* ── Design tokens ──────────────────────────────────────────────────────────── */
const T = {
  cream:    '#F5F1E8',
  ink:      '#1A1A1A',
  inkSub:   '#6B6A63',
  inkMute:  '#9A9890',
  sage:     '#234B3E',
  sage2:    '#2D5F4E',
  sageSoft: '#E3EAE4',
  heart:    '#C95D5D',
  line:     '#E2DCCC',
  lineStr:  '#CECCBF',
  inputBg:  '#FBF7EC',
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

/* ── Input field ────────────────────────────────────────────────────────────── */
function AuthInput({ icon, placeholder, value, onChangeText, secure, showToggle, onToggle,
  keyboardType, returnKeyType, onSubmit, onFocus, onBlur, focused, error }) {
  return (
    <View style={{ marginBottom: error ? 4 : 14 }}>
      <View style={[inp.wrap, focused && inp.wrapFocus, !!error && inp.wrapError]}>
        <Ionicons name={icon} size={17} color={focused ? T.sage : T.inkMute} style={inp.icon} />
        <TextInput
          style={inp.field}
          placeholder={placeholder}
          placeholderTextColor={T.inkMute}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secure}
          keyboardType={keyboardType || 'default'}
          returnKeyType={returnKeyType || 'next'}
          onSubmitEditing={onSubmit}
          onFocus={onFocus}
          onBlur={onBlur}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {showToggle && (
          <Pressable onPress={onToggle} hitSlop={10} style={inp.eyeBtn}>
            <Text style={inp.showText}>{secure ? 'Show' : 'Hide'}</Text>
          </Pressable>
        )}
      </View>
      {!!error && <Text style={inp.errorText}>{error}</Text>}
    </View>
  );
}
const inp = StyleSheet.create({
  wrap:      { flexDirection: 'row', alignItems: 'center', height: 50, backgroundColor: T.inputBg, borderRadius: 14, borderWidth: 1, borderColor: T.line },
  wrapFocus: { backgroundColor: '#FFFFFF', borderColor: T.sage },
  wrapError: { borderColor: T.heart, backgroundColor: '#FFF8F8' },
  icon:      { marginHorizontal: 14 },
  field:     { flex: 1, fontSize: 14.5, color: T.ink, fontWeight: '400', paddingRight: 4, outlineWidth: 0, outlineStyle: 'none' },
  eyeBtn:    { paddingHorizontal: 14 },
  showText:  { fontSize: 12.5, fontWeight: '600', color: T.sage },
  errorText: { fontSize: 12, color: T.heart, marginTop: 4, marginLeft: 2, marginBottom: 10 },
});

/* ── Checkbox ───────────────────────────────────────────────────────────────── */
function Checkbox({ value, onChange, label }) {
  return (
    <Pressable style={cb.row} onPress={() => onChange(!value)}>
      <View style={[cb.box, value && cb.boxChecked]}>
        {value && <Ionicons name="checkmark" size={11} color="#FFFFFF" />}
      </View>
      <Text style={cb.label}>{label}</Text>
    </Pressable>
  );
}
const cb = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center', gap: 9 },
  box:        { width: 16, height: 16, borderRadius: 5, borderWidth: 1.5, borderColor: T.lineStr, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  boxChecked: { backgroundColor: T.sage, borderColor: T.sage },
  label:      { fontSize: 13, color: T.inkSub },
});

/* ── OAuth button ───────────────────────────────────────────────────────────── */
function OAuthBtn({ provider, onPress }) {
  const isGoogle = provider === 'google';
  return (
    <Pressable
      style={({ pressed }) => [oa.btn, pressed && { opacity: 0.8 }]}
      onPress={onPress}
    >
      <Ionicons name={isGoogle ? 'logo-google' : 'logo-apple'} size={18} color={T.ink} />
      <Text style={oa.label}>{isGoogle ? 'Google' : 'Apple'}</Text>
    </Pressable>
  );
}
const oa = StyleSheet.create({
  btn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: T.line },
  label: { fontSize: 14, fontWeight: '600', color: T.ink },
});

/* ── Field label ────────────────────────────────────────────────────────────── */
function FieldLabel({ children }) {
  return <Text style={fl.text}>{children}</Text>;
}
const fl = StyleSheet.create({
  text: { fontSize: 11, fontWeight: '700', color: T.inkSub, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 8 },
});

/* ── Screen ─────────────────────────────────────────────────────────────────── */
export default function LoginScreen({ navigation }) {
  const { login, continueAsGuest } = useAuth();
  const insets = useSafeAreaInsets();

  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [showPass,   setShowPass]   = useState(true);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [focused,    setFocused]    = useState(null);
  const [errors,     setErrors]     = useState({});

  const pwRef = useRef(null);

  const validate = () => {
    const e = {};
    if (!email.trim())                        e.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email))    e.email    = 'Enter a valid email';
    if (!password)                            e.password = 'Password is required';
    else if (password.length < 8)            e.password = 'Password must be at least 8 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      Alert.alert('Sign in failed', e.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const fp = (key) => ({
    focused:       focused === key,
    onFocus:       () => { setFocused(key); setErrors(p => ({ ...p, [key]: '' })); },
    onBlur:        () => setFocused(null),
  });

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

          {/* Heading */}
          <Text style={s.eyebrow}>WELCOME BACK</Text>
          <Text style={s.h1}>Sign in to{'\n'}<Text style={s.h1Accent}>continue.</Text></Text>

          <View style={s.form}>
            {/* Email */}
            <FieldLabel>Email</FieldLabel>
            <AuthInput
              icon="mail-outline"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              returnKeyType="next"
              onSubmit={() => pwRef.current?.focus()}
              error={errors.email}
              {...fp('email')}
            />

            {/* Password */}
            <FieldLabel>Password</FieldLabel>
            <AuthInput
              icon="lock-closed-outline"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secure={showPass}
              showToggle
              onToggle={() => setShowPass(v => !v)}
              returnKeyType="done"
              onSubmit={handleLogin}
              error={errors.password}
              {...fp('password')}
            />

            {/* Remember + Forgot */}
            <View style={s.rememberRow}>
              <Checkbox value={rememberMe} onChange={setRememberMe} label="Remember me" />
              <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={s.forgotText}>Forgot password?</Text>
              </Pressable>
            </View>

            {/* CTA */}
            <Pressable
              style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.88 }, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#FFFFFF" />
                : <>
                    <Text style={s.primaryBtnText}>Sign in</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                  </>
              }
            </Pressable>

            {/* Divider */}
            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>OR CONTINUE WITH</Text>
              <View style={s.dividerLine} />
            </View>

            {/* OAuth */}
            <View style={s.oauthRow}>
              <OAuthBtn provider="google" onPress={() => { /* TODO: connect Google */ Alert.alert('Coming Soon', 'Google Sign In will be available soon.'); }} />
              <OAuthBtn provider="apple"  onPress={() => { /* TODO: connect Apple */  Alert.alert('Coming Soon', 'Apple Sign In will be available soon.'); }} />
            </View>

            {/* Register link */}
            <View style={s.bottomRow}>
              <Text style={s.bottomText}>New to Bonus Life?</Text>
              <Pressable onPress={() => navigation.replace('Register')}>
                <Text style={s.bottomLink}>Create account</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: T.cream },
  scroll: { paddingHorizontal: 24 },

  navRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 36 },
  navName: { fontSize: 16, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic', fontWeight: '700', color: T.ink, letterSpacing: -0.3 },

  eyebrow:  { fontSize: 11, fontWeight: '700', color: T.inkSub, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10 },
  h1:       { fontSize: 34, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontWeight: '400', color: T.ink, letterSpacing: -0.8, lineHeight: 40, marginBottom: 32 },
  h1Accent: { color: T.sage, fontStyle: 'italic' },

  form: { gap: 0 },

  rememberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  forgotText:  { fontSize: 13, fontWeight: '600', color: T.sage },

  primaryBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 14, backgroundColor: T.sage, shadowColor: T.sage, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 6 },
  primaryBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', letterSpacing: 0.2 },

  divider:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 20 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: T.line },
  dividerText: { fontSize: 10.5, fontWeight: '700', color: T.inkMute, letterSpacing: 1 },

  oauthRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },

  bottomRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  bottomText: { fontSize: 13.5, color: T.inkSub },
  bottomLink: { fontSize: 13.5, fontWeight: '600', color: T.sage },
});
