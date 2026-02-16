import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import * as api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function ForgotPasswordScreen({ navigation }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim()) {
      Alert.alert(t('auth.error'), t('auth.enterEmail'));
      return;
    }
    setLoading(true);
    try {
      await api.forgotPassword(email);
      Alert.alert(t('auth.done'), t('auth.tempPasswordSent'));
      navigation.goBack();
    } catch (e) {
      Alert.alert(t('auth.error'), e.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>{t('auth.forgotPasswordTitle')}</Text>
      <Text style={styles.subtitle}>{t('auth.forgotPasswordSubtitle')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('auth.email')}
        placeholderTextColor="#64748b"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={submit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('auth.sendTempPassword')}</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.link} onPress={() => navigation.goBack()}>
        <Text style={styles.linkText}>{t('auth.backToLogin')}</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1419', padding: 24, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: '#e6edf3', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#7d8590', marginBottom: 24 },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: 14, color: '#e6edf3', fontSize: 16, marginBottom: 16 },
  button: { backgroundColor: '#10b981', borderRadius: 8, padding: 14, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  link: { marginTop: 24, alignItems: 'center' },
  linkText: { color: '#10b981', fontSize: 14 },
});
