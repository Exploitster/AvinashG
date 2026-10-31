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
      const disclosures = page.locator('.skill-disclosure');
      assert.equal(await disclosures.count(), 2, 'both skill groups are independently collapsible');
      for (const disclosure of await disclosures.all()) {
        const allSkills = await disclosure.locator('li').count();
        const previewCount = await disclosure.locator('li:visible').count();
        assert(previewCount > 0, 'collapsed skill groups retain a visible first row');
        const tops = await disclosure.locator('li:visible').evaluateAll(nodes => nodes.map(n => Math.round(n.getBoundingClientRect().top)));
        assert.equal(new Set(tops).size, 1, 'preview shows exactly one complete row');
        const toggle = disclosure.locator('button');
        if (previewCount === allSkills) {
          assert.equal(await toggle.isVisible(), false, 'no redundant toggle when every skill fits in one row');
          continue;
        }
        assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
        assert.match(await toggle.innerText(), /View more/);
        await toggle.scrollIntoViewIfNeeded();
        await toggle.focus();
        await page.keyboard.press('Enter');
        assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
        assert.equal(await disclosure.locator('li:visible').count(), allSkills, 'all skills remain accessible');
        assert.match(await toggle.innerText(), /View less/);
        await page.keyboard.press('Space');
        assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
        assert.equal(await disclosure.locator('li:visible').count(), previewCount);
      }
      if (width === 393) {
        const tools = disclosures.first();
        const narrowCount = await tools.locator('li:visible').count();
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.waitForFunction(count => document.querySelectorAll('.skill-icons li:not([hidden])').length > count, narrowCount);
        await tools.locator('button').click();
        await page.setViewportSize({ width, height: 900 });
        assert.equal(await tools.locator('li:visible').count(), await tools.locator('li').count(), 'expanded state survives resizing');
        await tools.locator('button').click();
        assert.equal(await tools.locator('li:visible').count(), narrowCount, 'collapse uses the new viewport width');
      }
      await page.locator('#navToggle').click();
      const menuResume = page.locator('#menuResume');
      assert(await menuResume.isVisible());
      assert.equal(await menuResume.getAttribute('target'), '_blank');
      assert.equal(await menuResume.getAttribute('href'), 'https://drive.google.com/file/d/1FetKoTI3R4i9ifAlpLTDsdYSYlU3Ortm/view?usp=sharing');
      await page.locator('#navClose').click();
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
          assert.equal(await page.locator('#view .portrait-motion').getAttribute('width'), '960');
          assert.equal(await page.locator('#view .portrait-motion').getAttribute('height'), '1278');
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
    await page.evaluate(() => window.scrollTo(0, document.querySelector('#spacer').offsetHeight + 900));
    await page.waitForFunction(() => getComputedStyle(document.querySelector('#stage')).visibility === 'hidden');
    const landing = await page.locator('#view .hero h1').boundingBox();
    assert(landing.y >= 50 && landing.y < 260, 'a fast intro flick lands on the first hero heading');
    const landedY = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 400);
    await page.waitForFunction(y => scrollY > y + 100, landedY);
    assert.equal(await page.locator('#stage').evaluate(n => getComputedStyle(n).visibility), 'hidden', 'normal scrolling continues after landing');
    await context.close();
    console.log('PASS normal-motion intro text, button spacing and zoom scroll');
    for (const [width, missingLibraries] of [[320, false], [768, false], [1440, false], [393, true]]) {
      const flickContext = await browser.newContext({ viewport: { width, height: 900 } });
      if (missingLibraries) await flickContext.route('**/vendor/**', route => route.abort());
      const flickPage = await flickContext.newPage();
      await flickPage.goto(base);
      await flickPage.reload(); // persisted history entries must still land at the hero
      await flickPage.locator('#vload').waitFor({ state: 'hidden' });
      await flickPage.mouse.wheel(0, 2500);
      await flickPage.waitForFunction(() => getComputedStyle(document.querySelector('#stage')).visibility === 'hidden');
      const hero = await flickPage.locator('#view .hero').boundingBox();
      const heading = await flickPage.locator('#view .hero h1').boundingBox();
      const barHeight = await flickPage.locator('#topbar').evaluate(n => n.offsetHeight);
      assert(Math.abs(hero.y - barHeight) <= 2 && heading.y >= barHeight && heading.y + heading.height < 900, `${width}px: wheel flick lands at the start of the hero, missingLibraries=${missingLibraries}`);
      const startY = await flickPage.evaluate(() => scrollY);
      await flickPage.mouse.wheel(0, 500);
      await flickPage.waitForFunction(y => scrollY > y + 200, startY);
      await flickContext.close();
    }
    console.log('PASS fast wheel handoff and continued scrolling on mobile, tablet, desktop and missing-library fallback');
    const touchContext = await browser.newContext({ viewport: { width: 393, height: 851 }, isMobile: true, hasTouch: true });
    const touchPage = await touchContext.newPage();
    await touchPage.goto(base);
    await touchPage.locator('#vload').waitFor({ state: 'hidden' });
    await touchPage.evaluate(() => scrollTo(0, 400));
    await touchPage.waitForTimeout(400);
    const touchSession = await touchContext.newCDPSession(touchPage);
    async function swipe() {
      await touchSession.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 190, y: 770 }] });
      for (let y = 700; y >= 20; y -= 60) {
        await touchSession.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 190, y }] });
        await touchPage.waitForTimeout(5);
      }
      await touchSession.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    await swipe();
    await touchPage.waitForFunction(() => getComputedStyle(document.querySelector('#stage')).visibility === 'hidden');
    await touchPage.waitForTimeout(300);
    assert(Math.abs(await touchPage.locator('.hero').evaluate(n => n.getBoundingClientRect().top) - await touchPage.locator('#topbar').evaluate(n => n.offsetHeight)) <= 2, 'native mobile swipe settles at the hero');
    const touchLandingY = await touchPage.evaluate(() => scrollY);
    await swipe();
    await touchPage.waitForFunction(y => scrollY > y + 200, touchLandingY);
    await touchContext.close();
    console.log('PASS native touch swipe handoff');
    for (const scenario of ['normal', 'blocked-gif', 'reduced-motion']) {
      const portraitContext = await browser.newContext({ viewport: { width: 393, height: 851 }, reducedMotion: scenario === 'reduced-motion' ? 'reduce' : 'no-preference' });
      const portraitPage = await portraitContext.newPage();
      if (scenario === 'blocked-gif') await portraitContext.route('**/images/avinash-portrait-glitch.gif', route => route.abort());
      await portraitPage.goto(base);
      await portraitPage.locator('#vload').waitFor({ state: 'hidden' });
      await portraitPage.locator('#scrollCue').click();
      for (const route of ['#/', '#/about']) {
        if (route !== '#/') await portraitPage.evaluate(hash => { location.hash = hash; }, route);
        await portraitPage.waitForFunction(() => {
          const poster = document.querySelector('.portrait-still');
          return poster && poster.complete && poster.naturalWidth > 0;
        });
        assert(await portraitPage.locator('.portrait-still').isVisible(), `${scenario}: portrait remains visible on ${route}`);
        const bounds = await portraitPage.locator('.portrait').boundingBox();
        assert(bounds.width > 100 && bounds.height > 100);
        if (scenario === 'normal') {
          await portraitPage.locator('.portrait-motion.ready').waitFor();
          assert(await portraitPage.locator('.portrait-motion').isVisible(), 'normal mode retains the animated GIF');
        } else {
          await portraitPage.locator('.portrait-motion').waitFor({ state: 'hidden' });
        }
      }
      await portraitContext.close();
    }
    console.log('PASS Home and About portrait in normal, failed-animation and reduced-motion modes');
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
