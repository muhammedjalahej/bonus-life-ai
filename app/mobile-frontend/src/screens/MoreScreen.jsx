import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const FEATURES = [
  { key: 'Assessment', labelKey: 'nav.riskAssessment', color: '#2563eb' },
  { key: 'DietPlan', labelKey: 'nav.dietPlan', color: '#d97706' },
  { key: 'MealPhoto', labelKey: 'nav.mealAnalyzer', color: '#0891b2' },
  { key: 'WorkoutVideos', labelKey: 'nav.workoutVideos', color: '#db2777' },
  { key: 'Emergency', labelKey: 'nav.emergencyCheck', color: '#dc2626' },
  { key: 'Dashboard', labelKey: 'nav.myAssessments', color: '#7c3aed' },
  { key: 'VerifyReport', labelKey: 'nav.verifyReport', color: '#64748b' },
];

export default function MoreScreen({ navigation }) {
  const { logout } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionLabel}>{t('nav.more')}</Text>
      <TouchableOpacity
        style={[styles.row, styles.settingsRow, { borderLeftColor: '#10b981' }]}
        onPress={() => navigation.navigate('Settings')}
        activeOpacity={0.7}
      >
        <Text style={styles.settingsIcon}>⚙</Text>
        <Text style={styles.rowTitle}>{t('nav.settings')}</Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
      {FEATURES.map(({ key, labelKey, color }) => (
        <TouchableOpacity
          key={key}
          style={[styles.row, { borderLeftColor: color }]}
          onPress={() => navigation.navigate(key)}
          activeOpacity={0.7}
        >
          <Text style={styles.rowTitle}>{t(labelKey)}</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.logout} onPress={logout} activeOpacity={0.7}>
        <Text style={styles.logoutText}>{t('home.signOut')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1419' },
  content: { paddingHorizontal: 20 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7d8590',
    letterSpacing: 0.8,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  rowTitle: { fontSize: 15, fontWeight: '600', color: '#e6edf3', flex: 1 },
  chevron: { fontSize: 18, color: '#484f58', fontWeight: '300' },
  settingsRow: { flexDirection: 'row', alignItems: 'center' },
  settingsIcon: { fontSize: 18, marginRight: 12, color: '#10b981' },
  logout: {
    alignSelf: 'center',
    marginTop: 28,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  logoutText: { fontSize: 14, color: '#7d8590', fontWeight: '500' },
});
