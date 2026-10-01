import { Coffee, Utensils } from 'lucide-react';

function Symbol({ type }) {
  if (type === 'stand' || type === 'vip' || type === 'occupied') return '№';
  if (type === 'coffee') return <Coffee aria-hidden="true" />;
  if (type === 'cafe') return <Utensils aria-hidden="true" />;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {type === 'stairs' ? (
        <path d="M3 21v-5h5v-5h5V6h5V2h3" />
      ) : type === 'wardrobe' ? (
        <path d="M9 6a3 3 0 1 1 4 2.83V11l8 8H3l10-8" />
      ) : (
        <>
          <circle cx="12" cy="5" r="2" fill="currentColor" stroke="none" />
          <path d="M8 12V9h8v3M4 13h16M7 13v8h10v-8" />
        </>
      )}
    </svg>
  );
}

const firstFloor = [
  ['registration', 'Регистрация'],
  ['stand', '№ выставочного стенда'],
  ['vip', '№ VIP-переговорной'],
  ['cafe', 'DOLG TALK CAFE'],
  ['coffee', 'COFFEE BREAK'],
  ['wardrobe', 'Гардероб'],
  ['stairs', 'Лестница на 2-й этаж'],
];
const secondFloor = [
  ['stand', '№ выставочного стенда'],
  ['coffee', 'COFFEE BREAK'],
  ['stairs', 'Лестница на 1-й и 3-й этажи'],
];

export function ExhibitionLegend({ floorId }) {
  return (
    <div className="exhibition-legend" aria-label="Обозначения схемы">
      {(floorId === 1 ? firstFloor : secondFloor).map(([type, label]) => (
        <span key={type}>
          <span
            className={`exhibition-legend__icon exhibition-legend__icon--${type}`}
            aria-hidden="true"
          >
            <Symbol type={type} />
          </span>
          {label}
        </span>
      ))}
    </div>
  );
}
