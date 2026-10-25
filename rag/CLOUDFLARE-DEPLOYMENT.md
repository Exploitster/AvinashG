# Restore Cloudflare Worker builds

The frontend is deployed by Vercel. Cloudflare runs only the portfolio assistant.
The failed GitHub check links to build `85a18b91-8491-4435-955f-0b6f533549e2`, but does not expose its error text; the exact remote failure must be read in Cloudflare's build log.

Three repository issues have been identified:

- The connected Worker is `quiet-frog-766b`; the Wrangler name previously targeted `avinashg-rag`. It now matches the existing Worker.
- `rag/worker/src/index-data.json` is generated and intentionally ignored by Git. A clean checkout must generate it before deploying the Worker that imports it.
- The index builder previously required a machine-specific Chromium path. It now uses Playwright's installed browser, with `CHROMIUM_EXECUTABLE_PATH` as an optional local override.

## Dashboard configuration

Open Workers & Pages → quiet-frog-766b → Settings → Builds. Set:

- Repository: `Exploitster/AvinashG`
- Production branch: `main`
- Root directory: repository root (leave blank or `/`)
- Build command:

```sh
npm ci && npx playwright install --with-deps chromium && npm run build && npm run rag:index
```

- Deploy command:

```sh
npx wrangler@3 deploy --config rag/worker/wrangler.toml
```

If non-production branch builds are enabled, use this non-production deploy command:

```sh
npx wrangler@3 versions upload --config rag/worker/wrangler.toml
```

Add `GEMINI_API_KEY` as a **secret build variable** in Builds. This is required by the index builder. Separately, ensure the Worker has a **runtime secret** named `GEMINI_API_KEY` under Variables and Secrets. Runtime secrets are not automatically available to the build. Keep the key out of repository files, command text, and browser code. The key must have access to `gemini-embedding-001` and the configured chat model.

Save, then retry the latest build after these repository changes are merged. Do not deploy a placeholder or dry-run index; the dry-run output contains no embeddings.

## Verify

Visit:

https://quiet-frog-766b.avinashdevg09.workers.dev/api/health

It should report that the key and index are available, with a nonzero chunk count. Then ask the website assistant about Chat360 and the current contact email. Confirm it cites the relevant case study and uses `avinashdev.garudapalli2027@mastersunion.org`.

If the build still fails, open its **View logs** link and copy the first error plus surrounding lines. Typical remaining failures are a missing build secret, Gemini API quota/model access, or Chromium installation restrictions. Do not replace the running Worker until the index build succeeds.

## Local validation without a key

```sh
npm ci
npx playwright install chromium
npm run build
node rag/scripts/build-rag-index.mjs --dry-run
node --test rag/worker/test/worker.test.mjs
```

For a preinstalled system browser, prefix the dry-run command with `CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`.

The current agent environment has no configured Cloudflare credentials or Gemini secret, so remote settings and production deployment cannot be completed here. The published Worker remains separate from these source fixes.
