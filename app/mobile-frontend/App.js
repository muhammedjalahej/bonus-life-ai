import React from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator, DrawerContentScrollView } from '@react-navigation/drawer';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  ActivityIndicator, View, Text, StyleSheet, Pressable,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import { COLORS, FONT, RADIUS, SPACING } from './src/config/theme';

// ─── Screen imports ────────────────────────────────────────────────────────────
import WelcomeScreen         from './src/screens/WelcomeScreen';
import LoginScreen           from './src/screens/LoginScreen';
import RegisterScreen        from './src/screens/RegisterScreen';
import ForgotPasswordScreen  from './src/screens/ForgotPasswordScreen';

import HomeScreen            from './src/screens/HomeScreen';
import MoreScreen            from './src/screens/MoreScreen';
import SettingsScreen        from './src/screens/SettingsScreen';
import DashboardScreen       from './src/screens/DashboardScreen';
import ChatScreen            from './src/screens/ChatScreen';

import AssessmentScreen      from './src/screens/AssessmentScreen';
import HeartScreen           from './src/screens/HeartScreen';
import DietPlanScreen        from './src/screens/DietPlanScreen';
import SymptomCheckerScreen  from './src/screens/SymptomCheckerScreen';
import HospitalsScreen       from './src/screens/HospitalsScreen';
import WorkoutVideosScreen   from './src/screens/WorkoutVideosScreen';
import MealPhotoScreen       from './src/screens/MealPhotoScreen';
import VerifyReportScreen    from './src/screens/VerifyReportScreen';
import LocalAIFeaturesScreen from './src/screens/LocalAIFeaturesScreen';
import ChangePasswordScreen  from './src/screens/ChangePasswordScreen';
import BrainMRIScreen        from './src/screens/BrainMRIScreen';
import CKDScreen             from './src/screens/CKDScreen';
import MyDietPlansScreen     from './src/screens/MyDietPlansScreen';
import HelpCenterScreen      from './src/screens/HelpCenterScreen';
import AboutScreen           from './src/screens/AboutScreen';
import EditProfileScreen     from './src/screens/EditProfileScreen';

// ─── Navigators ────────────────────────────────────────────────────────────────
const Stack   = createNativeStackNavigator();
const Tab     = createBottomTabNavigator();
const Drawer  = createDrawerNavigator();

// ─── Navigation theme (Clinical Calm — light) ─────────────────────────────────
const AppLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.bg,
    card:       COLORS.bg,
    text:       COLORS.textPrimary,
    border:     COLORS.borderSubtle,
    primary:    COLORS.purple,
    notification: COLORS.purple,
  },
};

// ─── Shared stack header style ─────────────────────────────────────────────────
const HEADER = {
  headerStyle:       { backgroundColor: COLORS.bg },
  headerTintColor:   COLORS.textPrimary,
  headerTitleStyle:  { fontWeight: FONT.bold, fontSize: FONT.lg, color: COLORS.textPrimary, letterSpacing: -0.2 },
  headerShadowVisible: false,
  headerBackgroundContainerStyle: { borderBottomWidth: 0.5, borderBottomColor: COLORS.borderSubtle },
  contentStyle:      { backgroundColor: COLORS.bg },
};

