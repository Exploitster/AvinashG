/* Browser regression checks for navigation, résumé access and assistant recovery.
 * CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node scripts/qa-journeys.cjs
 */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const RESUME_URL = 'https://drive.google.com/file/d/1FetKoTI3R4i9ifAlpLTDsdYSYlU3Ortm/view?usp=sharing';
async function assertDriveClick(page, selector) {
  let seen;
  const requested = new Promise(resolve => { seen = resolve; });
  await page.context().route('https://drive.google.com/**', async route => {
    seen(route.request().url());
    await route.fulfill({ contentType: 'text/html', body: '<h1>Drive destination intercepted for QA</h1>' });
  });
  await page.locator(selector).click({ timeout: 5000 });
  let timer;
  try {
    const url = await Promise.race([requested, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Résumé click did not reach Google Drive')), 5000); })]);
    assert.equal(url, RESUME_URL);
  } finally { clearTimeout(timer); }
}
const docs = path.resolve(__dirname, '../docs');
const server = createServer((req, res) => {
  if (new URL(req.url, 'http://localhost').pathname === '/slow.html') {
    const html = fs.readFileSync(path.join(docs, 'index.html'), 'utf8');
    const split = html.lastIndexOf('<script>');
    res.setHeader('Content-Type', 'text/html');
    res.write(html.slice(0, split));
    setTimeout(() => { if (!res.destroyed) res.end(html.slice(split)); }, 2500);
    return;
  }
  const file = path.resolve(docs, '.' + new URL(req.url, 'http://localhost').pathname);
  if (file !== docs && !file.startsWith(docs + path.sep)) { res.writeHead(404).end(); return; }
  try {
    const target = fs.statSync(file).isDirectory() ? path.join(file, 'index.html') : file;
    res.setHeader('Content-Type', target.endsWith('.js') ? 'application/javascript' : 'text/html');
    res.end(fs.readFileSync(target));
  } catch { res.writeHead(404).end('Not found'); }
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {});
  try {
    const base = 'http://127.0.0.1:' + server.address().port + '/';
    for (const width of [320, 393, 768, 1100, 1440, 1920]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base + '#/work');
      assert.equal(await page.locator('#nav a').first().innerText(), 'Work');
      for (const route of ['#/', '#/work', '#/experience', '#/about', '#/resume', '#/contact', '#/story', '#/thinking', '#/lab', '#/beyond', '#/work/chat360', '#/work/cordelia-cruises', '#/work/nosh-house', '#/work/yapita-health', '#/work/events-fusion', '#/not-a-page']) {
        await page.evaluate(hash => { location.hash = hash; }, route);
        await page.waitForFunction(hash => location.hash === hash && document.querySelector('#view h1'), route);
        assert.equal(await page.locator('#view h1').count(), 1, route + ': exactly one main heading');
        assert.notEqual(await page.title(), 'Avinash Garudapalli');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, route + ': no overflow');
        if (width <= 768) {
          const missingGutters = await page.locator('#view > section, #view > .cs-head, #view > .breadcrumbs').evaluateAll(nodes => nodes.filter(node => {
            const style = getComputedStyle(node);
            return parseFloat(style.paddingLeft) < 20 || parseFloat(style.paddingRight) < 20;
          }).map(node => node.className || node.tagName));
          assert.deepEqual(missingGutters, [], route + ': every mobile section has side padding');
        }
        assert(!/Add file|Your words go here|awaiting a real image|Open notes/.test(await page.locator('#view').innerText()));
        const resumeLinks = await page.locator('a').evaluateAll(nodes => nodes.filter(n => /résumé|resume/i.test(n.textContent)).map(n => ({ href: n.href, label: n.textContent.trim(), download: n.hasAttribute('download') })));
        assert(resumeLinks.length > 0, route + ': résumé access is available');
        for (const link of resumeLinks) {
          assert.equal(link.href, RESUME_URL, route + ': résumé opens the supplied Drive link');
          assert.match(link.label, /Download résumé/i);
          assert.equal(link.download, false, 'no local download attachment');
        }
        assert.equal(await page.locator('#printCv, [data-rec-open]').count(), 0, 'no print or notes launcher');
      }
      await page.goto(base + '#/work');
      await page.waitForTimeout(400);
      await page.evaluate(() => window.scrollTo({ top: 450, behavior: 'instant' }));
      await page.waitForTimeout(150);
      const browsingY = await page.evaluate(() => scrollY);
      await page.locator('a[href="#/work/chat360"]').first().evaluate(n => n.click());
      await page.waitForFunction(() => location.hash === '#/work/chat360');
      await page.waitForTimeout(100);
      await page.goBack();
      await page.waitForFunction(y => Math.abs(scrollY - y) < 10 && location.hash === '#/work', browsingY);
      await page.evaluate(() => { location.hash = '#/resume'; });
      await page.locator('[data-resume-download]').first().waitFor();
      assert.equal(await page.locator('[data-resume-download]').first().getAttribute('href'), RESUME_URL);
      await page.emulateMedia({ media: 'print' });
      assert.equal(await page.locator('.cv-job').count(), 5);
      for (const item of await page.locator('.cv-job, .cv-block').all()) {
        assert.equal(await item.evaluate(n => getComputedStyle(n).opacity), '1', 'print includes every résumé section');
      }
      await page.emulateMedia({ media: 'screen' });
      await page.locator('#navToggle').click();
      await page.keyboard.press('Shift+Tab');
      assert(await page.evaluate(() => !!document.activeElement.closest('#navDrawer')), 'menu traps keyboard focus');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#navToggle').getAttribute('aria-expanded'), 'false');
      await page.evaluate(() => { location.hash = '#/'; });
      await page.locator('#workMore').waitFor({ state: width <= 600 ? 'visible' : 'hidden' });
      if (width <= 600) {
        assert.equal(await page.locator('#selectedResults .rcard:visible').count(), 1);
        await page.locator('#workMore').evaluate(n => n.click());
        assert.equal(await page.locator('#selectedResults .rcard:visible').count(), 3);
      } else assert.equal(await page.locator('#selectedResults .rcard:visible').count(), 3);
      const order = await page.locator('#view > section').evaluateAll(nodes => nodes.slice(0, 3).map(n => n.className));
      assert(order[0].includes('hero') && order[1].includes('ask'), 'assistant follows hero');
      assert.equal(await page.locator('[data-ask]').count(), 3);
      assert.deepEqual(errors, []);
      await context.close();
      console.log('PASS navigation, headings, overflow, print visibility and mobile disclosure at ' + width + 'px');
    }
    const loaderContext = await browser.newContext({ viewport: { width: 393, height: 851 } });
    const loaderPage = await loaderContext.newPage();
    await loaderPage.clock.install();
    await loaderPage.clock.pauseAt(new Date());
    await loaderPage.goto(base);
    const firstFact = await loaderPage.locator('#vloadFact').innerText();
    assert.equal(firstFact.trim().split(/\s+/).length, 10);
    const waveBefore = await loaderPage.locator('#vloadWave').innerHTML();
    await loaderPage.clock.runFor(100);
    assert.notEqual(await loaderPage.locator('#vloadWave').innerHTML(), waveBefore, 'voice waveform animates');
    await loaderPage.clock.runFor(3000);
    assert(await loaderPage.locator('#vload').isVisible(), 'fast load still leaves reading time');
    await loaderPage.clock.runFor(600);
    assert.equal(await loaderPage.locator('#vload').count(), 0);
    await loaderPage.reload();
    const nextFact = await loaderPage.locator('#vloadFact').innerText();
    assert.notEqual(nextFact, firstFact, 'a new fact appears on the next load');
    assert.equal(nextFact.trim().split(/\s+/).length, 10);
    await loaderPage.locator('#loaderSkip').click();
    assert.equal(await loaderPage.locator('#vload').count(), 0, 'explicit skip bypasses the minimum timer');
    await loaderContext.close();
    for (const width of [320, 393, 768, 1440]) {
      const controls = await browser.newContext({ viewport: { width, height: 851 }, reducedMotion: 'reduce' });
      const controlsPage = await controls.newPage();
      await controlsPage.goto(base);
      await controlsPage.locator('#vload').waitFor({ state: 'hidden' });
      const skip = await controlsPage.locator('#scrollCue').boundingBox();
      const resume = await controlsPage.locator('.intro-resume').boundingBox();
      assert(Math.abs((skip.y + skip.height / 2) - (resume.y + resume.height / 2)) < 2, 'intro actions share a row');
      assert(resume.x >= skip.x + skip.width + 6, 'intro actions do not overlap');
      assert(skip.x >= 16 && resume.x + resume.width <= width - 16, 'intro actions respect screen edges');
      assert((await controlsPage.locator('a[href^="mailto:"]').first().getAttribute('href')).includes('avinashdev.garudapalli2027@mastersunion.org'));
      await controls.close();
    }
    console.log('PASS rotating ten-word facts, fast-load reading time, waveform, explicit skip, side-by-side controls and new email');
    const stalledContext = await browser.newContext({ viewport: { width: 393, height: 851 }, reducedMotion: 'reduce' });
    const stalledPage = await stalledContext.newPage();
    const loaderHtml = fs.readFileSync(path.join(docs, 'index.html'), 'utf8');
    await stalledPage.route('**/loader-only.html', route => route.fulfill({ contentType: 'text/html', body: loaderHtml.slice(0, loaderHtml.lastIndexOf('<script>')) }));
    await stalledPage.clock.install();
    await stalledPage.clock.pauseAt(new Date());
    await stalledPage.goto(base + 'loader-only.html');
    const stalledFact = await stalledPage.locator('#vloadFact').innerText();
    const staticWave = await stalledPage.locator('#vloadWave').innerHTML();
    await stalledPage.clock.runFor(3200);
    assert.notEqual(await stalledPage.locator('#vloadFact').innerText(), stalledFact, 'slow loads rotate facts');
    assert.equal(await stalledPage.locator('#vloadWave').innerHTML(), staticWave, 'reduced motion keeps waveform static');
    await stalledPage.clock.runFor(9500);
    assert(await stalledPage.locator('#vload').isVisible(), 'the last fact retains a full reading window');
    await stalledPage.clock.runFor(100);
    assert.equal(await stalledPage.locator('#vload').count(), 0, 'stalled main script cannot trap visitors');
    await stalledContext.close();
    console.log('PASS slow-load fact rotation, reduced-motion waveform and stalled-script escape');
    const intro = await browser.newContext({ viewport: { width: 393, height: 851 } });
    const introPage = await intro.newPage();
    await introPage.goto(base);
    await introPage.locator('#vload').waitFor({ state: 'hidden' });
    await assertDriveClick(introPage, '.intro-resume');
    await intro.close();
    const firstLoadResume = await browser.newContext({ viewport: { width: 393, height: 851 } });
    const firstLoadPage = await firstLoadResume.newPage();
    await firstLoadPage.goto(base);
    await assertDriveClick(firstLoadPage, '.vload-actions a');
    await firstLoadResume.close();
    for (const action of ['skip', 'resume']) {
      const slow = await browser.newContext({ viewport: { width: 393, height: 851 } });
      const slowPage = await slow.newPage();
      await slowPage.goto(base + 'slow.html', { waitUntil: 'commit' });
      await slowPage.locator('#loaderSkip').waitFor();
      assert.equal(await slowPage.locator('#view h1').count(), 0, 'main script has not arrived yet');
      if (action === 'skip') {
        await slowPage.locator('#loaderSkip').click();
        await slowPage.waitForFunction(() => document.querySelector('#view h1') && scrollY > 200 && getComputedStyle(document.getElementById('stage')).opacity === '0');
      } else {
        await assertDriveClick(slowPage, '.vload-actions a');
      }
      await slow.close();
    }
    const experience = await browser.newContext({ viewport: { width: 1100, height: 700 } });
    const experiencePage = await experience.newPage();
    await experiencePage.goto(base + '#/experience');
    await experiencePage.waitForTimeout(600);
    await experiencePage.evaluate(() => window.scrollTo({ top: 1800, behavior: 'instant' }));
    await experiencePage.waitForTimeout(500);
    const experienceY = await experiencePage.evaluate(() => scrollY);
    await experiencePage.locator('.xp-link[href="#/work/chat360"]').evaluate(n => n.click());
    await experiencePage.waitForFunction(() => location.hash === '#/work/chat360');
    await experiencePage.waitForTimeout(200);
    await experiencePage.goBack();
    await experiencePage.waitForFunction(y => location.hash === '#/experience' && Math.abs(scrollY - y) < 10, experienceY);
    await experience.close();
    const bypass = await browser.newContext({ viewport: { width: 393, height: 851 } });
    const bypassPage = await bypass.newPage();
    await bypassPage.goto(base);
    if (await bypassPage.locator('#loaderSkip').isVisible()) await bypassPage.locator('#loaderSkip').click();
    else await bypassPage.locator('#scrollCue').click();
    await bypassPage.waitForFunction(() => scrollY > 200 && getComputedStyle(document.getElementById('stage')).opacity === '0');
    await bypass.close();
    console.log('PASS normal-motion intro résumé link and immediate bypass');
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(base + '#/');
    let mode = 'failure';
    const requests = [];
    await page.route('**/api/chat', route => {
      if (route.request().method() === 'POST') requests.push(route.request().postDataJSON());
      if (mode === 'hang') return;
      const headers = { 'Access-Control-Allow-Origin': '*' };
      if (mode === 'failure') return route.fulfill({ status: 503, contentType: 'application/json', headers, body: '{"error":"upstream unavailable"}' });
      if (mode === 'malformed') return route.fulfill({ status: 200, contentType: 'application/json', headers, body: 'invalid JSON' });
      if (mode === 'badSources') return route.fulfill({ status: 200, contentType: 'application/json', headers, body: '{"answer":"An answer with no valid sources.","sources":{"bad":true}}' });
      return route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify({ answer: 'Chat360 Voice AI ownership.', sources: [{ title: 'Contact', route: '#/contact' }, { title: 'Chat360', route: '#/work/chat360' }] }) });
    });
    await page.locator('[data-ask]').first().evaluate(n => n.click());
    await page.locator('[data-chat-retry]').waitFor();
    assert(await page.locator('#chatLog a[href="#/work"]').count(), 'failure offers a useful independent route');
    mode = 'success';
    await page.locator('[data-chat-retry]').click();
    await page.waitForFunction(() => document.getElementById('chatLog').innerText.includes('Chat360 Voice AI ownership.'));
    assert.equal(await page.locator('.msg-src a').last().getAttribute('href'), '#/contact');
    await page.locator('#chatInput').fill('Tell me about Nosh House');
    await page.locator('#chatForm').evaluate(form => form.requestSubmit());
    await page.waitForFunction(() => !document.getElementById('chatSend').disabled);
    await page.locator('[data-chat-retry]').first().click();
    await page.waitForFunction(() => !document.getElementById('chatSend').disabled);
    assert.equal(await page.locator('.msg-you').count(), 3, 'retrying an older question creates an explicit new user turn');
    assert.equal(requests.at(-1).history.at(-1).role, 'model', 'retry history preserves the newer answer');
    await page.locator('#chatClear').focus();
    await page.keyboard.press('Shift+Tab');
    assert(await page.evaluate(() => !!document.activeElement.closest('.chat')), 'chat traps keyboard focus');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#chatScrim').isVisible(), false);
    await page.locator('[data-ask]').first().evaluate(n => n.click());
    await page.waitForFunction(() => document.getElementById('chatLog').innerText.includes('Chat360 Voice AI ownership.'));
    await page.locator('#chatClear').click();
    mode = 'malformed';
    await page.locator('#chatInput').fill('What did Avinash build?');
    await page.locator('#chatForm').evaluate(form => form.requestSubmit());
    await page.locator('[data-chat-retry]').waitFor();
    assert(!(await page.locator('#chatLog').innerText()).includes('SyntaxError'));
    await page.locator('#chatClear').click();
    mode = 'badSources';
    await page.locator('#chatInput').fill('What did Avinash build?');
    await page.locator('#chatForm').evaluate(form => form.requestSubmit());
    await page.waitForFunction(() => document.getElementById('chatLog').innerText.includes('An answer with no valid sources.'));
    assert.equal(await page.locator('.msg-src a').count(), 0);
    await page.locator('#chatClear').click();
    await context.setOffline(true);
    await page.locator('#chatInput').fill('Offline question');
    await page.locator('#chatForm').evaluate(form => form.requestSubmit());
    assert((await page.locator('#chatLog').innerText()).includes('offline'));
    await context.setOffline(false);
    await page.locator('#chatClear').click();
    mode = 'hang';
    await page.clock.install();
    await page.locator('#chatInput').fill('Slow question');
    await page.locator('#chatForm').evaluate(form => form.requestSubmit());
    await page.waitForFunction(() => document.getElementById('chatLog').innerText.includes('reading the site'));
    await page.clock.fastForward(26000);
    await page.locator('[data-chat-retry]').waitFor();
    assert((await page.locator('#chatLog').innerText()).includes('too long'));
    await page.locator('#chatClear').click();
    await page.locator('#chatInput').fill('Cancel this question');
    await page.locator('#chatForm').evaluate(form => form.requestSubmit());
    await page.locator('#chatClear').click();
    await page.clock.fastForward(26000);
    assert.equal(await page.locator('#chatLog .msg').count(), 0, 'cancelled requests do not append stale answers');
    await context.close();
    const nojs = await browser.newContext({ javaScriptEnabled: false });
    const fallback = await nojs.newPage();
    await fallback.goto(base);
    assert(await fallback.locator('.offline-profile a[href^="mailto:"]').isVisible());
    await nojs.close();
    const storage = await browser.newContext({ reducedMotion: 'reduce' });
    await storage.addInitScript(() => {
      Storage.prototype.getItem = () => { throw new Error('storage blocked'); };
      Storage.prototype.setItem = () => { throw new Error('storage blocked'); };
    });
    const safe = await storage.newPage();
    await safe.route('**/vendor/*', route => route.abort());
    await safe.goto(base + '#/work');
    assert.equal(await safe.locator('#view h1').count(), 1);
    assert.equal(await safe.locator('#view .rcard').count(), 5);
    await storage.close();
    console.log('PASS assistant success, failure, retry, source validation, malformed responses, offline, timeout, cancellation, keyboard focus, blocked storage, missing libraries and no-JavaScript recovery');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
