# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: hiring managers and PM leads recruiting for AI, voice, and generative
product roles at product companies. They arrive with a role in mind and are
deciding whether this candidate is worth a conversation.

Also served, without a privileged path: recruiters and talent screeners
skimming against a spec, and founders or chiefs of staff sizing up range.
Arrival is usually from a CV link, LinkedIn, or an application already sent,
frequently on a phone.

## Product Purpose

The personal portfolio of Avinashdev Ravikumar Garudapalli, AI product manager.

It does three jobs at once, none of them dominant:

1. Converts a visitor into a conversation.
2. Backs up an application already sent, for someone who arrives knowing the name.
3. Demonstrates the craft it claims — the artifact is part of the argument.

## Positioning

A product manager who has both shipped enterprise Voice AI 0-to-1 *and* carried
a full P&L as a founder. Most PM portfolios can claim one; the pairing is the
position, and it is documented rather than asserted — each claim opens the case
study that earned it.

The site also answers questions about itself: an assistant retrieves from the
site's own published content and declines anything it does not cover. That is a
demonstrated capability, not a stated one.

## Operating Context

Read in short, sceptical sessions, often mid-shortlist and usually on a phone.
A reader either skims for facts (titles, dates, numbers) or drills into one
piece of work — rarely both in one visit, and the site cannot know which in
advance. The assistant exists so a specific question ("what did he own at
Chat360?") can be asked instead of hunted for.

## Capabilities and Constraints

- One authored HTML file (`design/avinash-console.html`) containing markup,
  styles, data, views, and the motion engine; built to `docs/index.html` for
  GitHub Pages. No framework, no bundler, no build step for the site's own JS.
- Third-party motion libraries (GSAP with ScrollTrigger, SplitText and
  ScrambleText; Lenis) load as plain script tags. The source references them by
  pinned CDN URL, because it is also previewed as a fragment in a host with no
  build step; the build copies the installed files to `docs/vendor/` and
  repoints the tags, so the deployed site never depends on a third party and
  the audit — which loads the built page over `file://` with no network — gets
  real libraries rather than a silently failed fetch. The build fails if a CDN
  URL survives.
- A retrieval assistant backed by a Cloudflare Worker and Gemini. It answers
  only from indexed site content and says so plainly when a question falls
  outside it. A per-IP throttle sits in front of the model call.
- The index is built by rendering every route, so it cannot drift from what is
  actually published.
- Quality is asserted mechanically, not by eye: an audit drives 13 viewports
  across 14 routes and fails on horizontal overflow, a page that can actually
  be dragged sideways, tap targets under 40px, type under 11.5px, content stuck
  mid-transition, rendered `undefined`, leaked CSS escape sequences, and text
  below WCAG AA contrast.
- The audit covers layout and colour. It does not measure smoothness, and a
  green run has already coexisted with a phone dropping half its frames — so
  motion work is profiled separately under CPU throttling, because unthrottled
  desktop silicon makes everything look free. Scroll-linked motion writes
  transforms to cached nodes and nothing else: never a custom property on an
  ancestor, which invalidates every descendant, and never a property that can
  trigger layout.
- Undecided, deliberately: the Story narrative (four visible placeholders) and
  the PRD document shelf (four empty slots). The material exists but is not yet
  written or cleared; both are awaiting real content.

## Brand Commitments

- Name in full: Avinashdev Ravikumar Garudapalli. Shortened to "Avinash" in the
  masthead and the desk screen.
- "a Metacognist & Philomath" — the line on the monitor in the opening scene.
- Black ground (`#000000`) with a single soft-mint accent (`#7FCFAB`), and
  full-bleed mint sections that swap the whole viewport rather than gradating
  into it. The owner chose mint from four softer greens in September 2026
  because the earlier acid lime (`#9AEE30`) was fluorescent enough to tire the
  eye on black; the structure of the palette did not change, only its hue.

  The dark ground itself reverses an earlier decision. The site ran a light
  paper ground with amber and teal for a while, which itself replaced an
  original dark console. The light palette was not abandoned because it failed
  — it was replaced because the owner chose a reference direction and asked for
  it. Anyone reading this later should know the light theme is recoverable from
  history (`scripts/relight.mjs` maps one way, `scripts/redark.mjs` the other)
  rather than assume it was a mistake.
- Apple's design language for clarity: the system font stack (San Francisco on
  Apple devices, the platform UI face elsewhere, no web font to fetch), large
  bold headings, 17px body text, a 12px floor for labels, rounded cards,
  capsule buttons and a frosted top bar. Former monospace labels are set in the
  same system face with tabular figures; true monospace is kept only for code
  the assistant quotes.
