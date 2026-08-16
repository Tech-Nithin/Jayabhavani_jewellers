import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { API_BASE } from '../config/apiConfig';

export async function initFcmPushNotifications(userOrWorkerId: string, role: 'WORKER' | 'ADMIN' = 'WORKER') {
  if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('PushNotifications')) return;

  try {
    const perm = await PushNotifications.checkPermissions();
    if (perm.receive !== 'granted') {
      const req = await PushNotifications.requestPermissions();
      if (req.receive !== 'granted') {
        console.warn('Push notification permission denied by user.');
        return;
      }
    }

    // Register with Google FCM gateway safely without crashing if Firebase is uninitialized
    try {
      await PushNotifications.register();
    } catch (regErr: any) {
      console.warn('⚠️ FCM Firebase registration notice (unconfigured google-services.json):', regErr.message);
    }

    // Listen for FCM Device Token registration
    PushNotifications.addListener('registration', async (token) => {
      console.log('FCM Token received:', token.value);
      try {
        await fetch(`${API_BASE}/work-assignment/register-fcm-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userOrWorkerId,
            role: role,
            fcmToken: token.value,
            platform: Capacitor.getPlatform(),
          }),
        });
      } catch (e) {
        console.warn('Failed to send FCM token to backend:', e);
      }
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('FCM Registration Error:', err);
    });

    // Listen for incoming FCM push payloads when app is active
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('FCM Push Notification Received:', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('FCM Push Notification Action Performed:', notification);
    });
  } catch (err) {
    console.warn('FCM Initialization Exception:', err);
  }
}
