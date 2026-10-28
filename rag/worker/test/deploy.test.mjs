import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const config = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');
const preflight = readFileSync(new URL('../../scripts/check-provider.mjs', import.meta.url), 'utf8')
  .replace("import { readFileSync } from 'node:fs';", '')
  .replace(/const config = readFileSync\([^\n]+/, 'const config = ' + JSON.stringify(config) + ';');
let counter = 0;
async function runPreflight(fake) {
  const previous = { fetch: globalThis.fetch, key: process.env.GEMINI_API_KEY, code: process.exitCode, log: console.log, error: console.error };
  const logs = [];
  globalThis.fetch = fake;
  process.env.GEMINI_API_KEY = 'private-test-key';
  process.exitCode = 0;
  console.log = console.error = (...args) => logs.push(args.join(' '));
  try {
    await import('data:text/javascript;base64,' + Buffer.from(preflight + '\n// ' + counter++).toString('base64'));
    return { code: process.exitCode, logs };
  } finally {
    globalThis.fetch = previous.fetch;
    if (previous.key === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previous.key;
    process.exitCode = previous.code;
    console.log = previous.log;
    console.error = previous.error;
  }
}
test('deployment preflight exercises both provider APIs, without logging credentials', async () => {
  const urls = [];
  const result = await runPreflight(async (url, init) => {
    urls.push(url);
    assert.equal(init.headers['x-goog-api-key'], 'private-test-key');
    return Response.json(url.includes(':embedContent') ? { embedding: { values: Array(768).fill(0.1) } } : { candidates: [{ content: { parts: [{ text: 'READY' }] } }] });
  });
  assert.equal(result.code, 0);
  assert.equal(urls.length, 2);
  assert(result.logs.every(line => !line.includes('private-test-key')));
});
test('model errors stop deployment and do not expose provider error bodies', async () => {
  let calls = 0;
  const result = await runPreflight(async () => { calls++; return new Response('private-test-key provider details', { status: 404 }); });
  assert.equal(result.code, 1);
  assert.equal(calls, 1);
  assert.match(result.logs.join(' '), /HTTP 404/);
  assert(!result.logs.join(' ').includes('private-test-key'));
});
test('an empty chat result cannot pass the deployment gate', async () => {
  let calls = 0;
  const result = await runPreflight(async () => Response.json(++calls === 1 ? { embedding: { values: Array(768).fill(0.1) } } : { candidates: [] }));
  assert.equal(result.code, 1);
  assert.match(result.logs.join(' '), /CHAT_MODEL returned no usable result/);
});