- A voice-wave loader opens the site once per browser session — bars moving
  like speech, a nod to the Voice AI work — then hands over to the desk intro.
  A tap, key or scroll skips it, and reduced motion never shows it.
- The desk-scene opening, with the next section previewed inside the monitor.
- A technical HUD across the top rail — availability lamp, city and the
  visitor's own local clock, coordinates — plus a vertical label on the right
  margin. It is instrumentation, and it is real: Mumbai's actual coordinates
  and the visitor's actual clock, never invented telemetry. It is hidden from
  assistive technology, and its cells drop one at a time as the rail runs out
  of room rather than disappearing at a single breakpoint.
- Motion is the argument as much as the layout: a paced desk intro, scramble
  decode on headings, a pinned horizontal track that turns vertical scroll into
  horizontal travel, and an ambient particle field that answers to scroll and
  to the pointer. GSAP with ScrollTrigger drives it, Lenis eases the wheel, and
  every one of them degrades to a static, readable page when the vendored
  scripts are absent or motion is reduced.
- Material 3 still supplies the state layers and easing curves; the shape
  scale is now Apple-rounded. Its elevation model does not survive on a black
  ground or a mint field, where the design uses flat surfaces instead.

## Evidence on Hand

Real, and safe to reference:

- Roles: Chat360 (Associate Product Manager, Jan–Jun 2025, Pune), Cordelia
  Cruises (Product Analyst, Nov 2023–Jan 2025), Nosh House Cafe (Founder, from
  May 2025, Mumbai), Yapita Health, Events Fusion.
- Shipped products, publicly reachable: tragenie.lovable.app,
  noshhouse.lovable.app, blankstore.lovable.app.
- Outcomes already published on the site: 50% voice-latency reduction, 5
  channels shipped, 50% MRR growth, operational break-even in nine months, −20%
  support queries, −15% operational cost.
- `assets/avinash-garudapalli-resume.pdf` — a real document, currently not
  linked from any page.

Absences future work must not fill with invention:

- No testimonials, references, or quotes from anyone.
- No press, awards, or third-party validation.
- No PRDs or specs are attached yet; the four shelf slots are empty on purpose.
- The Story section's four placeholders are unwritten, not missing.

## Product Principles

1. **Never invent portfolio content** — metrics, companies, projects,
   achievements, or technologies. This is the founding constraint of the
   project and binds the assistant as tightly as the pages.
2. **A visible gap beats plausible filler.** Where something is not written
   yet, the page says so rather than generating text that reads true.
3. **Claims travel with their evidence.** A number links to the work that
   produced it; the live products are openable, not screenshotted.
4. **Serve the skim and the drill-down at once**, since the site cannot know
   which visit it is getting.
5. **Execution is part of the claim.** For a candidate arguing product craft,
   a defect in the artifact is a defect in the argument.

## Accessibility & Inclusion

WCAG AA contrast for all text, asserted per route by the audit rather than
reviewed by eye. Touch targets follow Material's 48dp minimum. Motion respects
`prefers-reduced-motion` throughout, and the page renders fully without
JavaScript reveals.
