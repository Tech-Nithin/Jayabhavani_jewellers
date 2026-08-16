import { supabase } from '../config/supabase';
import fs from 'fs';
import path from 'path';

// ── SHARED IN-MEMORY RAM TOKEN CACHE (<1ms SUB-MILLISECOND LOOKUP) ──
const memoryTokenCache = new Map<string, string>();
const tokensFilePath = path.join(__dirname, '../../../../data/worker_push_tokens.json');

// Initialize local disk cache on module load if file exists
try {
  if (fs.existsSync(tokensFilePath)) {
    const data = JSON.parse(fs.readFileSync(tokensFilePath, 'utf8') || '{}');
    Object.entries(data).forEach(([key, val]) => {
      if (key && val && typeof val === 'string') {
        memoryTokenCache.set(key, val);
      }
    });
  }
} catch (e) {
  console.warn('ℹ️ Token store local disk load notice:', e);
}

/**
 * Save FCM Token for target ID ('ADMIN' or Worker ID)
 * 1. Immediate save to RAM memory map
 * 2. Asynchronous upsert to Supabase 'workers' table (Cloud DB persistence)
 * 3. Soft-save to local disk file (for local dev backup)
 */
export async function saveFcmToken(targetId: string, role: 'ADMIN' | 'WORKER', fcmToken: string): Promise<void> {
  if (!targetId || !fcmToken) return;

  const finalId = role === 'ADMIN' ? 'ADMIN' : String(targetId);
  const cleanToken = String(fcmToken).trim();

  // Tier 1: Save to RAM Memory Cache (<1ms speed)
  memoryTokenCache.set(finalId, cleanToken);
  console.log(`[FCM TokenStore] Saved token in RAM for ${role} [${finalId}]`);

  // Tier 2: Save to Supabase Cloud Database (Survives server restarts & cloud deploys)
  try {
    if (role === 'ADMIN') {
      const { error } = await supabase
        .from('workers')
        .upsert({ id: 'ADMIN', name: 'Admin User', fcm_token: cleanToken }, { onConflict: 'id' });
      if (error) console.warn('⚠️ Supabase Admin FCM token save error:', error.message);
      else console.log('[FCM TokenStore] Admin FCM token persisted to Supabase workers table.');
    } else {
      const { error } = await supabase
        .from('workers')
        .update({ fcm_token: cleanToken })
        .eq('id', finalId);
      if (error) console.warn('⚠️ Supabase Worker FCM token save error:', error.message);
      else console.log(`[FCM TokenStore] Worker ${finalId} FCM token persisted to Supabase workers table.`);
    }
  } catch (e: any) {
    console.warn('⚠️ Supabase FCM token save exception:', e.message || e);
  }

  // Tier 3: Local disk file write (Soft backup, ignores errors on read-only serverless platforms like Vercel)
  try {
    const dir = path.dirname(tokensFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const currentObj: Record<string, string> = {};
    memoryTokenCache.forEach((v, k) => { currentObj[k] = v; });
    fs.writeFileSync(tokensFilePath, JSON.stringify(currentObj, null, 2), 'utf8');
  } catch {}
}

/**
 * Retrieve FCM Token for target ID ('ADMIN' or Worker ID)
 * Possibility 1: RAM Cache Hit (<1ms)
 * Possibility 2: Supabase Cloud DB Query (On server restart / cold-boot cache miss)
 */
export async function getFcmToken(targetId: string): Promise<string | null> {
  if (!targetId) return null;
  const key = String(targetId);

  // Possibility 1: Hit in RAM Cache
  if (memoryTokenCache.has(key)) {
    const ramToken = memoryTokenCache.get(key);
    if (ramToken) return ramToken;
  }

  // Possibility 2: Cache miss after server restart/reboot -> Fetch from Supabase Cloud DB
  try {
    const { data, error } = await supabase
      .from('workers')
      .select('fcm_token')
      .eq('id', key)
      .single();

    if (!error && data?.fcm_token) {
      const dbToken = String(data.fcm_token).trim();
      // Populate RAM Cache for future requests
      memoryTokenCache.set(key, dbToken);
      console.log(`[FCM TokenStore] Restored token from Supabase for target [${key}]`);
      return dbToken;
    }
  } catch (e: any) {
    console.warn(`⚠️ Supabase token lookup exception for [${key}]:`, e.message || e);
  }

  return null;
}
