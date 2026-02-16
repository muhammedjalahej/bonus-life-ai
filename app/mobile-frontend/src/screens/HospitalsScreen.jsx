/**
 * Nearest hospitals – same behavior as web (Use my location, list + directions), optimized for mobile.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import * as api from '../services/api';

const TURKEY_CENTER = { lat: 39.0, lon: 32.8 };

function useMyLocation(getHospitals, setLoading, setLocationError, setError) {
  return useCallback(async () => {
    setLocationError('');
    setError('');
    if (Platform.OS === 'web') {
      if (!navigator.geolocation) {
        setLocationError('Browser does not support location.');
        return;
      }
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          getHospitals(lat, lon);
        },
        () => {
          setLocationError('Location denied or unavailable.');
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
      );
      return;
    }
    try {
      const loc = await import('expo-location').then((m) => m.default);
      const { status } = await loc.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied.');
        return;
      }
      setLoading(true);
      const position = await loc.getCurrentPositionAsync({ accuracy: loc.Accuracy.Balanced });
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      getHospitals(lat, lon);
    } catch (e) {
      setLocationError(e?.message || 'Location unavailable.');
      setLoading(false);
    }
  }, [getHospitals, setLoading, setLocationError, setError]);
}

function openInMaps(lat, lon) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`;
  Linking.openURL(url);
}

export default function HospitalsScreen() {
  const [userLocation, setUserLocation] = useState(null);
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [loading, setLoading] = useState(false);
  const [hospitals, setHospitals] = useState([]);
  const [error, setError] = useState('');
  const [locationError, setLocationError] = useState('');

  const fetchHospitals = useCallback(async (latitude, longitude) => {
    setLoading(true);
    setError('');
    setUserLocation({ lat: latitude, lon: longitude });
    try {
      const res = await api.getNearbyHospitals(latitude, longitude, 50, 25);
      setHospitals(Array.isArray(res?.hospitals) ? res.hospitals : []);
    } catch (e) {
      setError(e?.message || 'Could not fetch hospitals. Location must be within Turkey.');
      setHospitals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onUseMyLocation = useMyLocation(fetchHospitals, setLoading, setLocationError, setError);

  const searchByCoords = () => {
    const la = parseFloat(lat);
    const lo = parseFloat(lon);
    if (isNaN(la) || isNaN(lo)) {
      Alert.alert('Invalid coordinates', 'Enter valid latitude and longitude (e.g. 41.0, 29.0 for Turkey).');
      return;
    }
    fetchHospitals(la, lo);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header – match web */}
      <Text style={styles.title}>Nearest Hospitals</Text>

      {/* Primary CTA: Use my location – same as web */}
      <View style={styles.ctaRow}>
        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
          onPress={onUseMyLocation}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>Use my location</Text>
          )}
        </TouchableOpacity>
        {locationError ? <Text style={styles.errorText}>{locationError}</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      {/* Optional: manual coordinates – collapsed for mobile */}
      <View style={styles.manualSection}>
        <Text style={styles.manualLabel}>Or enter coordinates (Turkey)</Text>
        <View style={styles.row}>
          <View style={styles.field}>
            <Text style={styles.label}>Latitude</Text>
            <TextInput
              style={styles.input}
              placeholder="41.0"
              value={lat}
              onChangeText={setLat}
              keyboardType="decimal-pad"
              placeholderTextColor="#64748b"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Longitude</Text>
            <TextInput
              style={styles.input}
              placeholder="29.0"
              value={lon}
              onChangeText={setLon}
              keyboardType="decimal-pad"
              placeholderTextColor="#64748b"
            />
          </View>
        </View>
        <TouchableOpacity
          style={[styles.secondaryButton, loading && styles.primaryButtonDisabled]}
          onPress={searchByCoords}
          disabled={loading}
        >
          <Text style={styles.secondaryButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Hospital list – same structure as web */}
      <View style={styles.listSection}>
        <Text style={styles.listSectionTitle}>Hospital list</Text>
        {!userLocation && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Click "Use my location".</Text>
          </View>
        )}
        {userLocation && hospitals.length === 0 && !loading && !error && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No hospitals found in this area.</Text>
          </View>
        )}
        {hospitals.map((h, i) => (
          <View key={`${h.lat}-${h.lon}-${i}`} style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.cardContent}>
                <Text style={styles.cardName} numberOfLines={2}>{h.name || 'Hospital'}</Text>
                {h.address ? (
                  <Text style={styles.cardAddress} numberOfLines={2}>{h.address}</Text>
                ) : null}
                <View style={styles.cardMeta}>
                  {h.distance_km != null && (
                    <Text style={styles.cardDist}>{h.distance_km.toFixed(1)} km</Text>
                  )}
                  {h.phone ? (
                    <TouchableOpacity onPress={() => Linking.openURL('tel:' + h.phone)}>
                      <Text style={styles.cardPhone}>{h.phone}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
              <TouchableOpacity
                style={styles.directionsButton}
                onPress={() => openInMaps(h.lat, h.lon)}
              >
                <Text style={styles.directionsButtonText}>Directions</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a12' },
  content: { padding: 20, paddingBottom: 48 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  ctaRow: { alignItems: 'center', marginBottom: 16 },
  primaryButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minWidth: 200,
    alignItems: 'center',
  },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  errorText: { fontSize: 13, color: '#f59e0b', marginTop: 8, textAlign: 'center' },
  manualSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 16,
    marginBottom: 20,
  },
  manualLabel: { fontSize: 13, color: '#94a3b8', marginBottom: 10 },
  row: { flexDirection: 'row', gap: 12 },
  field: { flex: 1 },
  label: { fontSize: 12, color: '#94a3b8', marginBottom: 4 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  secondaryButtonText: { color: '#94a3b8', fontSize: 15, fontWeight: '500' },
  listSection: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    minHeight: 200,
  },
  listSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  emptyState: {
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  card: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardInner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardContent: { flex: 1, minWidth: 0 },
  cardName: { fontSize: 15, fontWeight: '600', color: '#fff' },
  cardAddress: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 6 },
  cardDist: { fontSize: 11, fontWeight: '600', color: 'rgba(16,185,129,0.95)' },
  cardPhone: { fontSize: 11, color: '#10b981' },
  directionsButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(16,185,129,0.15)',
    justifyContent: 'center',
  },
  directionsButtonText: { fontSize: 13, color: '#10b981', fontWeight: '500' },
});
