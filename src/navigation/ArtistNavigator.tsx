import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CardStyleInterpolators, createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme';

import ArtistHomeScreen from '../screens/artist/HomeScreen';
import ArtistProfileScreen from '../screens/artist/ProfileScreen';
import VenueReviewScreen from '../screens/artist/VenueReviewScreen';
import MessagesScreen from '../screens/common/MessagesScreen';
import ProAccountScreen from '../screens/common/ProAccountScreen';
import NotificationsScreen from '../screens/common/NotificationsScreen';
import PrivacySettingsScreen from '../screens/common/PrivacySettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const ACTIVE = Colors.artistColor ?? Colors.primary;

function ArtistTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 4,
        },
        tabBarBackground: () => (
          <LinearGradient
            colors={['rgba(10,11,14,0.55)', 'rgba(10,11,14,0.97)']}
            style={{ flex: 1 }}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          />
        ),
        tabBarStyle: {
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          borderRadius: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 1,
          borderTopColor: 'rgba(168,85,247,0.25)',
          height: 80, paddingBottom: 16, paddingTop: 8,
          elevation: 20,
        },
      }}
    >
      <Tab.Screen
        name="ArtistHome"
        component={ArtistHomeScreen}
        options={{
          tabBarLabel: 'Ana Sayfa',
          tabBarIcon: ({ focused, color }) => (
            <View style={{ alignItems: 'center' }}>
              {focused && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: ACTIVE, marginBottom: 2 }} />}
              <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="VenueReview"
        component={VenueReviewScreen}
        options={{
          tabBarLabel: 'Mekanlar',
          tabBarIcon: ({ focused, color }) => (
            <View style={{ alignItems: 'center' }}>
              {focused && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: ACTIVE, marginBottom: 2 }} />}
              <Ionicons name={focused ? 'star' : 'star-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="ArtistMessages"
        component={MessagesScreen}
        options={{
          tabBarLabel: 'Mesajlar',
          tabBarIcon: ({ focused, color }) => (
            <View style={{ alignItems: 'center' }}>
              {focused && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: ACTIVE, marginBottom: 2 }} />}
              <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="ArtistProfile"
        component={ArtistProfileScreen}
        options={{
          tabBarLabel: 'Profilim',
          tabBarIcon: ({ focused, color }) => (
            <View style={{ alignItems: 'center' }}>
              {focused && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: ACTIVE, marginBottom: 2 }} />}
              <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function ArtistNavigator() {
  return (
    <Stack.Navigator screenOptions={{
      headerShown: false,
      cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
      transitionSpec: {
        open: { animation: 'spring', config: { stiffness: 900, damping: 80, mass: 1 } },
        close: { animation: 'spring', config: { stiffness: 900, damping: 80, mass: 1 } },
      },
    }}>
      <Stack.Screen name="ArtistTabs" component={ArtistTabs} />
      <Stack.Screen name="ProAccount" component={ProAccountScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} />
    </Stack.Navigator>
  );
}
