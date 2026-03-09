import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CardStyleInterpolators, createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme';

import VenueHomeScreen from '../screens/venue/HomeScreen';
import AnalyticsScreen from '../screens/venue/AnalyticsScreen';
import VenueProfileScreen from '../screens/venue/ProfileScreen';
import FindArtistScreen from '../screens/venue/FindArtistScreen';
import MessagesScreen from '../screens/common/MessagesScreen';
import ProAccountScreen from '../screens/common/ProAccountScreen';
import NotificationsScreen from '../screens/common/NotificationsScreen';
import PrivacySettingsScreen from '../screens/common/PrivacySettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const ACTIVE = Colors.venueColor ?? Colors.primary;

function VenueTabs() {
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
        tabBarStyle: {
          position: 'absolute',
          bottom: 20, left: 20, right: 20,
          borderRadius: 24,
          backgroundColor: '#13131E',
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.06)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.07)',
          height: 70, paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.4,
          shadowRadius: 20,
          elevation: 16,
        },
      }}
    >
      <Tab.Screen
        name="VenueHome"
        component={VenueHomeScreen}
        options={{
          tabBarLabel: 'Ana Sayfa',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="FindArtist"
        component={FindArtistScreen}
        options={{
          tabBarLabel: 'Sanatçı Bul',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'search-circle' : 'search-circle-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          tabBarLabel: 'Analitik',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="VenueMessages"
        component={MessagesScreen}
        options={{
          tabBarLabel: 'Mesajlar',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="VenueProfile"
        component={VenueProfileScreen}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'business' : 'business-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function VenueNavigator() {
  return (
    <Stack.Navigator screenOptions={{
      headerShown: false,
      cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
      transitionSpec: {
        open: { animation: 'spring', config: { stiffness: 900, damping: 80, mass: 1 } },
        close: { animation: 'spring', config: { stiffness: 900, damping: 80, mass: 1 } },
      },
    }}>
      <Stack.Screen name="VenueTabs" component={VenueTabs} />
      <Stack.Screen name="ProAccount" component={ProAccountScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} />
    </Stack.Navigator>
  );
}
