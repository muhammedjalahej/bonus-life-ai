import React from 'react';
import { Pressable, StyleSheet, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useRef } from 'react';

export default function HeaderGear() {
  const navigation = useNavigation();
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.88, damping: 20, stiffness: 300, useNativeDriver: true }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    damping: 20, stiffness: 300, useNativeDriver: true }).start();

  return (
    <Animated.View style={[styles.wrap, { transform: [{ scale }] }]}>
      <Pressable
        onPress={() => navigation.navigate('Settings')}
        onPressIn={onIn}
        onPressOut={onOut}
        style={styles.btn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="settings-outline" size={20} color="rgba(237,237,239,0.7)" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginRight: 8 },
  btn: {
    width: 36, height: 36, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
});
