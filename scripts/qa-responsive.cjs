/**
 * Responsive + interaction QA for the built portfolio (docs/index.html).
 *
 * Runs the real deployed file through a device matrix and asserts the things
 * that actually break on phones: horizontal overflow, tap target size, unread-
 * able type, content stuck behind reveal animations, and whether the core
 * interactions work by tap rather than hover.
 *
 * Usage: node scripts/qa-responsive.cjs
 */
const { chromium } = require("playwright");
const path = require("path");

const FILE = "file://" + path.resolve(__dirname, "../docs/index.html");

const ROUTES = [
  "#/", "#/story", "#/experience", "#/beyond",
  "#/work/chat360", "#/work/cordelia-cruises", "#/work/nosh-house",
  "#/work/yapita-health", "#/work/events-fusion",
  "#/lab", "#/thinking", "#/about", "#/resume", "#/contact",
];

const DEVICES = [
  { name: "Android · Galaxy S8 (360×740)",     w: 360,  h: 740,  dpr: 4,   touch: true,  class: "phone" },
  { name: "Android · small (320×568)",         w: 320,  h: 568,  dpr: 2,   touch: true,  class: "phone" },
  { name: "Android · Pixel 5 (393×851)",       w: 393,  h: 851,  dpr: 2.75,touch: true,  class: "phone" },
  { name: "Android · Pixel 7 (412×915)",       w: 412,  h: 915,  dpr: 2.6, touch: true,  class: "phone" },
  { name: "Android · Pixel 7 landscape",       w: 915,  h: 412,  dpr: 2.6, touch: true,  class: "phone" },
  { name: "Tablet · Galaxy Tab (800×1280)",    w: 800,  h: 1280, dpr: 2,   touch: true,  class: "tablet" },
  { name: "Tablet · 768×1024 portrait",        w: 768,  h: 1024, dpr: 2,   touch: true,  class: "tablet" },
  { name: "Tablet · 1024×768 landscape",       w: 1024, h: 768,  dpr: 2,   touch: true,  class: "tablet" },
  // Mid widths matter as much as the extremes: the breakpoint bands between
  // tablet and desktop are where a rail runs out of room, and nothing in this
  // list covered 1100-1360 until a sweep found 161px of overflow living there.
  { name: "Laptop · 1100×700",                 w: 1100, h: 700,  dpr: 1,   touch: false, class: "desktop" },
  { name: "Laptop · 1180×820",                 w: 1180, h: 820,  dpr: 2,   touch: false, class: "desktop" },
  { name: "Laptop · 1280×800",                 w: 1280, h: 800,  dpr: 1,   touch: false, class: "desktop" },
  { name: "Desktop · 1366×768",                w: 1366, h: 768,  dpr: 1,   touch: false, class: "desktop" },
  { name: "Desktop · 1920×1080",               w: 1920, h: 1080, dpr: 1,   touch: false, class: "desktop" },
];

const fails = [];
const warns = [];
function fail(dev, route, msg) { fails.push(`${dev} | ${route} | ${msg}`); }
function warn(dev, route, msg) { warns.push(`${dev} | ${route} | ${msg}`); }

