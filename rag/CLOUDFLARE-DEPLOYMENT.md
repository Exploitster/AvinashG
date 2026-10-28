# Deploy the assistant through GitHub Actions

Vercel hosts the portfolio. Cloudflare runs the AI assistant. The deployment workflow in `.github/workflows/deploy-assistant.yml` builds the current main-branch content index and deploys `rag/worker/wrangler.toml` to the existing `quiet-frog-766b` Worker.

Cloudflare Builds cannot run the current browser-based indexer: `playwright install --with-deps` fails because root access is unavailable, and downloading the browser alone fails with missing `libatk-1.0.so.0`. The workflow uses a GitHub-hosted Ubuntu runner where Playwright can install its system dependencies.

## One-time setup

1. Merge the workflow PR into main.
2. In Cloudflare, open the Worker's Settings → Builds and disconnect its Git repository build integration (or disable automatic builds if that option is offered). Keep the Worker itself. This prevents the old static-site build from overwriting the assistant deployment. Vercel's separate Git integration remains connected.
3. Open https://github.com/Exploitster/AvinashG/settings/secrets/actions . Add repository secrets `GEMINI_API_KEY` and `CLOUDFLARE_API_TOKEN`. Do not add them to source files. Cloudflare build secrets are not shared with GitHub Actions.
4. Create the Cloudflare token through https://dash.cloudflare.com/profile/api-tokens using the Edit Cloudflare Workers template, scoped to account `470d4ae994bae7d6a4b4d9f216501197`. Use a token with permission to deploy Workers and update their secrets. No domain or nameserver changes are needed.
5. Open the repository's Actions tab → Deploy AI assistant to Cloudflare → Run workflow → select main → Run workflow.
6. Wait for all steps, including Verify deployed backend health, to succeed. The workflow sets the runtime Gemini secret as well as using it for indexing.
7. Open https://quiet-frog-766b.avinashdevg09.workers.dev/api/health . Expect `ok`, `keyConfigured`, and `indexReady` to be true, with a nonzero `chunks` count. Then test questions about Chat360 and contact details on the website.

## Subsequent updates

Run the same workflow from main after merging portfolio content changes. The workflow is manual so repository pushes alone do not trigger Gemini usage or replace production. It does not deploy or change Vercel. Backend tests and real embedding generation must succeed before the deployment step runs. A successful health check verifies backend configuration and embeddings; a real chat question is still needed to verify the Gemini chat model and quota.

If deployment fails, open the failed step's log. Do not substitute the dry-run index, remove tests, or rerun the Cloudflare browser build.

## Meaningful readiness checks

The workflow now checks both configured Gemini models before generating the index or replacing production. A 400/403/404 failure here needs investigation of the configured model, API key permissions or request compatibility; a 429 indicates quota or rate limits. Do not treat the presence of a secret as proof that its APIs work. Error bodies and credentials are not printed.

After deployment, the workflow asks actual questions about Chat360, contact email, Nosh House and an unavailable private detail. It validates generated answers and sources. Health alone is insufficient. If the assistant returns labeled portfolio excerpts, visitors can still read matching source material, but generated AI answers remain unverified and the post-deployment check fails intentionally.
