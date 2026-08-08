const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const app = require('../server');
const publicDir = path.join(__dirname, '..', 'public');

test('all inline page scripts parse', () => {
  const pages = fs.readdirSync(publicDir).filter((name) => name.endsWith('.html'));
  for (const page of pages) {
    const html = fs.readFileSync(path.join(publicDir, page), 'utf8');
    const scripts = html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi);
    let index = 0;
    for (const match of scripts) {
      index += 1;
      if (match[1].trim()) new vm.Script(match[1], { filename: `${page}:script-${index}` });
    }
  }
});

test('page generator is portable and deterministic', (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'software-dashboard-build-'));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));
  for (const file of ['build_pages.py', 'sw_data.json']) {
    fs.copyFileSync(path.join(publicDir, file), path.join(tempDir, file));
  }

  const script = path.join(tempDir, 'build_pages.py');
  execFileSync('python3', [script]);
  const firstBuild = ['correlation.html', 'technicals.html'].map((file) =>
    fs.readFileSync(path.join(tempDir, file), 'utf8')
  );
  execFileSync('python3', [script]);
  const secondBuild = ['correlation.html', 'technicals.html'].map((file) =>
    fs.readFileSync(path.join(tempDir, file), 'utf8')
  );

  assert.deepEqual(secondBuild, firstBuild);
});

test('acquired tickers do not call the live upstream', async (t) => {
  const originalFetch = global.fetch;
  let upstreamCalls = 0;
  global.fetch = async () => {
    upstreamCalls += 1;
    throw new Error('unexpected upstream request');
  };
  t.after(() => { global.fetch = originalFetch; });

  const server = app.listen(0);
  t.after(() => server.close());
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  const payload = await new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}/api/quotes?symbols=CYBR,CFLT`, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => resolve(JSON.parse(body)));
    }).on('error', reject);
  });

  assert.deepEqual(payload.quotes, {});
  assert.equal(upstreamCalls, 0);
});

test('server exposes the dashboard and health metadata', async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());
  await new Promise((resolve) => server.once('listening', resolve));

  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  const [pageResponse, healthResponse] = await Promise.all([
    fetch(`${baseUrl}/index.html`),
    fetch(`${baseUrl}/api/health`),
  ]);

  assert.equal(pageResponse.status, 200);
  assert.match(await pageResponse.text(), /Software Stack/);
  assert.equal(healthResponse.status, 200);
  const health = await healthResponse.json();
  assert.equal(health.status, 'ok');
  assert.equal(health.dashboard, 'Software Supply Chain');
  assert.equal(health.tickerCount, 58);
  assert.ok(Number.isInteger(health.cacheSize));
  assert.match(health.timestamp, /^\d{4}-\d{2}-\d{2}T/);
});
