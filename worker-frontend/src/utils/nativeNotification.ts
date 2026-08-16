import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export async function initNativeNotifications() {
  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }
    } catch (e) {
      console.warn('Native notification permission error:', e);
    }
  } else if ('Notification' in window) {
    if (Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (e) {
        console.warn('Web notification permission error:', e);
      }
    }
  }
}

export async function triggerDeviceNotification(title: string, body: string, iconUrl?: string) {
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: title || 'Jaya Bhavani Jewellers',
            body: body || 'New message update',
            id: Math.floor(Math.random() * 100000),
            schedule: { at: new Date(Date.now() + 100) },
            sound: 'res://platform_default',
            smallIcon: 'ic_launcher',
            iconColor: '#d97706',
          },
        ],
      });
    } catch (e) {
      console.warn('Failed to schedule local notification:', e);
    }
  } else if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: iconUrl || '/JB_logo_mobile.png',
        badge: '/JB_logo_mobile.png',
      });
    } catch (e) {
      console.warn('Web notification error:', e);
    }
  }
}
