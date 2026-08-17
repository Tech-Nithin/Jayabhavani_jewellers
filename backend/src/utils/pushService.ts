// backend/src/utils/pushService.ts
//
// FIREBASE ADMIN SDK PUSH SERVICE (mirrors messaging-app pushService.js architecture)
// Architecture: initializeApp(cert(serviceAccount)) -> getMessaging().send(message)
// Identical proven pattern to the "Bike Racing App" (messaging-app) notification system.
//

import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getMessaging, Message } from 'firebase-admin/messaging';
import { getFcmToken } from './fcmTokenStore';

// JBJ notification channel -- must match AndroidManifest.xml meta-data
const CHANNEL_ID = 'jbj_chat_channel_v2';

let firebaseApp: App | null = null;

// FIREBASE ADMIN INITIALIZATION (mirrors messaging-app pushService.js lines 24-32)
try {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    // Prevent duplicate app initialization on Vercel warm instances / hot reloads
    if (getApps().length === 0) {
      firebaseApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          // Handle Vercel env var literal \n -> actual newline
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      firebaseApp = getApps()[0];
    }
    console.log('[Firebase Admin SDK] Successfully initialized for JBJ project!');
  } else {
    console.log('[Firebase Admin SDK] Firebase credentials not configured. Push notifications disabled.');
  }
} catch (err: any) {
  console.error('[Firebase Admin Initialization Error]:', err.message);
}

/**
 * triggerFcmPushNotification
 *
 * Mirrors: messaging-app sendPushNotification() in pushService.js
 *
 * Token source:  fcmTokenStore -> RAM cache (<1ms) -> Supabase fallback (cold start)
 * Send method:   firebase-admin getMessaging().send(message) -- SDK handles OAuth2 internally
 * Channel:       jbj_chat_channel_v2 (matches AndroidManifest.xml meta-data)
 */
export const triggerFcmPushNotification = async (
  targetWorkerId: string,
  title: string,
  body: string,
  payloadData: any = {}
): Promise<void> => {
  if (!targetWorkerId) return;

  if (!firebaseApp) {
    console.log('[FCM Push] Firebase Admin not initialized. Message saved to database only.');
    return;
  }

  // TOKEN LOOKUP: RAM cache -> Supabase (mirrors messaging-app lines 43-50)
  const deviceToken = await getFcmToken(targetWorkerId);
  if (!deviceToken) {
    console.log(`[FCM Push] No device push token for target [${targetWorkerId}]. Message saved to database.`);
    return;
  }

  try {
    // All FCM v1 data payload values must be strings
    const stringifiedData: Record<string, string> = { title, body };
    for (const [k, v] of Object.entries(payloadData || {})) {
      stringifiedData[k] = typeof v === 'string' ? v : JSON.stringify(v);
    }

    // FCM MESSAGE (mirrors messaging-app pushService.js message object lines 52-73)
    const message: Message = {
      token: deviceToken,
      notification: {
        title,
        body,
      },
      data: stringifiedData,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: CHANNEL_ID,
          priority: 'high',
          visibility: 'public',
          defaultSound: true,
          defaultVibrateTimings: true,
          defaultLightSettings: true,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    // SEND: mirrors messaging-app line 75 -> messagingInstance.send(message)
    const response = await getMessaging(firebaseApp).send(message);
    console.log(`[FCM Push Delivered] Target [${targetWorkerId}] | Token: ${deviceToken.slice(0, 15)}... | MsgID: ${response}`);
  } catch (err: any) {
    console.error(`[FCM Push Delivery Error] Target [${targetWorkerId}]:`, err.message || err);
  }
};
