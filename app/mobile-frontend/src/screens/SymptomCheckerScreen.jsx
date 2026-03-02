import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const FIELD_YES_NO = ['fever', 'cough', 'fatigue', 'difficultyBreathing'];
const FIELD_PROFILE = ['age', 'gender', 'bloodPressure', 'cholesterol'];

export default function SymptomCheckerScreen({ navigation }) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState({
    fever: '',
    cough: '',
    fatigue: '',
    difficultyBreathing: '',
    age: '',
    gender: '',
    bloodPressure: '',
    cholesterol: '',
  });
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const submit = async () => {
    const { fever, cough, fatigue, difficultyBreathing, age, gender, bloodPressure, cholesterol } = form;
    if ([fever, cough, fatigue, difficultyBreathing, age, gender, bloodPressure, cholesterol].some((v) => v === '')) {
      setError(t('symptomChecker.fillAll'));
      return;
    }
    setError('');
    setPredictions(null);
    setLoading(true);
    try {
      const result = await api.symptomCheckerPredict({
        fever: parseInt(fever, 10),
        cough: parseInt(cough, 10),
        fatigue: parseInt(fatigue, 10),
        difficultyBreathing: parseInt(difficultyBreathing, 10),
        age: parseFloat(age),
        gender: parseInt(gender, 10),
        bloodPressure: parseInt(bloodPressure, 10),
        cholesterol: parseInt(cholesterol, 10),
      });
      setPredictions(result.predictions || []);
    } catch (err) {
      setError(err?.message || t('symptomChecker.errorGeneric'));
      setPredictions(null);
    } finally {
      setLoading(false);
    }
  };

  const renderChoice = (key, options) => (
    <View style={styles.choiceRow} key={key}>
      <Text style={styles.label}>{t(`symptomChecker.${key}`)}</Text>
      <View style={styles.optionRow}>
        {options.map(({ value, labelKey }) => (
          <TouchableOpacity
            key={value}
            style={[styles.optionBtn, form[key] === value && styles.optionBtnSelected]}
            onPress={() => set(key, value)}
            activeOpacity={0.8}
          >
            <Text style={[styles.optionText, form[key] === value && styles.optionTextSelected]}>{t(labelKey)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.badge}>{t('symptomChecker.badge')}</Text>
      <Text style={styles.title}>{t('symptomChecker.title')}</Text>
      <Text style={styles.subtitle}>{t('symptomChecker.subtitle')}</Text>

      <View style={styles.warningBox}>
        <Ionicons name="warning-outline" size={20} color="#f87171" />
        <Text style={styles.warningText}>{t('symptomChecker.warning')}</Text>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>{t('symptomChecker.symptomsSection')}</Text>
      {FIELD_YES_NO.map((f) => renderChoice(f, [{ value: '1', labelKey: 'symptomChecker.yes' }, { value: '0', labelKey: 'symptomChecker.no' }]))}

      <Text style={[styles.sectionTitle, styles.sectionTitleTop]}>{t('symptomChecker.profileSection')}</Text>
      <View style={styles.row3}>
        <View style={styles.third}>
          <Text style={styles.label}>{t('symptomChecker.age')}</Text>
          <TextInput
            style={styles.input}
            value={form.age}
            onChangeText={(v) => set('age', v)}
            placeholder="e.g. 35"
            placeholderTextColor="#64748b"
            keyboardType="number-pad"
          />
        </View>
      </View>
      {renderChoice('gender', [{ value: '1', labelKey: 'symptomChecker.male' }, { value: '0', labelKey: 'symptomChecker.female' }])}
      {renderChoice('bloodPressure', [{ value: '1', labelKey: 'symptomChecker.high' }, { value: '0', labelKey: 'symptomChecker.normal' }])}
      {renderChoice('cholesterol', [{ value: '1', labelKey: 'symptomChecker.high' }, { value: '0', labelKey: 'symptomChecker.normal' }])}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={submit}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('symptomChecker.getPrediction')}</Text>}
      </TouchableOpacity>

      {predictions && predictions.length > 0 && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>{t('symptomChecker.results')}</Text>
          {predictions.map((p, i) => {
            const examples = p.disease_examples ?? p.diseaseExamples ?? [];
            const list = Array.isArray(examples) ? examples : [];
            return (
              <View key={i} style={styles.predRow}>
                <Text style={styles.predName}>{p.disease}</Text>
                <View style={styles.progressWrap}>
                  <View style={[styles.progressBar, { width: `${Math.round((p.probability || 0) * 100)}%` }]} />
                </View>
                <Text style={styles.predPct}>{(p.probability * 100).toFixed(1)}%</Text>
                {list.length > 0 && (
                  <Text style={styles.predExamples}>{t('symptomChecker.possibleConditions')}: {list.join(', ')}</Text>
                )}
              </View>
            );
          })}
          <Text style={styles.resultWarning}>{t('symptomChecker.warning')}</Text>
          <TouchableOpacity style={styles.hospitalsBtn} onPress={() => navigation.navigate('Hospitals')} activeOpacity={0.8}>
            <Ionicons name="location-outline" size={18} color="#10b981" />
            <Text style={styles.hospitalsBtnText}>{t('symptomChecker.findHospitals')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1419' },
  content: { paddingHorizontal: 20 },
  badge: { fontSize: 11, fontWeight: '700', color: '#10b981', letterSpacing: 1, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '700', color: '#e6edf3', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#8b949e', marginBottom: 16 },
  warningBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)' },
  warningText: { flex: 1, fontSize: 13, color: '#fca5a5' },
  errorBox: { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  errorText: { color: '#f87171', fontSize: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#e6edf3', marginBottom: 10 },
  sectionTitleTop: { marginTop: 20 },
  choiceRow: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', color: '#8b949e', marginBottom: 6 },
  optionRow: { flexDirection: 'row', gap: 10 },
  optionBtn: { flex: 1, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center' },
  optionBtnSelected: { borderColor: 'rgba(16,185,129,0.4)', backgroundColor: 'rgba(16,185,129,0.1)' },
  optionText: { fontSize: 14, color: '#94a3b8' },
  optionTextSelected: { color: '#10b981', fontWeight: '600' },
  row3: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  third: { flex: 1 },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: '#e6edf3', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  button: { backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  resultCard: { marginTop: 24, backgroundColor: 'rgba(16,185,129,0.06)', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' },
  resultTitle: { fontSize: 16, fontWeight: '700', color: '#10b981', marginBottom: 16 },
  predRow: { marginBottom: 16 },
  predName: { fontSize: 15, fontWeight: '600', color: '#e6edf3', marginBottom: 4 },
  progressWrap: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressBar: { height: '100%', backgroundColor: '#10b981', borderRadius: 3 },
  predPct: { fontSize: 13, color: '#10b981', fontWeight: '600', marginBottom: 4 },
  predExamples: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  resultWarning: { fontSize: 12, color: '#64748b', marginTop: 8, marginBottom: 12 },
  hospitalsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  hospitalsBtnText: { fontSize: 14, fontWeight: '600', color: '#10b981' },
});
