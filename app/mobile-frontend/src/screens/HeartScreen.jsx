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
import { useLanguage } from '../context/LanguageContext';
import * as api from '../services/api';

const DEFAULT_VALUES = {
  age: '',
  sex: '1',
  cp: '1',
  trestbps: '',
  chol: '',
  fbs: '0',
  restecg: '0',
  thalach: '',
  exang: '0',
  oldpeak: '0',
  slope: '1',
  ca: '0',
  thal: '3',
};

function stripMarkdown(s) {
  if (typeof s !== 'string') return s;
  return s.replace(/\*\*/g, '');
}

export default function HeartScreen({ navigation }) {
  const { t } = useLanguage();
  const [values, setValues] = useState(DEFAULT_VALUES);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const setVal = (key, v) => setValues((prev) => ({ ...prev, [key]: v }));

  const submit = async () => {
    const required = ['age', 'trestbps', 'chol', 'thalach'];
    for (const k of required) {
      const v = values[k];
      if (v === '' || v == null) {
        Alert.alert(t('common.error') || 'Error', 'Please fill Age, Resting BP, Cholesterol, and Max Heart Rate.');
        return;
      }
    }
    const num = (v, def) => (v === '' || v == null ? def : parseFloat(String(v).replace(',', '.')));
    const int = (v, def) => (v === '' || v == null ? def : parseInt(String(v), 10));
    const payload = {
      age: int(values.age, 0),
      sex: int(values.sex, 1),
      cp: int(values.cp, 1),
      trestbps: int(values.trestbps, 0),
      chol: int(values.chol, 0),
      fbs: int(values.fbs, 0),
      restecg: int(values.restecg, 0),
      thalach: int(values.thalach, 0),
      exang: int(values.exang, 0),
      oldpeak: num(values.oldpeak, 0),
      slope: int(values.slope, 1),
      ca: int(values.ca, 0),
      thal: int(values.thal, 3),
      language: 'english',
    };
    if (payload.age < 1 || payload.trestbps < 80 || payload.chol < 100 || payload.thalach < 60) {
      Alert.alert(t('common.error') || 'Error', 'Please enter valid values (e.g. age ≥1, BP ≥80, chol ≥100, max HR ≥60).');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await api.runHeartAssessment(payload);
      setResult(res);
    } catch (e) {
      Alert.alert(t('common.error') || 'Error', e.message || 'Assessment failed');
    } finally {
      setLoading(false);
    }
  };

  const riskLevel = result?.risk_analysis?.risk_level || 'N/A';
  const probability = result?.risk_analysis?.probability;
  const probPct = probability != null ? (probability * 100).toFixed(1) : '—';
  const executiveSummary = result?.executive_summary || '';
  const keyFactors = result?.risk_analysis?.key_factors || [];
  const recommendations = result?.recommendations?.lifestyle_changes || [];
  const isHigh = String(riskLevel).toLowerCase().includes('high');
  const isMod = String(riskLevel).toLowerCase().includes('moderate');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>AI-Powered Heart Risk</Text>
      </View>
      <Text style={styles.title}>Heart Risk Assessment</Text>
      <Text style={styles.subtitle}>Enter clinical values for heart disease risk (Cleveland-style). Same as web.</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Age *</Text>
        <TextInput style={styles.input} placeholder="e.g. 55" placeholderTextColor="#64748b" value={values.age} onChangeText={(v) => setVal('age', v)} keyboardType="number-pad" />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Sex</Text>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.segButton, values.sex === '0' && styles.segActive]} onPress={() => setVal('sex', '0')}>
            <Text style={[styles.segText, values.sex === '0' && styles.segTextActive]}>Female</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.segButton, values.sex === '1' && styles.segActive]} onPress={() => setVal('sex', '1')}>
            <Text style={[styles.segText, values.sex === '1' && styles.segTextActive]}>Male</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Chest pain type (0-4)</Text>
        <TextInput style={styles.input} placeholder="1" placeholderTextColor="#64748b" value={values.cp} onChangeText={(v) => setVal('cp', v)} keyboardType="number-pad" />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Resting BP (mmHg) *</Text>
        <TextInput style={styles.input} placeholder="e.g. 130" placeholderTextColor="#64748b" value={values.trestbps} onChangeText={(v) => setVal('trestbps', v)} keyboardType="decimal-pad" />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Cholesterol (mg/dL) *</Text>
        <TextInput style={styles.input} placeholder="e.g. 240" placeholderTextColor="#64748b" value={values.chol} onChangeText={(v) => setVal('chol', v)} keyboardType="decimal-pad" />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Fasting blood sugar >120 (0/1)</Text>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.segButton, values.fbs === '0' && styles.segActive]} onPress={() => setVal('fbs', '0')}>
            <Text style={[styles.segText, values.fbs === '0' && styles.segTextActive]}>No</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.segButton, values.fbs === '1' && styles.segActive]} onPress={() => setVal('fbs', '1')}>
            <Text style={[styles.segText, values.fbs === '1' && styles.segTextActive]}>Yes</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Resting ECG (0-2)</Text>
        <TextInput style={styles.input} placeholder="0" placeholderTextColor="#64748b" value={values.restecg} onChangeText={(v) => setVal('restecg', v)} keyboardType="number-pad" />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Max heart rate *</Text>
        <TextInput style={styles.input} placeholder="e.g. 150" placeholderTextColor="#64748b" value={values.thalach} onChangeText={(v) => setVal('thalach', v)} keyboardType="number-pad" />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Exercise angina (0/1)</Text>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.segButton, values.exang === '0' && styles.segActive]} onPress={() => setVal('exang', '0')}>
            <Text style={[styles.segText, values.exang === '0' && styles.segTextActive]}>No</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.segButton, values.exang === '1' && styles.segActive]} onPress={() => setVal('exang', '1')}>
            <Text style={[styles.segText, values.exang === '1' && styles.segTextActive]}>Yes</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>ST depression (oldpeak)</Text>
        <TextInput style={styles.input} placeholder="0" placeholderTextColor="#64748b" value={values.oldpeak} onChangeText={(v) => setVal('oldpeak', v)} keyboardType="decimal-pad" />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Slope (1-3)</Text>
        <TextInput style={styles.input} placeholder="1" placeholderTextColor="#64748b" value={values.slope} onChangeText={(v) => setVal('slope', v)} keyboardType="number-pad" />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Major vessels (0-4)</Text>
        <TextInput style={styles.input} placeholder="0" placeholderTextColor="#64748b" value={values.ca} onChangeText={(v) => setVal('ca', v)} keyboardType="number-pad" />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Thal (3=normal, 6=fixed, 7=reversible)</Text>
        <TextInput style={styles.input} placeholder="3" placeholderTextColor="#64748b" value={values.thal} onChangeText={(v) => setVal('thal', v)} keyboardType="number-pad" />
      </View>

      <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={submit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Run Assessment</Text>}
      </TouchableOpacity>

      {result && (
        <View style={styles.resultSection}>
          <Text style={styles.resultSectionTitle}>Result</Text>
          {executiveSummary ? (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Summary</Text>
              <Text style={styles.cardText}>{stripMarkdown(executiveSummary)}</Text>
            </View>
          ) : null}
          <View style={[styles.riskCard, isHigh && styles.riskHigh, isMod && styles.riskMod]}>
            <Text style={[styles.riskPct, isHigh && styles.riskPctHigh, isMod && styles.riskPctMod]}>{probPct}%</Text>
            <Text style={[styles.riskLevel, isHigh && styles.riskLevelHigh, isMod && styles.riskLevelMod]}>{riskLevel}</Text>
            <Text style={styles.riskLabel}>Probability of heart disease</Text>
          </View>
          {keyFactors.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Key Risk Factors</Text>
              {keyFactors.map((f, i) => (
                <View key={i} style={styles.factorRow}>
                  <View style={[styles.severityBadge, (f.severity || '').toLowerCase().includes('high') && styles.severityHigh, (f.severity || '').toLowerCase().includes('moderate') && styles.severityMod]}>
                    <Text style={styles.severityText}>{f.severity || 'Info'}</Text>
                  </View>
                  <Text style={styles.factorText}>{stripMarkdown(f.factor)}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {recommendations.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Recommendations</Text>
              {recommendations.map((r, i) => (
                <Text key={i} style={styles.cardText}>• {r}</Text>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a12' },
  content: { padding: 24, paddingBottom: 48 },
  badge: { alignSelf: 'flex-start', backgroundColor: 'rgba(236, 72, 153, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 12 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#ec4899', letterSpacing: 0.5 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#cbd5e1', marginBottom: 6 },
  input: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#334155' },
  row: { flexDirection: 'row', gap: 10 },
  segButton: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  segActive: { borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)' },
  segText: { color: '#94a3b8', fontWeight: '500' },
  segTextActive: { color: '#10b981' },
  button: { backgroundColor: '#ec4899', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  resultSection: { marginTop: 32 },
  resultSectionTitle: { fontSize: 20, fontWeight: '700', color: '#ec4899', marginBottom: 16 },
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
