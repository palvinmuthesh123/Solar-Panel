// backend/warmup.js
// A small standalone warmup process that periodically pings the public health URL.
// Designed to be run under pm2: `pm2 start backend/warmup.js --name solar-warmup --env production`

const DEFAULT_URL = process.env.TARGET_URL || `http://localhost:${process.env.PORT || 5000}/api/health`;
const INTERVAL_MS = Number(process.env.INTERVAL_MS) || 9 * 60 * 1000; // 9 minutes

async function ensureFetch() {
  if (typeof fetch === 'undefined') {
    try {
      const mod = await import('node-fetch');
      // node-fetch v2 default export works for CommonJS when dynamic-imported
      global.fetch = mod.default || mod;
      console.log('warmup: fetch polyfilled using node-fetch');
    } catch (e) {
      console.warn('warmup: failed to import node-fetch, ping may not work', e && e.message);
    }
  }
}

async function ping(url) {
  try {
    const res = await fetch(url, { method: 'GET' });
    console.log(`warmup: ping ${url} => ${res.status}`);
  } catch (e) {
    console.warn('warmup: ping failed', e && e.message);
  }
}

(async () => {
  await ensureFetch();
  const url = DEFAULT_URL;
  console.log('warmup: starting, target=', url, 'intervalMs=', INTERVAL_MS);
  // first immediate ping
  await ping(url);
  // schedule repeated ping
  setInterval(() => ping(url), INTERVAL_MS);
})();
