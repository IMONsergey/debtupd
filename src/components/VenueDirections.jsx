import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, MapPin, X } from 'lucide-react';
import { useDialog } from '../lib/useDialog.js';
import { assetUrl } from '../lib/assets.js';
import { content } from '../content.js';

const venuePhoto = assetUrl('assets/images/venue/tau-event-hero.webp');
const venueDirectionsMap = assetUrl('assets/images/venue/tau-route-map.webp');

export function VenueCard({ onDirections }) {
  const venue = content.venue;
  return (
    <section className="venue-hero-card" aria-label={venue.title}>
      <div className="venue-hero-card__photo">
        <img
          src={venuePhoto}
          alt="Зал пространства TAU с синим световым оформлением"
          width="1400"
          height="1264"
          loading="eager"
          decoding="async"
          fetchPriority="low"
        />
      </div>
      <div className="venue-hero-card__details">
        <h2>
          TAU <span>— пространство музыкальных культур</span>
        </h2>
        <p>{venue.address}</p>
      </div>
      <button
        type="button"
        className="venue-hero-card__button"
        onClick={onDirections}
        aria-haspopup="dialog"
      >
        <span>Как добраться</span>
        <MapPin aria-hidden="true" size={20} />
      </button>
    </section>
  );
}

export function VenueDirectionsDialog({ onClose }) {
  const panelRef = useRef(null);
  useDialog(panelRef, onClose);
  const venue = content.venue;
  return createPortal(
    <div
      className="modal-layer venue-directions-layer"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="venue-directions-title"
        aria-describedby="venue-directions-text"
        tabIndex={-1}
        className="venue-directions-dialog"
      >
        <header className="venue-directions-dialog__header">
          <div>
            <span className="venue-directions-dialog__eyebrow">Место проведения</span>
            <h2 id="venue-directions-title">Как добраться до TAU</h2>
          </div>
          <button
            type="button"
            className="venue-directions-dialog__close"
            aria-label="Закрыть маршрут"
            onClick={onClose}
            data-autofocus
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <p id="venue-directions-text" className="venue-directions-dialog__description">
          {venue.directionsText}
        </p>
        <img
          className="venue-directions-dialog__map"
          src={venueDirectionsMap}
          alt="Схема пешего пути от метро «Стахановская» до пространства TAU через территорию кинозавода «МОСКИНО», с обозначенными парковками"
          width="1100"
          height="854"
          loading="eager"
          decoding="async"
        />
        <a
          className="button secondary venue-directions-dialog__link"
          href={venue.routeHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="button-label">См. на карте</span>
          <ArrowUpRight size={18} aria-hidden="true" />
        </a>
      </section>
    </div>,
    document.body,
  );
}
