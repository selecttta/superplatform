import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import RootNavigator from './src/navigation/RootNavigator';
import { useAuthStore } from './src/store/authStore';
import { useNotifications } from './src/hooks/useNotifications';

function NotificationSetup() {
  useNotifications();
  return null;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" backgroundColor="transparent" translucent />
      <NotificationSetup />
      <RootNavigator />
      <Toast />
    </GestureHandlerRootView>
  );
}
