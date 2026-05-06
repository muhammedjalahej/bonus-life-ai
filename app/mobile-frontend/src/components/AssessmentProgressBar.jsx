/**
 * AssessmentProgressBar — thin gradient line shown at the top of assessment screens
 * Usage: <AssessmentProgressBar progress={0.6} color="#8B5CF6" />
 */
import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../config/theme';

export default function AssessmentProgressBar({ progress = 0.5, color = COLORS.purple }) {
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: progress,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const widthPct = width.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={s.track}>
      <Animated.View style={[s.fill, { width: widthPct }]}>
        <LinearGradient
          colors={[color, color + 'AA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  track: {
    height: 3,
    backgroundColor: 'rgba(28,27,24,0.08)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    overflow: 'hidden',
  },
});
