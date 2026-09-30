# Client revisions and cosmic motion — 30 September 2026

final result: passed

The latest published implementation has no remaining actionable P0/P1/P2 visual findings within this scope. The initial delivery passed all checks; the 15:18 ticker correction and its separate verification are recorded below.

## Scope and source visual truth

This review covers the client's 14:40 instructions (static technology tags after the hero and forum facts ticker inside About), restrained site-wide motion, and the 14:58 correction to the expanded speaker button. It supersedes the earlier incomplete report in this file for this delivery; it does not claim a new pixel-by-pixel audit against all historical Figma frames.

- Source 1: `/workspace/scratch/c57e1b09c88f/upload/Снимок экрана — 2026-09-30 в 14.40.41.png`, 1404 × 1068 px.
- Source 2: `/workspace/scratch/c57e1b09c88f/upload/Снимок экрана — 2026-09-30 в 14.58.00.png`, 662 × 376 px.
- Baseline: `4bd27bfc3f58c611d98501e9bb45ea46c36e7386`.
- Published implementation: <https://imonsergey.github.io/debtupd/>.
- Runtime release visually inspected: `d801ff46b74b0753c604c7d152ea1a94e59723c5` (includes motion release `053fc0f60b7a9a4a4eb6fdc93af58f549d5e02d0`).
- Final test synchronization revision: `301f1c45b563f6c5d9491fda85665462ec90aa9e`; runtime source is unchanged from the visually inspected release.

The sources are client annotation sheets with cropped screenshots, not complete replacement layouts. Their CSS viewport and device density cannot be inferred. Comparison therefore checks the explicit content/state changes while retaining the existing approved layout, typography and artwork. No pixel-distance claims are made between the annotation sheets and the page.

## Browser-rendered evidence and normalization

Evidence directory: `/workspace/scratch/c57e1b09c88f/debtupd-motion/qa/client-motion/`.

| Evidence | CSS viewport | Image size | State |
| --- | --- | --- | --- |
| `tags-desktop.jpg` | 1440 × 900, DPR 1 | 1440 × 900 | Static tags after hero; beginning of About |
| `about-desktop.jpg` | 1440 × 900, DPR 1 | 1440 × 900 | About content and facts ticker |
| `tags-mobile.jpg` | 390 × 844, DPR 1 | 390 × 844 | All 13 tags wrapped; About below |
| `speakers-desktop.jpg` | 1440 × 900, DPR 1 | 1440 × 900 | Expanded speaker list and new collapse label |
| `speakers-mobile.jpg` | 390 × 844, DPR 1 | 390 × 844 | Expanded list; button fits mobile width |
| `comparison.jpg` | Combined comparison board | 2200 × 1500 | Client instructions beside desktop/mobile captures, including a focused ticker crop |
| `speakers-comparison.jpg` | Combined comparison board | 1530 × 990 | Client label correction beside desktop/mobile button regions |

Both combined boards were opened and visually reviewed. Desktop content crops exclude the persistent sidebar where appropriate. The source sheet and desktop crops are scaled proportionally to fit the comparison board; the mobile button crop is shown at 1:1. Original screenshots remain available for readable typography and spacing checks. This avoids treating a cropped chat image as a full-viewport design.

Additional live states inspected: desktop services satellite and glow, mobile tariff astronaut moving between sampled frames, active/offscreen ambient states, reduced-motion mode, and the loaded sidebar video. A temporarily empty third-party video frame after viewport remount was rechecked after loading; it displayed normally.

## Findings and fixes

No actionable P0/P1/P2 visual differences remain within this scope.

| Severity | Location | Earlier mismatch | Fix and post-fix evidence |
| --- | --- | --- | --- |
| P1, resolved | Directly below hero | Running facts did not match the requested static, fully visible technology list | Replaced with semantic wrapping list of all 13 supplied topics. `comparison.jpg`, desktop/mobile tag screenshots; no clipped tags or horizontal page overflow. |
| P1, resolved | About | Technology ticker occupied the position requested for the previous hero facts | Reused the existing facts content in the single About ticker. `about-desktop.jpg` and the focused ticker crop in `comparison.jpg`. |
| P2, resolved | Expanded speakers | Button said «Вернуть слайдер» | Changed to «Скрыть всех спикеров». `speakers-comparison.jpg`; verified desktop/mobile expand and collapse, correct `aria-expanded`, and return to «Показать всех спикеров». |

The animation request did not provide a new visual arrangement. It is implemented as slow movement of existing illustrations, subtle light and star modulation, staggered existing reveal transitions and restrained hover/press feedback. No illustration was replaced with a code-drawn substitute.

## Required fidelity surfaces

