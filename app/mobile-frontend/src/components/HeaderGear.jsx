import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function HeaderGear() {
  const navigation = useNavigation();
  const { logout } = useAuth();
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => logout()}
        style={styles.button}
        activeOpacity={0.7}
        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
      >
        <Text style={styles.signOutText}>{t('home.signOut')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => navigation.navigate('Settings')}
        style={styles.button}
        activeOpacity={0.7}
        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
      >
        <Ionicons name="settings-outline" size={24} color="#e6edf3" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4,
  },
  button: {
    minWidth: 44,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 15,
    color: '#e6edf3',
    fontWeight: '500',
  },
});
