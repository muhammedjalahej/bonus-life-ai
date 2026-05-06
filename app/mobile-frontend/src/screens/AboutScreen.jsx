/**
 * AboutScreen — Clinical Calm
 * App info, version, features, legal
 */
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Linking, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, FONT, SPACING } from '../config/theme';

const SAGE = '#2D6A4F';
const VERSION = '1.0.0';

const FEATURES = [
  { icon: 'pulse-outline',        color: '#C85A3A', label: 'Diabetes Risk Assessment'    },
  { icon: 'heart-outline',        color: '#E05A8A', label: 'Heart Risk Assessment'        },
  { icon: 'scan-outline',         color: '#6B8794', label: 'Brain MRI Tumor Detection'    },
  { icon: 'water-outline',        color: '#2D9CDB', label: 'Kidney Disease (CKD) Check'  },
  { icon: 'medical-outline',      color: '#A7896C', label: 'Symptom Checker'              },
  { icon: 'leaf-outline',         color: SAGE,      label: 'AI Diet Planning'             },
  { icon: 'camera-outline',       color: '#B4781E', label: 'Meal Photo Analyzer'          },
  { icon: 'barbell-outline',      color: '#8B5CF6', label: 'Workout Videos'               },
  { icon: 'location-outline',     color: '#C85A3A', label: 'Nearby Hospitals Finder'      },
  { icon: 'chatbubbles-outline',  color: SAGE,      label: 'AI Health Chat'               },
  { icon: 'cpu-outline',          color: '#6B8794', label: 'Local AI Features'            },
  { icon: 'shield-checkmark-outline', color: '#2D6A4F', label: 'Cryptographic Report Verification' },
];

function InfoRow({ icon, iconColor, label, value, onPress }) {
  const inner = (
    <View style={s.infoRow}>
      <View style={[s.infoIcon, { backgroundColor: iconColor + '18' }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
      </View>
      {onPress && <Ionicons name="open-outline" size={14} color={COLORS.textMuted} />}
    </View>
  );
  if (onPress) return <Pressable onPress={onPress}>{inner}</Pressable>;
  return inner;
}

export default function AboutScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={s.root}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* App logo / hero */}
        <View style={s.hero}>
          <View style={s.logoWrap}>
            <Ionicons name="heart-circle" size={40} color={SAGE} />
          </View>
          <Text style={[s.appName, { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }]}>
            Bonus Life AI
          </Text>
          <Text style={s.tagline}>Your AI-powered personal health companion</Text>
          <View style={s.versionPill}>
            <Text style={s.versionText}>Version {VERSION}</Text>
          </View>
        </View>

        {/* App info */}
        <Text style={s.sectionLabel}>APP INFO</Text>
        <View style={s.card}>
          <View style={s.infoBorder}>
            <InfoRow icon="code-slash-outline"    iconColor={SAGE}      label="Version"   value={VERSION} />
          </View>
          <View style={s.infoBorder}>
            <InfoRow icon="globe-outline"         iconColor="#2D9CDB"   label="Platform"  value={Platform.OS === 'web' ? 'Web' : Platform.OS === 'ios' ? 'iOS' : 'Android'} />
          </View>
          <View style={s.infoBorder}>
            <InfoRow icon="server-outline"        iconColor="#B4781E"   label="Backend"   value="FastAPI · Python · SQLite" />
          </View>
          <InfoRow icon="logo-react"              iconColor="#61DAFB"   label="Frontend"  value="React Native · Expo" />
        </View>

        {/* Features */}
        <Text style={[s.sectionLabel, { marginTop: SPACING.xxl }]}>FEATURES</Text>
        <View style={s.card}>
          {FEATURES.map((f, i) => (
            <View key={i} style={[s.featureRow, i < FEATURES.length - 1 && s.featureBorder]}>
              <View style={[s.featureIcon, { backgroundColor: f.color + '15' }]}>
                <Ionicons name={f.icon} size={16} color={f.color} />
              </View>
              <Text style={s.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>

        {/* Legal */}
        <Text style={[s.sectionLabel, { marginTop: SPACING.xxl }]}>LEGAL</Text>
        <View style={s.card}>
          <View style={s.infoBorder}>
            <InfoRow
              icon="document-text-outline" iconColor={COLORS.textSecondary}
              label="Privacy Policy" value="View privacy policy"
              onPress={() => {}}
            />
          </View>
          <InfoRow
            icon="reader-outline" iconColor={COLORS.textSecondary}
            label="Terms of Service" value="View terms of service"
            onPress={() => {}}
          />
        </View>

        {/* Disclaimer */}
        <View style={s.disclaimer}>
          <Ionicons name="information-circle-outline" size={14} color={COLORS.textMuted} />
          <Text style={s.disclaimerText}>
            Bonus Life AI is intended for informational and educational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified healthcare provider with any questions you may have.
          </Text>
        </View>

        <Text style={s.copyright}>© {new Date().getFullYear()} Bonus Life AI. All rights reserved.</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#F7F4ED' },
  content: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },

  /* Hero */
  hero: { alignItems: 'center', marginBottom: SPACING.xxl, paddingTop: SPACING.md },
  logoWrap: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: 'rgba(45,106,79,0.1)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1.5, borderColor: 'rgba(45,106,79,0.2)',
    shadowColor: SAGE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 3,
  },
  appName: {
    fontSize: 28, fontWeight: '800', fontStyle: 'italic',
    color: '#1C1B18', letterSpacing: -0.6, marginBottom: 6,
  },
  tagline: {
    fontSize: 13, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 20,
    paddingHorizontal: SPACING.lg, marginBottom: SPACING.md,
  },
  versionPill: {
    backgroundColor: 'rgba(45,106,79,0.1)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 0.5, borderColor: 'rgba(45,106,79,0.25)',
  },
  versionText: {
    fontSize: FONT.xs, fontWeight: FONT.semibold, color: SAGE,
  },

  /* Section label */
  sectionLabel: {
    fontSize: 10, fontWeight: FONT.bold,
    color: COLORS.textMuted, letterSpacing: 1.2,
    marginBottom: SPACING.sm, paddingLeft: 4,
  },

  /* Card */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    shadowColor: '#1C1B18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },

  /* Info row */
  infoBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(28,27,24,0.07)',
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: SPACING.lg, paddingVertical: 14,
  },
  infoIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  infoLabel: { fontSize: FONT.xs, color: COLORS.textMuted, marginBottom: 2 },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#1C1B18' },

  /* Feature row */
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: SPACING.lg, paddingVertical: 12,
  },
  featureBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(28,27,24,0.06)',
  },
  featureIcon: {
    width: 32, height: 32, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  featureLabel: { fontSize: 13, fontWeight: '500', color: '#1C1B18' },

  /* Disclaimer */
  disclaimer: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    marginTop: SPACING.xxl,
    backgroundColor: 'rgba(28,27,24,0.03)',
    borderRadius: RADIUS.md, padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(28,27,24,0.07)',
  },
  disclaimerText: {
    flex: 1, fontSize: 11, color: COLORS.textMuted, lineHeight: 17,
  },

  copyright: {
    textAlign: 'center', fontSize: 11, color: COLORS.textMuted,
    marginTop: SPACING.xl, marginBottom: SPACING.md,
  },
});
