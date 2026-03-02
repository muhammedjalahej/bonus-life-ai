import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import BonusLifeLogo from '../components/BonusLifeLogo';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert(t('auth.error'), t('auth.enterEmailPassword'));
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      Alert.alert(t('auth.loginFailed'), e.message || t('auth.loginFailed'));
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
        <Text style={styles.subtitle}>{t('auth.signIn')}</Text>
        <TextInput style={styles.input} placeholder={t('auth.email')} placeholderTextColor="#64748b" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={styles.input} placeholder={t('auth.password')} placeholderTextColor="#64748b" value={password} onChangeText={setPassword} secureTextEntry />
        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('auth.signIn')}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={styles.linkText}>{t('auth.forgotPassword')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={() => navigation.replace('Register')}>
          <Text style={styles.linkText}>{t('auth.noAccount')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1419', justifyContent: 'center' },
  inner: { padding: 24 },
  logoWrap: { alignItems: 'center', marginBottom: 16 },
  subtitle: { fontSize: 15, color: '#7d8590', textAlign: 'center', marginBottom: 24 },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: 14, color: '#e6edf3', marginBottom: 12, fontSize: 16 },
  button: { backgroundColor: '#10b981', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  link: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#10b981', fontSize: 14 },
});
