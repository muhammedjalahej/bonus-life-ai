import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AssessmentScreen from './src/screens/AssessmentScreen';
import ChatScreen from './src/screens/ChatScreen';
import DietPlanScreen from './src/screens/DietPlanScreen';
import EmergencyScreen from './src/screens/EmergencyScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import HospitalsScreen from './src/screens/HospitalsScreen';
import WorkoutVideosScreen from './src/screens/WorkoutVideosScreen';
import MealPhotoScreen from './src/screens/MealPhotoScreen';
import VerifyReportScreen from './src/screens/VerifyReportScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import HeaderGear from './src/components/HeaderGear';
import HeaderLogo from './src/components/HeaderLogo';

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: '#0f1419' },
  headerTintColor: '#e6edf3',
  headerTitleStyle: { fontWeight: '600', fontSize: 17 },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: '#0f1419' },
};

function MainStack() {
  const { t } = useLanguage();
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={screenOptions}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerTitle: () => <HeaderLogo />,
          headerRight: () => <HeaderGear />,
        }}
      />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ title: t('nav.aiChat') }} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: t('nav.myAssessments') }} />
      <Stack.Screen name="Assessment" component={AssessmentScreen} options={{ title: t('nav.riskAssessment') }} />
      <Stack.Screen name="DietPlan" component={DietPlanScreen} options={{ title: t('nav.dietPlan') }} />
      <Stack.Screen name="Emergency" component={EmergencyScreen} options={{ title: t('nav.emergencyCheck') }} />
      <Stack.Screen name="Hospitals" component={HospitalsScreen} options={{ title: t('nav.nearbyHospitals') }} />
      <Stack.Screen name="WorkoutVideos" component={WorkoutVideosScreen} options={{ title: t('nav.workoutVideos') }} />
      <Stack.Screen name="MealPhoto" component={MealPhotoScreen} options={{ title: t('nav.mealAnalyzer') }} />
      <Stack.Screen name="VerifyReport" component={VerifyReportScreen} options={{ title: t('nav.verifyReport') }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t('nav.settings') }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: t('changePassword.title') }} />
    </Stack.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { isAuthenticated, loading, user } = useAuth();
  const { ready, setLanguage } = useLanguage();
  // Sync app language from user profile when user logs in
  React.useEffect(() => {
    if (!user?.preferred_language) return;
    if (user.preferred_language === 'turkish' || user.preferred_language === 'english') {
      setLanguage(user.preferred_language);
    }
  }, [user?.id]);
  if (loading || !ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }
  return isAuthenticated ? <MainStack /> : <AuthStack />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LanguageProvider>
          <NavigationContainer>
            <RootNavigator />
            <StatusBar style="light" />
          </NavigationContainer>
        </LanguageProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#0f1419',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
