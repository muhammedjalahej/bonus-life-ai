import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  RefreshControl,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');
const PADDING = 20;
const GAP = 12;
const CARD_WIDTH = (width - PADDING * 2 - GAP) / 2;

const QUICK_FEATURES = [
  { key: 'Assessment', labelKey: 'home.riskAssessment', descKey: 'home.riskAssessmentDesc', color: '#2563eb' },
  { key: 'Chat', labelKey: 'home.aiChat', descKey: 'home.aiChatDesc', color: '#059669' },
  { key: 'DietPlan', labelKey: 'home.dietPlan', descKey: 'home.dietPlanDesc', color: '#d97706' },
  { key: 'Hospitals', labelKey: 'home.nearbyHospitals', descKey: 'home.nearbyHospitalsDesc', color: '#4f46e5' },
];

const MORE_FEATURES = [
  { key: 'MealPhoto', labelKey: 'home.mealAnalyzer', descKey: 'home.mealAnalyzerDesc', color: '#0891b2' },
  { key: 'WorkoutVideos', labelKey: 'home.workoutVideos', descKey: 'home.workoutVideosDesc', color: '#db2777' },
  { key: 'Emergency', labelKey: 'home.emergencyCheck', descKey: 'home.emergencyCheckDesc', color: '#dc2626' },
  { key: 'Dashboard', labelKey: 'home.myAssessments', descKey: 'home.myAssessmentsDesc', color: '#7c3aed' },
  { key: 'VerifyReport', labelKey: 'home.verifyReport', descKey: 'home.verifyReportDesc', color: '#64748b' },
];

function AnimatedCard({ children, style, delay, onPress }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 280,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <TouchableOpacity style={style} onPress={onPress} activeOpacity={0.72}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HomeScreen({ navigation }) {
  const { user, logout, refreshUser } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const headerAnim = useRef(new Animated.Value(0)).current;

  const name = (user?.full_name || user?.email || '').trim() || t('common.user');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshUser();
    setRefreshing(false);
  }, [refreshUser]);

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, []);

  const headerOpacity = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const headerTranslate = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 48 },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#10b981"
        />
      }
    >
      <Animated.View style={[styles.header, { opacity: headerOpacity, transform: [{ translateY: headerTranslate }] }]}>
        <Text style={styles.welcome}>{t('home.welcome', { name })}</Text>
        <Text style={styles.tagline}>{t('home.tagline')}</Text>
      </Animated.View>

      <Text style={styles.sectionLabel}>{t('home.quickAccess')}</Text>
      <View style={styles.grid}>
        {QUICK_FEATURES.map((item, i) => (
          <AnimatedCard
            key={item.key}
            delay={50 + i * 50}
            onPress={() => navigation.navigate(item.key)}
            style={[
              styles.gridCard,
              { backgroundColor: item.color + '22', borderColor: item.color + '50' },
            ]}
          >
            <View style={[styles.gridAccent, { backgroundColor: item.color }]} />
            <Text style={[styles.gridTitle, { color: item.color }]} numberOfLines={1}>
              {t(item.labelKey)}
            </Text>
            <Text style={styles.gridDesc} numberOfLines={1}>
              {t(item.descKey)}
            </Text>
          </AnimatedCard>
        ))}
      </View>

      <Text style={[styles.sectionLabel, styles.sectionLabelMore]}>{t('home.more')}</Text>
      <View style={styles.list}>
        {MORE_FEATURES.map((item, i) => (
          <AnimatedCard
            key={item.key}
            delay={280 + i * 40}
            onPress={() => navigation.navigate(item.key)}
            style={[styles.listRow, { borderLeftColor: item.color }]}
          >
            <View style={styles.listContent}>
              <Text style={styles.listTitle} numberOfLines={1}>
                {t(item.labelKey)}
              </Text>
              <Text style={styles.listDesc} numberOfLines={1}>
                {t(item.descKey)}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </AnimatedCard>
        ))}
      </View>

      <TouchableOpacity style={styles.logout} onPress={logout} activeOpacity={0.6}>
        <Text style={styles.logoutText}>{t('home.signOut')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1419' },
  content: { paddingHorizontal: PADDING },
  header: { marginBottom: 32 },
  welcome: {
    fontSize: 22,
    fontWeight: '700',
    color: '#e6edf3',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  tagline: { fontSize: 15, color: '#8b949e', lineHeight: 22 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8b949e',
    letterSpacing: 1,
    marginBottom: 14,
    textTransform: 'uppercase',
  },
  sectionLabelMore: { marginTop: 8, marginBottom: 14 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -GAP / 2,
    marginBottom: 32,
  },
  gridCard: {
    width: CARD_WIDTH,
    marginHorizontal: GAP / 2,
    marginBottom: GAP,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    minHeight: 108,
    overflow: 'hidden',
  },
  gridAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  gridTitle: { fontSize: 15, fontWeight: '700', marginTop: 8, marginBottom: 4 },
  gridDesc: { fontSize: 13, color: '#8b949e' },
  list: { marginBottom: 32 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 10,
    minHeight: 56,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  listContent: { flex: 1, justifyContent: 'center', minHeight: 44 },
  listTitle: { fontSize: 16, fontWeight: '600', color: '#e6edf3' },
  listDesc: { fontSize: 13, color: '#8b949e', marginTop: 2 },
  chevron: { fontSize: 22, color: '#6e7681', marginLeft: 8, fontWeight: '300' },
  logout: { alignSelf: 'center', paddingVertical: 16, paddingHorizontal: 24, minHeight: 48, justifyContent: 'center' },
  logoutText: { fontSize: 14, color: '#8b949e', fontWeight: '500' },
});
