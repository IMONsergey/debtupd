# Exhibition test branch

Branch: `test/exhibition-floorplan`. Based on production-matched main `19d8fbc`.

The branch deploys to the existing GitHub Pages preview, without merging to main or deploying debt-tech.ru. Pages runs the exhibition flow in Chromium, Firefox and WebKit before deployment.

## Content and assets

The section follows Speakers and uses the supplied 2026 brief, photograph and both original SVG files. Original SVG bytes are preserved. Interactive stand bounds in `src/data/exhibition.js` were measured from the numbered stand paths; VIP meeting circles are not stands. Floor 1 selects 1–24; floor 2 selects 25–27.

Company assignments are deliberately empty: the supplied company screenshot describes a previous conference. Add confirmed current exhibitors to `exhibitors` in `src/data/exhibition.js` using the documented shape. Their cards then appear below the matching floor and connect to the map. No individual stand is represented as free or occupied before that data arrives. The aggregate 15 remaining places is approved brief copy and must be kept current by the organizer.

The existing stand form is reused; selecting a stand prefills its number and floor in the editable comment. GitHub Pages remains a preview: production lead API CORS currently disallows the Pages origin. No live forms are submitted by automated tests.
