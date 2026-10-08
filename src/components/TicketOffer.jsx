import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDialog } from '../lib/useDialog.js';
import { assetUrl } from '../lib/assets.js';
import { ActionArrow } from './ActionArrow.jsx';
import { getPricingPhase, PRICING_END_AT } from '../lib/ticket-pricing.js';
const SEEN = 'debt2026-early-booking-dismissed';
function alreadyDismissed() {
  try {
    return sessionStorage.getItem(SEEN) === '1';
  } catch {
    return false;
  }
}
function TicketOfferDialog({ onClose, onBuy }) {
  const ref = useRef(null),
    [now, setNow] = useState(Date.now());
  useDialog(ref, onClose);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const phase = getPricingPhase(now);
  const seconds = Math.max(0, Math.floor((phase.deadline - now) / 1000));
  const values = [
    Math.floor(seconds / 86400),
    Math.floor(seconds / 3600) % 24,
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ];
  useEffect(() => {
    if (seconds === 0) onClose();
  }, [seconds, onClose]);
  return createPortal(
    <div
      className="ticket-offer-modal"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        className="ticket-offer-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-offer-title"
        aria-describedby="ticket-offer-description"
        tabIndex={-1}
        style={{
          '--ticket-offer-background': `url("${assetUrl('assets/ticket-offer/background.webp')}")`,
        }}
      >
        <img
          className="ticket-offer-modal__planet"
          src={assetUrl('assets/ticket-offer/planet.webp')}
          alt=""
        />
        <button
          type="button"
          className="ticket-offer-modal__close icon-button"
          aria-label="Закрыть предложение"
          onClick={onClose}
        >
          ×
        </button>
        <img
          className="ticket-offer-modal__logo"
          src={assetUrl('assets/ticket-offer/logo.svg')}
          alt="DEBT TECH 2026"
        />
        <span className="ticket-offer-modal__eyebrow">Форум-выставка</span>
        <h2
          className="ticket-offer-modal__event-title"
          id="ticket-offer-title"
          tabIndex={-1}
          data-autofocus
        >
          «Вселенная технологий»
        </h2>
        <span className="ticket-offer-modal__booking-title">Раннее бронирование</span>
        <p id="ticket-offer-description">
          Успейте приобрести билеты со скидкой <strong>{phase.deadlineLabel}</strong>
        </p>
        <div className="ticket-offer-modal__countdown" aria-label="До окончания скидки">
          {values.map((value, index) => (
            <span className="ticket-offer-modal__countdown-item" key={index}>
              <strong>{String(value).padStart(2, '0')}</strong>
              <span>{['дней', 'часов', 'минут', 'секунд'][index]}</span>
            </span>
          ))}
        </div>
        <button type="button" className="ticket-offer-modal__buy button" onClick={onBuy}>
          <span>Купить билет</span>
          <ActionArrow />
        </button>
      </section>
    </div>,
    document.body,
  );
}
export function DelayedTicketOffer({ blocked = false }) {
  const [due, setDue] = useState(false),
    [dismissed, setDismissed] = useState(alreadyDismissed),
    [loading, setLoading] = useState(() => !!document.getElementById('site-preloader'));
  useEffect(() => {
    const timer = setTimeout(() => setDue(true), 15000);
    const ready = () => setLoading(false);
    document.addEventListener('debt:preloader-closed', ready);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('debt:preloader-closed', ready);
    };
  }, []);
  const close = useCallback(() => {
    setDismissed(true);
    try {
      sessionStorage.setItem(SEEN, '1');
    } catch {}
  }, []);
  const buy = useCallback(() => {
    close();
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const target = document.getElementById('tariff-plans');
        if (!target) return;
        history.replaceState(null, '', '#tariff-plans');
        target.scrollIntoView({
          behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
          block: 'start',
        });
      }),
    );
  }, [close]);
  if (!due || dismissed || blocked || loading || Date.now() >= PRICING_END_AT) return null;
  return <TicketOfferDialog onClose={close} onBuy={buy} />;
}
