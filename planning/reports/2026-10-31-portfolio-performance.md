# Portfolio performance changes

The loader's minimum 3.2-second reading window, rotating facts, exit duration and 12.8-second failsafe remain unchanged, as requested. Its deliberate wait can continue to limit Speed Index, and Lighthouse may continue identifying a loader fact as LCP rather than the actual hero.

## Implemented

- GSAP and ScrollTrigger use ordered deferred scripts. Application boot waits for DOMContentLoaded so dependencies finish before motion initialization; the independent loader starts immediately.
- Removed unused SplitText and ScrambleTextPlugin downloads and generated copies. Lenis is fetched asynchronously during idle time on non-touch, normal-motion desktops only. Phones already use native touch scrolling; reduced-motion sessions do not need the smoother.
- Animated WebP portraits replace the published GIF, with 480/768/960px variants selected using screen size and pixel density. The same glitch loop and transparency remain. Still portraits use 480/768/original-1087px responsive variants, remain underneath the animation, and serve reduced-motion sessions. Source GIF retained for reproducible conversion; build does not require ImageMagick.
- Removed unused intro-screen geometry reads and temporary scale changes. The fallback loop needs only whether the intro is active. Skill preview measurements precede writes; unchanged hidden flags are not reset. Capability-map viewBox writes occur after geometry reads.
- Status-light pulse animates a separate glow's opacity/transform, with no animated box-shadow. Loader fade is explicitly marked for opacity compositing; its timing is unchanged.
- Published CSS and inline JavaScript are minified using CleanCSS level 1 and Terser. Authored source stays readable. Compression errors fail the build.
- Removed obsolete descendant rules for the monitor's permanently empty preview. Retained styles required on other routes and interactive states; Lighthouse's initial-page unused-CSS estimate is not proof those styles can be deleted.

## Measured file sizes

| Asset | Before | After |
| --- | ---: | ---: |
| HTML, uncompressed | 317,249 bytes | approximately 201,800 bytes |
| HTML, local gzip comparison | 88,333 bytes | approximately 58,800 bytes |
| Animated portrait | 753,671 bytes GIF | approximately 55–149 KB WebP, depending on selected size |
| Still portrait | 104,298 bytes | approximately 22–104 KB, depending on selected size |

These are file-size measurements, not a promised Lighthouse score or timing gain. Browser choice depends on screen size and pixel density; visitors do not download all variants. Re-run PageSpeed against production after merging to establish comparable mobile timings.

## Verification

- Responsive audit: 13 viewport configurations by 15 routes, partitioned without changing assertions.
- Journey suite covers résumé popups, assistant success and recovery, loader reading time, facts, skip controls, stalled startup, keyboard and no-JavaScript fallback.
- Focused browser checks cover skill previews, native touch and wheel intro handoff, page destinations, portrait failure fallback and reduced motion.
- New performance contract checks confirm only two deferred vendor tags, single application boot, desktop-only Lenis requests, responsive animated images, and no animation request in reduced-motion mode.
- Build and syntax/whitespace checks run before publishing. The report does not claim a new production PageSpeed score.
