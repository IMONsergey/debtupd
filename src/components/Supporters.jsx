import { assetUrl } from '../lib/assets.js';
const supporters = [
  { id: 'mir', short: 'СРО «МиР»', name: 'СРО «МиР»' },
  {
    id: 'napka',
    short: 'НАПКА',
    name: 'Национальной Ассоциации Профессиональных Коллекторских Агентств',
  },
  { id: 'nsfr', short: 'НСФР', name: 'Национального совета финансового рынка' },
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
              <span className="supporter-prefix">
                При поддержке
                <br />
              </span>{' '}
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
