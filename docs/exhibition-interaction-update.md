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
