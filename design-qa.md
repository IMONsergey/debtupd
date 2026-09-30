# Art-director review — 30 September 2026

final result: blocked

## Scope and visual truth

Base: `92b5b35d3d8f6cd70aa9e81a12122eb67183a084` (latest `main` verified through GitHub).
Eight user-supplied annotated screenshots in `/workspace/scratch/c57e1b09c88f/upload/`, dated 2026-09-30 at 10.38.09, 10.39.15, 10.39.32, 10.39.50, 10.40.05, 10.40.15, 10.40.31 and 10.40.40. The first is a desktop correction sheet; the others cover responsive corrections and a two-column grid reference. They contain cropped regions and mixed image scales, so exact viewport dimensions cannot be inferred from the sheets.

The current public site was inspected in Chromium at 1440×1000 and 390×844 before implementation. New implementation screenshots and a normalized combined comparison are **not yet available**. No post-change visual pass is claimed.

## Implemented changes awaiting visual verification

1. Restore the full NSFR logo by correcting the source SVG viewport from `11 186 44 42` to `11 174 44 42`. Browser measurements of the source paths cover y=175.282…214.912; the old viewport clipped the roof.
2. Make ambient hero motion more perceptible with a slower-than-distracting 180-second planet rotation, drifting supplied haze artwork and a gentle crown pulse. Preserve reduced-motion and offscreen/hidden/dialog pauses.
3. Remove parentheses around “участников” in the stage capacity labels.
4. Show three speaker cards on desktop, two on tablets and one on phones; add shared primary CTA for expanding/collapsing the complete list. Preserve swipe and keyboard navigation.
5. Rename the tariff heading to “Тарифы участия”.
6. Restore full supporter names and stack them beside the mobile brand instead of the abbreviated row beneath the hero.
7. Add the shared “Ранняя регистрация” CTA to the mobile menu, using the existing navigation handler and closing the menu after selection. Allow vertical menu scrolling on short viewports.
8. Remove forced equal program-card row heights in responsive layouts to eliminate empty areas below the stage photos.
9. Replace the text-only speaker expansion link with the shared primary button, removing its extra separator.
10. Fit the entire note astronaut inside a taller mobile note instead of cropping the illustration.
11. Restore two audience cards per mobile row and retain the existing background illustration.
12. Restore the privacy link's explicit mobile line break and reduce the footer illustration to 78% width.

## Required fidelity surfaces

- Fonts and typography: existing Bounded/IBM Plex fonts preserved; mobile supporter, audience and tariff sizes require screenshot inspection, particularly at 320/360 px.
- Spacing and rhythm: responsive stage rows no longer forced equal; speaker tracks use 3/2/1 columns; post-render overlap and vertical-rhythm checks pending.
- Colors and tokens: existing primary CTA, border and text tokens reused; no additional button treatment.
- Image fidelity: existing assets retained, NSFR viewport corrected, note astronaut uses `object-fit: contain`, footer scaled proportionally. Actual rendered crops remain to be checked.
- Copy: requested heading, capacity parentheses and privacy wrap changed; other business copy and prices preserved.

## Verification completed

- Production Vite build: passed (including `/debtupd/` base path).
- Existing Node suite: 9/9 passed.
- Updated existing E2E expectations for the approved heading, full supporter placement, privacy wrap and two-up tablet carousel endpoint; JavaScript syntax checked. E2E browser suite not run locally.
- `git diff --check`: passed.
- Local preview service started successfully; this alone is not visual verification.

## Blocking verification

Firecrawl cannot resolve the local preview host. Automatic approval review rejected sending the compiled project files to Firecrawl for remote rendering, citing disclosure of potentially private code to an untrusted external destination. The rejected transfer was not executed or retried by another route.

The safer remaining check is the built-in cloud browser on the local preview, without uploading project code to Firecrawl. Browser fallback guidance requires user approval before switching from the unavailable plugin workflow. Do not mark this review passed until that browser pass is completed.

Pending viewports: 320, 360, 390, 430, 599, 600, 768, 899, 900, 1180, 1181, 1440, 1920 and 2560 px; short mobile/desktop heights. Required interactions: mobile registration CTA, speaker arrows/swipe/Home/End, expand/collapse scroll preservation, resize with a selected speaker, reduced motion and hero pause. Capture desktop/mobile hero, stage cards, speakers/note, audience, tariffs and footer; compare with the corresponding annotation sheets and check console errors.

## Comparison history

- Source sheets opened and read; public baseline captured before edits.
- Implementation 1 prepared and statically verified; no post-change screenshot exists.
- No visual approval or deployment performed.

## Publication request — 30 September, 11:08 UTC+3

The user explicitly requested immediate GitHub Pages publication. CI completed 71/75 browser scenarios. Three failures were stale expectations for the added mobile menu CTA and animated crown; one exposed a real third CTA style on mobile, corrected to the existing 13px/21px button typography. The next verification target is the publicly deployed site; no project payload will be transferred to Firecrawl. Full local visual approval is not claimed.
