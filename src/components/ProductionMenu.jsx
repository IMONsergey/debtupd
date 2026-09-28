import { useEffect, useState } from 'react';
import { SpaceNavigation } from './SpaceNavigation.jsx';
import { content } from '../content.js';
import { assetUrl } from '../lib/assets.js';

// Same markup, dimensions and visual rules as the live debt-tech.ru left rail.
export function ProductionMenu({ onVideo, onGallery, onStand }) {
  const [desktop, setDesktop] = useState(() => matchMedia('(min-width:1181px)').matches);
  useEffect(() => {
    const mq = matchMedia('(min-width:1181px)');
    const sync = () => setDesktop(mq.matches);
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  if (!desktop) return <SpaceNavigation mobile onGallery={onGallery} />;
  return (
    <aside className="fixed-menu has-space-route" aria-label="Информация о конференции">
      <a className="fixed-menu__brand" href="#top" aria-label="DEBT TECH 2026 — в начало">
        <img src={assetUrl('assets/debttech-logo.svg')} alt="DEBT TECH 2026" />
      </a>
      <SpaceNavigation onGallery={onGallery} />
      <div className="fixed-menu__info">
        <div className="desktop-sidebar-video">
          <span className="desktop-sidebar-video__caption">Как это было в 2025</span>
          <div className="desktop-sidebar-video__frame">
            <iframe
              src={content.heroVideo.previewUrl}
              title="DEBT TECH 2025 — превью"
              allow="autoplay; fullscreen; picture-in-picture"
              tabIndex={-1}
              aria-hidden="true"
            />
            <button
              className="desktop-sidebar-video__open"
              type="button"
              aria-label="Открыть видео"
              onClick={onVideo}
            >
              <span className="desktop-sidebar-video__play" aria-hidden="true" />
            </button>
          </div>
        </div>
        <a className="contact-link" href="mailto:redchief@rvzrus.ru">
          <span>Контакты для связи</span>
          <strong>redchief@rvzrus.ru</strong>
          <img className="contact-link__arrow" src={assetUrl('assets/icons/arrow-up.svg')} alt="" />
        </a>
        <div className="organizers-mark">
          <span>Организаторы</span>
          <img src={assetUrl('assets/icons/organizers.svg')} alt="Рынок взыскания и DEBTPRICE" />
        </div>
        <a className="fixed-menu__cta" href="#tariffs">
          <span>Ранняя регистрация</span>
          <img
            className="fixed-menu__cta-icon"
            src={assetUrl('assets/icons/arrow-up.svg')}
            alt=""
          />
        </a>
        <button className="fixed-menu__cta fixed-menu__cta--secondary" onClick={onStand}>
          <span>Забронировать стенд</span>
          <img
            className="fixed-menu__cta-icon"
            src={assetUrl('assets/icons/arrow-up.svg')}
            alt=""
          />
        </button>
      </div>
    </aside>
  );
}
