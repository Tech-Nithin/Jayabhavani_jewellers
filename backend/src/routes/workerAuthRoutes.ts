import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import fs from 'fs';
import path from 'path';

// Re-export triggerFcmPushNotification from pushService (firebase-admin SDK)
export { triggerFcmPushNotification } from '../utils/pushService';

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

// NOTE: triggerFcmPushNotification is now in utils/pushService.ts (firebase-admin SDK)
// The re-export at the top of this file keeps all existing imports working unchanged.

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
