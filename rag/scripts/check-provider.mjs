// Run with GitHub Actions secrets before replacing a production Worker.
// Never print provider error bodies or credential-bearing request URLs.
import { readFileSync } from 'node:fs';
const config = readFileSync(new URL('../worker/wrangler.toml', import.meta.url), 'utf8');
const key = process.env.GEMINI_API_KEY;
if (!key) throw new Error('GEMINI_API_KEY is required');
async function check(name, method, body, validate) {
  const model = config.match(new RegExp(name + '\\s*=\\s*"([^"]+)"'))?.[1];
  if (!model) throw new Error(`Missing ${name} configuration`);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(body(model)), signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`${name} (${model}) returned HTTP ${response.status}. Check model availability, API permissions and quota; production was not replaced.`);
  }
  if (!validate(await response.json())) throw new Error(`${name} returned no usable result; production was not replaced.`);
  console.log(`${name}: ${model} verified`);
}
try {
  await check('EMBED_MODEL', 'embedContent', model => ({ model: `models/${model}`, content: { parts: [{ text: 'Portfolio connectivity check' }] }, outputDimensionality: 768 }), data => Array.isArray(data.embedding?.values) && data.embedding.values.length === 768 && data.embedding.values.every(Number.isFinite) && data.embedding.values.some(value => value !== 0));
  await check('CHAT_MODEL', 'generateContent', () => ({ contents: [{ role: 'user', parts: [{ text: 'Reply with the word READY.' }] }], generationConfig: { maxOutputTokens: 256 } }), data => data.candidates?.some(c => c.content?.parts?.some(p => typeof p.text === 'string' && p.text.trim())));
} catch (error) {
  // Do not forward arbitrary fetch error text (it can contain request details).
  if (error.name === 'TimeoutError') console.error('Gemini connectivity check exceeded 20 seconds; production was not replaced.');
  else if (/^(EMBED_MODEL|CHAT_MODEL|Missing)/.test(error.message)) console.error(error.message);
  else console.error('Gemini connectivity check failed; check provider access before deploying.');
  process.exitCode = 1;
}
