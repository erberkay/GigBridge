import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CardStyleInterpolators, createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme';

import CustomerHomeScreen from '../screens/customer/HomeScreen';
import MapScreen from '../screens/customer/MapScreen';
import CustomerProfileScreen from '../screens/customer/ProfileScreen';
import ArtistDetailScreen from '../screens/customer/ArtistDetailScreen';
import EventDetailScreen from '../screens/customer/EventDetailScreen';
import EventsScreen from '../screens/customer/EventsScreen';
import VenueDetailScreen from '../screens/customer/VenueDetailScreen';
import TimelineScreen from '../screens/customer/TimelineScreen';
import EventAttendeesScreen from '../screens/customer/EventAttendeesScreen';
import MessagesScreen from '../screens/common/MessagesScreen';
import ProAccountScreen from '../screens/common/ProAccountScreen';
import NotificationsScreen from '../screens/common/NotificationsScreen';
import PrivacySettingsScreen from '../screens/common/PrivacySettingsScreen';
import FollowingScreen from '../screens/customer/FollowingScreen';
import FavoritesScreen from '../screens/customer/FavoritesScreen';
import MyReviewsScreen from '../screens/customer/MyReviewsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const ACTIVE = '#FFFFFF';

function CustomerTabs() {
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
          bottom: 0,
          left: 0,
          right: 0,
          borderRadius: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 1,
          borderTopColor: 'rgba(168,85,247,0.25)',
          height: 80,
          paddingBottom: 16,
          paddingTop: 8,
          elevation: 20,
        },
      }}
    >
      <Tab.Screen
        name="CustomerHome"
        component={CustomerHomeScreen}
        options={{
          tabBarLabel: 'Keşfet',
          tabBarIcon: ({ focused, color }) => (
            <View style={{ alignItems: 'center' }}>
              {focused && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: ACTIVE, marginBottom: 2 }} />}
              <Ionicons name={focused ? 'compass' : 'compass-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarLabel: 'Harita',
          tabBarIcon: ({ focused, color }) => (
            <View style={{ alignItems: 'center' }}>
              {focused && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: ACTIVE, marginBottom: 2 }} />}
              <Ionicons name={focused ? 'map' : 'map-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Timeline"
        component={TimelineScreen}
        options={{
          tabBarLabel: 'Akış',
          tabBarIcon: ({ focused, color }) => (
            <View style={{ alignItems: 'center' }}>
              {focused && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: ACTIVE, marginBottom: 2 }} />}
              <Ionicons name={focused ? 'newspaper' : 'newspaper-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
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
        name="CustomerProfile"
        component={CustomerProfileScreen}
        options={{
          tabBarLabel: 'Profil',
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

export default function CustomerNavigator() {
  return (
    <Stack.Navigator screenOptions={{
      headerShown: false,
      cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
      transitionSpec: {
        open: { animation: 'spring', config: { stiffness: 900, damping: 80, mass: 1 } },
        close: { animation: 'spring', config: { stiffness: 900, damping: 80, mass: 1 } },
      },
    }}>
      <Stack.Screen name="CustomerTabs" component={CustomerTabs} />
      <Stack.Screen name="ArtistDetail" component={ArtistDetailScreen} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} />
      <Stack.Screen name="Events" component={EventsScreen} />
      <Stack.Screen name="VenueDetail" component={VenueDetailScreen} />
      <Stack.Screen name="ProAccount" component={ProAccountScreen} />
      <Stack.Screen name="EventAttendees" component={EventAttendeesScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} />
      <Stack.Screen name="Following" component={FollowingScreen} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
      <Stack.Screen name="MyReviews" component={MyReviewsScreen} />
    </Stack.Navigator>
  );
}
