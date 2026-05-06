/**
 * EditProfileScreen — Clinical Calm
 * Edit full name + language preference
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  Pressable, Animated, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import * as api from '../services/api';
import { RADIUS, FONT } from '../config/theme';

const SAGE = '#2D6A4F';

function SubmitBtn({ onPress, loading, label }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.97, damping: 20, stiffness: 300, useNativeDriver: true }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    damping: 20, stiffness: 300, useNativeDriver: true }).start();
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable onPress={onPress} onPressIn={onIn} onPressOut={onOut} disabled={loading}>
        <View style={[st.btn, loading && st.btnDisabled]}>
          {loading
            ? <ActivityIndicator color="#F7F4ED" size="small" />
            : <><Ionicons name="checkmark-outline" size={18} color="#F7F4ED" /><Text style={st.btnText}>{label}</Text></>
          }
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function EditProfileScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const { language, setLanguage } = useLanguage();
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [focused,  setFocused]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [saved,    setSaved]    = useState(false);

  const handleSave = async () => {
    if (!fullName.trim()) {
      if (Platform.OS === 'web') { window.alert('Please enter your name.'); }
      else Alert.alert('Required', 'Please enter your name.');
      return;
    }
    setLoading(true);
    try {
      await api.updateProfile({ full_name: fullName.trim(), preferred_language: language });
      await refreshUser();
      setSaved(true);
      setTimeout(() => navigation.goBack(), 800);
    } catch (e) {
      const msg = e?.message || 'Could not save profile.';
      if (Platform.OS === 'web') { window.alert(msg); }
      else Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = async () => {
    const next = language === 'turkish' ? 'english' : 'turkish';
    setLanguage(next);
  };

  return (
    <View style={st.root}>
      <ScrollView
        contentContainerStyle={[st.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={st.title}>Edit Profile</Text>
        <Text style={st.subtitle}>Update your personal details.</Text>

        {/* Full name */}
        <View style={st.fieldWrap}>
          <Text style={st.fieldLabel}>FULL NAME</Text>
          <TextInput
            style={[st.input, focused && st.inputFocused]}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your full name"
            placeholderTextColor="rgba(28,27,24,0.25)"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoCapitalize="words"
            returnKeyType="done"
          />
        </View>

        {/* Email (read-only) */}
        <View style={st.fieldWrap}>
          <Text style={st.fieldLabel}>EMAIL</Text>
          <View style={st.inputReadOnly}>
            <Text style={st.inputReadOnlyText}>{user?.email || ''}</Text>
            <View style={st.lockedBadge}>
              <Ionicons name="lock-closed-outline" size={11} color="rgba(28,27,24,0.3)" />
              <Text style={st.lockedText}>Cannot change</Text>
            </View>
          </View>
        </View>

        {/* Language */}
        <View style={st.fieldWrap}>
          <Text style={st.fieldLabel}>LANGUAGE</Text>
          <View style={st.langRow}>
            {['english', 'turkish'].map(lang => (
              <Pressable
                key={lang}
                style={[st.langBtn, language === lang && st.langBtnActive]}
                onPress={() => setLanguage(lang)}
              >
                <Text style={[st.langBtnText, language === lang && st.langBtnTextActive]}>
                  {lang === 'english' ? '🇬🇧  English' : '🇹🇷  Türkçe'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Save button */}
        <View style={{ marginTop: 8 }}>
          <SubmitBtn
            onPress={handleSave}
            loading={loading}
            label={saved ? 'Saved!' : 'Save Changes'}
          />
        </View>

        {saved && (
          <View style={st.savedRow}>
            <Ionicons name="checkmark-circle" size={14} color={SAGE} />
            <Text style={st.savedText}>Profile updated successfully</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#F7F4ED' },
  content: { paddingHorizontal: 20 },

  title:    { fontSize: 24, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic', fontWeight: '700', color: '#1C1B18', letterSpacing: -0.5, lineHeight: 30, marginBottom: 6 },
  subtitle: { fontSize: 12, fontStyle: 'italic', color: 'rgba(28,27,24,0.45)', lineHeight: 18, marginBottom: 28 },

  fieldWrap:  { marginBottom: 20 },
  fieldLabel: { fontSize: 10, fontWeight: '800', color: 'rgba(28,27,24,0.4)', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 8 },

  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '500',
    color: '#1C1B18',
    borderWidth: 0.5,
    borderColor: 'rgba(28,27,24,0.1)',
    shadowColor: '#1C1B18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  inputFocused: { borderColor: SAGE + '55' },

  inputReadOnly: {
    backgroundColor: 'rgba(28,27,24,0.04)',
    borderRadius: 11,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(28,27,24,0.07)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputReadOnlyText: { fontSize: 15, color: 'rgba(28,27,24,0.4)', fontWeight: '500' },
  lockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lockedText:  { fontSize: 10, color: 'rgba(28,27,24,0.3)' },

  langRow: { flexDirection: 'row', gap: 10 },
  langBtn: {
    flex: 1, paddingVertical: 13, alignItems: 'center', borderRadius: 11,
    backgroundColor: '#FFFFFF', borderWidth: 0.5, borderColor: 'rgba(28,27,24,0.1)',
    shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  langBtnActive:     { backgroundColor: SAGE, borderColor: SAGE, shadowColor: SAGE, shadowOpacity: 0.2 },
  langBtnText:       { fontSize: 14, fontWeight: '600', color: 'rgba(28,27,24,0.5)' },
  langBtnTextActive: { color: '#F7F4ED' },

  btn:        { backgroundColor: SAGE, borderRadius: RADIUS.md, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: SAGE, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 6 },
  btnDisabled:{ backgroundColor: 'rgba(45,106,79,0.45)', shadowOpacity: 0 },
  btnText:    { color: '#F7F4ED', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 14 },
  savedText: { fontSize: 13, color: SAGE, fontWeight: '600' },
});
