/* Run against the built site: QA_BASE_URL=http://127.0.0.1:8086/ node scripts/qa-portfolio-refinements.cjs */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:8086/';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium' });
  try {
    for (const width of [320, 393, 600, 768, 1024, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base);
      
      await page.locator('#vload').waitFor({ state: 'hidden' });
      const geometry = await page.locator('#outcomeRail').evaluate(rail => {
        const cards = [...rail.children].map(n => n.getBoundingClientRect());
        const bounds = rail.getBoundingClientRect();
        return { display: getComputedStyle(rail).display, count: cards.length,
          fraction: (bounds.right - cards[2].left) / cards[2].width,
          firstX: cards[0].left, secondX: cards[1].left };
      });
      assert.equal(geometry.count, 6);
      assert.equal(geometry.display, width <= 600 ? 'flex' : 'grid');
      if (width <= 600) {
        assert(Math.abs(geometry.fraction - 0.5) < 0.03, `${width}: two full outcomes plus half a third`);
        await page.locator('[data-rail="outcomeRail"][data-direction="1"]').scrollIntoViewIfNeeded();
        await page.locator('[data-rail="outcomeRail"][data-direction="1"]').click();
        await page.waitForFunction(() => document.querySelector('#outcomeRail').scrollLeft > 0);
        const caseGeometry = await page.locator('#selectedResults').evaluate(n => ({ display: getComputedStyle(n).display, scrollable: n.scrollWidth > n.clientWidth }));
        assert.equal(caseGeometry.display, 'flex');
        assert(caseGeometry.scrollable);
        await page.locator('#mapNext').scrollIntoViewIfNeeded();
        await page.locator('#mapNext').click();
        assert.equal(await page.locator('.sysnode[aria-pressed="true"]').count(), 1);
        await page.evaluate(() => {
          const first = document.querySelector('.sysnode[data-p="chat360"]');
          if (first.getAttribute('aria-pressed') === 'true') first.click();
          first.click();
          document.querySelector('#mapNext').click();
        });
        await page.waitForTimeout(300);
        assert.equal(await page.locator('.sysnode[aria-pressed="true"]').getAttribute('data-p'), 'cordelia-cruises', 'rapid selection then Next remains on the next project');
      } else {
        assert.equal(await page.locator('.outcome-controls').isVisible(), false);
        assert.equal(await page.locator('#mapNext').isVisible(), false);
        assert.equal(await page.locator('#selectedResults').evaluate(n => getComputedStyle(n).display), 'grid');
      }
      await page.locator('#recentRail').evaluate(n => { n.scrollLeft = n.scrollWidth; });
      await page.waitForFunction(() => document.querySelector('[data-rail="recentRail"][data-direction="1"]').disabled);
      await page.locator('#recentRail').evaluate(n => { n.scrollLeft = 0; });
      await page.waitForFunction(() => document.querySelector('[data-rail="recentRail"][data-direction="-1"]').disabled);
      const icons = await page.locator('#recentRail .recent-depiction svg').evaluateAll(nodes => nodes.map(n => n.innerHTML));
      assert.equal(new Set(icons).size, 4, 'recent cards use distinct relevant icons');
      await page.locator('[data-rail="recentRail"][data-direction="1"]').scrollIntoViewIfNeeded();
      await page.locator('[data-rail="recentRail"][data-direction="1"]').click();
      await page.waitForFunction(() => document.querySelector('#recentRail').scrollLeft > 0);
      assert.match(await page.locator('.sysnode-name').first().innerText(), /Chat360 - Voice AI/);
      for (const route of ['#/about', '#/contact', '#/work/chat360']) {
        await page.evaluate(hash => { location.hash = hash; }, route);
        await page.waitForFunction(hash => location.hash === hash, route);
        const bad = await page.locator('a[href]').evaluateAll(nodes => nodes.filter(a => {
          const href = a.getAttribute('href');
          return /^https?:/.test(a.href) && (!href.startsWith('#') || href.startsWith('#/')) && (a.target !== '_blank' || !a.rel.includes('noopener'));
        }).map(a => a.href));
        assert.deepEqual(bad, [], 'all page destinations open safe new tabs');
        if (route === '#/about') {
          assert.equal(await page.locator('.foundation-heading').count(), 2);
          assert.equal(await page.locator('#view .portrait img').getAttribute('width'), '960');
          assert.equal(await page.locator('#view .portrait img').getAttribute('height'), '1278');
        }
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      }
      assert.deepEqual(errors, []);
      console.log(`PASS requested layouts, carousel interaction, labels, headings and link policy at ${width}px`);
      await context.close();
    }
    const context = await browser.newContext({ viewport: { width: 393, height: 851 } });
    const page = await context.newPage();
    await page.goto(base);
    await page.locator('#vload').waitFor({ state: 'hidden' });
    const before = await page.locator('#scrText').textContent();
    const boxes = await page.evaluate(() => ({
      cue: document.querySelector('#scrollCue').getBoundingClientRect().toJSON(),
      resume: document.querySelector('.intro-resume').getBoundingClientRect().toJSON(),
      monitor: document.querySelector('#scrArea').getBoundingClientRect().toJSON()
    }));
    assert(boxes.cue.bottom + 16 <= boxes.monitor.top, 'intro actions have monitor clearance');
    assert(boxes.cue.right + 4 <= boxes.resume.left, 'intro actions do not collide');
    for (const y of [100, 300, 600]) {
      await page.evaluate(top => window.scrollTo(0, top), y);
      await page.waitForTimeout(250);
      assert.equal(await page.locator('#scrText').textContent(), before, 'PC text does not change on scroll');
      assert.equal(await page.locator('#scrPreview').getAttribute('opacity'), '0');
    }
    assert.match(await page.locator('#scrollCue').innerText(), /Scroll to know more/);
    await context.close();
    console.log('PASS normal-motion intro text, button spacing and zoom scroll');
    const links = await browser.newContext({ reducedMotion: 'reduce' });
    const sourcePage = await links.newPage();
    await sourcePage.route('**/api/chat', route => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ answer: 'Voice AI at Chat360.', sources: [{ title: 'Chat360', route: '#/work/chat360' }] }) }));
    await sourcePage.goto(base);
    await sourcePage.locator('#vload').waitFor({ state: 'hidden' });
    await sourcePage.locator('[data-ask]').first().click();
    await sourcePage.locator('.msg-src a').waitFor();
    const sourcePopupPromise = links.waitForEvent('page');
    await sourcePage.locator('.msg-src a').first().click();
    const sourcePopup = await sourcePopupPromise;
    await sourcePopup.waitForLoadState('domcontentloaded');
    assert.equal(new URL(sourcePopup.url()).hash, '#/work/chat360');
    assert.equal(await sourcePage.evaluate(() => location.hash), '');
    await sourcePopup.close();
    const external = sourcePage.locator('#view a[href^="https://"]:not([href*="drive.google.com"])').first();
    const destination = new URL(await external.getAttribute('href')).href;
    await links.route(destination, route => route.fulfill({ contentType: 'text/html', body: '<h1>External destination intercepted for QA</h1>' }));
    const externalPopupPromise = links.waitForEvent('page');
    await external.click();
    const externalPopup = await externalPopupPromise;
    await externalPopup.waitForLoadState('domcontentloaded');
    assert.equal(externalPopup.url(), destination);
    assert.equal(await sourcePage.evaluate(() => location.hash), '');
    await links.close();
    console.log('PASS dynamic assistant citation and external product new-tab destinations');

  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