// ─── Home Stack ────────────────────────────────────────────────────────────────
function HomeStack() {
  const { t } = useLanguage();
  return (
    <Stack.Navigator screenOptions={HEADER}>
      <Stack.Screen name="Home"         component={HomeScreen}           options={{ title: '', headerShown: false }} />
      <Stack.Screen name="Assessment"   component={AssessmentScreen}     options={{ title: 'Diabetes Assessment' }} />
      <Stack.Screen name="Heart"        component={HeartScreen}          options={{ title: 'Heart Risk' }} />
      <Stack.Screen name="CKD"          component={CKDScreen}            options={{ title: 'Kidney Disease (CKD)' }} />
      <Stack.Screen name="BrainMRI"     component={BrainMRIScreen}       options={{ title: 'Brain MRI Analysis' }} />
      <Stack.Screen name="DietPlan"     component={DietPlanScreen}       options={{ title: t('nav.dietPlan') }} />
      <Stack.Screen name="MyDietPlans"  component={MyDietPlansScreen}    options={{ title: 'Your Plans' }} />
      <Stack.Screen name="SymptomChecker" component={SymptomCheckerScreen} options={{ title: 'Symptom Checker' }} />
      <Stack.Screen name="Hospitals"    component={HospitalsScreen}      options={{ title: 'Nearby Hospitals' }} />
      <Stack.Screen name="WorkoutVideos" component={WorkoutVideosScreen} options={{ title: 'Workout Videos' }} />
      <Stack.Screen name="MealPhoto"    component={MealPhotoScreen}      options={{ title: 'Meal Analyzer' }} />
      <Stack.Screen name="VerifyReport" component={VerifyReportScreen}   options={{ title: 'Verify Report' }} />
      <Stack.Screen name="LocalAI"      component={LocalAIFeaturesScreen} options={{ title: 'Local AI' }} />
      <Stack.Screen name="ChatTab"      component={ChatScreen}           options={{ title: 'AI Chat' }} />
    </Stack.Navigator>
  );
}

// ─── Features Stack (More) ─────────────────────────────────────────────────────
function FeaturesStack() {
  const { t } = useLanguage();
  return (
    <Stack.Navigator screenOptions={HEADER}>
      <Stack.Screen name="More"         component={MoreScreen}           options={{ title: 'Explore', headerShown: false }} />
      <Stack.Screen name="Assessment"   component={AssessmentScreen}     options={{ title: 'Diabetes Assessment' }} />
      <Stack.Screen name="Heart"        component={HeartScreen}          options={{ title: 'Heart Risk' }} />
      <Stack.Screen name="CKD"          component={CKDScreen}            options={{ title: 'Kidney Disease (CKD)' }} />
      <Stack.Screen name="BrainMRI"     component={BrainMRIScreen}       options={{ title: 'Brain MRI Analysis' }} />
      <Stack.Screen name="DietPlan"     component={DietPlanScreen}       options={{ title: t('nav.dietPlan') }} />
      <Stack.Screen name="MyDietPlans"  component={MyDietPlansScreen}    options={{ title: 'Your Plans' }} />
      <Stack.Screen name="SymptomChecker" component={SymptomCheckerScreen} options={{ title: 'Symptom Checker' }} />
      <Stack.Screen name="Hospitals"    component={HospitalsScreen}      options={{ title: 'Nearby Hospitals' }} />
      <Stack.Screen name="WorkoutVideos" component={WorkoutVideosScreen} options={{ title: 'Workout Videos' }} />
      <Stack.Screen name="MealPhoto"    component={MealPhotoScreen}      options={{ title: 'Meal Analyzer' }} />
      <Stack.Screen name="VerifyReport" component={VerifyReportScreen}   options={{ title: 'Verify Report' }} />
      <Stack.Screen name="LocalAI"      component={LocalAIFeaturesScreen} options={{ title: 'Local AI' }} />
      <Stack.Screen name="ChatTab"      component={ChatScreen}           options={{ title: 'AI Chat' }} />
      <Stack.Screen name="Settings"     component={SettingsScreen}       options={{ title: 'Settings' }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Change Password' }} />
    </Stack.Navigator>
  );
}

// ─── History Stack ──────────────────────────────────────────────────────────────
function HistoryStack() {
  return (
    <Stack.Navigator screenOptions={HEADER}>
      <Stack.Screen name="Dashboard"    component={DashboardScreen}      options={{ title: 'History', headerShown: false }} />
      <Stack.Screen name="BrainMRI"     component={BrainMRIScreen}       options={{ title: 'Brain MRI Analysis' }} />
      <Stack.Screen name="MyDietPlans"  component={MyDietPlansScreen}    options={{ title: 'Your Plans' }} />
      <Stack.Screen name="DietPlan"     component={DietPlanScreen}       options={{ title: 'Diet Plan' }} />
    </Stack.Navigator>
  );
}

// ─── Profile Stack ──────────────────────────────────────────────────────────────
function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={HEADER}>
      <Stack.Screen name="Settings"       component={SettingsScreen}       options={{ title: 'Profile', headerShown: false }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Change Password' }} />
      <Stack.Screen name="VerifyReport"   component={VerifyReportScreen}   options={{ title: 'Verify Report' }} />
      <Stack.Screen name="HelpCenter"     component={HelpCenterScreen}     options={{ title: 'Help Center' }} />
      <Stack.Screen name="About"          component={AboutScreen}          options={{ title: 'About' }} />
      <Stack.Screen name="EditProfile"    component={EditProfileScreen}    options={{ title: 'Edit Profile' }} />
    </Stack.Navigator>
  );
}