- **Fonts and typography:** existing Bounded display typography and IBM Plex interface typography are preserved. Technology tags use IBM Plex Sans medium, uppercase, 13–17 px desktop and 12 px mobile, 1.65/1.7 line height and 0.025em tracking. The new speaker label is legible and untruncated in both captured states; the established button weight and arrow remain consistent.
- **Spacing and rhythm:** tags wrap into two rows at desktop width and six at 390 px, with clear separation before About. Facts retain a single strip between About content and statistics. Existing card grids, illustration base positions and section hierarchy are retained. The expanded speaker button remains centered on desktop and spans the established mobile content width. No horizontal overflow in the captured states.
- **Colors and tokens:** existing deep navy, white and blue palette retained. Tags use pale blue text and blue separators. New hover borders and shadows are low-opacity blue; no new CTA variant was introduced. Screenshots show no high-contrast flashing or distracting moving text in the static tag region.
- **Image quality:** existing photo, logo, astronaut, planet and satellite assets retained with original masks and proportions. Float uses independent `translate`/`rotate` so base transforms are preserved. Captured photos remain sharp and unstretched. Footer scale stays at or above 1 and within the full-width scene; this scale animation is disabled on phones.
- **Copy and content:** all 13 client technology topics are present. About reuses the previous facts ticker exactly. The expanded speaker label matches the client's requested wording, styled in the existing uppercase button typography. The pre-existing difference between “70+ speakers” in ticker copy and “100+ speakers” in the statistics was not silently changed; this request explicitly asked to move the old facts strip.

## Motion, accessibility and interaction behavior

- Decorative illustration cycles last 9–22 seconds; footer scale is 24 seconds. Phone movement is reduced, including a 2 px travel for the note astronaut.
- An IntersectionObserver pauses new ambient loops outside the viewport. Page visibility, pagehide/pageshow, preloader and open dialogs also suspend those loops. No additional requestAnimationFrame loop or scroll handler was added.
- The initial delivery used a wrapping static facts list under `prefers-reduced-motion`. The client rejected that behavior at 15:18; the update below supersedes it. Decorative loops and transitions still honor reduced motion.
- Existing two CTA designs, semantics, keyboard controls, focus states, forms and links are retained. Hover effects are restricted to devices with a fine pointer and hover support.
- Hero WebGL stabilization and GPU fallback logic from the preceding release are unchanged.
- Published browser checks: new label and collapse behavior at 1440 × 900 and 390 × 844; no overflow; zero page errors during that interaction session. Static tag placement and visible artwork movement were checked on the published page. No real lead was submitted.

## Verification and comparison history

1. Opened client instructions and the public baseline; identified the two content-placement mismatches. Implemented static tags and the relocated facts ticker plus the requested motion.
2. Captured the public implementation and constructed `comparison.jpg`. The first combined post-fix visual comparison found no further actionable P0/P1/P2 differences. No speculative visual redesign followed that pass.
3. Received the later speaker-label correction, opened its source image, changed the copy, deployed and captured the expanded desktop/mobile states. Opened `speakers-comparison.jpg`; no further label, wrapping, spacing or button-state issue found. Collapsing restored the slider on both viewports.
4. Initial motion CI identified synchronization problems in the new test: one cold software-GPU run did not change the sampled position within a fixed 450 ms, and a CSS pause could commit after a computed-style read. The test now waits for observed movement, then the animation's `ready` promise and paused timeline, before asserting that time remains frozen. The runtime was not weakened to satisfy the test. Reference: <https://developer.mozilla.org/en-US/docs/Web/API/Animation/ready>.
5. Local production build with `/debtupd/` base path and `git diff --check` passed. Final CI results are recorded below.

## Verification results

- Pages deployment for runtime release: successful, run `36712387752`.
- Final cross-browser motion/hero workflow: **55/55 passed**, run `36712782033`: Chromium 22, Firefox 11, WebKit 22.
- Final full site build/browser workflow: **76/76 browser checks and 10/10 Node checks passed**, run `36712782201`; production build passed.
- Final Pages workflow: **successful**, run `36712782140`.

The cross-browser matrix covers Chromium and WebKit desktop/mobile (mobile DPR 3), plus Firefox desktop. New tag layout checks cover widths 320, 390, 768, 1440 and 2560 in those projects. Physical device/GPU and historical browser-version testing is not claimed. The existing API integration is retained; a real production form delivery was not exercised in this visual task.

## Implementation checklist

- [x] Show all supplied technology tags statically after the hero.
- [x] Move the previous facts ticker into About.
- [x] Apply gentle motion to existing artwork, lights, cards and controls.
- [x] Preserve offscreen/dialog/background pauses and reduced-motion behavior.
- [x] Correct and verify the expanded speaker button on desktop and mobile.
- [x] Open source/rendered combined comparisons and evaluate required fidelity surfaces.
- [x] Finish the final CI run and record results.

No additional P3 visual work is required for this delivery.


## 15:18 client correction — always use a running facts strip

Runtime release: `fe566d5e5b04bc3571cefe9defed346876c7ffab`.

