/**
 * MoreScreen — Explore / Features tab
 * Clinical Calm: dot-list layout grouped by section, cream bg
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable,
  TextInput, ScrollView, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS, RADIUS, FONT, SPACING, FEATURE_COLORS } from '../config/theme';

/* ── Feature definitions ─────────────────────────────────────────────────── */
const SECTIONS = [
  {
    key: 'diagnostics',
    label: 'DIAGNOSTICS',
    features: [
      { key: 'Assessment',     icon: 'pulse-outline',    color: FEATURE_COLORS.Assessment,     label: 'Diabetes',      hint: 'Type 2 risk assessment'       },
      { key: 'Heart',          icon: 'heart-outline',    color: FEATURE_COLORS.Heart,          label: 'Heart risk',    hint: 'Cardiovascular disease'       },
      { key: 'BrainMRI',       icon: 'scan-outline',     color: FEATURE_COLORS.BrainMRI,       label: 'Brain MRI',     hint: 'Tumor detection'              },
      { key: 'CKD',            icon: 'water-outline',    color: FEATURE_COLORS.CKD,            label: 'Kidney CKD',    hint: 'Chronic kidney disease'       },
      { key: 'SymptomChecker', icon: 'medkit-outline',   color: FEATURE_COLORS.SymptomChecker, label: 'Symptoms',      hint: 'AI symptom checker'           },
    ],
  },
  {
    key: 'nutrition',
    label: 'NUTRITION & FITNESS',
    features: [
      { key: 'DietPlan',      icon: 'nutrition-outline', color: FEATURE_COLORS.DietPlan,      label: 'Diet plan',     hint: 'Personalized meal plans'      },
      { key: 'MealPhoto',     icon: 'camera-outline',    color: FEATURE_COLORS.MealPhoto,     label: 'Meal analyzer', hint: 'Photo nutrition analysis'     },
      { key: 'WorkoutVideos', icon: 'barbell-outline',   color: FEATURE_COLORS.WorkoutVideos, label: 'Workouts',      hint: 'Guided fitness videos'        },
    ],
  },
  {
    key: 'ai',
    label: 'AI TOOLS',
    features: [
      { key: 'ChatTab',  icon: 'chatbubbles-outline', color: FEATURE_COLORS.ChatTab, label: 'AI Chat',    hint: 'Talk to Bonus Life', badge: 'New' },
      { key: 'LocalAI',  icon: 'flash-outline',       color: FEATURE_COLORS.LocalAI, label: 'What if…?', hint: 'Scenario AI explorer'                    },
    ],
  },
];

const ALL_FEATURES = SECTIONS.flatMap(s => s.features.map(f => ({ ...f, section: s.key })));

/* ── Dot-list feature row ────────────────────────────────────────────────── */
function FeatureRow({ item, onPress, isLast }) {
  return (
    <Pressable
      style={({ pressed }) => [
        fr.row,
        !isLast && fr.rowDivider,
        pressed && { backgroundColor: 'rgba(28,27,24,0.02)' },
      ]}
      onPress={onPress}
    >
      {/* Colored dot */}
      <View style={[fr.dot, { backgroundColor: item.color }]} />

      {/* Labels */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={fr.label}>{item.label}</Text>
          {item.badge ? (
            <View style={fr.badge}>
              <Text style={fr.badgeText}>{item.badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={fr.hint}>{item.hint}</Text>
      </View>

      {/* Arrow */}
      <Ionicons name="chevron-forward" size={14} color="rgba(28,27,24,0.25)" />
    </Pressable>
  );
}

const fr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 12,
  },
  rowDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(28,27,24,0.06)',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1B18',
  },
  hint: {
    fontSize: 11,
    fontStyle: 'italic',
    color: 'rgba(28,27,24,0.4)',
    marginTop: 1,
  },
  badge: {
    backgroundColor: 'rgba(200,90,58,0.1)',
    borderRadius: 99,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#C85A3A',
    letterSpacing: 0.3,
  },
});

/* ═══════════════════════════════════════════════════════════════════════════
   Screen
═══════════════════════════════════════════════════════════════════════════ */
export default function MoreScreen({ navigation }) {
  const insets          = useSafeAreaInsets();
  const { isGuest, logout } = useAuth();
  const [query,    setQuery]   = useState('');
  const [focused,  setFocused] = useState(false);

  const navigate = useCallback((key) => {
    if (isGuest) {
      Alert.alert(
        'Members Only',
        'Sign in or create a free account to access health assessments, AI tools, and your personal history.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In / Register', onPress: logout },
        ]
      );
      return;
    }
    if (key === 'Dashboard') {
      navigation.navigate('HistoryTab');
    } else {
      navigation.navigate(key);
    }
  }, [navigation, isGuest, logout]);

  /* Search filters across all features */
  const searchResults = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    return ALL_FEATURES.filter(f =>
      f.label.toLowerCase().includes(q) || (f.hint || '').toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <View style={s.root}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Page header ───────────────────────────────────────────── */}
        <Text style={s.pageTitle}>Explore</Text>
        <Text style={s.pageSubtitle}>{ALL_FEATURES.length} features available</Text>

        {/* ── Search bar ────────────────────────────────────────────── */}
        <View style={[s.searchBox, focused && s.searchBoxFocused]}>
          <Ionicons name="search-outline" size={16} color="rgba(28,27,24,0.35)" />
          <TextInput
            style={s.searchInput}
            placeholder="Search features..."
            placeholderTextColor="rgba(28,27,24,0.3)"
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color="rgba(28,27,24,0.3)" />
            </Pressable>
          )}
        </View>

        {/* ── Search results ────────────────────────────────────────── */}
        {searchResults !== null ? (
          searchResults.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="search-outline" size={36} color={COLORS.textMuted} />
              <Text style={s.emptyText}>No features found</Text>
            </View>
          ) : (
            <View style={s.listCard}>
              {searchResults.map((item, i) => (
                <FeatureRow
                  key={item.key}
                  item={item}
                  onPress={() => navigate(item.key)}
                  isLast={i === searchResults.length - 1}
                />
              ))}
            </View>
          )
        ) : (
          /* ── Grouped sections ─────────────────────────────────────── */
          SECTIONS.map(section => (
            <View key={section.key} style={s.section}>
              <Text style={s.sectionLabel}>{section.label}</Text>
              <View style={s.listCard}>
                {section.features.map((item, i) => (
                  <FeatureRow
                    key={item.key}
                    item={item}
                    onPress={() => navigate(item.key)}
                    isLast={i === section.features.length - 1}
                  />
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#F7F4ED' },
  content: { paddingHorizontal: SPACING.lg },

  pageTitle: {
    fontSize: FONT.xl,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic',
    fontWeight: FONT.semibold,
    color: '#1C1B18',
    marginBottom: 2,
  },
  pageSubtitle: {
    fontSize: 12,
    color: 'rgba(28,27,24,0.4)',
    marginBottom: SPACING.lg,
  },

  /* Search */
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
    shadowColor: '#1C1B18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  searchBoxFocused: {
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT.md,
    color: '#1C1B18',
    paddingVertical: 12,
  },

  /* Sections */
  section: {
    marginBottom: SPACING.xl,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(28,27,24,0.4)',
    letterSpacing: 0.12 * 9,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
  },

  /* No card wrapper — rows sit directly on cream bg */
  listCard: {},

  /* Empty state */
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: FONT.md,
    color: 'rgba(28,27,24,0.4)',
  },
});
