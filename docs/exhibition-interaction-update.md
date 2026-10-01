# Exhibition interaction update — 2026-10-01

Scope: `test/exhibition-floorplan` only. Intended deployment: `debt-tech-exhibition-test` in `cdo-2844s-projects`. Main, Pages and the main domain are unchanged.

- Square panels and the site's existing blue gradients, typefaces and CTA treatments.
- Fitted original SVG, bounded viewport, desktop stand sidebar and compact mobile layout. SVG is rendered at the actual zoomed size, preserving sharp vector text and paths instead of enlarging a composited bitmap.
- Animated camera (240 ms), pointer drag, wheel zoom, two-pointer pinch, double-click zoom, keyboard arrows/+/-/Home. Reduced motion skips animation.
- List selection centers the stand. Floor switch clears selection and camera; reset restores the complete plan.
- Sample statuses only: #8 occupied and #9 free, explicitly labelled “Демо”. All other availability is unknown. `exhibitors` remains empty. No real bookings are invented.
- Removed map instructions, redundant photo caption and extra map heading text.
- Added browser coverage for gestures, fitted geometry, sample statuses and motion preferences. Lead requests are intercepted; no real applications sent.

Verification: `npm test` 11/11 and `npm run build` passed. All 18 browser checks passed in Chromium, Firefox and WebKit on the Mac using its existing cached browsers. Widths 320, 390, 768, 1024 and 1440 px are covered. Final desktop/mobile screenshots inspected; mobile refinements reduce unused map space and prevent wrapped floor labels. Motion and reduced-motion modes are covered. Browser download was unavailable in scratch; temporary Mac browser-path configuration is not committed. Deployment and runtime verification are recorded below.

Mac working copy: `/tmp/debt-tech-exhibition-update.B1u1Ze/site`. Vercel CLI identity was verified as `cdo-2844`. Never commit `.vercel` or `.env*`; link and verify the named test project before publishing.


First runtime deployment: `FfyC8z23PReEQNrkg39JDvC9Jyva`, source `b330e381dd5d8c27e8368e44c46193215fced141`, stable alias `https://debt-tech-exhibition-test.vercel.app`. Build READY, HTTP 200, `X-Robots-Tag: noindex, nofollow`. Two runtime Chromium checks (390 and 1440 px) passed, including floor switching, selection, editable form comment and no overflow. Leads and video iframe were isolated. Manual inspection then identified composited SVG softness at 250% zoom; the next patch renders the SVG at its actual display dimensions. A screenshot at 250% verified sharpness.


Final runtime deployment: `FPJxEUg9TMzT1wPAfLjQRqHMU6BY`, source `010080ba48205ed7643cfab75eed9407110efa59`. Deployment completed successfully and the existing alias `https://debt-tech-exhibition-test.vercel.app/#exhibition` was checked. Final SVG patch: 18/18 Chromium/Firefox/WebKit checks passed, build passed, enlarged SVG inspected on desktop/mobile. Two final runtime Chromium checks passed at 390 and 1440 px; floor reset, selection, geometry, editable stand #26 form comment and no overflow were verified. HTTP 200 and noindex/nofollow headers confirmed. Original SVG files and unconfirmed exhibitors are unchanged. No real leads sent.


## Status legend and demo company tiles

Latest source: `fc723d45416cf1ce9b7429ae0d0453091157856f`. Deployment `7RGhzE3S1R66BC8vGD4EYmcrsHH8` completed READY; stable test alias checked with HTTP 200 and noindex/nofollow headers.

The free/occupied numbered square key is beside floor tabs. Venue symbols remain floor-specific below the map. Occupied demo stands #8 and #9 use white fills and original digit outlines copied from the source SVG; their list tiles are muted. No status dots. Two fictional companies, ОРБИТА AI and ВЕКТОР DATA, appear as explicitly labelled demo cards with full-width stand buttons. Each button centers the corresponding stand and scrolls to the map; reduced-motion preference is respected. Demo data is separate from the still-empty confirmed exhibitors array. Source SVG files remain unchanged.

Validation: 11 unit tests and build passed; all 7 Chromium and 7 Firefox checks passed. Desktop/mobile map and card screenshots inspected. Two additional live Chromium tests passed for responsive layout, both white fills, top status labels and company-to-stand selection. Cloud browser independently verified the published card and selected #9. Real leads were not sent. The image test now explicitly scrolls its lazy-loaded photograph into view before checking naturalWidth.
