import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Custom tab bar at the top: three pill-style buttons (Home, Chat, More).
 * Clinical Calm — cream bg, sage active state.
 */
export default function TopTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel ?? options.title ?? route.name;
          const isFocused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={[styles.tab, isFocused && styles.tabActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F7F4ED',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(28,27,24,0.08)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: 'rgba(28,27,24,0.08)',
    shadowColor: '#1C1B18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  tabActive: {
    backgroundColor: '#2D6A4F',
    borderColor: '#2D6A4F',
    shadowOpacity: 0,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(28,27,24,0.5)',
  },
  tabLabelActive: {
    color: '#F7F4ED',
  },
});
