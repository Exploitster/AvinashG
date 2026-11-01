#!/usr/bin/env node
/**
 * Wraps the portfolio source into a standalone page for GitHub Pages.
 *
 * design/avinash-console.html is authored as a fragment because the Claude
 * Artifact host supplies the document shell. GitHub Pages does not, so the
 * viewport meta in particular has to be added here or the site renders at a
 * 980px fallback width on phones.
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { minify } from "terser";
import CleanCSS from "clean-css";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = resolve(root, "design/avinash-console.html");
const OUT = resolve(root, "docs/index.html");

let body = readFileSync(SRC, "utf8");
mkdirSync(resolve(root, "docs/images"), { recursive: true });
for (const image of ["avinash-portrait.webp", "avinash-portrait-480.webp", "avinash-portrait-768.webp", "avinash-portrait-glitch-480.webp", "avinash-portrait-glitch-768.webp", "avinash-portrait-glitch-960.webp"]) {
  copyFileSync(resolve(root, "assets/images", image), resolve(root, "docs/images", image));
}

/* GSAP is vendored rather than fetched.
 *
 * The source carries CDN URLs because it is also previewed as a fragment in
 * the Claude Artifact host, which has no build step to rewrite anything. The
 * deployed site should not depend on a third party staying up, and the QA
 * harness loads the built file over file:// with no network at all - a CDN
 * script there would silently fail and every motion assertion would go with
 * it. So the build copies the exact installed version next to the page and
 * points the tags at it. Version drift is impossible: these are the same
 * files npm resolved, not a URL that might serve something else later.
 */
/* [ file inside node_modules, name written to docs/vendor/, exact CDN URL in
   the source ]. The CDN URL is listed rather than derived: SplitType ships at
   /umd/index.min.js but is vendored under a descriptive name, so anything that
   infers one from the other silently stops matching. */
const VENDOR = [
  ["gsap/dist/gsap.min.js", "gsap.min.js",
   "https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"],
  ["gsap/dist/ScrollTrigger.min.js", "ScrollTrigger.min.js",
   "https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/ScrollTrigger.min.js"],
  ["lenis/dist/lenis.min.js", "lenis.min.js",
   "https://cdn.jsdelivr.net/npm/lenis@1.3.26/dist/lenis.min.js"],
];
const vendorDir = resolve(root, "docs/vendor");
mkdirSync(vendorDir, { recursive: true });
for (const [from, to, cdn] of VENDOR) {
  copyFileSync(resolve(root, "node_modules", from), resolve(vendorDir, to));
  if (!body.includes(cdn)) {
    throw new Error(`vendored ${to} but the source never referenced ${cdn}`);
  }
  body = body.split(cdn).join("vendor/" + to);
}
if (body.includes("cdn.jsdelivr.net")) {
  throw new Error("a CDN URL survived vendoring - add it to VENDOR or fix the version in the source");
}

for (const obsolete of ["vendor/SplitText.min.js", "vendor/ScrambleTextPlugin.min.js", "images/avinash-portrait-glitch.gif"]) {
  rmSync(resolve(root, "docs", obsolete), { force: true });
}

const DESCRIPTION =
  "Avinash Garudapalli - AI product manager. Voice AI, generative and " +
  "agentic products, and the business case underneath them.";

// All deployments name the preferred public domain; SITE_URL can override it.
const SITE_URL = new URL(
  process.env.SITE_URL || "https://avinashg.tech/"
).href;

let page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${DESCRIPTION}">
<meta name="theme-color" content="#000000">
<link rel="canonical" href="${SITE_URL}">
<meta property="og:url" content="${SITE_URL}">
<meta property="og:title" content="Avinash Garudapalli">
<meta property="og:description" content="${DESCRIPTION}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' fill='%23000000'/><circle cx='16' cy='16' r='7' fill='%2379B397'/></svg>">
<style>
  :root { color-scheme: dark; }
  html, body { margin: 0; }
  /* The intro lives at the very top of the page, so any swipe that ran past
     the top edge fired Chrome's pull-to-refresh and reloaded the whole site
     mid-animation - caught on a real phone recording, where it looked like the
     intro randomly restarting. overscroll-behavior does not make html a scroll
     container, so unlike overflow-x: clip it leaves position: sticky alone. */
  html { overscroll-behavior-y: none; }

  img { max-width: 100%; }
  [hidden] { display: none !important; }
</style>
</head>
<body>
${body}
<noscript>
<style>.stage, .vload, .topbar, #spacer, #view, .site-footer, .edge-rail, .intro-resume { display: none !important; } .offline-profile { max-width: 760px; margin: 60px auto; padding: 24px; color: #f4f4f4; font: 18px/1.6 system-ui, sans-serif; } .offline-profile a { color: #79B397; display: inline-block; margin: 10px 18px 10px 0; }</style>
<main class="offline-profile">
<h1>Avinash Garudapalli - AI Product Manager</h1>
<p>Enterprise Voice AI product work and end-to-end business ownership at Nosh House Cafe.</p>
<p>Enable JavaScript to explore the interactive case studies. You can also read the résumé or contact me directly.</p>
<a target="_blank" rel="noopener noreferrer" href="https://drive.google.com/file/d/1FetKoTI3R4i9ifAlpLTDsdYSYlU3Ortm/view?usp=sharing">Download résumé</a>
<a href="mailto:avinashdev.garudapalli2027@mastersunion.org">Email Avinash</a>
<a target="_blank" rel="noopener noreferrer" href="https://www.linkedin.com/in/avinashdevg/">LinkedIn</a>
</main>
</noscript>
</body>
</html>
`;

// Compress only the published output; the authored source stays readable.
page = page.replace(/<style>([\s\S]*?)<\/style>/g, (_, css) => {
  const result = new CleanCSS({ level: 1 }).minify(css);
  if (result.errors.length) throw new Error(result.errors.join("\n"));
  return "<style>" + result.styles + "</style>";
});
const inlineScripts = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)];
for (const match of inlineScripts) {
  const result = await minify(match[1], { format: { inline_script: true, comments: false } });
  page = page.replace(match[0], "<script>" + result.code + "</script>");
}
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, page);
console.log(`built ${OUT} (${(page.length / 1024).toFixed(1)} KB)`);
