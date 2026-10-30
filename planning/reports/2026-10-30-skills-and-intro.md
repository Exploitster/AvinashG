# Skills disclosure, intro handoff, résumé menu and loader facts

Date: 30 October 2026

## Requested changes

| Request | Implemented behavior |
| --- | --- |
| Collapse both skill sections | Tools/capabilities and business/product skills each start closed and have independent View more / View less controls. Native details preserve keyboard and screen-reader support. Every existing skill and icon remains available. |
| Start at the hero after the intro | The hero stays at its starting position while a paced intro finishes. The handoff discards intro overshoot once, then scrolling continues normally. Reloads, restored browsing positions, reduced motion and missing animation libraries have dedicated coverage. |
| Add résumé access in the menu | Download résumé is a prominent outlined menu button with an explicit Google Drive description. It opens the exact existing Drive URL in a new tab. |
| Different thoughtful loader lines | Six cycling facts are replaced with 16 personal learning lines, each ten words. Longer sessions use 512 further combinations of the same documented thought principles. Shown lines are excluded from later selections. |

The résumé destination remains:
https://drive.google.com/file/d/1FetKoTI3R4i9ifAlpLTDsdYSYlU3Ortm/view?usp=sharing

## Scroll fixes and evidence

The original fast-scroll reproduction put the first hero heading at y=-662.75px after the animation, completely above the viewport. The paced desk animation was behind the page's native scroll position.

The revised handoff holds the hero during that overshoot and settles the document at the intro runway boundary. It does not reset subsequent browsing or a saved return position beyond the runway. A reload's existing history entry no longer disables the handoff when no real scroll position has been restored.

Native touch testing exposed a second cause: a pointerdown handler intended to skip a preview also fired when a swipe began on the hero underneath the desk. Touch scrolling now bypasses that click handler. A real tap can still skip the intro. The handoff waits for the active touch to end and briefly disables vertical scrolling for two animation frames to cancel remaining native momentum, then restores the prior setting.

The native mobile regression settles at scrollY=919px for a 919px intro runway, with the hero at y=64px immediately below the top bar. A subsequent swipe advances beyond the hero normally.

## Loader copy

The first pool contains these edited personal lines:

- I learned to see customers through sales, support, and operations.
- Running a cafe taught me to connect decisions with consequences.
- Voice AI taught me that milliseconds can change customer trust.
- Different roles taught me to question my first product instinct.
- I study different disciplines to see what one perspective misses.
- I reflect on how I think, then question my assumptions.
- Curiosity helps me connect customer needs with wider business realities.
- I learn from customer conversations, then test ideas through experiments.
- Owning operations keeps my product thinking close to everyday realities.
- I bring engineering, customers, and business constraints into one conversation.
- Being a philomath means following questions beyond one familiar subject.
- Being a metacognist means examining how I reach each conclusion.
- My internships taught me that teams experience problems very differently.
- I connect course learning with decisions I face in practice.
- I look beyond features to understand the problem underneath them.
- I want decisions to work for customers and internal teams.

These express the personal principles and experience already described in About. They introduce no new metrics, roles or qualifications.

A session cookie identifies the current browser session; local storage shares the shown-line history between tabs. Web Locks serialize session initialization and quote allocation in supported secure browsers so simultaneous tabs cannot claim the same line. When cookies are blocked, tab session storage preserves history across reloads. If all browser storage is blocked, the loader still works, but reload history cannot persist. If the complete 528-line pool is exhausted, the loader retains its identity and animation without repeating a line.

## Verification

- Test-first disclosure regression: expected two disclosures, observed zero before implementation.
- Full responsive audit: 13 viewport configurations by 15 routes, partitioned into three browser runs with unchanged assertions; zero failures and zero warnings in all partitions.
- Focused browser checks at 320, 393, 600, 768, 1024 and 1440px cover disclosure keyboard controls, all retained skills, carousel geometry, menu destination and new-tab policy.
- Reload then wheel handoff checks cover mobile, tablet and desktop, plus the missing-library fallback.
- Native CDP touch input crosses the intro runway and verifies hero landing and continued scrolling on the next swipe.
- Journey suite covers direct Drive popups, route navigation, loader reading time, waveform, reload quote exclusion, cookie-blocked reloads and six simultaneous fresh tabs with deterministic random selection. Existing assistant success, failure, retry, timeout, cancellation, source validation, offline and storage recovery checks remain in the suite.
- Mobile screenshots inspected for collapsed and expanded skills, menu résumé access and hero landing.
- Build, JavaScript syntax checks and git diff whitespace checks pass. No separate lint or typecheck command is configured.

## Review

Compound Engineering simplification reviewed reuse, quality and efficiency. No behavior-preserving simplification was warranted. Its cookie-blocked session-ID finding was fixed.

Completed code review receipt: skills-20261030, five lenses: correctness, project standards, testing, adversarial and frontend races. Reload restoration and concurrent quote claims were fixed during review. The remaining touch coverage finding was applied and verified by the caller. No unresolved findings remain. No different-provider reviewer was available; the adversarial review used the local fallback.

## Deployment validation

After merging the PR and a successful Vercel production deployment, the maintainer should verify https://www.avinashg.tech/ in a fresh browser session. Check the two independent disclosures, fast scroll and reload handoff, a second swipe that continues browsing, the menu's exact Drive destination, and differing loader lines across refreshes and new tabs.

Expected behavior changes include collapsed skills by default and the one-time hero handoff. A lasting scroll lock, hidden hero, unexpected horizontal overflow or an incorrect résumé destination is a rollback trigger. Use Vercel's previous production deployment if such a regression appears. Validation window: immediately after production deployment. Owner: portfolio maintainer. This report records local and preview verification; it does not claim the custom domain has deployed this branch.
