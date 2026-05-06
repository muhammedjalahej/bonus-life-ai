/**
 * FeatureCard — Clinical Calm tinted card for 2×2 grids on HomeScreen
 */
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, FONT, COLORS } from '../config/theme';

export default function FeatureCard({ tool, onPress, index = 0, style }) {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const transY  = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration: 320,
        delay: index * 60, useNativeDriver: true,
      }),
      Animated.spring(transY, {
        toValue: 0, delay: index * 60,
        damping: 20, stiffness: 90, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const onIn  = () => Animated.spring(scale, { toValue: 0.97, damping: 18, stiffness: 280, useNativeDriver: true }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    damping: 18, stiffness: 280, useNativeDriver: true }).start();

  const color = tool.color || COLORS.purple;

  return (
    <Animated.View style={[
      s.wrap,
      {
        opacity,
        transform: [{ scale }, { translateY: transY }],
        backgroundColor: color + '12',
        borderColor: color + '20',
      },
      style,
    ]}>
      {/* Decorative blob */}
      <View style={[s.blob, { backgroundColor: color + '1A' }]} />

      <Pressable style={s.inner} onPress={onPress} onPressIn={onIn} onPressOut={onOut}>
        {/* Icon container */}
        <View style={[s.iconWrap, { backgroundColor: color + '22' }]}>
          <Ionicons name={tool.icon} size={20} color={color} />
        </View>

        <Text style={s.label} numberOfLines={1}>{tool.label}</Text>
        {tool.hint ? (
          <Text style={s.hint} numberOfLines={1}>{tool.hint}</Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: {
    borderRadius: RADIUS.lg,
    borderWidth: 0.5,
    overflow: 'hidden',
    minHeight: 108,
  },
  blob: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  inner: {
    padding: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: FONT.md,
    fontWeight: FONT.semibold,
    color: '#1C1B18',
    marginBottom: 2,
  },
  hint: {
    fontSize: 11,
    color: 'rgba(28,27,24,0.45)',
    fontWeight: FONT.regular,
  },
});
