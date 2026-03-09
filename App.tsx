import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import RootNavigator from './src/navigation/RootNavigator';
import { useAuthStore } from './src/store/authStore';
import { registerForPushNotifications, setupNotificationListeners } from './src/services/notifications';

function AppContent() {
  const { userId } = useAuthStore();
  const notificationListener = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Push token kaydet
    registerForPushNotifications(userId).catch(() => {});

    // Bildirim dinleyicilerini kur
    const cleanup = setupNotificationListeners(
      (_notification) => {
        // Uygulama açıkken gelen bildirim — gerekirse state güncellenebilir
      },
      (_response) => {
        // Bildirime tıklama — gerekirse navigation yapılabilir
      },
    );
    notificationListener.current = cleanup;

    return () => notificationListener.current?.();
  }, [userId]);

  return <RootNavigator />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <AppContent />
    </GestureHandlerRootView>
  );
}
