# Portfolio RAG backend

For the connected `quiet-frog-766b` Worker, use [the current Cloudflare build repair steps](CLOUDFLARE-DEPLOYMENT.md). The older manual setup below describes the original deployment options.

Answers visitor questions using only: the live site's own rendered text, plus
any PDFs/docs dropped in `rag/sources/`. Nothing is invented — if a question
isn't covered by that content, the assistant says so and points to the
contact section instead of guessing.

Two parts:

- **`scripts/build-rag-index.mjs`** — offline builder. Renders every route of
  `docs/index.html` with Playwright (so the index matches what a visitor
  actually sees, not a hand-copied version of it), chunks the text, embeds
  each chunk with Gemini, and writes `worker/src/index-data.json`.
- **`worker/`** — a Cloudflare Worker that embeds the visitor's question,
  finds the closest chunks (cosine similarity, in-memory — the corpus is a
  few dozen chunks, no vector DB needed), and asks Gemini to answer using
  only those chunks as context.

Your Gemini key only ever lives in two places: your shell environment when
you run the build script, and a Cloudflare secret the Worker reads at
runtime. It's never in a committed file or in any browser-side code.

## Deploying with no terminal (phone / tablet, browser only)

Everything below this section assumes a terminal (`wrangler` CLI). If you're
deploying from a phone or tablet, use the Cloudflare **dashboard's own code
editor** instead — no npm, no CLI, no laptop:

1. **Get a Gemini API key** — [aistudio.google.com](https://aistudio.google.com) → *Get API key* (works fine in a mobile browser).
2. **dash.cloudflare.com** → log in → **Workers & Pages** → **Create** → **Workers** → give it a name (e.g. `avinashg-rag`) → **Deploy** (this deploys Cloudflare's placeholder "Hello World" first — that's expected, next step replaces it).
3. Open the new Worker → **Edit code** (the built-in "Quick Edit" browser editor).
4. Replace *all* of its contents with `rag/worker/dist/worker.bundle.js` — this is a build I generate that inlines the whole embeddings index into one file, since the dashboard editor can't resolve a separate `index-data.json` import the way the CLI can. I'll hand you this file directly; paste it in whole.
5. Click **Save and deploy**.
6. Still in that Worker: **Settings** → **Variables and Secrets** → **Add** → name `GEMINI_API_KEY`, type **Secret**, paste your key → **Save and deploy**.
7. The Worker's URL is shown at the top of its dashboard page (`https://avinashg-rag.<your-subdomain>.workers.dev`) — send me that and I'll wire it into the site.

Regenerate the paste-in file after any Worker code or content change:
```
node rag/scripts/bundle-worker.mjs
```
(needs `rag/worker/src/index-data.json` to already exist — see *Build the
index* below.) This whole path was tested end-to-end locally before being
written down here — see the commit this file shipped in.

---

## One-time setup (terminal / `wrangler` path)

Skip this whole section if you used the dashboard path above.

1. **Get a Gemini API key** — [aistudio.google.com](https://aistudio.google.com) → *Get API key*. Free tier is enough for this.
2. **Log in to Cloudflare** (once, from this machine or yours):
   ```
   cd rag/worker
   npm install
   npx wrangler login
   ```
3. **Store the key as a Worker secret** (never committed, not visible in the dashboard after entry):
   ```
   npx wrangler secret put GEMINI_API_KEY
   ```
   Paste the key when prompted.

## Build the index

Whenever the site content or `rag/sources/` changes:

```
node scripts/build-site.mjs                      # from repo root: refresh docs/index.html
GEMINI_API_KEY=... node rag/scripts/build-rag-index.mjs
```

Add `--dry-run` to render + chunk without calling the embedding API (useful
to sanity-check chunk counts before spending API calls).

To include a PDF: extract its text (e.g. with the pdf skill, or `pdftotext`)
into a `.txt` file under `rag/sources/`, then rebuild the index. Every `.txt`
file there is chunked and embedded alongside the site content automatically.

## Deploy / update the Worker

```
cd rag/worker
npx wrangler deploy
```

This bundles `index-data.json` straight into the Worker, so redeploy after
every index rebuild. `wrangler deploy` prints the Worker's URL
(`https://avinashg-rag.<your-subdomain>.workers.dev`) — that's the endpoint
the chat widget will call.

## Testing before it's wired into the UI

```
cd rag/worker
npx wrangler dev
```

Then, from anywhere:

```
curl -X POST http://localhost:8787/api/chat \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:8080" \
  -d '{"message":"What did Avinash do at Nosh House?"}'
```

`wrangler.toml`'s `ALLOWED_ORIGINS` already includes `http://localhost:8080`
for this kind of local testing, plus the live GitHub Pages origin. Nothing
here touches `main` or the deployed site — the Worker is a separate piece of
infrastructure until the chat widget is built and wired to it, and that only
ships when you say so.

## Wiring the site to the deployed Worker

`design/avinash-console.html` holds the endpoint in one constant:

```js
var RAG_ENDPOINT = "";
```

Paste the deployed `https://avinashg-rag.<subdomain>.workers.dev/api/chat` URL
there, then rebuild with `node scripts/build-site.mjs`.

For testing before that constant is set, any page load accepts
`?api=<worker url>` and remembers it for the tab — so a freshly deployed
Worker can be exercised against the real site without a rebuild.

## Model choice

`CHAT_MODEL` is pinned to `gemini-3.5-flash-lite`: benchmarking the
alternatives against this key, it answered in ~0.6s where `gemini-flash-latest`
took 1-3s and repeatedly returned 503 "high demand" (which is also why the
Worker retries transient 429/5xx before giving up). Any model from
`GET /v1beta/models` works — swap the var and redeploy.

## Status

- [x] Retrieval + generation Worker, tested end-to-end against live Gemini
- [x] Offline index builder (37 chunks from the rendered site)
- [x] Ask bar + chat popup, verified on desktop and phone
- [x] Full responsive suite green (10 devices x 14 routes)
- [ ] Worker deployed to Cloudflare — **your step**; `api.cloudflare.com` is
      blocked from the agent sandbox, so the deploy has to run from your machine
- [ ] `RAG_ENDPOINT` set to the deployed URL
- [ ] PDFs added to `rag/sources/`