// ─── Tab icon map ───────────────────────────────────────────────────────────────
const TAB_ICONS = {
  HomeTab:     { active: 'home',       inactive: 'home-outline'       },
  FeaturesTab: { active: 'grid',       inactive: 'grid-outline'       },
  HistoryTab:  { active: 'time',       inactive: 'time-outline'       },
  ProfileTab:  { active: 'person',     inactive: 'person-outline'     },
};


// ─── Tab icon with active indicator bar ABOVE icon ────────────────────────────
function TabIcon({ routeName, focused, color }) {
  const icons = TAB_ICONS[routeName] || { active: 'ellipse', inactive: 'ellipse-outline' };
  return (
    <View style={{ alignItems: 'center', gap: 3 }}>
      {focused && (
        <View style={{
          position: 'absolute',
          top: -12,
          width: 20,
          height: 2.5,
          backgroundColor: '#2D6A4F',
          borderRadius: 2,
        }} />
      )}
      <Ionicons name={focused ? icons.active : icons.inactive} size={22} color={color} />
    </View>
  );
}

// ─── Bottom Tab Navigator ──────────────────────────────────────────────────────
function BottomTabNavigator({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor:   '#2D6A4F',
        tabBarInactiveTintColor: 'rgba(28,27,24,0.35)',
        tabBarLabelStyle: { fontSize: FONT.xs, fontWeight: FONT.medium, marginBottom: 4 },
        tabBarStyle: {
          backgroundColor: '#F7F4ED',
          borderTopWidth: 0.5,
          borderTopColor: 'rgba(28,27,24,0.1)',
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarIcon: ({ focused, color }) => (
          <TabIcon routeName={route.name} focused={focused} color={color} />
        ),
      })}
      screenListeners={{
        tabPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        },
      }}
    >
      <Tab.Screen name="HomeTab"     component={HomeStack}     options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="FeaturesTab" component={FeaturesStack} options={{ tabBarLabel: 'Features' }} />
      <Tab.Screen name="HistoryTab"  component={HistoryStack}  options={{ tabBarLabel: 'History' }} />
      <Tab.Screen name="ProfileTab"  component={ProfileStack}  options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

// ─── Custom Drawer Content ─────────────────────────────────────────────────────
const DRAWER_SECTIONS = [
  {
    label: 'MENU',
    items: [
      { label: 'Home',     icon: 'home-outline',        activeIcon: 'home',        tab: 'HomeTab',    color: '#2D6A4F' },
      { label: 'Features', icon: 'grid-outline',        activeIcon: 'grid',        tab: 'FeaturesTab', color: '#6366F1' },
      { label: 'History',  icon: 'time-outline',        activeIcon: 'time',        tab: 'HistoryTab',  color: '#6B8794' },
      { label: 'AI Chat',  icon: 'chatbubbles-outline', activeIcon: 'chatbubbles', drawer: 'ChatDrawer', color: '#B4781E' },
    ],
  },
];

