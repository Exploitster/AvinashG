#!/usr/bin/env node
/**
 * Builds rag/worker/src/index-data.json: chunks of real, rendered site text
 * (plus anything dropped in rag/sources/*.txt — extracted PDF text) with a
 * Gemini embedding attached to each chunk.
 *
 * Site text is captured by actually rendering docs/index.html with
 * Playwright and reading #view per route, so the index can never drift from
 * what a visitor actually sees (no re-implementing the SPA's templates).
 *
 * Usage:
 *   GEMINI_API_KEY=... node rag/scripts/build-rag-index.mjs
 *   node rag/scripts/build-rag-index.mjs --dry-run   # render+chunk only, no API calls, no key needed
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DOCS = resolve(root, "docs");
const SOURCES_DIR = resolve(root, "rag/sources");
const OUT = resolve(root, "rag/worker/src/index-data.json");

const DRY_RUN = process.argv.includes("--dry-run");
const EMBED_MODEL = "gemini-embedding-001";
const EMBED_DIM = 768; // Matryoshka truncation: keeps index small; must match worker.js's request
const API_KEY = process.env.GEMINI_API_KEY;

if (!DRY_RUN && !API_KEY) {
  console.error("Set GEMINI_API_KEY (or pass --dry-run to test rendering/chunking without it).");
  process.exit(1);
}

const ROUTES = [
  { path: "/", title: "Overview" },
  { path: "/work", title: "Selected work" },
  { path: "/story", title: "Story" },
  { path: "/experience", title: "Experience" },
  { path: "/thinking", title: "Product Thinking" },
  { path: "/lab", title: "Lab" },
  { path: "/beyond", title: "Beyond the job" },
  { path: "/about", title: "About and education" },
  { path: "/resume", title: "Résumé" },
  { path: "/contact", title: "Contact" },
  { path: "/work/chat360", title: "Case study: Chat360" },
  { path: "/work/cordelia-cruises", title: "Case study: Cordelia Cruises" },
  { path: "/work/nosh-house", title: "Case study: Nosh House" },
  { path: "/work/yapita-health", title: "Case study: Yapita Health" },
  { path: "/work/events-fusion", title: "Case study: Events Fusion" }
];

const CHUNK_SIZE = 1100;
const CHUNK_OVERLAP = 150;

async function serveDocsStatic() {
  return new Promise((resolvePort) => {
    const server = createServer((req, res) => {
      let file = req.url === "/" ? "/index.html" : req.url.split("?")[0];
      try {
        const buf = readFileSync(resolve(DOCS, "." + file));
        res.writeHead(200, { "Content-Type": file.endsWith(".html") ? "text/html" : "application/octet-stream" });
        res.end(buf);
      } catch {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(readFileSync(resolve(DOCS, "index.html")));
      }
    });
    server.listen(0, () => resolvePort({ server, port: server.address().port }));
  });
}

async function renderRoutes() {
  const { server, port } = await serveDocsStatic();
  const browser = await chromium.launch(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pages = [];

  for (const r of ROUTES) {
    await page.goto(`http://localhost:${port}/#${r.path}`, { waitUntil: "load" });
    await page.waitForFunction(
      () => (document.getElementById("view")?.innerText || "").trim().length > 40,
      null, { timeout: 5000 }
    );
    await page.waitForTimeout(250);
    const text = await page.evaluate(() => document.getElementById("view")?.innerText || "");
    pages.push({ source: "#" + r.path, title: r.title, text: normalize(text) });
    console.log(`  rendered ${r.path} (${text.length} chars)`);
  }

  await browser.close();
  server.close();
  return pages;
}

function normalize(text) {
  return text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").replace(/[ \t]+/g, " ").trim();
}

function loadExtraSources() {
  if (!existsSync(SOURCES_DIR)) return [];
  return readdirSync(SOURCES_DIR)
    .filter((f) => f.endsWith(".txt"))
    .map((f) => ({
      source: `doc:${f}`,
      title: f.replace(/\.txt$/, ""),
      text: normalize(readFileSync(resolve(SOURCES_DIR, f), "utf8"))
    }));
}

function chunkPage(pageObj) {
  const { text, source, title } = pageObj;
  if (text.length <= CHUNK_SIZE) return [{ source, title, text }];
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(i + CHUNK_SIZE, text.length);
    chunks.push({ source, title, text: text.slice(i, end) });
    if (end === text.length) break;
    i = end - CHUNK_OVERLAP;
  }
  return chunks;
}

async function embed(text) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${EMBED_MODEL}`,
        content: { parts: [{ text }] },
        taskType: "RETRIEVAL_DOCUMENT",
        outputDimensionality: EMBED_DIM
      })
    }
  );
  if (!res.ok) throw new Error(`embed failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return l2norm(data.embedding.values);
}

function l2norm(vec) {
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / mag);
}

/**
 * Store each unit vector as base64 int8 instead of a JSON float array: ~1/6
 * the characters, which is what keeps the pasteable Worker bundle small.
 * Quantization error is far below the gap between competing chunks at this
 * corpus size — verified by diffing ranked results against the float index.
 */
function quantize(vec) {
  const buf = Buffer.alloc(vec.length);
  for (let i = 0; i < vec.length; i++) {
    const q = Math.max(-127, Math.min(127, Math.round(vec[i] * 127)));
    buf[i] = q & 0xff;
  }
  return buf.toString("base64");
}

async function main() {
  console.log("Rendering routes...");
  const rendered = await renderRoutes();
  const extra = loadExtraSources();
  if (extra.length) console.log(`Loaded ${extra.length} extra source doc(s) from rag/sources/`);

  const allChunks = [...rendered, ...extra].flatMap(chunkPage).map((c, i) => ({ id: `c${i}`, ...c }));
  console.log(`Chunked into ${allChunks.length} passages.`);

  if (DRY_RUN) {
    // Deliberately NOT the real index path: a dry run that overwrites the
    // live index with empty embeddings silently breaks retrieval, and the
    // Worker still starts, so the damage only shows up as bad answers.
    const preview = OUT.replace(/\.json$/, ".dryrun.json");
    mkdirSync(dirname(preview), { recursive: true });
    writeFileSync(preview, JSON.stringify(allChunks, null, 2));
    console.log(`Dry run: ${allChunks.length} chunks written to ${preview}. The real index was left untouched.`);
    return;
  }

  console.log("Embedding chunks with Gemini...");
  const out = [];
  for (const c of allChunks) {
    const embedding = quantize(await embed(c.text));
    out.push({ ...c, embedding });
    process.stdout.write(".");
  }
  console.log("");

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out));
  console.log(`Wrote ${OUT} (${out.length} embedded chunks, ${(JSON.stringify(out).length / 1024).toFixed(0)} KB).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
