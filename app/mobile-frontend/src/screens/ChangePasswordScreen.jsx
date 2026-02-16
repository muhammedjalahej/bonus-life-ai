import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import * as api from '../services/api';

export default function ChangePasswordScreen({ navigation }) {
  const { t } = useLanguage();
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [loading, setLoading] = useState(false);

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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>{t('changePassword.title')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('changePassword.current')}
        placeholderTextColor="#64748b"
        value={current}
        onChangeText={setCurrent}
        secureTextEntry
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder={t('changePassword.new')}
        placeholderTextColor="#64748b"
        value={newPass}
        onChangeText={setNewPass}
        secureTextEntry
        autoCapitalize="none"
      />
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={submit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{t('changePassword.submit')}</Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1419', padding: 24, paddingTop: 32 },
  title: { fontSize: 20, fontWeight: '600', color: '#e6edf3', marginBottom: 24 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 14,
    color: '#e6edf3',
    fontSize: 16,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
