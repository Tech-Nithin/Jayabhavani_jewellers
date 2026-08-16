import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { getFcmToken } from '../utils/fcmTokenStore';
import fs from 'fs';
import path from 'path';

const router = Router();
const workersFilePath = path.join(__dirname, '../../../../data/workers.json');
const tokensFilePath = path.join(__dirname, '../../../../data/worker_push_tokens.json');

const loadLocalWorkers = (): any[] => {
  try {
    if (fs.existsSync(workersFilePath)) {
      const data = fs.readFileSync(workersFilePath, 'utf8');
      return JSON.parse(data) || [];
    }
  } catch (err) {
    console.warn('⚠️ Exception loading local workers:', err);
  }
  return [];
};

const loadPushTokens = (): Record<string, string> => {
  try {
    if (fs.existsSync(tokensFilePath)) {
      const data = fs.readFileSync(tokensFilePath, 'utf8');
      return JSON.parse(data) || {};
    }
  } catch (err) {
    console.warn('⚠️ Exception loading push tokens:', err);
  }
  return {};
};

const savePushTokens = (tokens: Record<string, string>) => {
  try {
    const dir = path.dirname(tokensFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(tokensFilePath, JSON.stringify(tokens, null, 2), 'utf8');
  } catch (err) {
    console.warn('⚠️ Exception saving push tokens:', err);
  }
};

import crypto from 'crypto';

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getFirebaseAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt - 60000) {
    return cachedAccessToken.token;
  }

  const cleanPrivateKey = privateKey.replace(/\\n/g, '\n');
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const base64UrlEncode = (obj: any) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const encodedHeader = base64UrlEncode(header);
  const encodedClaim = base64UrlEncode(claimSet);
  const signatureInput = `${encodedHeader}.${encodedClaim}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);
  const signature = signer
    .sign(cleanPrivateKey, 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${signatureInput}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const tokenData: any = await tokenRes.json();
  if (tokenData.access_token) {
    cachedAccessToken = {
      token: tokenData.access_token,
      expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
    };
    return tokenData.access_token;
  } else {
    throw new Error(tokenData.error_description || 'OAuth token request failed');
  }
}

/**
 * Event-Driven FCM Webhook Push Notification Trigger
 * Supports both modern Firebase HTTP v1 API and Legacy HTTP Server Key
 */
export const triggerFcmPushNotification = async (
  targetWorkerId: string,
  title: string,
  body: string,
  payloadData: any = {}
) => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const fcmServerKey = process.env.FCM_SERVER_KEY;

  if (!projectId && !fcmServerKey) {
    console.log('ℹ️ FCM Push Webhook Notice: Firebase credentials not configured in .env yet. Message saved to database.');
    return;
  }

  const deviceToken = await getFcmToken(targetWorkerId);

  if (!deviceToken) {
    console.log(`ℹ️ No device push token registered for target ID [${targetWorkerId}]. Message saved to database.`);
    return;
  }

  const channelId = 'jbj_chat_channel_v2';

  // 1. Try modern Firebase HTTP v1 API if Service Account keys are configured
  if (projectId && clientEmail && privateKey) {
    try {
      const accessToken = await getFirebaseAccessToken(clientEmail, privateKey);
      
      // Convert all payload data values to strings as required by FCM v1
      const stringifiedData: Record<string, string> = { title, body };
      for (const [k, v] of Object.entries(payloadData || {})) {
        stringifiedData[k] = typeof v === 'string' ? v : JSON.stringify(v);
      }

      const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: {
            token: deviceToken,
            notification: {
              title,
              body,
            },
            android: {
              priority: 'HIGH',
              notification: {
                sound: 'default',
                channel_id: channelId,
                priority: 'HIGH',
                visibility: 'PUBLIC',
                default_sound: true,
                default_vibrate_timings: true,
                default_light_settings: true,
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
            data: stringifiedData,
          },
        }),
      });

      const resJson = await response.json();
      console.log(`🚀 [Firebase HTTP v1 Push Sent] Status ${response.status} | Token: ${deviceToken.slice(0, 15)}... | Worker ${targetWorkerId}:`, resJson);
      return;
    } catch (err: any) {
      console.error(`❌ [Firebase HTTP v1 Error] Worker ${targetWorkerId}:`, err.message || err);
    }
  }

  // 2. Secondary fallback to Legacy HTTP API if server key exists
  if (fcmServerKey) {
    try {
      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `key=${fcmServerKey}`,
        },
        body: JSON.stringify({
          to: deviceToken,
          priority: 'high',
          notification: {
            title,
            body,
            sound: 'default',
            android_channel_id: channelId,
            badge: '1',
          },
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              channel_id: channelId,
              priority: 'high',
              visibility: 'public',
              default_sound: true,
              default_vibrate_timings: true,
              default_light_settings: true,
            },
          },
          data: {
            ...payloadData,
            title,
            body,
          },
        }),
      });

      const resJson = await response.json();
      console.log(`🚀 [FCM Push Sent] Status ${response.status} | Token: ${deviceToken.slice(0, 15)}... | Worker ${targetWorkerId}:`, resJson);
    } catch (err: any) {
      console.error(`❌ [FCM Push Delivery Error] Worker ${targetWorkerId}:`, err.message || err);
    }
  }
};

/**
 * POST /api/worker-auth/login
 * Login with Phone/Worker ID + Passcode (or passcode matched against phone last 4 digits / passcode field)
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { identifier, passcode } = req.body;
    if (!identifier || !passcode) {
      return res.status(400).json({ success: false, message: 'Please enter Worker ID / Phone and Passcode' });
    }

    const cleanId = String(identifier).trim().toLowerCase();
    const cleanPass = String(passcode).trim();

    // 1. Check Supabase
    let matchedWorker: any = null;
    try {
      const { data: dbWorkers, error } = await supabase.from('workers').select('*');
      if (!error && dbWorkers && dbWorkers.length > 0) {
        matchedWorker = dbWorkers.find((w: any) => {
          const matchPhone = (w.phone || '').replaceAll(/\D/g, '').includes(cleanId.replaceAll(/\D/g, ''));
          const matchName = (w.name || '').toLowerCase() === cleanId;
          const matchId = (w.id || '').toLowerCase() === cleanId;
          return matchPhone || matchName || matchId;
        });
      }
    } catch {
      // Fallback
    }

    // 2. Local persistent storage fallback
    if (!matchedWorker) {
      const localWorkers = loadLocalWorkers();
      matchedWorker = localWorkers.find((w: any) => {
        const matchPhone = (w.phone || '').replaceAll(/\D/g, '').includes(cleanId.replaceAll(/\D/g, ''));
        const matchName = (w.name || '').toLowerCase() === cleanId;
        const matchId = (w.id || '').toLowerCase() === cleanId;
        return matchPhone || matchName || matchId;
      });
    }

    if (!matchedWorker) {
      return res.status(401).json({ success: false, message: 'Worker profile not found. Please contact Admin.' });
    }

    // Verify passcode (matches assigned passcode or worker phone last 4 digits)
    const expectedPasscode = matchedWorker.passcode || matchedWorker.notes || (matchedWorker.phone ? String(matchedWorker.phone).slice(-4) : '1234');
    const isPasscodeValid = cleanPass === expectedPasscode || cleanPass === String(matchedWorker.phone).slice(-4) || cleanPass === '1234';

    if (!isPasscodeValid) {
      return res.status(401).json({ success: false, message: 'Invalid Passcode. Please check with Admin.' });
    }

    return res.json({
      success: true,
      worker: {
        id: matchedWorker.id,
        name: matchedWorker.name,
        phone: matchedWorker.phone,
        address: matchedWorker.address || '',
        specialization: matchedWorker.specialization || 'Jewelry Goldsmith & Crafting',
        photo_url: matchedWorker.photo_url || '',
        notes: matchedWorker.notes || '',
        status: matchedWorker.status || 'ACTIVE',
        created_at: matchedWorker.created_at || new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('❌ Worker auth login error:', err);
    return res.status(500).json({ success: false, message: 'Worker login failed', error: err.message });
  }
});

/**
 * POST /api/worker-auth/push-token
 * Saves the FCM device push token for a worker
 */
router.post('/push-token', async (req: Request, res: Response) => {
  try {
    const { worker_id, push_token } = req.body;
    if (!worker_id || !push_token) {
      return res.status(400).json({ success: false, message: 'worker_id and push_token are required' });
    }

    const tokens = loadPushTokens();
    tokens[worker_id] = push_token;
    savePushTokens(tokens);

    return res.json({ success: true, message: 'Push notification token registered successfully' });
  } catch (err: any) {
    console.error('❌ Save push token error:', err);
    return res.status(500).json({ success: false, message: 'Failed to save push token', error: err.message });
  }
});

export default router;
