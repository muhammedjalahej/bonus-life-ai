import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useLanguage } from '../context/LanguageContext';

export default function HeaderLogo() {
  const { t } = useLanguage();
  return <Text style={styles.logo}>{t('appName')}</Text>;
}

const styles = StyleSheet.create({
  logo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
    letterSpacing: 0.4,
  },
});
