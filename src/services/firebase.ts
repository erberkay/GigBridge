import { initializeApp } from 'firebase/app';
import { initializeAuth } from 'firebase/auth';
import { getReactNativePersistence } from '@firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyB6nrk5SnXMl51Qdpv_ctdFcWPrisiYbCc',
  authDomain: 'djing-ba986.firebaseapp.com',
  projectId: 'djing-ba986',
  storageBucket: 'djing-ba986.firebasestorage.app',
  messagingSenderId: '70897940978',
  appId: '1:70897940978:web:37f6c8f2c36c454d43d36b',
  measurementId: 'G-L3JMS6CWN5',
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
