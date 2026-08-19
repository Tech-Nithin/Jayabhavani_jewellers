import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis =
  url && token && !url.includes('your-upstash')
    ? new Redis({ url, token })
    : null;

if (redis) {
  console.log('⚡ [Upstash Redis] Connected successfully for global ~5ms caching!');
} else {
  console.warn('⚠️ [Upstash Redis] Credentials missing or unconfigured; skipping Redis cache.');
}

export const getCachedData = async <T>(key: string): Promise<T | null> => {
  if (!redis) return null;
  const start = Date.now();
  try {
    const data = await redis.get<T>(key);
    if (data) {
      console.log(`⚡ [Upstash Redis HIT] Key: [${key}] | Duration: ${Date.now() - start}ms`);
      return data;
    }
    console.log(`💾 [Upstash Redis MISS] Key: [${key}] | Duration: ${Date.now() - start}ms`);
    return null;
  } catch (err) {
    console.warn(`⚠️ [Upstash Redis] GET error for [${key}]:`, err);
    return null;
  }
};

export const setCachedData = async (key: string, value: any, ttlSeconds: number = 300): Promise<void> => {
  if (!redis) return;
  const start = Date.now();
  try {
    await redis.set(key, value, { ex: ttlSeconds });
    console.log(`💾 [Upstash Redis SET] Key: [${key}] stored (${ttlSeconds}s TTL) | Duration: ${Date.now() - start}ms`);
  } catch (err) {
    console.warn(`⚠️ [Upstash Redis] SET error for [${key}]:`, err);
  }
};

export const invalidateCacheKey = async (key: string): Promise<void> => {
  if (!redis) return;
  try {
    await redis.del(key);
    console.log(`🧹 [Upstash Redis FLUSH] Invalidated key: [${key}]`);
  } catch (err) {
    console.warn(`⚠️ [Upstash Redis] DEL error for [${key}]:`, err);
  }
};