/* ── Guest-only nav sections ──────────────────────────────────────────────── */
const GUEST_SECTIONS = [
  {
    label: 'EXPLORE',
    items: [
      { label: 'Home',      icon: 'home-outline',     activeIcon: 'home',     tab: 'HomeTab',            color: '#2D6A4F' },
      { label: 'Hospitals', icon: 'location-outline', activeIcon: 'location', drawer: 'HospitalsDrawer', color: '#C85A3A' },
    ],
  },
];

function DrawerItem({ item, isActive, onPress, isLast }) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.97, damping: 20, stiffness: 300, useNativeDriver: true }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    damping: 20, stiffness: 300, useNativeDriver: true }).start();
  const color = item.color || '#2D6A4F';
  return (
    <Animated.View style={[{ transform: [{ scale }] }, !isLast && dr.itemDivider]}>
      <Pressable style={[dr.item, isActive && dr.itemActive]} onPress={onPress} onPressIn={onIn} onPressOut={onOut}>
        <View style={[dr.itemIcon, { backgroundColor: color + '18', borderColor: color + '30' }]}>
          <Ionicons name={isActive ? item.activeIcon : item.icon} size={16} color={isActive ? color : color + 'AA'} />
        </View>
        <Text style={[dr.itemLabel, isActive && { color, fontWeight: FONT.semibold }]}>{item.label}</Text>
        <Ionicons name="chevron-forward" size={13} color="rgba(28,27,24,0.2)" />
      </Pressable>
    </Animated.View>
  );
}

