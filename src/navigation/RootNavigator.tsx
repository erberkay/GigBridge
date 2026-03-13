import React, { useEffect, useState } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../services/firebase';
import { useAuthStore } from '../store/authStore';
import { Colors } from '../theme';
import { UserType, OrgRole } from '../types';
import { registerForPushNotifications } from '../services/notificationService';

// Auth ekranları
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import OnboardingScreen, { ONBOARDING_KEY } from '../screens/auth/OnboardingScreen';

// Platform navigatörleri
import CustomerNavigator from './CustomerNavigator';
import ArtistNavigator from './ArtistNavigator';
import VenueNavigator from './VenueNavigator';
import OrganizerNavigator from './OrganizerNavigator';

const Stack = createStackNavigator();

export default function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading       = useAuthStore((s) => s.isLoading);
  const userType        = useAuthStore((s) => s.userType);
  const userId          = useAuthStore((s) => s.userId);
  const setUser         = useAuthStore((s) => s.setUser);
  const clearUser       = useAuthStore((s) => s.clearUser);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      setShowOnboarding(val !== 'true');
    });
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUser({
              userId:      firebaseUser.uid,
              email:       firebaseUser.email ?? '',
              displayName: data.displayName,
              photoURL:    data.photoURL,
              userType:    data.userType as UserType,
              orgId:       data.orgId ?? null,
              orgRole:     (data.orgRole ?? null) as OrgRole | null,
              orgName:     data.orgName ?? null,
            });
          } else {
            clearUser();
          }
        } catch {
          clearUser();
        }
      } else {
        clearUser();
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (userId) {
      registerForPushNotifications(userId);
    }
  }, [userId]);

  if (isLoading || showOnboarding === null) {
    return (
      <View style={navStyles.loader}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={{ ...DarkTheme, colors: { ...DarkTheme.colors, background: Colors.background, card: Colors.surface, text: Colors.text, border: Colors.border, primary: Colors.primary, notification: Colors.primary } }}>
      <Stack.Navigator screenOptions={{ headerShown: false, gestureEnabled: true }}>
        {showOnboarding && !isAuthenticated ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : null}
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} options={{ gestureDirection: 'horizontal' }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ gestureDirection: 'horizontal' }} />
          </>
        ) : (
          <>
            {userType === 'customer'   && <Stack.Screen name="CustomerApp"   component={CustomerNavigator} />}
            {userType === 'artist'     && <Stack.Screen name="ArtistApp"     component={ArtistNavigator} />}
            {userType === 'venue'      && <Stack.Screen name="VenueApp"      component={VenueNavigator} />}
            {userType === 'organizer'  && <Stack.Screen name="OrganizerApp"  component={OrganizerNavigator} />}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const navStyles = StyleSheet.create({
  loader: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
});
