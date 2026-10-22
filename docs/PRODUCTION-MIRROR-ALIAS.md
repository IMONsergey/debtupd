# DEBT TECH: Live mirror at /2/

Production primary: https://debt-tech.ru/
Live alias: https://debt-tech.ru/2/

## How it works

The /2/ page is not a copied project and does not have a separate deployment or database. Caddy's production route handles /2/* by stripping the /2 prefix and serving from exactly the same current frontend symlink as /. This includes the HTML entry point and any prefixed static resources. The requested /2/ URL is the supported alias entry point. The slashless /2 URL still resolves through the main SPA fallback. SPA deep links and hash links stay on the /2/ URL.

The Vite application uses absolute /assets/... resources, /api/lead, /api/programme and /api/speakers, so forms, the programme, speakers and other CMS-backed content share the same live services and data on both page addresses. Updates to the main site's current symlink or CMS are reflected on /2/ automatically with no synchronization job.

Both addresses are the same-origin, share cookies and other browser storage, and share the same forms endpoint. The administrative interface continues to live only at /programme-admin/ and is not duplicated.

## SEO and operation

The /2/ route sends X-Robots-Tag: noindex, follow. The HTML canonical tag continues to identify the primary site, so no duplicate content is intended for search results. No additional navigation link to /2/ is added.

Caddy configuration lives in deploy/production.caddy. **Carry this block into every future production Caddy deployment.** Do not create an independent /2 directory, copy files to it or assign independent content storage. Changes to the production release will automatically appear under both addresses.

Rollback: restore the backed-up previous Caddyfile and reload Caddy; leave the active website release, CMS data and form service untouched.
