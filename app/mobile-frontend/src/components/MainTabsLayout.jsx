import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import TopTabBar from './TopTabBar';
import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '../screens/ChatScreen';
import MoreScreen from '../screens/MoreScreen';

/**
 * Tabs at the top (like quick access menu): Home | Chat | More as buttons.
 * Renders the bar above the content so there are no dropdowns.
 */
export default function MainTabsLayout({ navigation }) {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);

  const state = {
    routes: [
      { key: 'HomeTab', name: 'HomeTab' },
      { key: 'Chat', name: 'Chat' },
      { key: 'MoreTab', name: 'MoreTab' },
    ],
    index,
  };

  const descriptors = {
    HomeTab: { options: { tabBarLabel: t('nav.home') } },
    Chat: { options: { tabBarLabel: t('nav.chat') } },
    MoreTab: { options: { tabBarLabel: t('nav.more') } },
  };

  const nav = {
    navigate: (name) => {
      const i = state.routes.findIndex((r) => r.name === name);
      if (i >= 0) setIndex(i);
    },
    emit: () => ({ defaultPrevented: false }),
  };

  const CurrentScreen =
    index === 0 ? HomeScreen : index === 1 ? ChatScreen : MoreScreen;

  return (
    <View style={styles.container}>
      <TopTabBar
        state={state}
        descriptors={descriptors}
        navigation={nav}
      />
      <View style={styles.content}>
        <CurrentScreen navigation={navigation} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F4ED' },
  content: { flex: 1 },
});
