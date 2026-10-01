# Exhibition art direction — 2026-10-01

Current behavior supersedes the demo allocation and automatic centering described in earlier handoff notes.

- Work stays on `test/exhibition-floorplan`; deployment target is only `cdo-2844s-projects/debt-tech-exhibition-test`.
- Source `2eecd9d` already contains the art director's requested changes: large audience metrics, numbered benefits, emphasized availability, venue legend, manual zoom, selection toggle/Escape, partner form wording, and reserved stand styling.
- Reserved stands supplied by the brief: **3, 4, 5, 6, 7, 8, 9, 10, 15, 16, 20**. Hover/focus shows “Стенд забронирован”; these stands cannot open a placement request.
- Confirmed company names and descriptions have not been supplied. Fictional demo companies were removed. The existing company presentation supports names/descriptions without a booking CTA for reserved stands when confirmed data is added.
- The final clarification withdraws item 17 (redesign of the company listing).
- The approved headline still says **15 places**. There are 27 drawn stands and 11 reserved entries, leaving 16 currently unreserved. This discrepancy needs organizer clarification; no extra reservation was invented.

## Final visual correction

Visual inspection found clipped tops on the gradient metric glyphs and a clipped percentage at 320px. The copy column now has bounded grid tracks, metrics scale to its actual width, and both values share a baseline with full-height glyph boxes. A browser regression assertion checks metric bounds and alignment at 320, 768, and 1024px.

Validation of the inherited art-direction commit: 11 unit tests, production build, and all 21 exhibition browser checks passed in Chromium, Firefox, and WebKit. Final metric changes are additionally checked with the responsive and selection/form cases in all three browsers. Live lead requests are intercepted or blocked during verification.
