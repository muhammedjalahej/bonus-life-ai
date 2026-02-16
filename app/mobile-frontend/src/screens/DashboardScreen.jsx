import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { SkeletonCard } from '../components/Skeleton';
import * as api from '../services/api';

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState([]);

  const toggleCompare = (id) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const comparedAssessments = compareIds
    .map((id) => assessments.find((a) => a.id === id))
    .filter(Boolean);

  const load = async () => {
    try {
      const raw = await api.getMyAssessments(20);
      const list = Array.isArray(raw) ? raw : (raw?.assessments ?? []);
      setAssessments(list);
    } catch {
      setAssessments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const showError = (title, message) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.alert) {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const downloadPdfOnWeb = (pdfBytes, fileName) => {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

  const buildPdfWithJspdf = async (assessment, fileName, signResult = null) => {
    const jspdfMod = await import('jspdf');
    const JSPDF = jspdfMod.default || jspdfMod.jsPDF || jspdfMod;
    if (typeof JSPDF !== 'function') throw new Error('jspdf did not load.');
    const doc = new JSPDF();
    const date = assessment.created_at ? new Date(assessment.created_at).toLocaleString() : 'N/A';
    const patient = user?.full_name || user?.email || 'N/A';
    const riskLine = `Risk Level: ${assessment.risk_level || 'Unknown'}  |  Probability: ${((assessment.probability || 0) * 100).toFixed(1)}%`;
    const summary = (assessment.executive_summary || 'No summary available.').slice(0, 800);
    let y = 20;
    doc.setFontSize(16);
    doc.setTextColor(0, 120, 80);
    doc.text('Diabetes Risk Assessment Report', 20, y);
    y += 10;
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(`Date: ${date}`, 20, y); y += 7;
    doc.text(`Patient: ${patient}`, 20, y); y += 7;
    doc.text(riskLine, 20, y); y += 10;
    doc.setFont(undefined, 'bold');
    doc.text('Summary:', 20, y); y += 6;
    doc.setFont(undefined, 'normal');
    const lines = doc.splitTextToSize(summary, 170);
    doc.text(lines, 20, y);
    y += lines.length * 5 + 15;
    if (signResult) {
      try {
        const QRCode = (await import('qrcode')).default;
        const qrPayload = JSON.stringify({
          report_id: signResult.report_id,
          issued_at: signResult.issued_at,
          assessment_db_id: signResult.assessment_db_id,
          payload_hash: signResult.payload_hash,
          signature_b64: signResult.signature_b64,
          alg: signResult.alg || 'ES256',
        });
        const qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 120, margin: 1 });
        doc.addImage(qrDataUrl, 'PNG', 20, y, 40, 40);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('Scan QR to verify signature', 20, y + 44);
      } catch (_) {}
    }
    const blob = doc.output('arraybuffer');
    downloadPdfOnWeb(new Uint8Array(blob), fileName);
  };

  const exportSignedAssessmentPDF = async (assessment) => {
    const aid = assessment.id;
    setPdfLoading(aid);
    try {
      if (isBrowser) {
        let signResult = null;
        try {
          signResult = await api.signAssessmentReport(aid);
        } catch (_) {}
        const fileName = `assessment-${aid}-${signResult ? 'signed' : 'report'}.pdf`;
        await buildPdfWithJspdf(assessment, fileName, signResult);
        return;
      }
      const FileSystem = await import('expo-file-system').then((m) => m.default);
      const Sharing = await import('expo-sharing').then((m) => m.default);
      let signResult = null;
      try {
        signResult = await api.signAssessmentReport(aid);
      } catch (_) {}
      const jspdfMod = await import('jspdf');
      const JSPDF = jspdfMod.default || jspdfMod.jsPDF || jspdfMod;
      if (typeof JSPDF !== 'function') throw new Error('jspdf did not load.');
      const doc = new JSPDF();
      const date = assessment.created_at ? new Date(assessment.created_at).toLocaleString() : 'N/A';
      const patient = user?.full_name || user?.email || 'N/A';
      const riskLine = `Risk Level: ${assessment.risk_level || 'Unknown'}  |  ${((assessment.probability || 0) * 100).toFixed(1)}%`;
      const summary = (assessment.executive_summary || 'No summary available.').slice(0, 800);
      let y = 20;
      doc.setFontSize(16);
      doc.setTextColor(0, 120, 80);
      doc.text('Diabetes Risk Assessment Report', 20, y);
      y += 10;
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(`Date: ${date}`, 20, y); y += 7;
      doc.text(`Patient: ${patient}`, 20, y); y += 7;
      doc.text(riskLine, 20, y); y += 10;
      doc.setFont(undefined, 'bold');
      doc.text('Summary:', 20, y); y += 6;
      doc.setFont(undefined, 'normal');
      const lines = doc.splitTextToSize(summary, 170);
      doc.text(lines, 20, y);
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const path = `${FileSystem.cacheDirectory}assessment-${aid}-report.pdf`;
      await FileSystem.writeAsStringAsync(path, pdfBase64, { encoding: FileSystem.EncodingType.Base64 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: 'application/pdf', dialogTitle: 'Save assessment PDF' });
      } else {
        showError('Sharing not available', 'Cannot save PDF on this device.');
      }
    } catch (err) {
      const msg = err?.message || String(err);
      if (isBrowser) console.error('PDF export error', err);
      showError('PDF failed', msg || 'Could not create PDF.');
    } finally {
      setPdfLoading(null);
    }
  };

  if (loading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.skeletonContent}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
  }

  const renderComparePanel = () => {
    if (!compareMode || compareIds.length < 2 || comparedAssessments.length < 2) return null;
    const [a0, a1] = comparedAssessments;
    const diff = (a1.probability ?? 0) - (a0.probability ?? 0);
    const improved = diff < 0;
    const pct = (Math.abs(diff) * 100).toFixed(1);
    const diffText =
      diff === 0
        ? t('dashboard.noChange')
        : improved
          ? t('dashboard.riskDecreased', { pct })
          : t('dashboard.riskIncreased', { pct });
    return (
      <View style={styles.comparePanel}>
        <Text style={styles.comparePanelTitle}>{t('dashboard.comparison')}</Text>
        <View style={styles.compareRow}>
          <View style={styles.compareHalf}>
            <Text style={styles.compareDate}>{a0.created_at ? new Date(a0.created_at).toLocaleDateString() : 'N/A'}</Text>
            <Text style={styles.compareRisk}>{a0.risk_level} · {((a0.probability ?? 0) * 100).toFixed(1)}%</Text>
            <Text style={styles.compareSummary} numberOfLines={2}>{a0.executive_summary || '—'}</Text>
          </View>
          <View style={styles.compareHalf}>
            <Text style={styles.compareDate}>{a1.created_at ? new Date(a1.created_at).toLocaleDateString() : 'N/A'}</Text>
            <Text style={styles.compareRisk}>{a1.risk_level} · {((a1.probability ?? 0) * 100).toFixed(1)}%</Text>
            <Text style={styles.compareSummary} numberOfLines={2}>{a1.executive_summary || '—'}</Text>
          </View>
        </View>
        <View style={[styles.compareDiff, improved && styles.compareDiffImproved, diff > 0 && !improved && styles.compareDiffWorse]}>
          <Text style={[styles.compareDiffText, improved && styles.compareDiffTextGreen, diff > 0 && !improved && styles.compareDiffTextRed]}>{diffText}</Text>
        </View>
      </View>
    );
  };

  const renderCompareHint = () => {
    if (!compareMode || compareIds.length >= 2) return null;
    return (
      <View style={styles.compareHint}>
        <Text style={styles.compareHintText}>{t('dashboard.selectTwoToCompare')}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>{t('nav.myAssessments')}</Text>
          <Text style={styles.subtitle}>
            {user?.email} · {t('dashboard.assessmentCount', { count: assessments.length })}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.compareToggle, compareMode && styles.compareToggleActive]}
          onPress={() => { setCompareMode((m) => !m); setCompareIds([]); }}
          activeOpacity={0.8}
        >
          <Text style={[styles.compareToggleText, compareMode && styles.compareToggleTextActive]}>{t('dashboard.compare')}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={assessments}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          <>
            {renderComparePanel()}
            {renderCompareHint()}
          </>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, compareMode && compareIds.includes(item.id) && styles.cardSelected]}>
            <View style={styles.cardRow}>
              {compareMode && (
                <TouchableOpacity
                  style={[styles.compareCheck, compareIds.includes(item.id) && styles.compareCheckSelected]}
                  onPress={() => toggleCompare(item.id)}
                  activeOpacity={0.8}
                >
                  {compareIds.includes(item.id) && <Text style={styles.compareCheckMark}>✓</Text>}
                </TouchableOpacity>
              )}
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>
                  {item.risk_level || 'N/A'} · {item.probability != null ? `${(item.probability * 100).toFixed(0)}%` : '—'}
                </Text>
                {item.created_at && (
                  <Text style={styles.cardDate}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                )}
              </View>
              <Pressable
                style={({ pressed }) => [styles.pdfBtn, (pressed || pdfLoading === item.id) && styles.pdfBtnDisabled]}
                onPress={() => {
                  if (pdfLoading === item.id) return;
                  exportSignedAssessmentPDF(item);
                }}
                disabled={pdfLoading === item.id}
                android_ripple={null}
                accessibilityRole="button"
                accessibilityLabel="Download PDF"
              >
                {pdfLoading === item.id ? (
                  <ActivityIndicator size="small" color="#10b981" />
                ) : (
                  <Text style={styles.pdfBtnText}>PDF</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>{t('common.noAssessments')}</Text>
        }
      />
      <TouchableOpacity
        style={styles.back}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backText}>Back to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a12',
    padding: 24,
    paddingTop: 60,
  },
  centered: {
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
  compareToggle: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  compareToggleActive: {
    backgroundColor: 'rgba(16,185,129,0.2)',
    borderColor: 'rgba(16,185,129,0.4)',
  },
  compareToggleText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  compareToggleTextActive: { color: '#10b981' },
  comparePanel: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
  },
  comparePanelTitle: { fontSize: 13, fontWeight: '600', color: '#10b981', marginBottom: 10 },
  compareRow: { flexDirection: 'row', gap: 12 },
  compareHalf: { flex: 1 },
  compareDate: { fontSize: 11, color: '#8b949e', marginBottom: 4 },
  compareRisk: { fontSize: 14, fontWeight: '600', color: '#e6edf3', marginBottom: 4 },
  compareSummary: { fontSize: 12, color: '#94a3b8', lineHeight: 18 },
  compareDiff: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  compareDiffImproved: { backgroundColor: 'rgba(16,185,129,0.15)' },
  compareDiffWorse: { backgroundColor: 'rgba(239,68,68,0.15)' },
  compareDiffText: { fontSize: 14, color: '#e6edf3', fontWeight: '600', textAlign: 'center' },
  compareDiffTextGreen: { color: '#10b981' },
  compareDiffTextRed: { color: '#f87171' },
  compareHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
  },
  compareHintText: { fontSize: 13, color: '#fcd34d', flex: 1 },
  list: {
    paddingBottom: 24,
  },
  skeletonContent: {
    padding: 20,
    paddingTop: 24,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardSelected: {
    borderColor: 'rgba(16,185,129,0.4)',
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderLeftColor: '#10b981',
  },
  compareCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareCheckSelected: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  compareCheckMark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardContent: { flex: 1, minWidth: 0 },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cardDate: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  pdfBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(16,185,129,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.4)',
    minWidth: 56,
    alignItems: 'center',
  },
  pdfBtnDisabled: { opacity: 0.7 },
  pdfBtnText: { color: '#10b981', fontSize: 14, fontWeight: '600' },
  empty: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 24,
  },
  back: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  backText: {
    color: '#10b981',
    fontSize: 14,
  },
});
