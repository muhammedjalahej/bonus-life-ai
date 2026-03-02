import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

/**
 * Logo matching the web app: gradient icon box (emerald → cyan) with heart icon,
 * plus "Bonus Life" (gradient-style color) and "AI" (white).
 */
export default function BonusLifeLogo({ size = 'medium' }) {
  const isSmall = size === 'small';
  const isLarge = size === 'large';

  const iconSize = isSmall ? 20 : isLarge ? 28 : 24;
  const boxSize = isSmall ? 40 : isLarge ? 56 : 44;
  const fontSize = isSmall ? 16 : isLarge ? 22 : 18;
  const borderRadius = isSmall ? 12 : isLarge ? 14 : 12;
  const gap = isSmall ? 8 : isLarge ? 14 : 10;

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={['#10b981', '#06b6d4']}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={[styles.iconBox, { width: boxSize, height: boxSize, borderRadius }]}
      >
        <Ionicons name="heart" size={iconSize} color="#fff" />
      </LinearGradient>
      <View style={[styles.textRow, { marginLeft: gap }]}>
        <Text style={[styles.bonusLife, { fontSize }]} numberOfLines={1}>
          Bonus Life
        </Text>
        <Text style={[styles.ai, { fontSize }]}> AI</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bonusLife: {
    fontWeight: '800',
    letterSpacing: 0.3,
    color: '#34d399',
  },
  ai: {
    fontWeight: '800',
    letterSpacing: 0.3,
    color: '#fff',
  },
});
