import { assetUrl } from '../lib/assets.js';
const supporters = [
  { id: 'mir', short: 'СРО МИР', name: 'Саморегулируемая организация МИР' },
  {
    id: 'napka',
    short: 'НАПКА',
    name: 'Национальная Ассоциация Профессиональных Коллекторских Агентств',
  },
  { id: 'nsfr', short: 'НСФР', name: 'Национальный совет финансового рынка' },
];
export function Supporters() {
  return (
    <div className="hero-supporters" aria-label="При поддержке">
      <span className="supporters-label">При поддержке</span>
      <div className="supporters-list">
        {supporters.map((s) => (
          <div className="supporter" key={s.id}>
            <img
              src={assetUrl(`assets/figma/review/support-${s.id}.svg`)}
              width="40"
              height="40"
              alt={s.short}
            />
            <span className="supporter-full">
              При поддержке
              <br />
              {s.name}
            </span>
            <span className="supporter-short" aria-hidden="true">
              {s.short}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