function CustomDrawer({ state, navigation }) {
  const { user, logout, isGuest } = useAuth();
  const { language }              = useLanguage();
  const insets                    = useSafeAreaInsets();

  const isLoggedIn  = !!user;
  const rawName     = isLoggedIn ? (user.full_name || user.email || 'User').split('@')[0].split(' ')[0] : 'Guest';
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
  const initials = isLoggedIn ? displayName.substring(0, 2).toUpperCase() : 'G';

  const sections = isLoggedIn ? DRAWER_SECTIONS : GUEST_SECTIONS;

  const handleItem = (item) => {
    if (item.drawer) {
      navigation.navigate(item.drawer);
    } else if (item.sub) {
      navigation.navigate('MainTabs', { screen: 'HomeTab', params: { screen: item.sub } });
    } else if (item.tab) {
      navigation.navigate('MainTabs', { screen: item.tab });
    }
    navigation.closeDrawer();
  };

  return (
    <View style={[dr.container, { paddingTop: insets.top }]}>
      {/* ── Logo row ── */}
      <View style={dr.logoRow}>
        <View style={dr.logoSquare}>
          <Ionicons name="pulse-outline" size={15} color="#F7F4ED" />
        </View>
        <View>
          <Text style={dr.appName}>Bonus Life</Text>
          <Text style={dr.appTagline}>Health Intelligence</Text>
        </View>
      </View>

      {/* ── Sections (scrollable) ── */}
      <DrawerContentScrollView contentContainerStyle={dr.scrollContent} showsVerticalScrollIndicator={false}>
        {sections.map((section) => (
          <View key={section.label} style={dr.section}>
            <Text style={dr.sectionLabel}>{section.label}</Text>
            <View style={dr.sectionCard}>
              {section.items.map((item, i) => (
                <DrawerItem
                  key={item.label}
                  item={item}
                  isActive={false}
                  isLast={i === section.items.length - 1}
                  onPress={() => handleItem(item)}
                />
              ))}
            </View>
          </View>
        ))}

        {/* ── Guest: Sign In CTA ── */}
        {!isLoggedIn && (
          <View style={dr.guestCTA}>
            <Pressable style={dr.signInBtn} onPress={() => { navigation.closeDrawer(); logout(); }}>
              <Ionicons name="log-in-outline" size={16} color="#F7F4ED" />
              <Text style={dr.signInBtnText}>Sign In</Text>
            </Pressable>
            <Text style={dr.guestCTAHint}>
              Create a free account to access health assessments, AI tools, diet plans, and your personal history.
            </Text>
          </View>
        )}
      </DrawerContentScrollView>

      {/* ── Bottom: user card + logout ── */}
      <View style={[dr.bottomSection, { paddingBottom: insets.bottom + 16 }]}>
        <View style={dr.bottomDivider} />

        {isLoggedIn ? (
          <View style={dr.userRow}>
            {/* Avatar + name → taps to Settings */}
            <Pressable
              style={dr.userInfo}
              onPress={() => { navigation.navigate('MainTabs', { screen: 'ProfileTab' }); navigation.closeDrawer(); }}
            >
              <View style={dr.avatar}>
                <Text style={dr.avatarText}>{initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={dr.userName} numberOfLines={1}>{displayName}</Text>
                <Text style={dr.userEmail} numberOfLines={1}>{user?.email || ''}</Text>
              </View>
            </Pressable>

            {/* Divider */}
            <View style={dr.userRowDivider} />

            {/* Sign out icon */}
            <Pressable style={dr.logoutIconBtn} onPress={() => { navigation.closeDrawer(); logout(); }}>
              <Ionicons name="log-out-outline" size={18} color="#C85A3A" />
            </Pressable>
          </View>
        ) : (
          <View style={dr.guestCard}>
            <View style={dr.guestIcon}>
              <Ionicons name="person-outline" size={16} color="rgba(28,27,24,0.4)" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={dr.guestName}>Browsing as Guest</Text>
              <Text style={dr.guestSub}>Sign in for full access</Text>
            </View>
          </View>
        )}

      </View>
    </View>
  );
}

const dr = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F4ED',
  },

  /* Logo row */
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(28,27,24,0.07)',
  },
  logoSquare: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#2D6A4F',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  appName: {
    fontSize: FONT.xl,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic',
    fontWeight: FONT.bold,
    color: '#1C1B18',
    letterSpacing: -0.4,
    lineHeight: 22,
  },
  appTagline: {
    fontSize: 10,
    color: 'rgba(28,27,24,0.35)',
    letterSpacing: 0.2,
    marginTop: 1,
  },

  /* User row */
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(28,27,24,0.07)',
    overflow: 'hidden',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  userRowDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(28,27,24,0.08)',
  },
  logoutIconBtn: {
    paddingHorizontal: 16,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2D6A4F',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: FONT.sm,
    fontWeight: FONT.bold,
    color: '#F7F4ED',
    fontStyle: 'italic',
  },
  userName: {
    fontSize: FONT.sm,
    fontWeight: FONT.semibold,
    color: '#1C1B18',
    letterSpacing: -0.1,
  },
  userEmail: {
    fontSize: 10,
    color: 'rgba(28,27,24,0.38)',
    marginTop: 1,
  },

  /* Sections */
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: FONT.bold,
    color: 'rgba(28,27,24,0.28)',
    letterSpacing: 1.6,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  sectionCard: {
    overflow: 'hidden',
  },

  /* Items */
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  itemActive: {
    backgroundColor: 'rgba(45,106,79,0.06)',
  },
  itemDivider: {},
  itemIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    flex: 1,
    fontSize: FONT.md,
    fontWeight: FONT.medium,
    color: '#1C1B18',
  },


  /* Guest card */
  guestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.md,
    backgroundColor: 'rgba(28,27,24,0.04)',
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(28,27,24,0.08)',
  },
  guestIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(28,27,24,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestName: {
    fontSize: FONT.sm,
    fontWeight: FONT.semibold,
    color: 'rgba(28,27,24,0.55)',
  },
  guestSub: {
    fontSize: 10,
    color: 'rgba(28,27,24,0.35)',
    marginTop: 1,
  },
  guestCTA: {
    marginTop: SPACING.md,
    gap: 12,
  },
  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2D6A4F',
    borderRadius: RADIUS.md,
    paddingVertical: 13,
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  signInBtnText: {
    fontSize: FONT.md,
    fontWeight: FONT.bold,
    color: '#F7F4ED',
  },
  guestCTAHint: {
    fontSize: 11,
    color: 'rgba(28,27,24,0.35)',
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: 4,
  },

  /* Bottom section (user card + logout + version) */
  bottomSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 8,
  },
  bottomDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(28,27,24,0.08)',
    marginBottom: 14,
  },
  footerText: {
    fontSize: 10,
    color: 'rgba(28,27,24,0.28)',
    letterSpacing: 0.4,
    textAlign: 'center',
    marginBottom: 2,
  },
});

