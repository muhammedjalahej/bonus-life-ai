/**
 * DashboardScreen — History tab (Enhanced)
 * Filter chips · Search · FlatList of assessment cards with left accent bar · Section grouping
 * Keep all existing data-fetching and API logic unchanged.
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, RefreshControl, Alert, Platform,
  ScrollView, TextInput, Animated, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { SkeletonCard } from '../components/Skeleton';
import * as api from '../services/api';
import { COLORS, RADIUS, FONT, SPACING, FEATURE_COLORS } from '../config/theme';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

/* ── helpers ─────────────────────────────────────────────────────────────── */
function stripMd(s) {
  return typeof s === 'string' ? s.replace(/\*\*/g, '') : s;
}

/* ── Time period grouping ────────────────────────────────────────────────── */
function getTimePeriod(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now - d) / (1000 * 60 * 60 * 24);
  if (diff < 7) return 'THIS WEEK';
  if (diff < 14) return 'LAST WEEK';
  return 'EARLIER';
}

const TYPE_META = {
  diabetes: { label: 'Diabetes',  color: FEATURE_COLORS.Assessment, icon: 'pulse-outline'  },
  heart:    { label: 'Heart',     color: FEATURE_COLORS.Heart,      icon: 'heart-outline'  },
  ckd:      { label: 'Kidney',    color: FEATURE_COLORS.CKD,        icon: 'water-outline'  },
  mri:      { label: 'Brain MRI', color: FEATURE_COLORS.BrainMRI,   icon: 'scan-outline'   },
};

/* ── Left accent bar color ───────────────────────────────────────────────── */
function getAccentColor(item) {
  if (item.type === 'ckd')      return FEATURE_COLORS.CKD;
  if (item.type === 'mri')      return FEATURE_COLORS.BrainMRI;
  const label = (item.risk_level || item.prediction || '').toLowerCase();
  if (label.includes('low'))  return '#2D6A4F';
  if (label.includes('high')) return '#C85A3A';
  if (label.includes('mod'))  return '#B4781E';
  return FEATURE_COLORS.Assessment;
}

const FILTERS = [
  { key: 'all',      label: 'All',       icon: 'layers-outline' },
  { key: 'diabetes', label: 'Diabetes',  icon: 'pulse-outline'  },
  { key: 'heart',    label: 'Heart',     icon: 'heart-outline'  },
  { key: 'ckd',      label: 'Kidney',    icon: 'water-outline'  },
  { key: 'mri',      label: 'Brain MRI', icon: 'scan-outline'   },
];

