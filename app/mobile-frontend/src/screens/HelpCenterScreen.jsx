/**
 * HelpCenterScreen — Clinical Calm
 * FAQs accordion + contact info
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Animated, Linking, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, FONT, SPACING } from '../config/theme';

const SAGE = '#2D6A4F';

const FAQS = [
  {
    q: 'What is Bonus Life AI?',
    a: 'Bonus Life AI is an AI-powered personal health assistant that helps you assess your risk for diabetes, heart disease, kidney disease, and more. It also offers diet planning, symptom checking, meal photo analysis, and local AI features — all in one app.',
  },
  {
    q: 'How accurate are the health assessments?',
    a: 'Our models are trained on clinical datasets and validated against medical benchmarks. However, these assessments are for informational purposes only and are NOT a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider.',
  },
  {
    q: 'Is my health data private and secure?',
    a: 'Yes. Your data is encrypted in transit and at rest. We do not sell or share your personal health information with third parties. You can delete your records at any time from the History tab.',
  },
  {
    q: 'How do I delete my health records?',
    a: 'Go to the History tab, find the record you want to remove, and tap the trash icon on the card. You will be asked to confirm before the record is permanently deleted.',
  },
  {
    q: 'What is the Brain MRI Analysis feature?',
    a: 'This feature uses a deep learning model to classify brain MRI scans into four categories: no tumor, glioma, meningioma, or pituitary tumor. Upload a JPG or PNG image of a brain MRI scan and the AI will provide a classification with a confidence score.',
  },
  {
    q: 'How does the Symptom Checker work?',
    a: 'You describe your symptoms and the AI analyzes them against a large database of medical conditions to suggest possible causes. This is not a diagnosis — it is a guide to help you understand what might be happening and whether you should seek medical care.',
  },
  {
    q: 'Can I use Bonus Life AI offline?',
    a: 'Most features require an internet connection to communicate with our backend. The Local AI tab allows some features to run on-device depending on your setup.',
  },
  {
    q: 'What is the Verify Report feature?',
    a: 'When you download an assessment PDF, it contains a QR code with a cryptographic signature. Use the Verify Report feature (in your Account tab) to scan that QR code and confirm the report has not been tampered with.',
  },
  {
    q: 'How do I change the app language?',
    a: 'Go to your Profile tab, tap Preferences, then tap Language to toggle between English and Turkish.',
  },
  {
    q: 'How do I contact support?',
    a: 'You can reach us by email at the contact below. We aim to respond within 2 business days.',
  },
];

function FAQItem({ item, isLast }) {
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    Animated.spring(anim, {
      toValue: next ? 1 : 0,
      damping: 20, stiffness: 200, useNativeDriver: false,
    }).start();
  };

  return (
    <View style={[s.faqItem, !isLast && s.faqBorder]}>
      <Pressable style={s.faqQ} onPress={toggle}>
        <Text style={s.faqQText}>{item.q}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={open ? SAGE : COLORS.textMuted}
        />
      </Pressable>
      {open && (
        <Text style={s.faqAText}>{item.a}</Text>
      )}
    </View>
  );
}

export default function HelpCenterScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={s.root}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroIcon}>
            <Ionicons name="help-circle" size={28} color={SAGE} />
          </View>
          <Text style={s.heroTitle}>Help Center</Text>
          <Text style={s.heroSub}>Find answers to common questions about Bonus Life AI.</Text>
        </View>

        {/* FAQs */}
        <Text style={s.sectionLabel}>FREQUENTLY ASKED QUESTIONS</Text>
        <View style={s.card}>
          {FAQS.map((item, i) => (
            <FAQItem key={i} item={item} isLast={i === FAQS.length - 1} />
          ))}
        </View>

        {/* Contact */}
        <Text style={[s.sectionLabel, { marginTop: SPACING.xxl }]}>CONTACT US</Text>
        <Pressable
          style={s.contactCard}
          onPress={() => Linking.openURL('mailto:support@bonuslifeai.com')}
        >
          <View style={s.contactIcon}>
            <Ionicons name="mail-outline" size={20} color={SAGE} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.contactLabel}>Email Support</Text>
            <Text style={s.contactValue}>support@bonuslifeai.com</Text>
          </View>
          <Ionicons name="open-outline" size={14} color={COLORS.textMuted} />
        </Pressable>

        <View style={s.disclaimer}>
          <Ionicons name="information-circle-outline" size={14} color={COLORS.textMuted} />
          <Text style={s.disclaimerText}>
            Bonus Life AI is for informational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#F7F4ED' },
  content: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },

  /* Hero */
  hero: { alignItems: 'center', marginBottom: SPACING.xxl, paddingTop: SPACING.md },
  heroIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: 'rgba(45,106,79,0.1)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1, borderColor: 'rgba(45,106,79,0.2)',
  },
  heroTitle: {
    fontSize: 24, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic',
    fontWeight: '700', color: '#1C1B18', letterSpacing: -0.5, lineHeight: 30, marginBottom: 6,
  },
  heroSub: {
    fontSize: 13, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 20,
    paddingHorizontal: SPACING.lg,
  },

  /* Section label */
  sectionLabel: {
    fontSize: 10, fontWeight: FONT.bold,
    color: COLORS.textMuted, letterSpacing: 1.2,
    marginBottom: SPACING.sm, paddingLeft: 4,
  },

  /* FAQ card */
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
  faqItem: { paddingHorizontal: SPACING.lg, paddingVertical: 14 },
  faqBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(28,27,24,0.07)',
  },
  faqQ: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  },
  faqQText: {
    flex: 1, fontSize: 14, fontWeight: '600', color: '#1C1B18', lineHeight: 20,
  },
  faqAText: {
    fontSize: 13, color: COLORS.textSecondary, lineHeight: 20,
    marginTop: 10, paddingBottom: 4,
  },

  /* Contact */
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16,
    shadowColor: '#1C1B18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  contactIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(45,106,79,0.1)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: 'rgba(45,106,79,0.2)',
  },
  contactLabel: { fontSize: 13, fontWeight: '600', color: '#1C1B18', marginBottom: 2 },
  contactValue: { fontSize: 12, color: COLORS.textSecondary },

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
});
