import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export const HIGH_PRIORITY_CHANNEL_ID = 'jbj_chat_channel_v2';

export async function initNativeNotifications() {
  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }

      // Create High-Priority Notification Channel (Importance 5 = Heads Up, Lockscreen Visibility 1 = Public, Sound, Vibration & Screen Light-Up)
      await LocalNotifications.createChannel({
        id: HIGH_PRIORITY_CHANNEL_ID,
        name: 'Jaya Bhavani Real-time Chat',
        description: 'High-priority notifications for new chat transactions & work assignments',
        importance: 5, // 5 = Max/High Importance (triggers Heads-Up popup & screen turn on)
        visibility: 1, // 1 = Public visibility (shows full content on lock screen)
        sound: 'res://platform_default',
        vibration: true,
        lights: true,
        lightColor: '#d97706',
      });
    } catch (e) {
      console.warn('Native notification permission/channel error:', e);
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
            id: Math.floor(Math.random() * 1000000),
            channelId: HIGH_PRIORITY_CHANNEL_ID,
            schedule: { at: new Date(Date.now() + 50) },
            sound: 'res://platform_default',
            smallIcon: 'ic_launcher',
            iconColor: '#d97706',
            actionTypeId: '',
            extra: null,
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
        requireInteraction: true,
      });
    } catch (e) {
      console.warn('Web notification error:', e);
    }
  }
}
