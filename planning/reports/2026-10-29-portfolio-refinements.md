# Portfolio refinements: twelve-request verification

The user clarified that desktop/tablet outcomes retain their existing grid, only mobile outcomes become a carousel, and every destination that opens another page opens a new browser tab. In-page controls and email/phone handlers retain their appropriate behavior. Mobile-only layout changes use a 600px breakpoint; tablet widths retain the existing structures.

| Request | Final implementation |
|---|---|
| 1. Outcomes | Existing desktop/tablet grid retained. Mobile horizontal snap rail shows exactly two complete cards plus half the third, with previous/next controls. Same six metrics, icons and descriptions. |
| 2. Skills | Compact wrapping pills reduce row count while preserving every skill and existing icon. Business skill content retained. |
| 3. Recent updates | Horizontal swipe rail with previous/next controls. Four distinct relevant icons: mountain, map, storefront and workflow. |
| 4. Portrait | GIF rebuilt at 960 × 1278 logical pixels from the original higher-resolution cutout, twice the prior GIF dimensions. Same normal/glitch sequence, about 737 KiB. Static reduced-motion WebP retained. |
| 5. Foundation | Education and Certifications headings receive green outlined boxes. |
| 6. Perspective | Added explanation of combining customer, design, engineering, support, operations and business perspectives, plus curiosity and reflection. No invented credentials or metrics. |
| 7. Project labels | Product-specific labels, including Chat360 - Voice AI; original role descriptions retained. |
| 8. Mobile map | Horizontally scrollable project choices and Next project button only on mobile. Capability panel stays below. Existing desktop/tablet structure retained. |
| 9. New tabs | Internal page destinations, external HTTP(S) pages, resume links and map double-click case-study opening use new tabs with noopener/noreferrer. In-page skip links, carousel controls, project choices and email/phone handlers are excluded because they do not open another webpage. |
| 10. Intro | Existing Avinash/name/tagline stays unchanged during scroll; preview handover and typing changes removed. Scroll zoom remains. Button says Scroll to know more. Two separate actions are positioned 24px above the actual monitor with adequate gaps, including at 320px. |
| 11. Case studies | Mobile-only horizontal carousel exposes all cards; old collapsed-card rule removed. Desktop/tablet grids retained. |
| 12. Verification | Browser journey, focused requirement checks, full viewport matrix, visual inspection, simplification and code review. All 13 viewport configurations × 15 routes passed with zero failures/warnings. Focused requirement checks passed at six widths. The full journey suite passed, including new-tab resume behavior during delayed script loading. |

## Checks and review

`qa-journeys.cjs` now tests actual Work and Experience popups and preserves original routes/scroll positions. Resume tests capture the new tab and exact supplied Drive URL, including during delayed-main-script loading. They intercept the external destination rather than validating the Google Drive file contents or access permissions.

New `qa-portfolio-refinements.cjs` covers six widths, exact half-card geometry, outcome/recent rail movement, endpoint disabled states, rapid project selection followed by Next, desktop/tablet preservation, unique icons, About headings, HD image dimensions, all page-link attributes, real dynamic assistant citation/external product popup destinations, no page overflow, and normal-motion intro text/button geometry.

The responsive audit checks horizontally visible reveal content and waits up to two seconds for the drawer's actual open geometry instead of sampling a potentially delayed transition after 500ms. It retains the original drawer on-screen assertion. Its 13 viewport configurations are partitioned into three independent browser runs without changing the assertions.

Simplification applied two findings: removed abandoned preview/handover code and replaced per-render window resize listeners with one handler for the current rail controls. Code reuse pass found no worthwhile duplication.

Code review completed with five lenses (correctness, project standards, testing, adversarial, frontend races), no remaining actionable findings. Receipt: `/tmp/compound-engineering-1000/ce-code-review/carousel-20261029/review.json`; run `carousel-20261029`. The identified delayed-selection/Next race was fixed using synchronous selection and covered by a regression. No independent provider CLI was available; adversarial review was local, not cross-model.

There is no configured standalone lint/typecheck command. Build, browser execution, Node syntax checks and diff checks are used. Backend APIs and secrets were not changed. After merging text changes, refresh the assistant index using the existing deployment workflow if those new About paragraphs should be searchable by the chatbot.

## Post-deployment validation

After Vercel deploys, inspect mobile widths 320/393 and tablet/desktop 768/1440. Confirm swipe rails, two-and-a-half mobile outcomes, new-tab destinations, stable intro text, button clearance, GIF playback and reduced-motion fallback. Check the browser console for asset/route errors. Unexpected horizontal page scrolling, unreadable cards or blocked destinations warrant reverting this frontend commit to the previous deployment. The intentionally requested new-tab behavior is not a regression. The owner is the site maintainer; validate immediately after deployment. No continuous analytics or monitoring service is configured.
