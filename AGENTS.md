# Working in this repo

This is **not** a framework app. There is no bundler, no build step for the
site's JavaScript, and no component tree. Treat anything that assumes
Next.js, React, or a `src/` directory as out of date — that draft was removed
once the single-file site replaced it.

## The one rule that matters

`design/avinash-console.html` is the source of truth. It is the entire site:
markup, CSS, data, views, and the motion engine, in one file, plain ES5-style
JavaScript with no build step.

`docs/index.html` is **generated**. Never edit it by hand — it is overwritten.
After changing the source, run:

```
node scripts/build-site.mjs
```

That wrapper exists because the source is authored as a fragment (the Claude
Artifact host supplies the document shell) while GitHub Pages does not. The
viewport meta in particular has to be added there, or phones render the site
at a 980px fallback width.

## Layout

| Path | What it is |
| --- | --- |
| `design/avinash-console.html` | the site — edit this |
| `docs/index.html` | generated output, served by GitHub Pages |
| `scripts/build-site.mjs` | wraps the fragment into a standalone page |
| `scripts/qa-responsive.cjs` | device-matrix audit, 13 viewports x 14 routes |
| `rag/` | the assistant's backend — see `rag/README.md` |
| `assets/` | source documents not published by the site |

## Before calling a change done

Run the audit. It catches the things that are invisible while reading a diff:
horizontal overflow, tap targets under 40px, type under 11.5px, content stuck
mid-transition, rendered `undefined`, and leaked CSS escape sequences.

```
node scripts/build-site.mjs && node scripts/qa-responsive.cjs
```

Green means 10 devices x 14 routes with 0 failures and 0 warnings.

Note that the overview renders the page scaled down *inside* the monitor for
the length of the intro, so anything measured before the spacer is spent
reports the preview's dimensions rather than the layout's. The audit already
scrolls past it; new checks must too.

## Content

Do not invent portfolio content — metrics, companies, projects, achievements,
or technologies. Where something is genuinely not written yet, the page says
so visibly rather than filling the space with plausible text. The assistant in
`rag/` follows the same rule: it answers only from indexed site content and
declines otherwise.
