import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';

export default function SettingsScreen({ navigation }) {
  const { t, language, setLanguage } = useLanguage();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const toggleLanguage = async () => {
    const next = language === 'turkish' ? 'english' : 'turkish';
    setLanguage(next);
    if (user) {
      try {
        await api.updateProfile({ preferred_language: next });
      } catch {}
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionLabel}>{t('settings.language')}</Text>
      <TouchableOpacity style={styles.row} onPress={toggleLanguage} activeOpacity={0.7}>
        <View style={styles.rowContent}>
          <Text style={styles.rowTitle}>{t('settings.language')}</Text>
          <Text style={styles.rowDesc}>{t('settings.languageDesc')}</Text>
        </View>
        <Text style={styles.badge}>{language === 'turkish' ? 'TR' : 'EN'}</Text>
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>{t('settings.changePassword')}</Text>
      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate('ChangePassword')}
        activeOpacity={0.7}
      >
        <View style={styles.rowContent}>
          <Text style={styles.rowTitle}>{t('settings.changePassword')}</Text>
          <Text style={styles.rowDesc}>{t('settings.changePasswordDesc')}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1419' },
  content: { paddingHorizontal: 20 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8b949e',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 10,
    minHeight: 56,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#e6edf3' },
  rowDesc: { fontSize: 13, color: '#8b949e', marginTop: 2 },
  badge: { fontSize: 12, fontWeight: '600', color: '#10b981', marginLeft: 8 },
  chevron: { fontSize: 22, color: '#6e7681', marginLeft: 8 },
});
