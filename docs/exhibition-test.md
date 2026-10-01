# Exhibition test branch

Branch: `test/exhibition-floorplan`. Based on production-matched main `19d8fbc`.

Target: a separate Vercel project, `debt-tech-exhibition-test`, in the connected team. The user switched hosting to Vercel after GitHub Pages rejected this test branch through its environment protection rules. The original Pages workflow is restored; neither main nor debt-tech.ru is changed. The exhibition workflow runs the flow in Chromium, Firefox and WebKit.

## Content and assets

The section follows Speakers and uses the supplied 2026 brief, photograph and both original SVG files. Original SVG bytes are preserved. Interactive stand bounds in `src/data/exhibition.js` were measured from the numbered stand paths; VIP meeting circles are not stands. Floor 1 selects 1–24; floor 2 selects 25–27.

Company assignments are deliberately empty: the supplied company screenshot describes a previous conference. Add confirmed current exhibitors to `exhibitors` in `src/data/exhibition.js` using the documented shape. Their cards then appear below the matching floor and connect to the map. No individual stand is represented as free or occupied before that data arrives. The aggregate 15 remaining places is approved brief copy and must be kept current by the organizer.

The existing stand form is reused; selecting a stand prefills its number and floor in the editable comment. Vercel builds with root-relative paths and uses the existing same-origin `/api/lead` rewrite, updated to the current production API domain. Test pages carry a noindex header. No live forms are submitted by automated tests; actual CRM delivery from Vercel is not verified.

## Published preview

https://debt-tech-exhibition-test.vercel.app/#exhibition

Deployed source: `13a5087`. Vercel project: `debt-tech-exhibition-test`, team `cdo-2844s-projects`. Deployment: `5dL4akTWJc2nJWCDV5bUYWLB8dk4`. Published using the authenticated Vercel CLI on the user's Mac. Git auto-link was unavailable because Vercel requested a GitHub Login Connection; no account permissions were changed. Future updates can deploy the test branch through the same CLI. All nine exhibition browser checks passed before publication.
