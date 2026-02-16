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
import * as api from '../services/api';

const FIELDS = [
  { key: 'glucose', label: 'Glucose (mg/dL)', hint: 'Fasting blood sugar', placeholder: 'e.g. 120', type: 'decimal-pad' },
  { key: 'blood_pressure', label: 'Blood Pressure (mmHg)', hint: 'Systolic', placeholder: 'e.g. 70', type: 'decimal-pad' },
  { key: 'weight', label: 'Weight (kg)', hint: 'Required', placeholder: 'e.g. 70', type: 'decimal-pad' },
  { key: 'height', label: 'Height (cm)', hint: 'Required', placeholder: 'e.g. 170', type: 'decimal-pad' },
  { key: 'age', label: 'Age', hint: 'Required', placeholder: 'e.g. 35', type: 'number-pad' },
  { key: 'pregnancies', label: 'Number of Pregnancies', hint: 'Enter 0 if not applicable', placeholder: '0', type: 'number-pad' },
  { key: 'skin_thickness', label: 'Skin Thickness (mm)', hint: 'Triceps skinfold', placeholder: '20', type: 'decimal-pad' },
  { key: 'insulin', label: 'Insulin (mu U/ml)', hint: '2-Hour serum', placeholder: '80', type: 'decimal-pad' },
  { key: 'diabetes_pedigree_function', label: 'Diabetes Pedigree Function', hint: 'Family history score (0.0 - 2.5)', placeholder: '0.5', type: 'decimal-pad' },
];

const DEFAULT_VALUES = {
  glucose: '',
  blood_pressure: '',
  weight: '',
  height: '',
  age: '',
  pregnancies: '0',
  skin_thickness: '20',
  insulin: '80',
  diabetes_pedigree_function: '0.5',
};

