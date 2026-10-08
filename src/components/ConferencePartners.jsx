import { assetUrl } from '../lib/assets.js';
import { conferencePartners } from '../conferencePartners.js';

export function ConferencePartners() {
  return (
    <div className="conference-partners-list" aria-label="Партнёры DEBT TECH 2026">
      {conferencePartners.map((partner) => (
        <article className="sponsor-panel sponsor-panel--partner glass corners" key={partner.name}>
          <div className="sponsor-brand conference-partner-brand">
            <img
              className="sponsor-planet conference-partner-planet"
              src={assetUrl('assets/figma/sponsor-planet.webp')}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
            />
            <h3 className="conference-partner-name">{partner.name}</h3>
            <a
              className="conference-partner-logo"
              href={partner.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Сайт партнёра: ${partner.name}`}
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
          <div className="conference-partner-copy">
            {partner.description.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
