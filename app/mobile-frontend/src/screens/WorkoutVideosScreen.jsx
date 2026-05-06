/**
 * Workout Videos — Clinical Calm
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, FlatList,
  Animated, ActivityIndicator, Linking, RefreshControl, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, FONT } from '../config/theme';
import * as api from '../services/api';

const ACCENT = '#6B8794'; // slate — fitness accent in Clinical Calm

const GOALS = [
  { key: 'beginner',    label: 'Beginner',    icon: 'leaf-outline'          },
  { key: 'weight_loss', label: 'Weight Loss', icon: 'trending-down-outline' },
  { key: '10_min',      label: '10 Min',      icon: 'timer-outline'         },
  { key: 'low_impact',  label: 'Low Impact',  icon: 'body-outline'          },
  { key: 'strength',    label: 'Strength',    icon: 'barbell-outline'       },
];

function GoalChip({ goal, active, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.94, damping: 20, stiffness: 300, useNativeDriver: true }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    damping: 20, stiffness: 300, useNativeDriver: true }).start();
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        style={[st.chip, active && { backgroundColor: ACCENT + '18', borderColor: ACCENT + '55' }]}
        onPress={onPress} onPressIn={onIn} onPressOut={onOut}
      >
        <Ionicons name={goal.icon} size={13} color={active ? ACCENT : 'rgba(28,27,24,0.3)'} />
        <Text style={[st.chipText, active && { color: ACCENT, fontWeight: '700' }]}>{goal.label}</Text>
      </Pressable>
    </Animated.View>
  );
}

function VideoCard({ item, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.97, damping: 20, stiffness: 300, useNativeDriver: true }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    damping: 20, stiffness: 300, useNativeDriver: true }).start();

  return (
    <Animated.View style={[st.card, { transform: [{ scale }] }]}>
      <Pressable style={st.cardInner} onPress={onPress} onPressIn={onIn} onPressOut={onOut}>
        <View style={st.thumb}>
          <Ionicons name="play-circle-outline" size={32} color={ACCENT} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.cardTitle} numberOfLines={2}>{item.title || 'Workout'}</Text>
          {item.channel ? (
            <View style={st.channelRow}>
              <Ionicons name="person-circle-outline" size={12} color="rgba(28,27,24,0.3)" />
              <Text style={st.cardChannel}>{item.channel}</Text>
            </View>
          ) : null}
          <View style={st.watchRow}>
            <Ionicons name="logo-youtube" size={13} color="#C85A3A" />
            <Text style={st.watchText}>Watch on YouTube</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={14} color="rgba(28,27,24,0.2)" />
      </Pressable>
    </Animated.View>
  );
}

export default function WorkoutVideosScreen() {
  const insets = useSafeAreaInsets();
  const [goal, setGoal]         = useState('beginner');
  const [videos, setVideos]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (refresh) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.getWorkoutVideos(goal, refresh ? Date.now() : null);
      setVideos(Array.isArray(res.videos) ? res.videos : []);
    } catch {
      setVideos([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(false); }, [goal]);

  const openVideo = (id) => {
    if (id) Linking.openURL('https://www.youtube.com/watch?v=' + id);
  };

  const activeGoalLabel = GOALS.find((g) => g.key === goal)?.label || '';

  return (
    <View style={st.root}>
      <View style={[st.header, { paddingTop: 20 }]}>
        <Text style={st.title}>Workout Videos</Text>
        <Text style={st.subtitle}>Guided fitness from top YouTube trainers</Text>
        <View style={st.chipRow}>
          {GOALS.map((g) => (
            <GoalChip key={g.key} goal={g} active={goal === g.key} onPress={() => setGoal(g.key)} />
          ))}
        </View>
      </View>

      {loading ? (
        <View style={st.loaderWrap}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={st.loaderText}>Loading {activeGoalLabel} workouts…</Text>
        </View>
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(item) => (item.id || Math.random()).toString()}
          renderItem={({ item }) => (
            <VideoCard item={item} onPress={() => openVideo(item.id)} />
          )}
          contentContainerStyle={[st.list, { paddingBottom: 48 + insets.bottom }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={ACCENT} />
          }
          ListEmptyComponent={
            <View style={st.emptyState}>
              <View style={st.emptyIconWrap}>
                <Ionicons name="videocam-outline" size={32} color={ACCENT + '55'} />
              </View>
              <Text style={st.emptyTitle}>No videos found</Text>
              <Text style={st.emptyHint}>Try a different goal or pull to refresh</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F4ED' },
  blob: {
    position: 'absolute', top: 80, right: -70,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(107,135,148,0.06)',
  },

  header:   { paddingHorizontal: 20, paddingBottom: 16 },
  title:    { fontSize: 24, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic', fontWeight: '700', color: '#1C1B18', letterSpacing: -0.5, lineHeight: 30, marginBottom: 4 },
  subtitle: { fontSize: 12, fontStyle: 'italic', color: 'rgba(28,27,24,0.45)', lineHeight: 18, marginBottom: 20 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 8, paddingHorizontal: 13,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.full,
    borderWidth: 0.5, borderColor: 'rgba(28,27,24,0.1)',
    shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  chipText: { fontSize: 13, fontWeight: '500', color: 'rgba(28,27,24,0.5)' },

  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loaderText: { fontSize: 13, color: 'rgba(28,27,24,0.45)' },

  list: { paddingHorizontal: 16, paddingTop: 8 },

  card: {
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    borderWidth: 0.5, borderColor: 'rgba(28,27,24,0.07)',
    shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    overflow: 'hidden',
  },
  cardInner: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },

  thumb: {
    width: 64, height: 64, borderRadius: 14,
    backgroundColor: ACCENT + '12',
    borderWidth: 0.5, borderColor: ACCENT + '30',
    alignItems: 'center', justifyContent: 'center',
  },

  cardTitle:   { fontSize: 14, fontWeight: '700', color: '#1C1B18', lineHeight: 20, marginBottom: 4 },
  channelRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 5 },
  cardChannel: { fontSize: 11, color: 'rgba(28,27,24,0.4)' },
  watchRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  watchText:   { fontSize: 12, color: '#C85A3A', fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: ACCENT + '10',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: 'rgba(28,27,24,0.35)', marginBottom: 6 },
  emptyHint:  { fontSize: 13, color: 'rgba(28,27,24,0.3)', textAlign: 'center' },
});