export default function AssessmentScreen({ navigation }) {
  const [values, setValues] = useState(DEFAULT_VALUES);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const setVal = (key, v) => setValues((prev) => ({ ...prev, [key]: v }));

  const submit = async () => {
    const required = ['glucose', 'blood_pressure', 'weight', 'height', 'age'];
    for (const k of required) {
      const v = values[k];
      if (v === '' || v == null) {
        Alert.alert('Missing fields', 'Please fill Glucose, Blood Pressure, Weight, Height, and Age.');
        return;
      }
    }
    const num = (v, def) => (v === '' || v == null ? def : parseFloat(String(v).replace(',', '.')));
    const int = (v, def) => (v === '' || v == null ? def : parseInt(String(v), 10));
    const payload = {
      glucose: num(values.glucose, 0),
      blood_pressure: num(values.blood_pressure, 0),
      weight: num(values.weight, 0),
      height: num(values.height, 0),
      age: int(values.age, 0),
      pregnancies: int(values.pregnancies, 0),
      skin_thickness: num(values.skin_thickness, 20),
      insulin: num(values.insulin, 80),
      diabetes_pedigree_function: num(values.diabetes_pedigree_function, 0.5),
      language: 'english',
    };
    if (payload.glucose <= 0 || payload.blood_pressure <= 0 || payload.weight <= 0 || payload.height <= 0 || payload.age <= 0) {
      Alert.alert('Invalid values', 'Please enter positive numbers for required fields.');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await api.runDiabetesAssessment(payload);
      setResult(res);
    } catch (e) {
      Alert.alert('Error', e.message || 'Assessment failed');
    } finally {
      setLoading(false);
    }
  };

  const riskLevel = result?.risk_analysis?.risk_level || result?.risk_level || 'N/A';
  const probability = result?.risk_analysis?.probability != null
    ? result.risk_analysis.probability
    : result?.probability;
  const probPct = probability != null ? (probability * 100).toFixed(1) : '—';
  const executiveSummary = result?.executive_summary || '';
  const keyFactors = result?.risk_analysis?.key_factors || result?.key_factors || [];
  const healthMetrics = result?.health_metrics || {};
  const isHigh = String(riskLevel).toLowerCase().includes('high');
  const isMod = String(riskLevel).toLowerCase().includes('moderate');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>AI-Powered Analysis</Text>
      </View>
      <Text style={styles.title}>Risk Assessment</Text>
      <Text style={styles.subtitle}>Enter your health metrics for an AI-driven diabetes risk analysis. Same as web.</Text>

      {FIELDS.map(({ key, label, hint, placeholder, type }) => (
        <View key={key} style={styles.field}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor="#64748b"
            value={values[key]}
            onChangeText={(v) => setVal(key, v)}
            keyboardType={type}
          />
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
      ))}

      <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={submit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Run Assessment</Text>}
      </TouchableOpacity>

      {result && (
        <View style={styles.resultSection}>
          <Text style={styles.savedHint}>Saved to your account. View in My Assessments.</Text>
          <Text style={styles.resultSectionTitle}>Result</Text>

          {executiveSummary ? (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Executive Summary</Text>
              <Text style={styles.cardText}>{executiveSummary}</Text>
            </View>
          ) : null}

          <View style={[styles.riskCard, isHigh && styles.riskHigh, isMod && styles.riskMod]}>
            <Text style={[styles.riskPct, isHigh && styles.riskPctHigh, isMod && styles.riskPctMod]}>{probPct}%</Text>
            <Text style={[styles.riskLevel, isHigh && styles.riskLevelHigh, isMod && styles.riskLevelMod]}>{riskLevel}</Text>
            <Text style={styles.riskLabel}>Probability of developing type 2 diabetes</Text>
          </View>

          {keyFactors.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Key Risk Factors</Text>
              {keyFactors.map((f, i) => (
                <View key={i} style={styles.factorRow}>
                  <View style={[styles.severityBadge, (f.severity || '').toLowerCase().includes('high') && styles.severityHigh, (f.severity || '').toLowerCase().includes('moderate') && styles.severityMod]}>
                    <Text style={styles.severityText}>{f.severity || 'Info'}</Text>
                  </View>
                  <Text style={styles.factorText}>{f.factor}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {(healthMetrics.bmi != null || healthMetrics.health_score != null) && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Health Metrics</Text>
              {healthMetrics.bmi != null && <Text style={styles.cardText}>BMI: {healthMetrics.bmi} {healthMetrics.bmi_category ? `(${healthMetrics.bmi_category})` : ''}</Text>}
              {healthMetrics.metabolic_age != null && <Text style={styles.cardText}>Metabolic age: {healthMetrics.metabolic_age} years</Text>}
              {healthMetrics.health_score != null && <Text style={styles.cardText}>Health score: {healthMetrics.health_score}</Text>}
            </View>
          )}
          <TouchableOpacity style={styles.viewAssessmentsBtn} onPress={() => navigation.navigate('Dashboard')}>
            <Text style={styles.viewAssessmentsText}>View My Assessments</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a12' },
  content: { padding: 24, paddingBottom: 48 },
  badge: { alignSelf: 'flex-start', backgroundColor: 'rgba(59, 130, 246, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 12 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#60a5fa', letterSpacing: 0.5 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#cbd5e1', marginBottom: 6 },
  input: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#334155' },
  hint: { fontSize: 12, color: '#64748b', marginTop: 4 },
  button: { backgroundColor: '#10b981', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  resultSection: { marginTop: 32 },
  savedHint: { fontSize: 13, color: '#10b981', marginBottom: 12 },
  resultSectionTitle: { fontSize: 20, fontWeight: '700', color: '#10b981', marginBottom: 16 },
  viewAssessmentsBtn: { marginTop: 16, paddingVertical: 12, alignItems: 'center', borderRadius: 12, backgroundColor: 'rgba(16,185,129,0.15)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  viewAssessmentsText: { color: '#10b981', fontSize: 15, fontWeight: '600' },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  cardLabel: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 10 },
  cardText: { fontSize: 14, color: '#94a3b8', lineHeight: 22 },
  riskCard: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 2, borderColor: 'rgba(16, 185, 129, 0.3)' },
  riskHigh: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' },
  riskMod: { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' },
  riskPct: { fontSize: 36, fontWeight: '800', color: '#10b981' },
  riskPctHigh: { color: '#ef4444' },
  riskPctMod: { color: '#f59e0b' },
  riskLevel: { fontSize: 18, fontWeight: '700', color: '#10b981', marginTop: 4 },
  riskLevelHigh: { color: '#ef4444' },
  riskLevelMod: { color: '#f59e0b' },
  riskLabel: { fontSize: 12, color: '#64748b', marginTop: 6 },
  factorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  severityBadge: { backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  severityHigh: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
  severityMod: { backgroundColor: 'rgba(245, 158, 11, 0.2)' },
  severityText: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  factorText: { flex: 1, fontSize: 14, color: '#e2e8f0' },
});
