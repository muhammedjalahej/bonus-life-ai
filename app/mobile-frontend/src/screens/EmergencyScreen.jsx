import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const SYMPTOMS_LIST = [
  { id: 'extreme_thirst', critical: false },
  { id: 'frequent_urination', critical: false },
  { id: 'blurred_vision', critical: false },
  { id: 'fatigue', critical: false },
  { id: 'weight_loss', critical: false },
  { id: 'nausea', critical: false },
  { id: 'confusion', critical: true },
  { id: 'breathing', critical: true },
  { id: 'abdominal_pain', critical: false },
  { id: 'fruity_breath', critical: false },
  { id: 'dizziness', critical: false },
  { id: 'rapid_heartbeat', critical: true },
];

export default function EmergencyScreen({ navigation }) {
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const apiLang = language === 'turkish' ? 'turkish' : 'english';

  const [selected, setSelected] = useState([]);
  const [showPersonal, setShowPersonal] = useState(false);
  const [personal, setPersonal] = useState({
    age: '',
    weight: '',
    height: '',
    existingConditions: [],
    currentMedications: [],
    newCondition: '',
    newMedication: '',
  });
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [error, setError] = useState('');

  const toggle = (id) => setSelected((p) => (p.includes(id) ? p.filter((s) => s !== id) : [...p, id]));

  const getLabels = (ids) => ids.map((id) => t(`emergency.symptom_${id}`) || id);

  const isNegative = (v) => v !== '' && !isNaN(parseFloat(v)) && parseFloat(v) < 0;
  const negErr = t('emergency.negativeError');

  const addCondition = () => {
    if (personal.newCondition.trim()) {
      setPersonal((p) => ({
        ...p,
        existingConditions: [...p.existingConditions, p.newCondition.trim()],
        newCondition: '',
      }));
    }
  };
  const removeCondition = (c) => {
    setPersonal((p) => ({ ...p, existingConditions: p.existingConditions.filter((x) => x !== c) }));
  };
  const addMedication = () => {
    if (personal.newMedication.trim()) {
      setPersonal((p) => ({
        ...p,
        currentMedications: [...p.currentMedications, p.newMedication.trim()],
        newMedication: '',
      }));
    }
  };
  const removeMedication = (m) => {
    setPersonal((p) => ({ ...p, currentMedications: p.currentMedications.filter((x) => x !== m) }));
  };

  const assess = async () => {
    if (selected.length === 0) return;
    if (isNegative(personal.age) || isNegative(personal.weight) || isNegative(personal.height)) {
      setError(negErr);
      return;
    }
    setError('');
    setLoading(true);
    setAssessment(null);
    try {
      const labels = getLabels(selected);
      const body = {
        symptoms: labels,
        language: apiLang,
        age: personal.age ? parseInt(personal.age, 10) : null,
        weight: personal.weight ? parseFloat(personal.weight) : null,
        height: personal.height ? parseFloat(personal.height) : null,
        existing_conditions: personal.existingConditions,
        current_medications: personal.currentMedications,
      };
      const res = await api.runEmergencyAssessment(body);
      setAssessment(res);
    } catch (e) {
      const hasCrit = selected.some((s) => ['breathing', 'confusion', 'rapid_heartbeat'].includes(s));
      setAssessment({
        assessment: hasCrit
          ? (apiLang === 'turkish' ? 'ACİL: Hemen tıbbi yardım gerekebilir.' : 'URGENT: Immediate medical attention may be required.')
          : (apiLang === 'turkish' ? `${selected.length} belirti tespit edildi. Yakından izleyin.` : `${selected.length} symptom(s) detected. Monitor closely.`),
        urgency_level: hasCrit ? 'critical' : 'medium',
        recommendations: hasCrit
          ? (apiLang === 'turkish' ? ['Acil bakım arayın', '911/112 arayın', 'Araç kullanmayın'] : ['Seek emergency care', 'Call 911/112', 'Do not drive'])
          : (apiLang === 'turkish' ? ['En kısa sürede doktora gidin', 'Belirtileri izleyin', 'Sıvı tüketin'] : ['See doctor soon', 'Monitor symptoms', 'Stay hydrated']),
        risk_factors: personal.existingConditions?.length ? (apiLang === 'turkish' ? ['Mevcut hastalıklar'] : ['Existing conditions']) : (apiLang === 'turkish' ? ['Birden fazla belirti'] : ['Multiple symptoms']),
        next_steps: hasCrit ? (apiLang === 'turkish' ? ['Hemen acili arayın'] : ['Call emergency now']) : (apiLang === 'turkish' ? ['İzleyin', '24 saat içinde kontrol'] : ['Monitor', 'Follow up in 24h']),
      });
    } finally {
      setLoading(false);
    }
  };

  const urgencyMap = {
    critical: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.3)', badge: 'rgba(239,68,68,0.2)', titleKey: 'criticalTitle' },
    high: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.3)', badge: 'rgba(239,68,68,0.2)', titleKey: 'highTitle' },
    medium: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)', badge: 'rgba(245,158,11,0.2)', titleKey: 'mediumTitle' },
    low: { bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.3)', badge: 'rgba(6,182,212,0.2)', titleKey: 'lowTitle' },
  };

  const hasCriticalSelected = selected.some((id) => SYMPTOMS_LIST.find((s) => s.id === id)?.critical);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.badge}>{t('emergency.badge')}</Text>
      <Text style={styles.title}>{t('emergency.title')}</Text>
      <Text style={styles.subtitle}>{t('emergency.subtitle')}</Text>

      <View style={styles.warningBox}>
        <Ionicons name="warning-outline" size={20} color="#f59e0b" />
        <Text style={styles.warningText}>{t('emergency.warning')}</Text>
      </View>

      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

      <Text style={styles.sectionTitle}>{t('emergency.selectSymptoms')}</Text>
      <View style={styles.symptomsGrid}>
        {SYMPTOMS_LIST.map((s) => {
          const on = selected.includes(s.id);
          return (
            <TouchableOpacity
              key={s.id}
              style={[
                styles.symptomChip,
                on && (s.critical ? styles.symptomChipCritical : styles.symptomChipSelected),
              ]}
              onPress={() => toggle(s.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.symptomChipText, on && (s.critical ? styles.symptomChipTextCritical : styles.symptomChipTextSelected)]} numberOfLines={2}>
                {t(`emergency.symptom_${s.id}`)}
              </Text>
              {s.critical ? <View style={styles.criticalDot} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>
      {selected.length > 0 && (
        <View style={styles.selectedRow}>
          <Text style={[styles.selectedBadge, hasCriticalSelected && styles.selectedBadgeCritical]}>
            {selected.length} {t('emergency.selected')}
          </Text>
          {hasCriticalSelected && <Text style={styles.criticalDetected}>{t('emergency.criticalDetected')}</Text>}
        </View>
      )}

      <TouchableOpacity style={styles.personalHeader} onPress={() => setShowPersonal(!showPersonal)} activeOpacity={0.8}>
        <Text style={styles.personalHeaderText}>{t('emergency.personalInfo')} <Text style={styles.optional}>{t('emergency.optional')}</Text></Text>
        <Ionicons name={showPersonal ? 'chevron-up' : 'chevron-down'} size={20} color="#8b949e" />
      </TouchableOpacity>
      {showPersonal && (
        <View style={styles.personalBox}>
          <View style={styles.row3}>
            <View style={styles.third}>
              <Text style={styles.label}>{t('emergency.age')}</Text>
              <TextInput
                style={styles.input}
                value={personal.age}
                onChangeText={(v) => setPersonal((p) => ({ ...p, age: v }))}
                placeholder="—"
                placeholderTextColor="#64748b"
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.third}>
              <Text style={styles.label}>{t('emergency.weight')}</Text>
              <TextInput
                style={styles.input}
                value={personal.weight}
                onChangeText={(v) => setPersonal((p) => ({ ...p, weight: v }))}
                placeholder="—"
                placeholderTextColor="#64748b"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.third}>
              <Text style={styles.label}>{t('emergency.height')}</Text>
              <TextInput
                style={styles.input}
                value={personal.height}
                onChangeText={(v) => setPersonal((p) => ({ ...p, height: v }))}
                placeholder="—"
                placeholderTextColor="#64748b"
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <Text style={styles.label}>{t('emergency.healthConditions')}</Text>
          <View style={styles.tagRow}>
            {personal.existingConditions.map((c, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{c}</Text>
                <TouchableOpacity onPress={() => removeCondition(c)} hitSlop={8}><Ionicons name="close" size={14} color="#94a3b8" /></TouchableOpacity>
              </View>
            ))}
          </View>
          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, styles.flex1]}
              value={personal.newCondition}
              onChangeText={(v) => setPersonal((p) => ({ ...p, newCondition: v }))}
              placeholder={t('emergency.addCondition')}
              placeholderTextColor="#64748b"
            />
            <TouchableOpacity style={styles.addBtn} onPress={addCondition}><Ionicons name="add" size={20} color="#e6edf3" /></TouchableOpacity>
          </View>
          <Text style={[styles.label, styles.labelTop]}>{t('emergency.medications')}</Text>
          <View style={styles.tagRow}>
            {personal.currentMedications.map((m, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{m}</Text>
                <TouchableOpacity onPress={() => removeMedication(m)} hitSlop={8}><Ionicons name="close" size={14} color="#94a3b8" /></TouchableOpacity>
              </View>
            ))}
          </View>
          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, styles.flex1]}
              value={personal.newMedication}
              onChangeText={(v) => setPersonal((p) => ({ ...p, newMedication: v }))}
              placeholder={t('emergency.addMedication')}
              placeholderTextColor="#64748b"
            />
            <TouchableOpacity style={styles.addBtn} onPress={addMedication}><Ionicons name="add" size={20} color="#e6edf3" /></TouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, (loading || selected.length === 0) && styles.buttonDisabled]}
        onPress={assess}
        disabled={loading || selected.length === 0}
        activeOpacity={0.8}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('emergency.getAssessment')}</Text>}
      </TouchableOpacity>
      {loading && <Text style={styles.assessingText}>{t('emergency.assessing')}</Text>}

      {assessment && (() => {
        const u = urgencyMap[assessment.urgency_level] || urgencyMap.low;
        const title = t(`emergency.${u.titleKey}`);
        return (
          <View style={[styles.result, { backgroundColor: u.bg, borderColor: u.border }]}>
            <View style={[styles.resultBadge, { backgroundColor: u.badge }]}>
              <Ionicons name="warning" size={24} color={['critical', 'high'].includes(assessment.urgency_level) ? '#f87171' : assessment.urgency_level === 'low' ? '#06b6d4' : '#f59e0b'} />
              <Text style={styles.resultTitle}>{title}</Text>
            </View>
            <Text style={styles.resultAssessment}>{assessment.assessment}</Text>
            {assessment.personalized_analysis ? <Text style={styles.resultText}>{assessment.personalized_analysis}</Text> : null}
            {assessment.risk_factors?.length > 0 && (
              <View style={styles.resultSection}>
                <Text style={styles.resultSectionTitle}>{t('emergency.riskFactors')}</Text>
                {assessment.risk_factors.map((f, i) => (
                  <Text key={i} style={styles.bullet}>• {f}</Text>
                ))}
              </View>
            )}
            {assessment.recommendations?.length > 0 && (
              <View style={styles.resultSection}>
                <Text style={styles.resultSectionTitle}>{t('emergency.recommendations')}</Text>
                {assessment.recommendations.map((r, i) => (
                  <Text key={i} style={styles.bullet}>• {r}</Text>
                ))}
              </View>
            )}
            {assessment.next_steps?.length > 0 && (
              <View style={styles.resultSection}>
                <Text style={styles.resultSectionTitle}>{t('emergency.nextSteps')}</Text>
                {assessment.next_steps.map((s, i) => (
                  <Text key={i} style={styles.bullet}>• {s}</Text>
                ))}
              </View>
            )}
            {['critical', 'high'].includes(assessment.urgency_level) && (
              <View style={styles.urgentBox}>
                <Text style={styles.urgentText}>{t('emergency.callNow')}</Text>
                <TouchableOpacity style={styles.hospitalsBtn} onPress={() => navigation.navigate('Hospitals')} activeOpacity={0.8}>
                  <Ionicons name="location-outline" size={18} color="#10b981" />
                  <Text style={styles.hospitalsBtnText}>{t('emergency.findHospitals')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1419' },
  content: { paddingHorizontal: 20 },
  badge: { fontSize: 11, fontWeight: '700', color: '#f87171', letterSpacing: 1, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '700', color: '#e6edf3', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#8b949e', marginBottom: 16 },
  warningBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)' },
  warningText: { flex: 1, fontSize: 13, color: '#fcd34d' },
  errorBox: { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  errorText: { color: '#f87171', fontSize: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#e6edf3', marginBottom: 10 },
  symptomsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  symptomChip: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', minWidth: '47%' },
  symptomChipSelected: { borderColor: 'rgba(16,185,129,0.4)', backgroundColor: 'rgba(16,185,129,0.1)' },
  symptomChipCritical: { borderColor: 'rgba(239,68,68,0.4)', backgroundColor: 'rgba(239,68,68,0.1)' },
  symptomChipText: { fontSize: 13, color: '#94a3b8' },
  symptomChipTextSelected: { color: '#10b981' },
  symptomChipTextCritical: { color: '#f87171' },
  criticalDot: { position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: 3, backgroundColor: '#f87171' },
  selectedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  selectedBadge: { fontSize: 12, color: '#10b981', fontWeight: '600' },
  selectedBadgeCritical: { color: '#f87171' },
  criticalDetected: { fontSize: 12, color: '#f87171', fontWeight: '600' },
  personalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  personalHeaderText: { fontSize: 16, fontWeight: '600', color: '#e6edf3' },
  optional: { fontSize: 13, fontWeight: '400', color: '#8b949e' },
  personalBox: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  row3: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  third: { flex: 1 },
  label: { fontSize: 12, color: '#8b949e', marginBottom: 6 },
  labelTop: { marginTop: 8 },
  input: { backgroundColor: '#1e293b', borderRadius: 10, padding: 12, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  flex1: { flex: 1 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16,185,129,0.15)', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  tagText: { fontSize: 13, color: '#10b981' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addBtn: { padding: 10 },
  button: { backgroundColor: '#dc2626', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8, minHeight: 52, justifyContent: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  assessingText: { textAlign: 'center', color: '#8b949e', fontSize: 13, marginTop: 8 },
  result: { marginTop: 24, borderRadius: 16, padding: 20, borderWidth: 2 },
  resultBadge: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, marginBottom: 16 },
  resultTitle: { fontSize: 18, fontWeight: '800', color: '#e6edf3' },
  resultAssessment: { fontSize: 15, color: '#e6edf3', lineHeight: 22, marginBottom: 12 },
  resultText: { fontSize: 14, color: '#94a3b8', lineHeight: 21, marginBottom: 12 },
  resultSection: { marginBottom: 14 },
  resultSectionTitle: { fontSize: 14, fontWeight: '600', color: '#e6edf3', marginBottom: 6 },
  bullet: { fontSize: 14, color: '#94a3b8', marginLeft: 8, marginBottom: 4 },
  urgentBox: { marginTop: 16, backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  urgentText: { fontSize: 14, color: '#fca5a5', fontWeight: '700', marginBottom: 12 },
  hospitalsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  hospitalsBtnText: { fontSize: 14, color: '#10b981', fontWeight: '600' },
});
