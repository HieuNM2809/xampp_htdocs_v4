const { createClient } = require('redis');
const { createCustomSpan, captureError } = require('../apm');

class RedisService {
  constructor() {
    this.client = createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    });

    this.client.on('error', (err) => {
      console.error('❌ Redis error:', err);
      captureError(err, {
        custom: {
          component: 'redis_service',
          action: 'client_error'
        }
      });
    });

    this.client.on('connect', () => {
      console.log('📦 Redis connected');
    });

    this.client.on('ready', () => {
      console.log('✅ Redis ready');
    });

    this.client.on('end', () => {
      console.log('📦 Redis disconnected');
    });

    this.init();
  }

  async init() {
    try {
      await this.client.connect();
      
      // Test connection
      await this.client.ping();
      console.log('📦 Redis connection successful');
      
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      captureError(error, {
        custom: {
          component: 'redis_service',
          action: 'connection_failed'
        }
      });
    }
  }

  async get(key) {
    const span = createCustomSpan('redis_get', 'cache');
    const start = Date.now();
    
    try {
      span.addLabels({
        'cache.key': key,
        'cache.operation': 'get'
      });
      
      const result = await this.client.get(key);
      const duration = Date.now() - start;
      
      span.addLabels({
        'cache.hit': result !== null,
        'cache.duration_ms': duration
      });
      
      span.end();
      
      // Parse JSON if possible
      if (result) {
        try {
          const parsed = JSON.parse(result);
          parsed.fromCache = true;
          return parsed;
        } catch {
          return result;
        }
      }
      
      return null;
    } catch (error) {
      span.end();
      captureError(error, {
        custom: {
          key,
          operation: 'get',
          component: 'redis_service'
        }
      });
      throw error;
    }
  }

  async set(key, value, ttl = 3600) {
    const span = createCustomSpan('redis_set', 'cache');
    const start = Date.now();
    
    try {
      span.addLabels({
        'cache.key': key,
        'cache.operation': 'set',
        'cache.ttl': ttl
      });
      
      const serializedValue = typeof value === 'object' 
        ? JSON.stringify(value) 
        : value;
      
      const result = await this.client.setEx(key, ttl, serializedValue);
      const duration = Date.now() - start;
      
      span.addLabels({
        'cache.duration_ms': duration,
        'cache.success': result === 'OK'
      });
      
      span.end();
      return result;
    } catch (error) {
      span.end();
      captureError(error, {
        custom: {
          key,
          ttl,
          operation: 'set',
          component: 'redis_service'
        }
      });
      throw error;
    }
  }

  async del(key) {
    const span = createCustomSpan('redis_delete', 'cache');
    
    try {
      span.addLabels({
        'cache.key': key,
        'cache.operation': 'delete'
      });
      
      const result = await this.client.del(key);
      span.end();
      return result;
    } catch (error) {
      span.end();
      captureError(error, {
        custom: {
          key,
          operation: 'delete',
          component: 'redis_service'
        }
      });
      throw error;
    }
  }

  async exists(key) {
    const span = createCustomSpan('redis_exists', 'cache');
    
    try {
      const result = await this.client.exists(key);
      span.end();
      return result === 1;
    } catch (error) {
      span.end();
      captureError(error, {
        custom: {
          key,
          operation: 'exists',
          component: 'redis_service'
        }
      });
      throw error;
    }
  }

  async expire(key, ttl) {
    const span = createCustomSpan('redis_expire', 'cache');
    
    try {
      const result = await this.client.expire(key, ttl);
      span.end();
      return result === 1;
    } catch (error) {
      span.end();
      captureError(error, {
        custom: {
          key,
          ttl,
          operation: 'expire',
          component: 'redis_service'
        }
      });
      throw error;
    }
  }

  async incr(key) {
    const span = createCustomSpan('redis_increment', 'cache');
    
    try {
      const result = await this.client.incr(key);
      span.end();
      return result;
    } catch (error) {
      span.end();
      captureError(error, {
        custom: {
          key,
          operation: 'increment',
          component: 'redis_service'
        }
      });
      throw error;
    }
  }

  async hset(hash, field, value) {
    const span = createCustomSpan('redis_hset', 'cache');
    
    try {
      span.addLabels({
        'cache.hash': hash,
        'cache.field': field,
        'cache.operation': 'hset'
      });
      
      const serializedValue = typeof value === 'object' 
        ? JSON.stringify(value) 
        : value;
      
      const result = await this.client.hSet(hash, field, serializedValue);
      span.end();
      return result;
    } catch (error) {
      span.end();
      captureError(error, {
        custom: {
          hash,
          field,
          operation: 'hset',
          component: 'redis_service'
        }
      });
      throw error;
    }
  }

  async hget(hash, field) {
    const span = createCustomSpan('redis_hget', 'cache');
    
    try {
      span.addLabels({
        'cache.hash': hash,
        'cache.field': field,
        'cache.operation': 'hget'
      });
      
      const result = await this.client.hGet(hash, field);
      span.end();
      
      if (result) {
        try {
          return JSON.parse(result);
        } catch {
          return result;
        }
      }
      
      return null;
    } catch (error) {
      span.end();
      captureError(error, {
        custom: {
          hash,
          field,
          operation: 'hget',
          component: 'redis_service'
        }
      });
      throw error;
    }
  }

  async hgetall(hash) {
    const span = createCustomSpan('redis_hgetall', 'cache');
    
    try {
      const result = await this.client.hGetAll(hash);
      span.end();
      
      // Parse JSON values
      const parsed = {};
      for (const [key, value] of Object.entries(result)) {
        try {
          parsed[key] = JSON.parse(value);
        } catch {
          parsed[key] = value;
        }
      }
      
      return parsed;
    } catch (error) {
      span.end();
      captureError(error, {
        custom: {
          hash,
          operation: 'hgetall',
          component: 'redis_service'
        }
      });
      throw error;
    }
  }

  async sadd(set, ...members) {
    const span = createCustomSpan('redis_sadd', 'cache');
    
    try {
      const result = await this.client.sAdd(set, members);
      span.end();
      return result;
    } catch (error) {
      span.end();
      captureError(error, {
        custom: {
          set,
          members: members.slice(0, 10), // First 10 members only
          operation: 'sadd',
          component: 'redis_service'
        }
      });
      throw error;
    }
  }

  async smembers(set) {
    const span = createCustomSpan('redis_smembers', 'cache');
    
    try {
      const result = await this.client.sMembers(set);
      span.end();
      return result;
    } catch (error) {
      span.end();
      captureError(error, {
        custom: {
          set,
          operation: 'smembers',
          component: 'redis_service'
        }
      });
      throw error;
    }
  }

  async flushall() {
    const span = createCustomSpan('redis_flushall', 'cache');
    
    try {
      const result = await this.client.flushAll();
      span.end();
      console.log('🧹 Redis cache cleared');
      return result;
    } catch (error) {
      span.end();
      captureError(error, {
        custom: {
          operation: 'flushall',
          component: 'redis_service'
        }
      });
      throw error;
    }
  }

  async info() {
    const span = createCustomSpan('redis_info', 'cache');
    
    try {
      const result = await this.client.info();
      span.end();
      return result;
    } catch (error) {
      span.end();
      captureError(error, {
        custom: {
          operation: 'info',
          component: 'redis_service'
        }
      });
      throw error;
    }
  }

  async close() {
    try {
      await this.client.quit();
      console.log('📦 Redis connection closed');
    } catch (error) {
      captureError(error, {
        custom: {
          component: 'redis_service',
          action: 'close_connection'
        }
      });
      console.error('❌ Error closing Redis connection:', error);
    }
  }
}

module.exports = RedisService;
