/**
 * Redis client configuration
 * 
 * Provides Redis caching with graceful degradation if Redis is unavailable.
 * Falls back to in-memory caching or no caching if Redis connection fails.
 */

import { createClient } from 'redis';

// Redis client instance
let redisClient: ReturnType<typeof createClient> | null = null;
let isRedisAvailable = false;

/**
 * Initialize Redis client
 * Gracefully handles connection failures
 */
async function initializeRedis() {
  if (redisClient) {
    return redisClient;
  }

  try {
    const client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            console.warn('[Redis] Max reconnection attempts reached. Disabling Redis.');
            return false;
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    client.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
      isRedisAvailable = false;
    });

    client.on('connect', () => {
      console.log('[Redis] Connected successfully');
      isRedisAvailable = true;
    });

    client.on('ready', () => {
      isRedisAvailable = true;
    });

    await client.connect();
    redisClient = client;
    return client;
  } catch (error) {
    console.warn('[Redis] Failed to initialize. Caching disabled:', error instanceof Error ? error.message : 'Unknown error');
    isRedisAvailable = false;
    return null;
  }
}

/**
 * Get Redis client
 * Returns null if Redis is unavailable
 */
export async function getRedisClient() {
  if (!redisClient) {
    await initializeRedis();
  }
  return isRedisAvailable ? redisClient : null;
}

/**
 * Check if Redis is available
 */
export function isRedisConnected(): boolean {
  return isRedisAvailable && redisClient !== null;
}

/**
 * Close Redis connection
 */
export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isRedisAvailable = false;
  }
}
