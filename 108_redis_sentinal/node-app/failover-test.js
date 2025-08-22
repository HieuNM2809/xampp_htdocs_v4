const Redis = require('ioredis');

function parseSentinels(env) {
  if (!env) return [{ host: 'sentinel1', port: 26379 }, { host: 'sentinel2', port: 26379 }, { host: 'sentinel3', port: 26379 }];
  return env.split(',').map((hp) => {
    const [host, port] = hp.split(':');
    return { host, port: Number(port || 26379) };
  });
}

const masterName = process.env.REDIS_MASTER_NAME || 'mymaster';
const sentinels = parseSentinels(process.env.REDIS_SENTINELS);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

function createClient(role) {
  const client = new Redis({
    sentinels,
    name: masterName,
    role,
    password: redisPassword,
    enableReadyCheck: true,
    sentinelRetryStrategy: (times) => Math.min(times * 1000, 5000),
  });
  client.on('connect', () => console.log(`[${role}] connect`));
  client.on('ready', () => console.log(`[${role}] ready`));
  client.on('reconnecting', () => console.log(`[${role}] reconnecting`));
  client.on('end', () => console.log(`[${role}] end`));
  client.on('error', (err) => console.error(`[${role}] error`, err.message));
  return client;
}

const master = createClient('master');
const replica = createClient('slave');

function endpointOf(client) {
  const stream = client.connector && client.connector.stream;
  if (stream && stream.remoteAddress && stream.remotePort) {
    return `${stream.remoteAddress}:${stream.remotePort}`;
  }
  return 'unknown';
}

let counter = 0;
let running = true;

async function loop() {
  while (running) {
    try {
      counter += 1;
      await master.set('demo:counter', String(counter));
      const value = await master.get('demo:counter');
      const rValue = await replica.get('demo:counter').catch(() => 'n/a');
      console.log(new Date().toISOString(), `set=${counter} master=${value} replica=${rValue} master_ep=${endpointOf(master)} replica_ep=${endpointOf(replica)}`);
    } catch (e) {
      console.error('loop error:', e.message);
    }
    await new Promise((res) => setTimeout(res, 1000));
  }
}

process.on('SIGINT', async () => {
  running = false;
  await master.quit();
  await replica.quit();
  process.exit(0);
});

loop();


