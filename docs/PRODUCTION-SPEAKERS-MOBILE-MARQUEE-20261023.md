# DEBT TECH 2026 — smooth mobile speakers marquee

Production behavior:
- At viewport widths up to 899 px, speaker cards drift horizontally at **24 CSS pixels per second**, continuously while the carousel is visible. The previous discrete jump every 3.2 seconds has been removed.
- The scroll position keeps fractional precision in a virtual accumulator. Some mobile browsers round fractional scrollLeft values; without accumulation the marquee appeared stationary at 320–390 px.
- On touch/pointer interaction, the animation stops immediately. Native swipe and momentum scrolling are not overridden. Autoplay resumes from the user's actual scroll position after 4.2 seconds. Desktop pause after a manual arrow choice is 5.5 seconds, allowing the smooth scroll and reading time to finish without auto-motion competing.
- Touch-triggered focus and emulated hover are ignored as permanent autoplay blockers. Keyboard focus-visible, true desktop hover, document visibility and reduced-motion preference are respected.
- At the edges, the carousel gently reverses direction rather than jumping to the first item.
- Desktop above 899 px retains its existing 48 px/s continuous marquee and original IntersectionObserver behavior.
- The expanded all-speakers grid disables autoplay, and manual previous/next controls continue working.

Files:
- src/components/SpeakerCollection.jsx
- tests/speakers-continuous-mobile-20261023.spec.js (touch / continuous scroll / reversal)
- tests/speakers-mobile-smooth-20261022.spec.js
- tests/speakers-autoplay-20261015.spec.js

Production deployment: frontend-only update. Keep the current backend and admin CMS services running; do not mutate speaker data, programme, venue, pricing, forms or Caddy. The /2/ mirror reads the same active build.

Accessibility: when the operating system advertises prefers-reduced-motion: reduce, the automatic scroll remains disabled. Arrow buttons and manual swipe still work.
