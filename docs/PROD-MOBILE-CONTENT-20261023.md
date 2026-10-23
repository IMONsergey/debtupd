# DEBT TECH 2026 — mobile corrections, 23 October 2026

## Countdown

Forum timer targets 2026-11-13T10:00:00+03:00 (Moscow time). Source: src/content.js, field hero.countdownTarget.

## TAU venue

At widths 767px and below the existing venue photo is cropped from the top at scale 1.34 with tonal protection behind text, removing emphasis on the camera operators at the bottom. Desktop photography and CTA unchanged.

## Programme navigation

Three original CMS stage entries remain intact. On mobile (<=699px), a single selected tab is shown with a persistent numeric counter 01 / 03 and previous/next arrows that wrap through every stage, even when not yet published. On desktop all stage tabs remain accessible.

## Mobile contacts

Email is compact; the organizers' label sits above the existing original, proportional logo at full available width. No organizer names or logo assets were changed.

## WELCOME discount

The modal opens 60 seconds after page load. Copy WELCOME, dismiss, and choose tariff remain supported. No sticky/floating 50% badge is displayed after copying, closing or clicking the tariff CTA. Previous auto-reopen chip removed entirely. Old early-booking popup remains disabled.

## Release

Frontend-only changes. Production programme data, speakers data, CMS and forms service, tariff pricing, Caddy routing and /2/ mirror are left unchanged. QA includes mobile-polish-20261023.spec.js, welcome-discount-20261022.spec.js, forum-programme-20261021.spec.js, venue-directions-20261020.spec.js. Rollback is provided by preserving previous current symlink and a release-specific helper.
