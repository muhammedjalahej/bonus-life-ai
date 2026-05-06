/**
 * Change Password — Clinical Calm
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable,
  Animated, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RADIUS } from '../config/theme';
import { useLanguage } from '../context/LanguageContext';
import * as api from '../services/api';

const SAGE = '#2D6A4F';

/* ── Password field ──────────────────────────────────────────────────────── */
function PassField({ label, value, onChangeText, placeholder, focused, onFocus, onBlur }) {
  const [show, setShow] = useState(false);
  return (
    <View style={st.fieldWrap}>
      <Text style={st.fieldLabel}>{label}</Text>
      <View style={[st.inputBox, focused && st.inputFocused]}>
        <TextInput
          style={st.input}
          placeholder={placeholder}
          placeholderTextColor="rgba(28,27,24,0.3)"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!show}
          autoCapitalize="none"
          onFocus={onFocus}
          onBlur={onBlur}
        />
        <Pressable onPress={() => setShow((s) => !s)} style={st.eyeBtn}>
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(28,27,24,0.35)" />
        </Pressable>
      </View>
    </View>
  );
}

/* ── Screen ──────────────────────────────────────────────────────────────── */
export default function ChangePasswordScreen({ navigation }) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(null);

  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.97, damping: 20, stiffness: 300, useNativeDriver: true }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    damping: 20, stiffness: 300, useNativeDriver: true }).start();

  const submit = async () => {
    if (!current.trim() || !newPass.trim()) {
      Alert.alert(t('auth.error'), t('changePassword.enterBoth'));
      return;
    }
    if (newPass.length < 6) {
      Alert.alert(t('auth.error'), t('changePassword.minLength'));
      return;
    }
    setLoading(true);
    try {
      await api.changePassword(current, newPass);
      Alert.alert(t('auth.done'), t('changePassword.success'));
      navigation.goBack();
    } catch (e) {
      const msg = e.message || '';
      Alert.alert(
        t('auth.error'),
        msg.toLowerCase().includes('incorrect') ? t('changePassword.wrongCurrent') : msg
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={st.root}>

        <ScrollView
          contentContainerStyle={[st.content, { paddingBottom: 48 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={st.title}>{t('changePassword.title')}</Text>
          <Text style={st.subtitle}>Update your account password</Text>

          {/* Form card */}
          <View style={st.formCard}>
            <View style={st.formTopBar} />
            <PassField
              label={t('changePassword.current')}
              value={current}
              onChangeText={setCurrent}
              placeholder="Enter current password"
              focused={focused === 'current'}
              onFocus={() => setFocused('current')}
              onBlur={() => setFocused(null)}
            />
            <View style={st.fieldDivider} />
            <PassField
              label={t('changePassword.new')}
              value={newPass}
              onChangeText={setNewPass}
              placeholder="Min. 6 characters"
              focused={focused === 'new'}
              onFocus={() => setFocused('new')}
              onBlur={() => setFocused(null)}
            />
          </View>

          {/* Strength hint */}
          {newPass.length > 0 && (
            <View style={st.strengthRow}>
              <View style={[st.strengthBar, { backgroundColor: newPass.length >= 12 ? '#10b981' : newPass.length >= 8 ? '#f59e0b' : '#f43f5e', width: `${Math.min(100, (newPass.length / 12) * 100)}%` }]} />
              <Text style={st.strengthText}>
                {newPass.length >= 12 ? 'Strong' : newPass.length >= 8 ? 'Good' : newPass.length >= 6 ? 'Weak' : 'Too short'}
              </Text>
            </View>
          )}

          {/* Submit */}
          <Animated.View style={[{ transform: [{ scale }] }, { marginTop: 24 }]}>
            <Pressable onPress={submit} onPressIn={onIn} onPressOut={onOut} disabled={loading}>
              <View style={[st.submitBtn, loading && { opacity: 0.6 }]}>
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={st.submitText}>{t('changePassword.submit')}</Text>
                  </>
                )}
              </View>
            </Pressable>
          </Animated.View>

          {/* Back */}
          <Pressable style={st.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back-outline" size={15} color="rgba(28,27,24,0.4)" />
            <Text style={st.backText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ── Styles ───────────────────────────────────────────────────────────────── */
const st = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#F7F4ED' },
  content: { paddingHorizontal: 24, paddingTop: 24 },

  blob: {
    position: 'absolute', top: 60, right: -80,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(45,106,79,0.06)',
  },

  title:    { fontSize: 24, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic', fontWeight: '700', color: '#1C1B18', letterSpacing: -0.5, lineHeight: 30, marginBottom: 4 },
  subtitle: { fontSize: 12, fontStyle: 'italic', color: 'rgba(28,27,24,0.45)', lineHeight: 18, marginBottom: 28 },

  /* Form card */
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(28,27,24,0.08)',
    overflow: 'hidden',
    shadowColor: '#1C1B18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  formTopBar: { height: 3, backgroundColor: SAGE },

  fieldDivider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(28,27,24,0.07)', marginHorizontal: 16 },

  fieldWrap: { padding: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(28,27,24,0.5)', marginBottom: 8, letterSpacing: 0.3 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F7F4ED',
    borderRadius: RADIUS.sm, borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(28,27,24,0.12)', overflow: 'hidden',
  },
  inputFocused: { borderColor: 'rgba(45,106,79,0.5)', backgroundColor: 'rgba(45,106,79,0.04)' },
  input: {
    flex: 1, paddingVertical: 13, paddingHorizontal: 14,
    color: '#1C1B18', fontSize: 15, fontWeight: '500',
  },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 13 },

  /* Strength bar */
  strengthRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12,
  },
  strengthBar: {
    height: 3, borderRadius: 2, flex: 1,
  },
  strengthText: { fontSize: 11, fontWeight: '600', color: 'rgba(28,27,24,0.45)', minWidth: 60 },

  /* Submit */
  submitBtn: {
    backgroundColor: SAGE,
    borderRadius: RADIUS.md, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: SAGE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  /* Back */
  backBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 20, paddingVertical: 12,
  },
  backText: { fontSize: 14, color: 'rgba(28,27,24,0.4)' },
});
