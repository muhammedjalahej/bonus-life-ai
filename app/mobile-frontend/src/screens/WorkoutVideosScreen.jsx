import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Linking, RefreshControl } from 'react-native';
import * as api from '../services/api';

const GOALS = [
  { key: 'beginner', label: 'Beginner' },
  { key: 'weight_loss', label: 'Weight Loss' },
  { key: '10_min', label: '10 Min' },
  { key: 'low_impact', label: 'Low Impact' },
  { key: 'strength', label: 'Strength' },
];

export default function WorkoutVideosScreen() {
  const [goal, setGoal] = useState('beginner');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Workout Videos</Text>
      <Text style={styles.subtitle}>Same as web. Pick a goal.</Text>
      <View style={styles.goalRow}>
        {GOALS.map((g) => (
          <TouchableOpacity key={g.key} style={[styles.goalBtn, goal === g.key && styles.goalBtnActive]} onPress={() => setGoal(g.key)}>
            <Text style={[styles.goalText, goal === g.key && styles.goalTextActive]}>{g.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#10b981" style={styles.loader} />
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(item) => (item.id || Math.random()).toString()}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => openVideo(item.id)}>
              <Text style={styles.cardTitle}>{item.title || 'Workout'}</Text>
              {item.channel ? <Text style={styles.cardChannel}>{item.channel}</Text> : null}
              <Text style={styles.cardLink}>Watch on YouTube</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#10b981" />}
          ListEmptyComponent={<Text style={styles.empty}>No videos.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a12' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 4, paddingHorizontal: 24, paddingTop: 8 },
  subtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 16, paddingHorizontal: 24 },
  goalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 24, marginBottom: 16 },
  goalBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#1e293b' },
  goalBtnActive: { backgroundColor: '#10b981' },
  goalText: { fontSize: 14, color: '#94a3b8' },
  goalTextActive: { color: '#fff', fontWeight: '600' },
  loader: { marginTop: 24 },
  list: { padding: 24, paddingTop: 8 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#fff' },
  cardChannel: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  cardLink: { fontSize: 13, color: '#10b981', marginTop: 6 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 24 },
});