// ─── Chat screen stack (standalone for drawer) ─────────────────────────────────
function ChatDrawerStack() {
  return (
    <Stack.Navigator screenOptions={HEADER}>
      <Stack.Screen name="ChatMain" component={ChatScreen} options={{ title: 'AI Chat' }} />
    </Stack.Navigator>
  );
}

// ─── Hospitals screen stack (standalone for drawer) ────────────────────────────
function HospitalsDrawerStack() {
  return (
    <Stack.Navigator screenOptions={HEADER}>
      <Stack.Screen name="HospitalsMain" component={HospitalsScreen} options={{ title: 'Nearby Hospitals' }} />
    </Stack.Navigator>
  );
}

// ─── Drawer Navigator ──────────────────────────────────────────────────────────
function DrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawer {...props} />}
      screenOptions={{
        headerShown:     false,
        drawerStyle:     { backgroundColor: '#F7F4ED', width: 280 },
        overlayColor:    'rgba(0,0,0,0.55)',
        drawerType:      Platform.OS === 'web' ? 'front' : 'slide',
        swipeEdgeWidth:  Platform.OS === 'web' ? 0 : 40,
      }}
    >
      <Drawer.Screen name="MainTabs"        component={BottomTabNavigator} />
      <Drawer.Screen name="ChatDrawer"      component={ChatDrawerStack} />
      <Drawer.Screen name="HospitalsDrawer" component={HospitalsDrawerStack} />
    </Drawer.Navigator>
  );
}


// ─── Auth Stack ────────────────────────────────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome"        component={WelcomeScreen} />
      <Stack.Screen name="Login"          component={LoginScreen} />
      <Stack.Screen name="Register"       component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

// ─── Root navigator ────────────────────────────────────────────────────────────
function RootNavigator() {
  const { isAuthenticated, isGuest, loading, user } = useAuth();
  const { ready, setLanguage } = useLanguage();

  React.useEffect(() => {
    if (!user?.preferred_language) return;
    if (user.preferred_language === 'turkish' || user.preferred_language === 'english') {
      setLanguage(user.preferred_language);
    }
  }, [user?.id]);

  if (loading || !ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.purple} />
      </View>
    );
  }

  return (isAuthenticated || isGuest) ? <DrawerNavigator /> : <AuthStack />;
}

// ─── Error Boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#08080D', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: '#EF4444', fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>App Error</Text>
          <Text style={{ color: '#F1F1F4', fontSize: 13, textAlign: 'center', fontFamily: 'monospace' }}>
            {this.state.error.toString()}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// ─── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.gestureRoot}>
        <View style={styles.phoneFrame}>
          <SafeAreaProvider>
            <AuthProvider>
              <LanguageProvider>
                <NavigationContainer theme={AppLightTheme}>
                  <RootNavigator />
                  <StatusBar style="dark" />
                </NavigationContainer>
              </LanguageProvider>
            </AuthProvider>
          </SafeAreaProvider>
        </View>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
    backgroundColor: '#F7F4ED',
    alignItems: 'center',
  },
  phoneFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    overflow: 'hidden',
    backgroundColor: '#F7F4ED',
  },
  loading: {
    flex: 1,
    backgroundColor: '#F7F4ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
