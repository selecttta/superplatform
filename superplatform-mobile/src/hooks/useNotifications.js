import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

export function useNotifications() {
  const { user } = useAuthStore();
  const notifListener    = useRef();
  const responseListener = useRef();

  useEffect(() => {
    if (!user || !Device.isDevice) return;

    (async () => {
      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;
      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') return;

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#f97316',
        });
      }

      // Get Expo push token and save to profile
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      await supabase.from('profiles').update({ push_token: token }).eq('id', user.id);
    })();

    // Listen for incoming notifications
    notifListener.current = Notifications.addNotificationReceivedListener(notification => {
      // You can update local state here if needed
      console.log('[Notification received]', notification.request.content.title);
    });

    // Listen for user tapping on notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      // Handle deep-link navigation here based on data.type
    });

    return () => {
      Notifications.removeNotificationSubscription(notifListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [user]);
}
