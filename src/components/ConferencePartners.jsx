import { MobileCarouselControls } from './MobileCarouselControls.jsx';
import { useSnapCarousel } from '../lib/useSnapCarousel.js';
import { assetUrl } from '../lib/assets.js';
import { conferencePartners } from '../conferencePartners.js';

export function ConferencePartners() {
  const { trackRef, index, scrollToIndex, onScroll, onScrollEnd, onKeyDown, interrupt } =
    useSnapCarousel(conferencePartners.length);
  return (
    <div className="conference-partners-carousel">
      <div
        className="conference-partners-list"
        ref={trackRef}
        role="region"
        aria-label="Партнеры DEBT TECH 2026"
        tabIndex={0}
        onScroll={onScroll}
        onScrollEnd={onScrollEnd}
        onPointerDown={interrupt}
        onWheel={interrupt}
        onKeyDown={onKeyDown}
      >
      {conferencePartners.map((partner) => (
        <article className="sponsor-panel sponsor-panel--partner glass corners" key={partner.name}>
          <div className="conference-partner-visual">
            <img
              className="sponsor-planet conference-partner-planet"
              src={assetUrl('assets/partners/planets/' + partner.planet)}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
            />
            <div className="sponsor-brand conference-partner-brand">
              <h3 className="conference-partner-name">{partner.name}</h3>
              <a
                className="conference-partner-logo"
                href={partner.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Сайт партнера: ${partner.name}`}
              >
                <img
                  src={assetUrl(`assets/partners/${partner.logo}`)}
                  alt={partner.name}
                  loading="lazy"
                  decoding="async"
                />
              </a>
              <h4 className="conference-partner-tier">{partner.tier}</h4>
            </div>
          </div>
          <div className="sponsor-copy conference-partner-copy">
            {partner.description.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </article>
      ))}
      </div>
      <MobileCarouselControls
        className="conference-partners-controls"
        label="Навигация по партнерам"
        index={index}
        count={conferencePartners.length}
        onPrev={() => scrollToIndex(index - 1)}
        onNext={() => scrollToIndex(index + 1)}
        prevLabel="Предыдущий партнер"
        nextLabel="Следующий партнер"
      />
    </div>
  );
}
