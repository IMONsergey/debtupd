import { ArrowLeft, ArrowRight } from 'lucide-react';

// Exact control classes shared with the exhibitor and speaker sliders.
export function MobileCarouselControls({
  className = '', label, index, count, onPrev, onNext, prevLabel, nextLabel,
}) {
  return (
    <div className={'exhibition-exhibitor-controls mobile-carousel-controls ' + className} aria-label={label}>
      <span aria-live="polite" aria-atomic="true">
        {String(index + 1).padStart(2, '0')} <i>/ {String(count).padStart(2, '0')}</i>
      </span>
      <div>
        <button type="button" className="ui-icon-button" aria-label={prevLabel} onClick={onPrev} disabled={index === 0}>
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <button type="button" className="ui-icon-button" aria-label={nextLabel} onClick={onNext} disabled={index === count - 1}>
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