**[P1, resolved]** The client's screenshot shows the About facts in three static rows. Cause: the reduced-motion rules deliberately wrapped the ticker and disabled its motion. This contradicted the required running-strip presentation. Removed wrapping/duplicate hiding and exempted this informational ticker from the global animation reset and reduced-motion ambient pause. It remains a single seamless line: 64-second cycle normally, a slower 96-second cycle with reduced motion. Other decorative motion still respects that preference. Hidden-page, offscreen and dialog suspension remain intact. Hover on a fine pointer and keyboard focus pause the strip; touch hover does not create a sticky pause.

**Source visual truth:** `/workspace/scratch/c57e1b09c88f/attachments/1c78778e-c77b-4c41-b5d4-eeba8b5b7d81/Снимок экрана — 2026-09-30 в 15.18.17.png`, 736 × 258 px. This is an annotated crop; source CSS viewport/DPR are unknown. The correction asks for motion and one row, not a new visual design.

**Post-fix browser evidence:** `qa/client-motion/ticker-desktop.jpg` (1440 × 900 CSS/image px, DPR 1), `qa/client-motion/ticker-mobile.jpg` (390 × 844 CSS/image px, DPR 1). Both captured on the published site with reduced motion enabled, matching the problematic state. The combined `qa/client-motion/ticker-comparison.jpg` (1550 × 900 px) was opened and reviewed: source at native size, desktop content crop proportionally scaled, mobile content crop at 1:1. The existing About photo, statistics and section position give full regional context; the focused ticker detail is readable in the same comparison. No layout or imagery substitution was introduced.

**Fidelity checks:** fonts, sizes, blue separators, colors, masks and illustration quality are unchanged. The facts now occupy one row (48 px including padding on desktop, 42 px on mobile); the former extra rows are gone. Existing vertical gaps are preserved. Copy and all facts are retained; the duplicate copy is still hidden from assistive technology. No page overflow at either viewport.

**Live verification:** observed transform movement over 600 ms in all four combinations of 1440/390 px and normal/reduced motion. Desktop reduced: x −3.22 → −18.14 px; mobile reduced: −747.40 → −758.46 px. Keyboard focus paused the animation and blur resumed it. No page errors during the published interaction session. Updated the existing cross-browser test to assert a single line, duplicate continuity, actual transform movement, slower reduced-motion speed, and keyboard pause/resume. Production build and diff checks passed. Pages deployment succeeded (`36714167076`). The ticker revision passed all 55 cross-browser checks (`36714167269`: Chromium 22, Firefox 11, WebKit 22) and the full build/site workflow (`36714167200`: 76 browser checks, 10 Node tests).

**Comparison history:** client identified the reduced-motion mismatch after the earlier delivery. One targeted fix was applied, published and recaptured under the affected setting. The combined post-fix comparison found no remaining actionable P0/P1/P2 differences. No further visual changes were needed.

**Checklist:** single moving row restored; desktop/mobile and both motion preferences checked; keyboard pause/resume checked; source and rendered comparison opened; published deployment confirmed.

final result: passed


## 15:23 client correction — match the technology separators

Final runtime release: `18e6f6e5f779aba391c9da347d3941673ca8bb60`. Pages deployment succeeded, run `36714878404`.

**[P2, resolved]** Replace the static technology list's dot separators with the existing facts ticker's blue `//`. Matched Bounded 600, color `#247cbf`, normal letter spacing, and the same responsive font size and line height. The reference is the real `.ticker-copy i` already visible in the supplied screenshot and in `qa/client-motion/ticker-desktop.jpg`; no replacement artwork was created.

The first desktop capture after the wider slashes showed the final tag alone on a third row. Reduced the desktop column gap from 22 to 18 px; the published post-fix capture restores two balanced rows at 1440 px. The existing 14 px mobile gap stays in use.

**Evidence and comparison:** `qa/client-motion/dividers-desktop.jpg`, 1440 × 900 CSS/image px, DPR 1; `qa/client-motion/dividers-mobile.jpg`, 390 × 844 CSS/image px, DPR 1. The mobile rules are identical across the separator and spacing commits. Opened `qa/client-motion/dividers-comparison.jpg` (1550 × 930): existing ticker and final tag regions at 1:1, desktop context scaled proportionally, mobile crop at 1:1. The exact glyph, color, weight and baseline treatment match. Copy, background colors, photos, masks and other typography are unchanged. No actionable P0/P1/P2 difference remains after the spacing correction.

**Published viewport checks:** 1440 / 768 / 390 / 320 px. All 13 tags contained; no horizontal page overflow; computed separator font family, size, weight, line height and color match the ticker at each width. Tag row counts: 2 / 3 / 6 / 8 respectively. The facts ticker remains animated while the technology tags remain static. CSS-only spacing revision builds through the successful Pages workflow. Additional full-suite reruns were triggered automatically and are not represented as completed in this report.

**Checklist:** matching slashes applied; desktop wrap corrected; four viewport widths checked; source/rendered comparison opened; Pages release verified.

final result: passed
