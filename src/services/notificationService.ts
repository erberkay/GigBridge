import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(userId: string): Promise<void> {
  if (!userId || userId.startsWith('demo_')) return;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'djing-ba986',
    });

    await setDoc(
      doc(db, 'users', userId),
      { pushToken: tokenData.data, pushTokenUpdatedAt: new Date().toISOString() },
      { merge: true },
    );

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'GigBridge',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#A855F7',
      });
    }
  } catch {
    // Push token kaydedilemezse sessizce geç
  }
}

export function useNotificationListeners(
  onReceived?: (n: Notifications.Notification) => void,
  onResponse?: (r: Notifications.NotificationResponse) => void,
) {
  const receivedSub = Notifications.addNotificationReceivedListener((n) => onReceived?.(n));
  const responseSub = Notifications.addNotificationResponseReceivedListener((r) => onResponse?.(r));
  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}