/* ── Info Modal ──────────────────────────────────────────────────────────── */
function InfoModal({ visible, onClose, item, navigation }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: visible ? 1 : 0, damping: 26, stiffness: 320, useNativeDriver: true }).start();
  }, [visible]);
  if (!visible || !item) return null;

  const meta    = TYPE_META[item.type] || TYPE_META.diabetes;
  const isCKD   = item.type === 'ckd';
  const isMRI   = item.type === 'mri';

  // probability/confidence value (0–1)
  const prob = isCKD
    ? (item.confidence ?? null)
    : isMRI
    ? (item.confidence ?? item.risk_analysis?.confidence ?? null)
    : (item.probability ?? null);
  const pct  = prob != null ? Math.round(prob * 100) : null;

  // MRI tumor class
  const tumorClass = isMRI ? (item.tumor_class || item.risk_analysis?.tumor_class || '') : '';

  // risk level index for bar
  const rl      = (item.risk_level || item.prediction || '').toLowerCase();
  const isHigh  = rl.includes('high') || rl.includes('ckd');
  const isMod   = rl.includes('mod');
  const rLvl    = isHigh ? 2 : isMod ? 1 : 0;
  const segColors = ['#2D6A4F', '#B4781E', '#C85A3A'];

  // color — MRI uses tumor-class colors
  const mriColor = tumorClass === 'no tumor' ? '#2D6A4F'
    : tumorClass === 'glioma'     ? '#C85A3A'
    : tumorClass === 'meningioma' ? '#B4781E'
    : '#6B8794';
  const rColor = isMRI ? mriColor : (isHigh ? '#C85A3A' : isMod ? '#B4781E' : '#2D6A4F');

  // label shown in circle and title
  const rLabel = isCKD
    ? (item.prediction === 'CKD' ? 'CKD detected' : 'No CKD detected')
    : isMRI
    ? (tumorClass ? tumorClass.charAt(0).toUpperCase() + tumorClass.slice(1) : 'MRI Result')
    : stripMd(item.risk_level || 'N/A');

  const summary = item.executive_summary ? stripMd(item.executive_summary) : '';
  const date    = item.created_at ? new Date(item.created_at).toLocaleDateString() : '';

  const questionCount = isCKD ? '25 biomarkers' : isMRI ? 'MRI scan' : '8 / 8';

  const contextMsg = `I'm reviewing my ${meta.label} assessment from ${date}. Result: ${rLabel}${pct != null ? `, ${pct}% risk` : ''}. ${summary.slice(0, 200)} Can you give me advice?`;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <Pressable style={im.backdrop} onPress={onClose}>
        <Animated.View style={[im.card, {
          opacity: anim,
          transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
        }]}>
          <Pressable onPress={() => {}}>
            {/* Close */}
            <Pressable onPress={onClose} style={im.closeBtn} hitSlop={12}>
              <Ionicons name="close" size={15} color="rgba(28,27,24,0.4)" />
            </Pressable>

            {/* Header */}
            <View style={im.header}>
              <View style={[im.iconWrap, { backgroundColor: meta.color + '18' }]}>
                <Ionicons name={meta.icon} size={16} color={meta.color} />
              </View>
              <Text style={im.title}>{isMRI ? 'Brain MRI' : `${meta.label} Risk`}</Text>
            </View>

            {/* Score circle */}
            <View style={im.circleWrap}>
              <View style={[im.circle, { borderColor: rColor + '40', backgroundColor: rColor + '0E' }]}>
                <Text style={[im.circleVal, { color: rColor }]}>
                  {pct != null ? `${pct}%` : '—'}
                </Text>
                <Text style={im.circleUnit}>RISK</Text>
              </View>
              <Text style={[im.riskTitle, { color: rColor }]}>{rLabel}</Text>
              {summary ? <Text style={im.riskDesc} numberOfLines={3}>{summary.slice(0, 160)}</Text> : null}
            </View>

            {/* Risk bar */}
            {!isMRI && (
              <>
                <View style={im.barRow}>
                  {segColors.map((c, i) => (
                    <View key={i} style={[im.barSeg, { backgroundColor: c, opacity: i === rLvl ? 1 : 0.15 }]} />
                  ))}
                </View>
                <View style={im.barLabels}>
                  <Text style={im.barLabel}>Low</Text>
                  <Text style={im.barLabel}>Medium</Text>
                  <Text style={im.barLabel}>High</Text>
                </View>
              </>
            )}

            {/* Detail grid */}
            <View style={im.grid}>
              <View style={im.gridCell}>
                <Text style={im.gridLabel}>RISK LEVEL</Text>
                <Text style={im.gridVal}>{pct != null ? `${pct}%` : '—'}</Text>
              </View>
              <View style={[im.gridCell, im.gridCellRight]}>
                <Text style={im.gridLabel}>DATE</Text>
                <Text style={[im.gridVal, { fontSize: 13 }]}>{date}</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={im.actions}>
              <Pressable style={im.btnGhost} onPress={onClose}>
                <Ionicons name="close-outline" size={14} color="rgba(28,27,24,0.5)" />
                <Text style={im.btnGhostText}>Close</Text>
              </Pressable>
              <Pressable style={im.btnAskAI} onPress={() => {
                onClose();
                navigation.navigate('HomeTab', { screen: 'ChatTab', params: { screen: 'Chat', params: { context: contextMsg } } });
              }}>
                <Ionicons name="chatbubble-ellipses-outline" size={14} color="#F7F4ED" />
                <Text style={im.btnAskAIText}>Ask AI</Text>
              </Pressable>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

