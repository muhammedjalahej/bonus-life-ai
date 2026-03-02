import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import BonusLifeLogo from '../components/BonusLifeLogo';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email.trim() || !password) {
      Alert.alert(t('auth.error'), t('auth.enterEmailPassword'));
      return;
    }
    setLoading(true);
    try {
      await register(email.trim(), password, fullName.trim());
    } catch (e) {
      Alert.alert(t('auth.registerFailed'), e.message || t('auth.registerFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.logoWrap}>
          <BonusLifeLogo size="large" />
        </View>
        <Text style={styles.title}>{t('auth.createAccount')}</Text>
        <TextInput style={styles.input} placeholder={t('auth.fullNameOptional')} placeholderTextColor="#64748b" value={fullName} onChangeText={setFullName} />
        <TextInput style={styles.input} placeholder={t('auth.email')} placeholderTextColor="#64748b" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={styles.input} placeholder={t('auth.password')} placeholderTextColor="#64748b" value={password} onChangeText={setPassword} secureTextEntry />
        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('auth.signUp')}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={() => navigation.replace('Login')}>
          <Text style={styles.linkText}>{t('auth.haveAccount')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1419', justifyContent: 'center' },
  inner: { padding: 24 },
  logoWrap: { alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '600', color: '#e6edf3', marginBottom: 20 },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: 14, color: '#e6edf3', marginBottom: 12, fontSize: 16 },
  button: { backgroundColor: '#10b981', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  link: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#10b981', fontSize: 14 },
});
