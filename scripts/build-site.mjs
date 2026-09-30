#!/usr/bin/env node
/**
 * Wraps the portfolio source into a standalone page for GitHub Pages.
 *
 * design/avinash-console.html is authored as a fragment because the Claude
 * Artifact host supplies the document shell. GitHub Pages does not, so the
 * viewport meta in particular has to be added here or the site renders at a
 * 980px fallback width on phones.
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = resolve(root, "design/avinash-console.html");
const OUT = resolve(root, "docs/index.html");

let body = readFileSync(SRC, "utf8");

/* GSAP is vendored rather than fetched.
 *
 * The source carries CDN URLs because it is also previewed as a fragment in
 * the Claude Artifact host, which has no build step to rewrite anything. The
 * deployed site should not depend on a third party staying up, and the QA
 * harness loads the built file over file:// with no network at all — a CDN
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
  ["gsap/dist/SplitText.min.js", "SplitText.min.js",
   "https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/SplitText.min.js"],
  ["gsap/dist/ScrambleTextPlugin.min.js", "ScrambleTextPlugin.min.js",
   "https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/ScrambleTextPlugin.min.js"],
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
  throw new Error("a CDN URL survived vendoring — add it to VENDOR or fix the version in the source");
}

const DESCRIPTION =
  "Avinash Garudapalli — AI product manager. Voice AI, generative and " +
  "agentic products, and the business case underneath them.";

// Canonical home of the site. Everything that reports a URL points here.
const SITE_URL = "https://exploitster.github.io/AvinashG/";

const page = `<!doctype html>
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
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' fill='%23000000'/><circle cx='16' cy='16' r='7' fill='%237FCFAB'/></svg>">
<style>
  :root { color-scheme: dark; }
  html, body { margin: 0; }
  /* The intro lives at the very top of the page, so any swipe that ran past
     the top edge fired Chrome's pull-to-refresh and reloaded the whole site
     mid-animation — caught on a real phone recording, where it looked like the
     intro randomly restarting. overscroll-behavior does not make html a scroll
     container, so unlike overflow-x: clip it leaves position: sticky alone. */
  html { overscroll-behavior-y: none; }

  img { max-width: 100%; }
  [hidden] { display: none !important; }
</style>
</head>
<body>
${body}
</body>
</html>
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, page);
console.log(`built ${OUT} (${(page.length / 1024).toFixed(1)} KB)`);
