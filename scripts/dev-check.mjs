// Automated development environment verification script
// Usage: npm run dev (in one terminal) then run: npm run verify:dev
// It will check:
// 1. API health endpoint (http://localhost:3000/health)
// 2. Signaling WebSocket echo round-trip (ws://localhost:3001)
// 3. Web app dev server availability (http://localhost:5173)

import { setTimeout as delay } from 'node:timers/promises';
import WebSocket from 'ws';

const results = [];

async function checkApi() {
  const url = 'http://localhost:3000/health';
  try {
    const res = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const ok = json && json.ok === true;
    results.push({
      service: 'api',
      status: ok ? 'PASS' : 'FAIL',
      detail: ok ? 'health ok:true' : 'unexpected payload',
    });
  } catch (e) {
    results.push({ service: 'api', status: 'FAIL', detail: e.message });
  }
}

async function checkSignaling() {
  const url = 'ws://localhost:3001';
  const timeoutMs = 4000;
  let settled = false;
  await new Promise((resolve) => {
    const ws = new WebSocket(url);
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        ws.terminate();
        results.push({ service: 'signaling', status: 'FAIL', detail: 'timeout connecting' });
        resolve();
      }
    }, timeoutMs);

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'ping', payload: 'hello' }));
    });

    ws.on('message', (data) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const text = data.toString();
      results.push({ service: 'signaling', status: 'PASS', detail: `echo: ${text.slice(0, 60)}` });
      ws.close();
      resolve();
    });

    ws.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      results.push({ service: 'signaling', status: 'FAIL', detail: err.message });
      resolve();
    });
  });
}

async function checkWeb() {
  const url = 'http://localhost:5173';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    const text = await res.text();
    const hasVite = /<title>/i.test(text) || /Vite/i.test(text);
    results.push({
      service: 'web',
      status: hasVite ? 'PASS' : 'FAIL',
      detail: hasVite ? 'index.html loaded' : 'unexpected response',
    });
  } catch (e) {
    results.push({ service: 'web', status: 'FAIL', detail: e.message });
  }
}

async function main() {
  console.log('Verifying dev environment...');
  // Allow a brief grace period for services to spin up if run immediately after dev start
  await delay(500);
  await checkApi();
  await checkSignaling();
  await checkWeb();

  const pad = (s) => s.padEnd(10);
  console.log('\nResults:');
  console.log(pad('Service'), pad('Status'), 'Detail');
  results.forEach((r) => console.log(pad(r.service), pad(r.status), r.detail));

  const failed = results.filter((r) => r.status !== 'PASS');
  if (failed.length) {
    console.error(`\n${failed.length} service(s) failed.`);
    process.exitCode = 1;
  } else {
    console.log('\nAll services PASS');
  }
}

main();
