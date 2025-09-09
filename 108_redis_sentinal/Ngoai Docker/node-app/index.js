const Redis = require('ioredis');

function parseSentinels(env) {
  if (!env) return [{ host: 'sentinel1', port: 26379 }];
  return env.split(',').map((hp) => {
    const [host, port] = hp.split(':');
    return { host, port: Number(port || 26379) };
  });
}

const masterName = process.env.REDIS_MASTER_NAME || 'mymaster';
const sentinels = parseSentinels(process.env.REDIS_SENTINELS);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

const redis = new Redis({
  sentinels,
  name: masterName,
  role: 'master',
  password: redisPassword,
  enableReadyCheck: true,
  sentinelRetryStrategy: (times) => Math.min(times * 1000, 5000),
});

redis.on('connect', () => console.log('[master] connect'));
redis.on('ready', () => console.log('[master] ready'));
redis.on('reconnecting', () => console.log('[master] reconnecting'));
redis.on('end', () => console.log('[master] end'));
redis.on('error', (err) => console.error('[master] error', err.message));

async function run() {
  await redis.set('demo:key', 'hello-from-node');
  const value = await redis.get('demo:key');
  console.log('GET demo:key =', value);
  process.exit(0);
}

run().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});


