const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:8086/';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium' });
  try {
    for (const width of [393, 768, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.goto(base + '#/contact', { waitUntil: 'domcontentloaded' });
      await page.locator('#vload').waitFor({ state: 'hidden' });
      for (const route of ['#/about', '#/work', '#/contact']) {
        await page.evaluate(hash => { location.hash = hash; }, route);
        await page.waitForTimeout(50);
        const result = await page.evaluate(() => new Promise(resolve => {
          const nodes = [...document.querySelectorAll('[data-typed]')];
          const initial = nodes.map(n => ({ text: n.textContent, height: n.offsetHeight }));
          const sectionPositions = [...document.querySelectorAll('#view > section')].map(n => n.offsetTop);
          let stable = true, frames = 0;
          const start = performance.now();
          function sample() {
            frames++;
            nodes.forEach((n, i) => { if (n.textContent !== initial[i].text || n.offsetHeight !== initial[i].height) stable = false; });
            [...document.querySelectorAll('#view > section')].forEach((n, i) => { if (n.offsetTop !== sectionPositions[i]) stable = false; });
            if (performance.now() - start < 2300) return requestAnimationFrame(sample);
            resolve({ stable, frames, count: nodes.length, visible: nodes.every(n => [...n.querySelectorAll('span[aria-hidden]')].every(s => Number(getComputedStyle(s).opacity) === 1)) });
          }
          sample();
        }));
        assert(result.count > 0, 'typing is exercised');
        assert(result.frames > 10);
        assert(result.stable, `${width} ${route}: typing preserves text, heading height and section positions`);
        assert(result.visible, 'letters finish visible');
      }
      await page.close();
      console.log(`PASS stable sequential heading typing at ${width}px`);
    }
    const reduced = await browser.newPage({ reducedMotion: 'reduce' });
    await reduced.goto(base + '#/contact', { waitUntil: 'domcontentloaded' });
    await reduced.locator('#vload').waitFor({ state: 'hidden' });
    assert.equal(await reduced.locator('[data-typed]').count(), 0, 'reduced motion shows complete headings immediately');
    assert(await reduced.locator('#view h1').isVisible());
    await reduced.close();
    const fallback = await browser.newPage();
    await fallback.route('**/vendor/ScrambleTextPlugin.min.js', route => route.abort());
    await fallback.goto(base + '#/contact', { waitUntil: 'domcontentloaded' });
    await fallback.locator('#vload').waitFor({ state: 'hidden' });
    assert(await fallback.locator('[data-typed]').count() > 0, 'typing does not depend on the scramble plugin');
    await fallback.close();
    console.log('PASS reduced motion and missing scramble-plugin fallback');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
