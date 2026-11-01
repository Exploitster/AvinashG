const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const html = fs.readFileSync('docs/index.html', 'utf8');
  assert(!/SplitText\.min|ScrambleTextPlugin\.min|portrait-glitch\.gif/.test(html));
  const tags = [...html.matchAll(/<script[^>]+src=[^>]+>/g)].map(m => m[0]);
  assert.equal(tags.length, 2);
  assert(tags.every(tag => tag.includes('defer')));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium' });
  try {
    for (const mode of ['desktop', 'touch', 'reduced']) {
      const context = await browser.newContext({ viewport: { width: mode === 'touch' ? 393 : 1440, height: 900 }, hasTouch: mode === 'touch', isMobile: mode === 'touch', reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference' });
      const page = await context.newPage();
      const requests = [], errors = [];
      page.on('request', r => requests.push(r.url()));
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(process.env.QA_BASE_URL || 'http://127.0.0.1:8086/', { waitUntil: 'domcontentloaded' });
      await page.locator('#vload').waitFor({ state: 'hidden' });
      assert.equal(await page.locator('#view h1').count(), 1, 'boot runs once after deferred dependencies');
      assert.equal(requests.some(url => url.includes('lenis.min')), mode === 'desktop', 'wheel smoother is desktop-only');
      assert.equal(requests.some(url => /glitch.*webp/.test(url)), mode !== 'reduced');
      assert.deepEqual(errors, []);
      console.log('PASS deferred startup, responsive assets and optional smoother: ' + mode);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
