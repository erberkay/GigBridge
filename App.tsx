import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';

const appStyles = StyleSheet.create({
  root: { flex: 1 },
});

export default function App() {
  return (
    <GestureHandlerRootView style={appStyles.root}>
      <StatusBar style="light" />
      <RootNavigator />
    </GestureHandlerRootView>
  );
}