// Audit run inside the page: overflow, tap targets, tiny text, hidden content.
// isTouch gates the 44px rule — it is a finger guideline, not a mouse one.
function audit(isTouch) {
  const vw = document.documentElement.clientWidth;
  const overflow = document.documentElement.scrollWidth - vw;

  const inFixed = (n) => {
    let c = n;
    while (c && c !== document.body) {
      const cs = getComputedStyle(c);
      if (cs.position === "fixed") return true;
      c = c.parentElement;
    }
    return false;
  };

  const offenders = [];
  document.querySelectorAll("body *").forEach((n) => {
    if (inFixed(n)) return;
    const r = n.getBoundingClientRect();
    if (r.width > 0 && r.right > vw + 1) {
      offenders.push((n.tagName + "." + (typeof n.className === "string" ? n.className.split(" ")[0] : "")).slice(0, 40));
    }
  });

  // interactive elements currently on screen and actually visible
  const small = [];
  if (isTouch) document.querySelectorAll("a, button, summary, input, [role=button]").forEach((n) => {
    const cs = getComputedStyle(n);
    if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) < 0.05) return;
    const r = n.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    if (r.bottom < 0 || r.top > innerHeight) return;
    // inline text links inside prose are exempt from the 44px rule
    const inProse = n.closest("p, li, .init-body, .cv-points, .cv-list, .foot-nav, .statusbar");
    if (inProse) return;
    if (r.height < 40 || r.width < 40) {
      small.push(`${n.tagName.toLowerCase()}.${(typeof n.className === "string" ? n.className.split(" ")[0] : "")} ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
  });

  // body copy that would be unreadable on a phone
  const tiny = [];
  document.querySelectorAll("p, li, dd, .lede, .work-line, .init-sum").forEach((n) => {
    const r = n.getBoundingClientRect();
    if (r.height === 0) return;
    const fs = parseFloat(getComputedStyle(n).fontSize);
    if (fs < 11.5) tiny.push(`${n.tagName.toLowerCase()} ${fs}px`);
  });

  // anything meant to be read that is stuck invisible well inside the viewport
  const stuck = [];
  document.querySelectorAll(".rv").forEach((n) => {
    const r = n.getBoundingClientRect();
    const visibleEnough = r.top < innerHeight * 0.75 && r.bottom > 0;
    if (visibleEnough && parseFloat(getComputedStyle(n).opacity) < 0.5) {
      stuck.push((n.className || "").slice(0, 40));
    }
  });

  const main = document.getElementById("view");
  const copy = main ? (main.innerText || "") : "";
  const holes = ["undefined", "null", "NaN", "[object Object]"]
    .filter((t) => new RegExp("(^|\\s)" + t.replace("[", "\\[") + "(\\s|$|\\.|,)").test(copy));
  // CSS/JS escape sequences that leaked into visible copy (e.g. \2197, \u00b7)
  const escaped = /\\[0-9a-fA-F]{4}|\\u[0-9a-fA-F]{4}/.test(copy)
    ? [(copy.match(/\\[0-9a-fA-F]{4}|\\u[0-9a-fA-F]{4}/) || [""])[0]] : [];
  holes.push.apply(holes, escaped);

  // Colour contrast. A theme change can push text under WCAG AA everywhere at
  // once while every layout check still passes, and the page still *looks*
  // deliberate — so it is asserted rather than eyeballed. Translucent layers
  // are composited before measuring: a 9% tint is not its own base colour.
  const parseC = (c) => {
    const m = (c.match(/[\d.]+/g) || []).map(Number);
    return { r: m[0] || 0, g: m[1] || 0, b: m[2] || 0, a: m.length > 3 ? m[3] : 1 };
  };
  const relLum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const behind = (el) => {
    const stack = [];
    let n = el;
    while (n && n !== document.documentElement) {
      const c = parseC(getComputedStyle(n).backgroundColor);
      if (c.a > 0) { stack.push(c); if (c.a >= 0.999) break; }
      n = n.parentElement;
    }
    let out = { r: 255, g: 255, b: 255 };
    for (let i = stack.length - 1; i >= 0; i--) {
      const c = stack[i];
      out = { r: c.r * c.a + out.r * (1 - c.a), g: c.g * c.a + out.g * (1 - c.a), b: c.b * c.a + out.b * (1 - c.a) };
    }
    return out;
  };
  const contrast = [];
  document.querySelectorAll("#view p, #view h1, #view h2, #view h3, #view a, #view li, #view span, #view dd, .topbar a").forEach((n) => {
    const t = (n.textContent || "").trim();
    if (!t || t.length < 2) return;
    const cs = getComputedStyle(n);
    if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) < 0.5) return;
    const r = n.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const size = parseFloat(cs.fontSize);
    const large = size >= 24 || (size >= 18.66 && parseInt(cs.fontWeight, 10) >= 700);
    const L1 = relLum(parseC(cs.color)), L2 = relLum(behind(n));
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    if (ratio < (large ? 3 : 4.5)) {
      contrast.push(`${n.tagName.toLowerCase()}.${(typeof n.className === "string" ? n.className.split(" ")[0] : "")} ${ratio.toFixed(2)}:1`);
    }
  });

  return {
    holes,
    overflow,
    offenders: [...new Set(offenders)].slice(0, 4),
    small: [...new Set(small)].slice(0, 5),
    tiny: [...new Set(tiny)].slice(0, 4),
    stuck: [...new Set(stuck)].slice(0, 4),
    textLen: main ? (main.innerText || "").trim().length : 0,
    contrast: [...new Set(contrast)].slice(0, 5),
  };
}

(async () => {
  const browser = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  });

  for (const d of DEVICES) {
    const ctx = await browser.newContext({
      viewport: { width: d.w, height: d.h },
      deviceScaleFactor: d.dpr,
      isMobile: d.class !== "desktop",
      hasTouch: d.touch,
      userAgent: d.class === "desktop" ? undefined :
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36",
    });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => fail(d.name, "-", "JS error: " + e.message));
    page.on("console", (m) => {
      // ERR_CERT_AUTHORITY_INVALID: the sandboxed CI proxy re-signs TLS with a CA
      // headless Chromium does not trust, so fonts.googleapis.com fails here and
      // only here. Fonts are decorative and have a full fallback stack.
      if (m.type() === "error" && !/ERR_CONNECTION|ERR_NAME|ERR_TUNNEL|ERR_PROXY|ERR_INTERNET|ERR_CERT_AUTHORITY_INVALID|favicon|lovable\.app/.test(m.text())) {
        fail(d.name, "-", "console error: " + m.text().slice(0, 90));
      }
    });

    await page.goto(FILE, { waitUntil: "load" });
    await page.waitForTimeout(2200);

    for (const route of ROUTES) {
      await page.evaluate((h) => { location.hash = h; }, route);
      await page.waitForTimeout(500);
      // On the overview the intro renders the page scaled down inside the
      // monitor, so anything measured before the spacer is spent reports the
      // preview's dimensions, not the layout's. Clear the runway first.
      await page.evaluate(() => {
        const sp = document.getElementById("spacer");
        const past = sp && sp.offsetHeight ? sp.offsetHeight + 400 : 400;
        window.scrollTo(0, Math.min(past, document.body.scrollHeight));
      });
      // Scrolling the runway in one jump is a flick, and the intro now paces
      // a flick rather than consuming it in three frames, so it can still be
      // playing after a fixed wait that used to be long enough. Wait on the
      // real end state rather than a timeout. This is belt-and-braces: the
      // stage also hides itself once faded, which is what actually keeps the
      // monitor's preview clone out of these measurements.
      await page
        .waitForFunction(() => {
          const st = document.getElementById("stage");
          if (!st || !st.classList.contains("live")) return true;
          return parseFloat(getComputedStyle(st).opacity) === 0;
        }, { timeout: 8000 })
        .catch(() => warn(d.name, route, "intro never settled within 8s"));
      // reveals run 620ms plus up to 225ms of stagger; wait past that so the
      // audit measures settled state rather than a mid-transition frame
      await page.waitForTimeout(1200);

      // The voice-wave loader removes itself within 3.5s at most. If it is
      // still in the page here it is covering everything the audit measures.
      if (await page.evaluate(() => !!document.getElementById("vload"))) {
        fail(d.name, route, "voice-wave loader still covering the page");
      }

      const r = await page.evaluate(audit, d.touch);

      if (r.overflow > 1) fail(d.name, route, `horizontal overflow ${r.overflow}px [${r.offenders.join(", ")}]`);
      // scrollWidth alone over-reports: an element wider than the window inside
      // an overflow:hidden parent is clipped and the visitor never sees it. The
      // question that matters is whether the page can actually be dragged
      // sideways, so ask it directly.
      const sideways = await page.evaluate(() => {
        const before = window.scrollX;
        window.scrollTo(9999, window.scrollY);
        const after = window.scrollX;
        window.scrollTo(before, window.scrollY);
        return after > before + 1;
      });
      if (sideways) fail(d.name, route, "page can be scrolled horizontally");
      if (r.small.length) warn(d.name, route, `tap target <40px: ${r.small.join(", ")}`);
      if (r.tiny.length) fail(d.name, route, `text under 11.5px: ${r.tiny.join(", ")}`);
      if (r.stuck.length) fail(d.name, route, `content stuck hidden: ${r.stuck.join(", ")}`);
      if (r.holes && r.holes.length) fail(d.name, route, `rendered placeholder text: ${r.holes.join(", ")}`);
      if (r.textLen < 120) fail(d.name, route, `page nearly empty (${r.textLen} chars)`);
      if (r.contrast && r.contrast.length) fail(d.name, route, `contrast below WCAG AA: ${r.contrast.join(", ")}`);
    }

    // ---- interaction checks ----
    await page.evaluate(() => { location.hash = "#/"; });
    await page.waitForTimeout(600);

    // menu drawer reaches every page
    const menu = await page.evaluate(async () => {
      const t = document.getElementById("navToggle");
      if (!t) return { err: "no menu button" };
      t.click();
      await new Promise((r) => setTimeout(r, 500));
      const d = document.getElementById("navDrawer");
      const open = d && d.classList.contains("open");
      const links = document.querySelectorAll("#navBody .drawer-link").length;
      const onScreen = d ? d.getBoundingClientRect().left < innerWidth - 10 : false;
      document.getElementById("navClose").click();
      await new Promise((r) => setTimeout(r, 450));
      const closed = d && !d.classList.contains("open");
      return { open, links, onScreen, closed };
    });
    if (menu.err) fail(d.name, "menu", menu.err);
    else {
      if (!menu.open) fail(d.name, "menu", "drawer did not open");
      if (!menu.onScreen) fail(d.name, "menu", "drawer opened off-screen");
      if (menu.links < 12) fail(d.name, "menu", `only ${menu.links} destinations`);
      if (!menu.closed) fail(d.name, "menu", "drawer did not close");
    }

    // latency lab responds to taps (now on the Chat360 case study)
    await page.evaluate(() => { location.hash = "#/work/chat360"; });
    await page.waitForTimeout(800);
    const lab = await page.evaluate(async () => {
      const before = document.getElementById("labTotal").textContent;
      document.getElementById("labAll").click();
      await new Promise((r) => setTimeout(r, 400));
      const after = document.getElementById("labTotal").textContent;
      const verdict = document.getElementById("labVerdict").textContent;
      document.getElementById("labReset").click();
      await new Promise((r) => setTimeout(r, 300));
      return { before, after, verdict, reset: document.getElementById("labTotal").textContent };
    });
    if (!/100/.test(lab.before)) fail(d.name, "lab", `baseline not 100 (${lab.before})`);
    if (!/50/.test(lab.after)) fail(d.name, "lab", `all-on total not 50 (${lab.after})`);
    if (!/50%/.test(lab.verdict)) fail(d.name, "lab", "verdict missing the −50% result");
    if (!/100/.test(lab.reset)) fail(d.name, "lab", "reset did not restore baseline");

    // capability map selects by tap, and wires only on wide screens
    await page.evaluate(() => { location.hash = "#/"; });
    await page.waitForTimeout(800);
    const map = await page.evaluate(async () => {
      const n = document.querySelector('.sysnode[data-p="chat360"]');
      if (!n) return { err: "no map node" };
      n.click();
      await new Promise((r) => setTimeout(r, 400));
      const pressed = n.getAttribute("aria-pressed") === "true";
      const litCaps = document.querySelectorAll(".syscap.on").length;
      const state = (document.getElementById("sysState") || {}).textContent || "";
      const openBtn = document.getElementById("sysOpen");
      const wires = document.querySelectorAll(".sysmap-wires .wire").length;
      return { pressed, litCaps, state, openVisible: openBtn && !openBtn.hidden, wires, w: innerWidth };
    });
    if (map.err) fail(d.name, "map", map.err);
    else {
      if (!map.pressed) fail(d.name, "map", "tap did not select project");
      if (map.litCaps !== 5) fail(d.name, "map", `expected 5 lit capabilities, got ${map.litCaps}`);
      if (!/Chat360/.test(map.state)) fail(d.name, "map", "status line did not update");
      if (!map.openVisible) fail(d.name, "map", "open-case-study link not shown");
      if (map.w > 760 && map.wires !== 16) fail(d.name, "map", `expected 16 wires on wide screen, got ${map.wires}`);
      if (map.w <= 760 && map.wires !== 0) fail(d.name, "map", `wires should be dropped when stacked, got ${map.wires}`);
    }

    // every external product link is present, safe and correctly targeted
    const links = await page.evaluate(async () => {
      location.hash = "#/";
      await new Promise((r) => setTimeout(r, 500));
      // Returning to the overview rewinds to the intro, which renders the page
      // as a thumbnail on the monitor; measure past it or every box is scaled.
      const sp = document.getElementById("spacer");
      window.scrollTo(0, (sp && sp.offsetHeight ? sp.offsetHeight : 0) + 400);
      await new Promise((r) => setTimeout(r, 700));
      const want = ["tragenie.lovable.app", "noshhouse.lovable.app", "blankstore.lovable.app"];
      const ext = [...document.querySelectorAll('a[href^="http"]')];
      const found = want.map((w) => ext.some((a) => a.href.includes(w)));
      const unsafe = ext.filter((a) => a.target === "_blank" && !/noreferrer|noopener/.test(a.rel || ""));
      // a favicon of any shape must stay inside its fixed chip
      const spill = [...document.querySelectorAll("#view .mark-chip, .site-footer .mark-chip")].filter((c) => {
        const cr = c.getBoundingClientRect();
        return [...c.querySelectorAll("img")].some((im) => {
          const ir = im.getBoundingClientRect();
          return ir.width > cr.width + 1 || ir.height > cr.height + 1;
        });
      }).length;
      return { found, unsafe: unsafe.length, spill, total: ext.length };
    });
    const fallback = await page.evaluate(() => {
      // the intro preview is a decorative clone inside the SVG; audit the real page
      const chips = [...document.querySelectorAll("#view .mark-chip, .site-footer .mark-chip")];
      if (!chips.length) return { err: "no brand chips rendered" };
      const bad = chips.filter((c) => {
        const r = c.getBoundingClientRect();
        const word = c.querySelector(".mark-word");
        const wordVisible = word && getComputedStyle(word).display !== "none";
        // square, sized, and showing *something* even with the image gone
        return r.width < 16 || r.height < 16 || Math.abs(r.width - r.height) > 1 || !wordVisible;
      });
      return { total: chips.length, bad: bad.length };
    });
    if (fallback.err) fail(d.name, "brand", fallback.err);
    else if (fallback.bad) fail(d.name, "brand", `${fallback.bad}/${fallback.total} chips broke without a favicon`);

    links.found.forEach((ok, i) => {
      if (!ok) fail(d.name, "links", `missing product link #${i + 1} on home`);
    });
    if (links.unsafe) fail(d.name, "links", `${links.unsafe} target=_blank links without rel=noreferrer`);
    if (links.spill) fail(d.name, "links", `${links.spill} brand marks overflow their chip`);

    // résumé route renders real CV content
    const cv = await page.evaluate(async () => {
      location.hash = "#/resume";
      await new Promise((r) => setTimeout(r, 700));
      return {
        jobs: document.querySelectorAll(".cv-job").length,
        contacts: document.querySelectorAll(".cv-contact a").length,
        print: !!document.getElementById("printCv"),
      };
    });
    if (cv.jobs !== 5) fail(d.name, "resume", `expected 5 roles, got ${cv.jobs}`);
    if (cv.contacts !== 3) fail(d.name, "resume", `expected 3 contact links, got ${cv.contacts}`);
    if (!cv.print) fail(d.name, "resume", "print button missing");

    // BlankStore is a first-class entry, not just a link
    const bs = await page.evaluate(async () => {
      location.hash = "#/";
      await new Promise((r) => setTimeout(r, 800));
      const btn = document.querySelector('#view [data-gal="blankstore"]');
      if (!btn) return { err: "no blankstore entry" };
      btn.click();
      await new Promise((r) => setTimeout(r, 500));
      const open = !document.getElementById("galScrim").hidden;
      const cats = document.querySelectorAll(".gal-cat").length;
      document.getElementById("galClose").click();
      await new Promise((r) => setTimeout(r, 300));
      return { open, cats };
    });
    if (bs.err) fail(d.name, "blankstore", bs.err);
    else {
      if (!bs.open) fail(d.name, "blankstore", "gallery did not open");
      if (bs.cats < 2) fail(d.name, "blankstore", `only ${bs.cats} gallery categories`);
    }

    // contact links must be actionable (mailto / tel / linkedin)
    const contact = await page.evaluate(async () => {
      location.hash = "#/contact";
      await new Promise((r) => setTimeout(r, 600));
      const hs = [...document.querySelectorAll(".contact-cell, .reach")].map((a) => a.getAttribute("href") || "");
      return {
        mailto: hs.some((h) => h.startsWith("mailto:")),
        tel: hs.some((h) => h.startsWith("tel:")),
        li: hs.some((h) => h.includes("linkedin.com")),
      };
    });
    if (!contact.mailto) fail(d.name, "contact", "no mailto: link");
    if (!contact.tel) fail(d.name, "contact", "no tel: link (phone dialler)");
    if (!contact.li) fail(d.name, "contact", "no LinkedIn link");

    await ctx.close();
  }

  // ---- reduced motion: everything must still be readable ----
  const rmCtx = await browser.newContext({
    viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true,
    reducedMotion: "reduce",
  });
  const rm = await rmCtx.newPage();
  rm.on("pageerror", (e) => fail("reduced-motion", "-", "JS error: " + e.message));
  await rm.goto(FILE, { waitUntil: "load" });
  await rm.waitForTimeout(1600);
  const rmRes = await rm.evaluate(() => {
    const hidden = [...document.querySelectorAll(".rv")]
      .filter((n) => parseFloat(getComputedStyle(n).opacity) < 0.5).length;
    return { hidden, screen: (document.getElementById("scTag") || {}).textContent };
  });
  if (rmRes.hidden > 0) fail("reduced-motion", "#/", `${rmRes.hidden} elements hidden with reduced motion`);
  if (!/Metacognist/.test(rmRes.screen || "")) fail("reduced-motion", "#/", "hero screen text not shown");
  await rmCtx.close();

  await browser.close();

  console.log("\n================ RESULTS ================");
  console.log(`devices: ${DEVICES.length}   routes/device: ${ROUTES.length}`);
  console.log(`FAILURES: ${fails.length}`);
  fails.forEach((f) => console.log("  ✗ " + f));
  console.log(`WARNINGS: ${warns.length}`);
  warns.slice(0, 25).forEach((w) => console.log("  ! " + w));
  if (warns.length > 25) console.log(`  … ${warns.length - 25} more`);
  console.log("=========================================\n");
  process.exit(fails.length ? 1 : 0);
})();
