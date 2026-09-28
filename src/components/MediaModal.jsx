import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useDialog } from '../lib/useDialog.js';
import { content } from '../content.js';
export function MediaModal({ kind, onClose }) {
  const ref = useRef(null),
    touchStart = useRef(null),
    [index, setIndex] = useState(0);
  useDialog(ref, onClose);
  const gallery = kind === 'gallery',
    items = content.gallery.items;
  return createPortal(
    <div
      className="modal-layer media-layer"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-title"
        className="media-dialog"
        tabIndex={-1}
        onKeyDown={(e) => {
          if (!gallery) return;
          if (e.key === 'ArrowRight') setIndex((index + 1) % items.length);
          if (e.key === 'ArrowLeft') setIndex((index - 1 + items.length) % items.length);
        }}
      >
        <div className="media-heading">
          <h2 id="media-title">{gallery ? 'Кадры с DEBT TECH 2025' : 'Как это было в 2025'}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Закрыть просмотр">
            <X />
          </button>
        </div>
        {gallery ? (
          <>
            <div
              className="gallery-display"
              onTouchStart={(e) => {
                touchStart.current = e.touches[0].clientX;
              }}
              onTouchEnd={(e) => {
                if (touchStart.current === null) return;
                const distance = e.changedTouches[0].clientX - touchStart.current;
                touchStart.current = null;
                if (Math.abs(distance) > 45)
                  setIndex((i) => (i + (distance < 0 ? 1 : -1) + items.length) % items.length);
              }}
            >
              <img src={items[index].image} alt={items[index].alt} />
            </div>
            <div className="gallery-controls">
              <button
                className="icon-button"
                onClick={() => setIndex((index - 1 + items.length) % items.length)}
                aria-label="Предыдущее фото"
              >
                <ArrowLeft />
              </button>
              <span aria-live="polite">
                {index + 1} / {items.length}
              </span>
              <button
                className="icon-button"
                onClick={() => setIndex((index + 1) % items.length)}
                aria-label="Следующее фото"
              >
                <ArrowRight />
              </button>
            </div>
          </>
        ) : (
          <iframe
            src="https://kinescope.io/embed/dd7dQ3BMbTCeSfteZFXCiS?autoplay=true&controls=true"
            title="DEBT TECH 2025 — видеозапись"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
          />
        )}
      </section>
    </div>,
    document.body,
  );
}