/* ── animated pressable ──────────────────────────────────────────────────── */
function SpringCard({ children, onPress, style }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.97, damping: 20, stiffness: 300, useNativeDriver: true }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    damping: 20, stiffness: 300, useNativeDriver: true }).start();
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable onPress={onPress} onPressIn={onIn} onPressOut={onOut}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Screen
═══════════════════════════════════════════════════════════════════════════ */
export default function DashboardScreen({ navigation }) {
  const { user }  = useAuth();
  const { t }     = useLanguage();
  const insets    = useSafeAreaInsets();

  const [assessments,      setAssessments]      = useState([]);
  const [brainMriAnalyses, setBrainMriAnalyses] = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [refreshing,       setRefreshing]       = useState(false);
  const [pdfLoading,       setPdfLoading]       = useState(null);
  const [deleteLoading,    setDeleteLoading]    = useState(null);
  const [activeFilter,     setActiveFilter]     = useState('all');
  const [searchQuery,      setSearchQuery]      = useState('');
  const [searchFocused,    setSearchFocused]    = useState(false);
  const [sortOrder,        setSortOrder]        = useState('newest'); // 'newest' | 'oldest'
  const [modalItem,        setModalItem]        = useState(null);

  /* ── data ──────────────────────────────────────────────────────────────── */
  const load = async () => {
    try {
      const [rawD, rawH, rawCKD, rawBrain] = await Promise.all([
        api.getMyAssessments(50),
        api.getMyHeartAssessments(50),
        api.getMyCKDAssessments(50).catch(() => []),
        api.getMyBrainMriAnalyses(50).catch(() => []),
      ]);
      const dList = Array.isArray(rawD)   ? rawD   : (rawD?.assessments ?? []);
      const hList = Array.isArray(rawH)   ? rawH   : (rawH?.assessments ?? []);
      const cList = Array.isArray(rawCKD) ? rawCKD : [];
      const merged = [
        ...dList.map(a => ({ ...a, type: 'diabetes' })),
        ...hList.map(a => ({ ...a, type: 'heart'    })),
        ...cList.map(a => ({ ...a, type: 'ckd'      })),
      ];
      merged.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      setAssessments(merged);
      setBrainMriAnalyses(Array.isArray(rawBrain) ? rawBrain : []);
    } catch {
      setAssessments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);
  const onRefresh = () => { setRefreshing(true); load(); };

  /* ── unified list + filtering ─────────────────────────────────────────── */
  const allRecords = useMemo(() => {
    const list = [
      ...assessments,
      ...brainMriAnalyses.map(m => ({ ...m, type: 'mri' })),
    ];
    list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return list;
  }, [assessments, brainMriAnalyses]);

  const filteredRecords = useMemo(() => {
    let list = allRecords;
    if (activeFilter !== 'all') list = list.filter(r => r.type === activeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => {
        const label   = getLabel(r).toLowerCase();
        const typeLbl = (TYPE_META[r.type]?.label || '').toLowerCase();
        const summary = (r.executive_summary || r.goal || '').toLowerCase();
        return label.includes(q) || typeLbl.includes(q) || summary.includes(q);
      });
    }
    // apply sort direction
    if (sortOrder === 'oldest') {
      list = [...list].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    }
    return list;
  }, [allRecords, activeFilter, searchQuery, sortOrder]);

  /* ── Build flat list with section headers ────────────────────────────── */
  const listData = useMemo(() => {
    if (filteredRecords.length === 0) return [];
    const groups = {};
    filteredRecords.forEach(item => {
      const period = item.created_at ? getTimePeriod(item.created_at) : 'EARLIER';
      if (!groups[period]) groups[period] = [];
      groups[period].push(item);
    });
    const ORDER = ['THIS WEEK', 'LAST WEEK', 'EARLIER'];
    const result = [];
    ORDER.forEach(period => {
      if (groups[period]) {
        result.push({ _isHeader: true, period });
        groups[period].forEach(item => result.push(item));
      }
    });
    return result;
  }, [filteredRecords]);

  /* ── item helpers ─────────────────────────────────────────────────────── */
  const itemKey  = (item) => item._isHeader ? `header-${item.period}` : `${item.type}-${item.id}`;
  const getMeta  = (item) => TYPE_META[item.type] || TYPE_META.diabetes;
  const getScore = (item) => {
    if (item.type === 'ckd')  return item.confidence ?? 0;
    if (item.type === 'mri')  return null;
    return item.probability ?? 0;
  };
  const imagingLabel = (item) => {
    const tc = item.tumor_class || item.risk_analysis?.tumor_class || 'Brain MRI';
    return tc.charAt(0).toUpperCase() + tc.slice(1);
  };
  const getLabel = (item) => {
    if (item.type === 'ckd') return item.prediction || 'N/A';
    if (item.type === 'mri') return imagingLabel(item);
    return stripMd(item.risk_level || 'N/A');
  };

  /* ── delete ───────────────────────────────────────────────────────────── */
  const confirmDelete = (item) => {
    const doDelete = async () => {
      const lk = `${item.type}-${item.id}`;
      setDeleteLoading(lk);
      try {
        if      (item.type === 'diabetes') await api.deleteAssessment(item.id);
        else if (item.type === 'heart')    await api.deleteHeartAssessment(item.id);
        else if (item.type === 'ckd')      await api.deleteCKDAssessment(item.id);
        else if (item.type === 'mri')      await api.deleteBrainMriAnalysis(item.id);
        if (item.type === 'mri') setBrainMriAnalyses(p => p.filter(m => m.id !== item.id));
        else setAssessments(p => p.filter(a => !(a.id === item.id && a.type === item.type)));
      } catch (e) {
        showError('Delete failed', e?.message || 'Could not delete record.');
      } finally {
        setDeleteLoading(null);
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this record? This cannot be undone.')) doDelete();
    } else {
      Alert.alert('Delete Record', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  /* ── PDF export ───────────────────────────────────────────────────────── */
  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
  const showError = (title, msg) => {
    if (isBrowser && window.alert) window.alert(`${title}: ${msg}`);
    else Alert.alert(title, msg);
  };

  const buildPdfDoc = async (assessment, signResult = null) => {
    const isHeart = assessment.type === 'heart';
    const isCKD   = assessment.type === 'ckd';
    const isMRI   = assessment.type === 'mri';
    const doc     = new jsPDF();
    const date    = assessment.created_at ? new Date(assessment.created_at).toLocaleString() : 'N/A';
    const patient = user?.full_name || user?.email || 'N/A';
    let y = 20;

    if (isMRI) {
      doc.setFontSize(16); doc.setTextColor(107, 135, 148);
      doc.text('Brain MRI Analysis Report', 20, y); y += 10;
      doc.setFontSize(10); doc.setTextColor(60, 60, 60);
      doc.text(`Date: ${date}`, 20, y); y += 7;
      doc.text(`Patient: ${patient}`, 20, y); y += 7;
      const tumorClass = assessment.tumor_class || assessment.risk_analysis?.tumor_class || 'Unknown';
      const confidence = assessment.confidence ?? assessment.risk_analysis?.confidence;
      doc.text(`Classification: ${tumorClass.charAt(0).toUpperCase() + tumorClass.slice(1)}`, 20, y); y += 7;
      if (confidence != null) { doc.text(`Confidence: ${(confidence * 100).toFixed(1)}%`, 20, y); y += 7; }
      y += 3;
      if (assessment.description || assessment.executive_summary) {
        doc.setFont(undefined, 'bold'); doc.text('Analysis:', 20, y); y += 6;
        doc.setFont(undefined, 'normal');
        const desc = stripMd((assessment.description || assessment.executive_summary || '').slice(0, 800));
        const lines = doc.splitTextToSize(desc, 170);
        doc.text(lines, 20, y);
      }
      return doc;
    }

    // diabetes / heart / ckd
    const riskLine = isCKD
      ? `Prediction: ${assessment.prediction || 'Unknown'}  |  Confidence: ${((assessment.confidence || 0) * 100).toFixed(1)}%`
      : `Risk Level: ${stripMd(assessment.risk_level || 'Unknown')}  |  Probability: ${((assessment.probability || 0) * 100).toFixed(1)}%`;
    const summary = stripMd((assessment.executive_summary || 'No summary available.').slice(0, 800));
    doc.setFontSize(16);
    if (isCKD) doc.setTextColor(0, 138, 178);
    else doc.setTextColor(isHeart ? 180 : 0, isHeart ? 80 : 120, isHeart ? 120 : 80);
    const title = isCKD ? 'Kidney Disease (CKD) Assessment Report' : isHeart ? 'Heart Risk Assessment Report' : 'Diabetes Risk Assessment Report';
    doc.text(title, 20, y); y += 10;
    doc.setFontSize(10); doc.setTextColor(60, 60, 60);
    doc.text(`Date: ${date}`, 20, y); y += 7;
    doc.text(`Patient: ${patient}`, 20, y); y += 7;
    doc.text(riskLine, 20, y); y += 10;
    doc.setFont(undefined, 'bold'); doc.text('Summary:', 20, y); y += 6;
    doc.setFont(undefined, 'normal');
    const lines = doc.splitTextToSize(summary, 170);
    doc.text(lines, 20, y); y += lines.length * 5 + 15;
    if (signResult) {
      try {
        const qrPayload = JSON.stringify({
          report_id: signResult.report_id, issued_at: signResult.issued_at,
          assessment_db_id: signResult.assessment_db_id, payload_hash: signResult.payload_hash,
          signature_b64: signResult.signature_b64, alg: signResult.alg || 'ES256',
        });
        const qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 120, margin: 1 });
        doc.addImage(qrDataUrl, 'PNG', 20, y, 40, 40);
        doc.setFontSize(8); doc.setTextColor(100, 100, 100);
        doc.text('Scan QR to verify signature', 20, y + 44);
      } catch (_) {}
    }
    return doc;
  };

  const exportPDF = async (assessment) => {
    const lk = `${assessment.type}-${assessment.id}`;
    setPdfLoading(lk);
    try {
      const isHeart = assessment.type === 'heart';
      const isCKD   = assessment.type === 'ckd';
      const isMRI   = assessment.type === 'mri';
      let signResult = null;
      if      (isCKD)                    { try { signResult = await api.signCKDAssessmentReport(assessment.id); } catch (_) {} }
      else if (!isHeart && !isMRI)       { try { signResult = await api.signAssessmentReport(assessment.id);    } catch (_) {} }
      const doc = await buildPdfDoc(assessment, signResult);
      if (isBrowser) {
        const prefix   = isHeart ? 'heart' : isCKD ? 'ckd' : isMRI ? 'brain-mri' : 'diabetes';
        const fileName = `${prefix}-${assessment.id}-${signResult ? 'signed' : 'report'}.pdf`;
        const blob = new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = fileName; a.rel = 'noopener';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }
      const FileSystem = (await import('expo-file-system')).default;
      const Sharing    = (await import('expo-sharing')).default;
      const pdfBase64  = doc.output('datauristring').split(',')[1];
      const prefix = isHeart ? 'heart-' : isCKD ? 'ckd-' : isMRI ? 'brain-mri-' : '';
      const path   = `${FileSystem.cacheDirectory}${prefix}${assessment.id}-report.pdf`;
      await FileSystem.writeAsStringAsync(path, pdfBase64, { encoding: FileSystem.EncodingType.Base64 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: 'application/pdf', dialogTitle: 'Save report PDF' });
      } else { showError('Sharing not available', 'Cannot save PDF on this device.'); }
    } catch (err) {
      showError('PDF failed', err?.message || 'Could not create PDF.');
    } finally { setPdfLoading(null); }
  };

  /* ── loading skeleton ─────────────────────────────────────────────────── */
  if (loading) {
    return (
      <View style={st.root}>
        <ScrollView contentContainerStyle={{ padding: SPACING.xl, paddingTop: 24 }}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </ScrollView>
      </View>
    );
  }

  /* ── render ───────────────────────────────────────────────────────────── */
  return (
    <View style={st.root}>
      <InfoModal
        visible={!!modalItem}
        onClose={() => setModalItem(null)}
        item={modalItem}
        navigation={navigation}
      />
      {/* ── Page header ── */}
      <View style={[st.topRow, { paddingTop: insets.top + 16 }]}>
        <Text style={st.pageTitle}>History</Text>
      </View>

      {/* ── Filter chips ── */}
      <View style={st.filterTrack}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filterRow}>
          {FILTERS.map(f => {
            const isActive  = activeFilter === f.key;
            const meta      = TYPE_META[f.key];
            const chipColor = meta ? meta.color : COLORS.purple;
            return (
              <Pressable
                key={f.key}
                style={[st.filterChip, isActive && { backgroundColor: chipColor + '1A', borderColor: chipColor + '45' }]}
                onPress={() => setActiveFilter(f.key)}
              >
                <Ionicons name={f.icon} size={12} color={isActive ? chipColor : COLORS.textMuted} />
                <Text style={[st.filterChipText, isActive && { color: chipColor, fontWeight: FONT.bold }]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Search bar ── */}
      <View style={[st.searchBox, searchFocused && st.searchBoxFocused]}>
        <Ionicons name="search-outline" size={15} color={COLORS.textMuted} />
        <TextInput
          style={st.searchInput}
          placeholder="Search records…"
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
          </Pressable>
        )}
      </View>

      {/* ── Sort control row ── */}
      <View style={st.sortRow}>
        <Text style={st.countText}>
          Showing {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}
        </Text>
        <Pressable
          style={st.sortChip}
          onPress={() => setSortOrder(o => o === 'newest' ? 'oldest' : 'newest')}
          hitSlop={8}
        >
          <Ionicons
            name={sortOrder === 'newest' ? 'arrow-down-outline' : 'arrow-up-outline'}
            size={11}
            color={COLORS.textMuted}
          />
          <Text style={st.sortChipText}>{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</Text>
        </Pressable>
      </View>

      {/* ── List ── */}
      <FlatList
        data={listData}
        keyExtractor={itemKey}
        contentContainerStyle={[st.listPad, { paddingBottom: 48 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.purple} />}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          /* Section header row */
          if (item._isHeader) {
            return (
              <View style={st.sectionHeader}>
                <Text style={st.sectionHeaderText}>{item.period}</Text>
              </View>
            );
          }

          const key          = `${item.type}-${item.id}`;
          const meta         = getMeta(item);
          const score        = getScore(item);
          const isPdfLoading = pdfLoading === key;
          const isDeleting   = deleteLoading === key;
          const isMRI   = item.type === 'mri';
          const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString() : '';
          const accentColor = getAccentColor(item);

          const handleCardPress = () => setModalItem(item);

          return (
            <SpringCard
              style={st.card}
              onPress={handleCardPress}
            >
              {/* Left accent bar */}
              <View style={[st.accentBar, { backgroundColor: accentColor }]} />

              <View style={st.cardInner}>
                {/* Icon */}
                <View style={[st.iconBubble, { backgroundColor: meta.color + '1A' }]}>
                  <Ionicons name={meta.icon} size={20} color={meta.color} />
                </View>

                {/* Content */}
                <View style={st.cardContent}>
                  <View style={st.cardRow}>
                    <Text style={st.cardTitle} numberOfLines={1}>{getLabel(item)}</Text>
                    <View style={[st.typeBadge, { backgroundColor: meta.color + '1A', borderColor: meta.color + '40' }]}>
                      <Text style={[st.typeBadgeText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                  </View>
                  <Text style={st.cardScore}>
                    {score !== null ? `${(score * 100).toFixed(0)}% · ` : ''}{dateStr}
                  </Text>
                </View>

                {/* Actions */}
                <View style={st.cardActions}>
                  {/* Download button — shown for all types */}
                  <Pressable
                    style={st.iconBtn}
                    onPress={(e) => { e.stopPropagation?.(); if (!isPdfLoading) exportPDF(item); }}
                    disabled={isPdfLoading}
                    hitSlop={6}
                  >
                    {isPdfLoading
                      ? <ActivityIndicator size="small" color={COLORS.textMuted} />
                      : <Ionicons name="arrow-down-circle-outline" size={20} color={COLORS.textMuted} />
                    }
                  </Pressable>
                  {/* Delete icon */}
                  <Pressable
                    style={st.iconBtn}
                    onPress={(e) => { e.stopPropagation?.(); if (!isDeleting) confirmDelete(item); }}
                    disabled={isDeleting}
                    hitSlop={6}
                  >
                    {isDeleting
                      ? <ActivityIndicator size="small" color="#C85A3A" />
                      : <Ionicons name="trash-outline" size={18} color="#C85A3A" />
                    }
                  </Pressable>
                  {/* Chevron */}
                  <Pressable
                    style={st.chevronCircle}
                    onPress={(e) => { e.stopPropagation?.(); setModalItem(item); }}
                    hitSlop={6}
                  >
                    <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
                  </Pressable>
                </View>
              </View>
            </SpringCard>
          );
        }}
        ListEmptyComponent={
          <View style={st.empty}>
            <View style={st.emptyIconWrap}>
              <Ionicons name="document-text-outline" size={28} color={COLORS.purple + '60'} />
            </View>
            <Text style={st.emptyTitle}>
              {searchQuery ? 'No results found' : 'No records yet'}
            </Text>
            <Text style={st.emptyHint}>
              {searchQuery ? 'Try a different search term' : 'Complete an assessment to see records here'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

/* ── styles ──────────────────────────────────────────────────────────────── */
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  /* Top row */
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  pageTitle: {
    fontSize: FONT.h1,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic',
    fontWeight: FONT.bold,
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },

  /* Filter chips */
  filterTrack: { paddingBottom: SPACING.sm },
  filterRow:   { paddingHorizontal: SPACING.lg, gap: SPACING.sm, paddingRight: SPACING.xxl },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 7, paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.full,
    borderWidth: 0.5, borderColor: 'rgba(28,27,24,0.08)',
    shadowColor: '#1C1B18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  filterChipText: { fontSize: FONT.xs, fontWeight: FONT.medium, color: COLORS.textMuted },

  /* Search */
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    borderWidth: 0.5, borderColor: COLORS.borderSubtle,
    paddingHorizontal: SPACING.lg, marginHorizontal: SPACING.lg, gap: SPACING.sm,
  },
  searchBoxFocused: { borderColor: 'rgba(45,106,79,0.3)', shadowOpacity: 0.08 },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: FONT.md, paddingVertical: 11 },

  /* Sort row */
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  countText: { fontSize: 11, color: COLORS.textMuted, fontWeight: FONT.medium },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 0.5,
    borderColor: COLORS.borderSubtle,
  },
  sortChipText: { fontSize: 11, color: COLORS.textMuted, fontWeight: FONT.medium },

  /* Section header */
  sectionHeader: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginHorizontal: SPACING.lg,
  },
  sectionHeaderText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: FONT.bold,
    letterSpacing: 1.2,
  },

  /* Cards */
  listPad: { paddingTop: 4 },
  card: {
    marginHorizontal: SPACING.lg, marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    shadowColor: '#1C1B18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  cardInner:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, paddingLeft: 18 },
  iconBubble:  { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardContent: { flex: 1, minWidth: 0 },
  cardRow:     { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4, flexWrap: 'wrap' },
  cardTitle:   { fontSize: FONT.md, fontWeight: FONT.semibold, color: COLORS.textPrimary, flexShrink: 1 },
  cardScore:   { fontSize: FONT.xs, color: COLORS.textMuted },
  typeBadge:   { paddingVertical: 2, paddingHorizontal: 7, borderRadius: 6, borderWidth: 0.5 },
  typeBadgeText:{ fontSize: 10, fontWeight: FONT.bold, letterSpacing: 0.2 },

  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  iconBtn:     { padding: 5 },

  /* Chevron circle */
  chevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(28,27,24,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(28,27,24,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Empty */
  empty:        { alignItems: 'center', paddingTop: 64 },
  emptyIconWrap:{ width: 64, height: 64, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle:   { fontSize: FONT.md, fontWeight: FONT.semibold, color: COLORS.textSecondary, marginBottom: 5 },
  emptyHint:    { fontSize: FONT.sm, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 32 },
});

/* ── Info Modal styles ───────────────────────────────────────────────────── */
const im = StyleSheet.create({
  backdrop:  { flex: 1, backgroundColor: 'rgba(28,27,24,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card:      { backgroundColor: '#F7F4ED', borderRadius: 20, padding: 24, width: '100%', maxWidth: 380, shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 12 },
  closeBtn:  { position: 'absolute', top: 14, right: 14, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(28,27,24,0.07)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  header:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20, paddingRight: 30 },
  iconWrap:  { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title:     { flex: 1, fontSize: FONT.lg, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic', fontWeight: FONT.bold, color: '#1C1B18', letterSpacing: -0.3 },
  circleWrap:{ alignItems: 'center', marginBottom: 20 },
  circle:    { width: 110, height: 110, borderRadius: 55, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  circleVal: { fontSize: 36, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic', fontWeight: '700', lineHeight: 40 },
  circleUnit:{ fontSize: 9, fontWeight: '700', color: 'rgba(28,27,24,0.35)', letterSpacing: 1.2 },
  riskTitle: { fontSize: FONT.md, fontWeight: FONT.bold, marginBottom: 4 },
  riskDesc:  { fontSize: FONT.sm, color: 'rgba(28,27,24,0.5)', textAlign: 'center', lineHeight: 18, paddingHorizontal: 8 },
  barRow:    { flexDirection: 'row', gap: 4, marginBottom: 6 },
  barSeg:    { flex: 1, height: 6, borderRadius: 3 },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  barLabel:  { fontSize: 9, color: 'rgba(28,27,24,0.4)', fontWeight: FONT.medium },
  grid:      { flexDirection: 'row', gap: 8, marginBottom: 16 },
  gridCell:  { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  gridCellRight: {},
  gridLabel: { fontSize: 9, fontWeight: '700', color: 'rgba(28,27,24,0.35)', letterSpacing: 0.8, marginBottom: 4 },
  gridVal:   { fontSize: FONT.lg, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic', fontWeight: FONT.bold, color: '#1C1B18' },
  actions:   { flexDirection: 'row', gap: 8 },
  btnGhost:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 13, backgroundColor: '#FFFFFF', borderWidth: 0.5, borderColor: 'rgba(28,27,24,0.1)', shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  btnGhostText: { fontSize: FONT.sm, fontWeight: FONT.semibold, color: 'rgba(28,27,24,0.55)' },
  btnAskAI:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 13, backgroundColor: '#2D6A4F', shadowColor: '#2D6A4F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  btnAskAIText: { fontSize: FONT.sm, fontWeight: FONT.bold, color: '#F7F4ED' },
});
