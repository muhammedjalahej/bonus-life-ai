import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

export function Skeleton({ width, height, style }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });
  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width: width ?? '100%', height: height ?? 20, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonLine({ width }) {
  return <Skeleton width={width} height={14} style={styles.line} />;
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <Skeleton height={24} style={{ marginBottom: 8, width: '70%' }} />
      <Skeleton height={14} style={{ width: '100%' }} />
      <Skeleton height={14} style={{ width: '50%', marginTop: 6 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 6,
  },
  line: { borderRadius: 4 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
});
