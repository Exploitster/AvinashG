# Portfolio and assistant audit, 28 October 2026

## Production findings

The live Vercel page is byte-for-byte identical to the locally built `docs/index.html` (SHA-256 `7002a2de585fefb945f9552f48fbf4906b520cd50f730d5dacb35594be96c0d2`). Cloudflare health returns 200 with a configured key and 46 ready indexed passages. Browser preflight to `/api/chat` returns 204 with the expected CORS headers.

Real generated answers remain unhealthy: the latest roles question returned `UPSTREAM_UNAVAILABLE`. Earlier Chat360/contact checks returned timeout or unavailable errors. Health alone does not prove that Gemini can answer. The underlying provider status/model/quota cannot be verified here because Cloudflare account tools, its API credentials, and Gemini credentials are unavailable. No credentials were printed, fetched from GitHub secrets, or placed in source files.

## Fixes prepared

- On provider failure, supported questions can receive clearly labeled quotations from the actual indexed portfolio, with citations. This is extractive recovery and does not pretend to be a generated answer. Questions without sufficient lexical support keep the existing actionable error. Disconnected requests are not recovered after cancellation.
- The deployment workflow now calls both Gemini APIs before replacing production. Model-access, quota and empty-response errors cause a failed preflight rather than a misleading successful deployment. Provider response bodies and credential-bearing URLs are excluded from logs.
- The deployment workflow now asks real post-deployment questions about Chat360, contact email, Nosh House and an unavailable private detail. It checks answers, citations and generated-answer mode. A quotation fallback does not count as successful Gemini generation.
- Backend tests now cover source quotations during embedding/generation failure, unsupported private facts, both provider APIs, inaccessible models, empty generation and credential-safe diagnostic output.

The configured Gemini model was not changed speculatively. The new preflight can expose the actual provider status from the credentialed GitHub runner. These source fixes do not establish that upstream model access is repaired.

## Executed validation

- All five production vendor JavaScript assets returned HTTP 200.
- Build passed. No frontend change was needed for the issues reproduced.
- Browser journey suite passed at 320, 393, 768, 1100, 1440 and 1920 pixels. Routes include overview, work, experience, About, résumé, Contact, Story, Thinking, Lab, Beyond, all five case studies and an unknown route.
- Journey assertions include headings, overflow, navigation/history, mobile case-study disclosure, print visibility, all résumé actions pointing to the exact supplied Drive URL, no generated PDF action, loader facts and timing, slow/failed-script escape, normal/reduced motion, assistant success/failure/retry/citations, malformed responses, offline/timeout/cancellation, keyboard focus, blocked storage, missing libraries and JavaScript-disabled recovery.
- Full responsive matrix passed: 13 viewport configurations × 15 routes, zero failures and zero warnings.
- All 19 backend/deployment regression tests passed.
- Index dry run rendered 15 routes and produced 46 passages. No empty/fake embeddings were written to the deployment index.
- Corpus quotation recovery passed for Chat360, Nosh House, Cordelia, Yapita, BITS Pilani, metacognist, Himalayan trek and contact email. Unsupported salary and private medical questions returned no quotation answer.
- Workflow YAML parsed; new Node scripts passed syntax checks; `git diff --check` passed.

## Scope and limits

The résumé's website links and browser behavior were exercised. The externally hosted Google Drive PDF's factual currency and access permissions were not independently established; automated tests intercepted its exact destination. No replacement PDF was created.

An attempted live Chromium route sweep was blocked by the execution environment's proxy certificate trust. Importing its supplied proxy CA did not resolve the browser error; HTTPS verification was kept enabled. Local browser checks operate on exactly the HTML served by production. HTTP production API checks were performed separately.

This is automated browser and API testing, not a study with recruited human participants. It cannot prove that every possible visitor question, device or provider outage is covered. No external LinkedIn scrape was available to verify new profile facts, so no content facts were invented or changed.

## Deployment follow-through

Merge the reviewed change and run `Deploy AI assistant to Cloudflare` from main. The workflow uses the existing GitHub secrets. Inspect the Gemini preflight if it fails; do not bypass that gate or claim a healthy model from `/api/health` alone. Successful real-answer checks are required before marking the live assistant verified.
