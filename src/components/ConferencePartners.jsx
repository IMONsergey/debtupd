import { assetUrl } from '../lib/assets.js';
import { conferencePartners } from '../conferencePartners.js';

export function ConferencePartners() {
  return (
    <div className="conference-partners-list" aria-label="Партнёры DEBT TECH 2026">
      {conferencePartners.map((partner) => (
        <article className="sponsor-panel sponsor-panel--partner glass corners" key={partner.name}>
          <div className="conference-partner-brand">
            <span className="conference-partner-name">{partner.name}</span>
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
            <h3 className="conference-partner-tier">{partner.tier}</h3>
          </div>
          <div className="conference-partner-copy">
            {partner.description.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
            <a
              className="conference-partner-link"
              href={partner.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              Перейти на сайт <span aria-hidden="true">↗</span>
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}
