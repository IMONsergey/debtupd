# Exhibition art direction — 2026-10-01

Current behavior supersedes the demo allocation and automatic centering described in earlier handoff notes.

- Work stays on `test/exhibition-floorplan`; deployment target is only `cdo-2844s-projects/debt-tech-exhibition-test`.
- Source `2eecd9d` already contains the art director's requested changes: large audience metrics, numbered benefits, emphasized availability, venue legend, manual zoom, selection toggle/Escape, partner form wording, and reserved stand styling.
- Reserved stands supplied by the brief: **3, 4, 5, 6, 7, 8, 9, 10, 15, 16, 20**. Hover/focus shows “Стенд забронирован”; these stands cannot open a placement request.
- Confirmed company names and descriptions have not been supplied. The two original fictional demo company cards are retained and clearly labelled as unconfirmed examples. The existing company presentation supports names/descriptions without a booking CTA for reserved stands when confirmed data is added.
- The final clarification withdraws item 17 (redesign of the company listing), not the listing itself. Cards remain visible regardless of the active floor and open the corresponding reserved stand details without a booking CTA.
- The approved headline still says **15 places**. There are 27 drawn stands and 11 reserved entries, leaving 16 currently unreserved. This discrepancy needs organizer clarification; no extra reservation was invented.

## Final visual correction

Visual inspection found clipped tops on the gradient metric glyphs and a clipped percentage at 320px. The copy column now has bounded grid tracks, metrics scale to its actual width, and both values share a baseline with full-height glyph boxes. A browser regression assertion checks metric bounds and alignment at 320, 768, and 1024px.

Validation of the inherited art-direction commit: 11 unit tests, production build, and all 21 exhibition browser checks passed in Chromium, Firefox, and WebKit. Final metric changes are additionally checked with the responsive and selection/form cases in all three browsers. Live lead requests are intercepted or blocked during verification.


## Follow-up layout correction

The user clarified that figures and numbered benefits should use the same framed shapes as the rest of the site. Audience metrics now have individual blue gradient panels matching the forum statistics; benefits use the topic-card surface with corner accents. The map title and availability panel align vertically, removing the previous uneven gap. The original two demo cards are restored. Reserved stand numbers remain muted but their glyph size now matches the original SVG digits. A company card selects and highlights its stand without automatic zoom, switches floor if needed and brings its detail into view. The general partnership button always opens a general request, even after viewing a reserved stand.
