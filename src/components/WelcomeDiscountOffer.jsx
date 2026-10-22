import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, Check, Copy, X } from 'lucide-react';
import { assetUrl } from '../lib/assets.js';
import { useDialog } from '../lib/useDialog.js';

export const DISCOUNT_PROMO_CODE = 'WELCOME';
export const DISCOUNT_DELAY_MS = 60_000;
const START_KEY = 'debt2026-welcome50-entry-at';
const DISMISSED_KEY = 'debt2026-welcome50-dismissed';

function readSession(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeSession(key, value) {
  try {
    sessionStorage.setItem(key, String(value));
  } catch {
    // Private browsing may deny storage: the offer still works in this document.
  }
}
function initialEntryTime() {
  const saved = Number(readSession(START_KEY));
  if (Number.isFinite(saved) && saved > 0 && saved <= Date.now()) return saved;
  const started = Date.now();
  writeSession(START_KEY, started);
  return started;
}

async function copyPromoCode() {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(DISCOUNT_PROMO_CODE);
      return;
    } catch {
      // Clipboard permissions vary on mobile and in embedded browsers.
    }
  }
  const field = document.createElement('textarea');
  field.value = DISCOUNT_PROMO_CODE;
  field.setAttribute('readonly', '');
  field.setAttribute('aria-hidden', 'true');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  field.style.pointerEvents = 'none';
  document.body.append(field);
  field.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } finally {
    field.remove();
  }
  if (!copied) throw new Error('Копирование недоступно. Выделите промокод вручную.');
}

function DiscountDialog({ onClose, onTariffs }) {
  const dialogRef = useRef(null);
  const resetRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  useDialog(dialogRef, onClose);

  useEffect(() => () => clearTimeout(resetRef.current), []);

  const copy = async () => {
    try {
      await copyPromoCode();
      setCopyError('');
      setCopied(true);
      clearTimeout(resetRef.current);
      resetRef.current = setTimeout(() => setCopied(false), 2600);
    } catch (error) {
      setCopied(false);
      setCopyError(error.message);
    }
  };

  return createPortal(
    <div
      className="welcome-discount-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="welcome-discount"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-discount-title"
        aria-describedby="welcome-discount-copy"
        tabIndex={-1}
        style={{
          '--welcome-discount-space': 'url("' + assetUrl('assets/ticket-offer/background.webp') + '")',
        }}
      >
        <div className="welcome-discount__stars" aria-hidden="true" />
        <button
          className="welcome-discount__close"
          type="button"
          aria-label="Закрыть предложение"
          onClick={onClose}
        >
          <X size={26} strokeWidth={2.5} aria-hidden="true" />
        </button>
        <div className="welcome-discount__intro">
          <h2 id="welcome-discount-title" className="welcome-discount__heading" data-autofocus>
            Скидка
          </h2>
          <strong className="welcome-discount__percent" aria-label="50 процентов">50%</strong>
          <p id="welcome-discount-copy" className="welcome-discount__description">
            на один билет любого тарифа
            <span>
              для представителя компании, которая{' '}
              <strong>впервые</strong> участвует в DEBT TECH.
            </span>
          </p>
        </div>
        <img
          className="welcome-discount__astronaut"
          src={assetUrl('assets/promotions/welcome-astronaut.png')}
          alt=""
          width="897"
          height="861"
          decoding="async"
        />
        <div className="welcome-discount__bottom">
          <div className="welcome-discount__promo-heading">По промокоду</div>
          <div className="welcome-discount__promo">
            <span className="welcome-discount__code" aria-label="Промокод WELCOME">
              {DISCOUNT_PROMO_CODE}
            </span>
            <button
              type="button"
              className="welcome-discount__copy"
              aria-label={copied ? 'Промокод скопирован' : 'Скопировать промокод WELCOME'}
              title={copied ? 'Скопировано' : 'Скопировать промокод'}
              onClick={copy}
            >
              {copied ? <Check size={29} aria-hidden="true" /> : <Copy size={29} aria-hidden="true" />}
              <span className="welcome-discount__copy-tooltip">
                {copied ? 'Скопировано' : 'Копировать'}
              </span>
            </button>
          </div>
          <p role="status" aria-live="polite" className="welcome-discount__copy-status">
            {copyError || (copied ? 'Промокод WELCOME скопирован' : '')}
          </p>
          <p className="welcome-discount__terms">
            *Скидка предоставляется по согласованию с организаторами.
          </p>
          <button className="welcome-discount__cta" type="button" onClick={onTariffs}>
            <span>Выбрать тариф</span>
            <ArrowUpRight size={28} strokeWidth={2.3} aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

export function WelcomeDiscountOffer({ blocked = false }) {
  const [entryAt] = useState(initialEntryTime);
  const [due, setDue] = useState(() => Date.now() - entryAt >= DISCOUNT_DELAY_MS);
  const [dismissed, setDismissed] = useState(() => readSession(DISMISSED_KEY) === '1');
  const [reopened, setReopened] = useState(false);
  const [ready, setReady] = useState(() => !document.getElementById('site-preloader'));

  useEffect(() => {
    const wait = Math.max(0, DISCOUNT_DELAY_MS - (Date.now() - entryAt));
    const timeout = setTimeout(() => setDue(true), wait);
    const preloaderDone = () => setReady(true);
    document.addEventListener('debt:preloader-closed', preloaderDone);
    if (!document.getElementById('site-preloader')) setReady(true);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener('debt:preloader-closed', preloaderDone);
    };
  }, [entryAt]);

  const close = useCallback(() => {
    writeSession(DISMISSED_KEY, '1');
    setDismissed(true);
    setReopened(false);
  }, []);

  const toTariffs = useCallback(() => {
    close();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const target = document.getElementById('tariff-plans');
        if (!target) return;
        // Hash-only navigation keeps the user on the current address, including /2/.
        history.replaceState(null, '', '#tariff-plans');
        target.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
          block: 'start',
        });
      });
    });
  }, [close]);

  const isOpen = ready && due && !blocked && (!dismissed || reopened);

  return (
    <>
      {isOpen && <DiscountDialog onClose={close} onTariffs={toTariffs} />}
      {ready && due && !blocked && dismissed && !reopened && (
        <button
          type="button"
          className="welcome-discount-reopen"
          onClick={() => setReopened(true)}
          aria-label="Открыть предложение со скидкой 50%"
        >
          <span className="welcome-discount-reopen__value">−50%</span>
          <span className="welcome-discount-reopen__label">Промокод WELCOME</span>
        </button>
      )}
    </>
  );
}
