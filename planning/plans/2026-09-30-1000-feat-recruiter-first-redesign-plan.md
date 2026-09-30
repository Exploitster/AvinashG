---
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-brainstorm
status: implementation-ready
date: 2026-09-30
---

# Recruiter-first redesign: mint, Apple-style clarity, voice-wave loader

## Goal Capsule

**Objective:** make the portfolio faster for a recruiter to scan and easier on the eyes. The lime becomes mint on dark. The type and surfaces follow Apple's clarity. The home page opens on case studies. Copy is rewritten for punch, with every fact locked. A voice-wave loader opens the site, followed by the existing desk intro.

**Done when:**
- the site builds;
- the device audit is green;
- no lime value remains;
- every fact (number, company, tool, date) is unchanged;
- the user receives a list of the placeholders still waiting on them.

## Product Contract

### Summary

This is a whole-site pass on `design/avinash-console.html`:
- the mint accent on dark replaces the lime;
- Apple's system font, larger and clearer text, rounded cards, pill buttons and a frosted top bar;
- the home page reordered so case studies lead;
- all copy rewritten for punch, with facts locked;
- a voice-wave loader before the existing desk intro.

It ends with a list of every placeholder the owner still has to fill.

### Problem Frame

Recruiters read this site in short, sceptical sessions, usually on a phone (PRODUCT.md, Operating Context). Today the home page leads with a "what I've been doing lately" list of trips and side projects, and the results only arrive three sections in. The lime accent (#9AEE30) is fluorescent and tiring on black. Sora and IBM Plex give the site a technical look, not the calm, legible Apple feel the owner wants.

### Requirements

- **R1. Palette.** Replace every lime value with a mint family on the existing dark ground: the tokens, the literal `rgba()` tints, the SVG fills in the desk scene and the drawn plates, and the full-bleed band. The new accent is mint #7FCFAB. The neutrals lose their yellow-green bias. Text contrast stays at WCAG AA or better.
- **R2. Apple-style clarity.**
  - Display and body text use Apple's system font stack. It renders as San Francisco on Apple devices and falls back to the platform's UI font elsewhere.
  - Body text is at least 16px with generous line height.
  - Cards and panels get rounded corners, and interactive controls are pills.
  - The top bar is translucent with a frosted blur, with a solid fallback where blur is unsupported.
  - Glows and neon box-shadows are toned down.
- **R3. Recruiter order (home).** Order after the intro:
  1. Hero: headline, one-line pitch, and actions to Résumé and Contact.
  2. Case studies (results cards).
  3. The numbers band.
  4. Live products.
  5. Capability map.
  6. Where to go.
  7. Documents.
  8. What I've been doing lately.
  9. Contact.
- **R4. Copy.** Rewrite headings, intros, button labels and body sentences for punch. Never add, drop or alter a fact: numbers, companies, projects, tools, dates, titles. Where the site says content is not written yet, it keeps saying so.
- **R5. Loader.**
  - Voice-style bars move, settle into a flat line, and show the owner's name and role. Then the loader fades and the existing desk intro begins.
  - Plays at most once per browser session, lasts under about 2.5 seconds, and a tap or key skips it.
  - Skipped entirely under reduced motion.
  - Never blocks the page if its script fails.
- **R6. Placeholder report.** After the build, list every visible placeholder or pending slot that needs the owner's input.

### Key Decisions

- **Voice-wave loader** (session-settled: user-directed, chosen over the name reveal, the counter and gathering particles: it nods to the owner's Voice AI work).
- **Keep the desk intro and the sideways scroll after the loader** (session-settled: user-directed, chosen over removing both for speed: the owner wants the full experience).
- **Mint on dark** (session-settled: user-directed, chosen over sage, eucalyptus and a light Apple-style background).
- **Case studies first** (session-settled: user-directed, chosen over "proof numbers first" and keeping "lately" first).
- **Rewrite all copy with facts locked** (session-settled: user-directed, chosen over headlines-only and draft-for-approval). This supersedes the earlier "never change content" rule for wording only. Facts stay exactly as written.
- **Loader once per session, skippable.** An inference to keep the added intro time bounded for repeat visitors.

### Scope Boundaries

- No new content. Images, PRD files and missing text are only listed (R6).
- No change to the assistant's backend. Its index will quote the old wording until the owner rebuilds it with their Gemini key; that goes on the placeholder list.
- No light theme.

### Success Criteria

- `node scripts/build-site.mjs && node scripts/qa-responsive.cjs` is green on every device and route.
- A search for the old lime values (#9AEE30, #C8FF7A and `rgba(154, 238, 48`) finds nothing in the source.
- On the home page, the first section after the hero is the case studies.

## Implementation Units

All edits are in `design/avinash-console.html`; the build regenerates `docs/index.html`.

1. **Tokens and fonts.**
   - Rewrite the `:root` colour tokens (mint, cool neutrals) and the `.band` tokens.
   - Swap `--f-display`/`--f-body` to the Apple system stack and `--f-mono` to `ui-monospace`/SF Mono.
   - Remove the Google Fonts link.
   - Raise the shape tokens for rounded corners.
2. **Literal lime sweep.** Replace every `rgba(154, 238, 48, …)`, `rgba(200, 255, 122, …)`, `#9AEE30` and `#C8FF7A` in the CSS, the SVG desk scene and the plate drawings with the mint equivalents, and change the scene's `IBM Plex Sans` font reference.
3. **Apple surfaces.**
   - Frosted top bar.
   - Radius on cards, panels, the bento, results, live cards, doors, the PRD shelf and the menu drawer, using one scale: cards 18px, small chips 12px, controls pill.
   - Soften the neon glows.
   - Drop the notched clip-path corners, which read as the old aesthetic.
4. **Home reorder.** Split the "recent" list out of the hero into its own section, add Résumé and Contact actions to the hero, and move the results section directly after the hero.
5. **Copy pass.** Work through the headings, ledes, section descriptions, door text, button labels, and case study, story, experience and beyond sentences. Keep every data value identical.
6. **Loader.**
   - Add an overlay element before the page and a small self-contained script that runs before the intro.
   - A `sessionStorage` guard, wrapped in try/catch.
   - `prefers-reduced-motion` skips it.
   - A tap or key skips it.
   - A 3.5s failsafe removal.
   - The page renders underneath regardless.
7. **Verify.** Build, run the audit, grep for leftover lime, check the home order, and compile the placeholder list.
