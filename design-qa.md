# Exhibition section QA — 2026-10-01

final result: passed

## Scope and visual sources

New exhibition section in the existing DEBT TECH site. Source copy: supplied `Снимок экрана — 2026-10-01 в 12.26.11.png` (1422 × 1454). Source floor overview: `Снимок экрана — 2026-10-01 в 12.20.55.png` (1178 × 1592). Supplied First flour.svg (2780 × 1591), Second flour.svg (2789 × 1591), and 1-36.jpg (2048 × 1365). Both SVG files remain byte-identical in public/assets/exhibition. This is a new composition using the existing site design system, not a pixel clone of the previous-conference company-card screenshot.

## Browser evidence and comparison

- Live publication: https://debt-tech-exhibition-test.vercel.app/#exhibition
- Runtime commit: 13a50875509bd72a13e91dc6fd3d1328911f40fb.
- GitHub browser run: https://github.com/IMONsergey/debtupd/actions/runs/36845254446 — 9/9 passed in Chromium, Firefox, WebKit.
- Artifact 11152494230, exhibition-browser-checks; locally extracted to qa/exhibition-final. Desktop CSS viewport 1440 × 900, mobile 390 × 900, density 1. Additional layout checks: 320, 768, 1024 widths.
- Full section captures: qa/exhibition-final/exhibition-Exhibition-selection-and-application-at-1440px-chromium/exhibition-1440.png and corresponding 390px directory. Focused viewport captures: exhibition-intro-390.png, exhibition-map-390.png; opened visually.
- Combined source/implementation comparisons opened: qa/exhibition/brief-comparison.jpg and qa/exhibition/floor-1-comparison.jpg. Reference and implementation regions were scaled to a common width for geometry/content comparison, not pixel-error measurement.
- Cloud browser also opened the local preview at terminal.local:4173 and the published Vercel URL. Publication loaded without sign-in. Live desktop navigation, floor switch, stand 26 selection, zoom and editable application comment verified. No live lead submitted.
- Browser console checked: no application error observed. Existing Kinescope player warnings and browser-extension metadata errors are external to this section.

## Required fidelity surfaces

- Typography: existing Bounded uppercase display, IBM Plex Sans copy, Bebas Neue numbers. Headings and controls wrap without horizontal clipping at tested widths.
- Layout: section follows Speakers; desktop two-column introduction, stacked mobile photo/copy, consistent glass borders, corners, spacing and two existing CTA treatments. Mobile map has separate zoom and 44px numbered selection controls.
- Colors: existing navy/blue palette and muted text tokens; clear selected and keyboard focus states. No new animation loop or heavy rendering effect.
- Images: supplied photo, correct intrinsic dimensions, object-fit crop; unmodified vector floor geometry and outlined original numbers. Hit areas measured from actual numbered stand paths; VIP rooms excluded.
- Copy: approved exhibition title, 400+, 59%, three benefits, 15 remaining places and partner CTA present. Current individual company assignments were not supplied; previous-event assignments are not asserted as current.

## Interaction checks

24 selectable stands on floor 1, three on floor 2; switching resets stale selection and zoom; direct map and numbered-list selection; selection recentering; keyboard tab arrows; form opening, prefilled floor/stand, editing and Escape close; no document overflow. Existing 11 unit tests and production build pass.

## Findings and history

No actionable P0/P1/P2 visual difference remains in the checked section. Initial CI exposed an incorrect test assumption about photo width (actual 2048); image metadata/test corrected. A subsequent run hit an unrelated remote Kinescope error in WebKit; its iframe is now isolated in exhibition tests, matching the existing site test fixture. All nine checks then passed. The first tall mobile element capture contained fixed navigation/skip-link capture artifacts; separate 390 × 900 viewport captures confirmed these do not overlap the normal section layout.

## Known content/deployment limits

Confirmed DEBT TECH 2026 company-to-stand assignments are still required; conditional cards are implemented in src/components/Exhibition.jsx, data in src/data/exhibition.js. Individual availability is intentionally not fabricated. The aggregate availability follows the supplied brief. Real CRM delivery has not been tested. Vercel Git auto-link was unavailable for the local account; deployment was performed through authenticated CLI from the named test branch. Main, production domain and existing Pages were not changed.
