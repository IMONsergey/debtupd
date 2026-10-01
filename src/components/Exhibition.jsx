import { useState } from 'react';
import { useExhibitionMap } from '../hooks/useExhibitionMap.js';
import { BadgeCheck, Handshake, MonitorPlay, Minus, Plus, RotateCcw, MapPin } from 'lucide-react';
import { ActionArrow } from './ActionArrow.jsx';
import { assetUrl } from '../lib/assets.js';
import { floors, exhibitors, demoStandStatus } from '../data/exhibition.js';

const benefits = [
  [BadgeCheck, 'Чек-бейджи', 'Механика приводит участников на ваш стенд'],
  [MonitorPlay, 'Демо вживую', 'Возможность показать продукт вживую и отработать возражения'],
  [Handshake, 'Сервис знакомств', 'Организация переговоров между участниками'],
];

export function Exhibition({ onApply }) {
  const [floorId, setFloorId] = useState(1);
  const [selected, setSelected] = useState(null);
  const floor = floors.find((item) => item.id === floorId);
  const { viewport, canvas, zoom, changeZoom, locate, reset, handlers } = useExhibitionMap(floor);
  const status = demoStandStatus[selected];
  const company = exhibitors.find((item) => item.standNumbers.includes(selected));
  const floorCompanies = exhibitors.filter((item) =>
    item.standNumbers.some((n) => floor.stands.some((s) => s.number === n)),
  );

  function switchFloor(id) {
    setFloorId(id);
    setSelected(null);
    reset();
  }
  function chooseStand(number, center = false) {
    setSelected(number);
    if (center) locate(floor.stands.find((item) => item.number === number));
  }
  function apply() {
    onApply(
      selected
        ? `Интересует стенд №${selected}, ${floorId}-й этаж, выставка решений DEBT TECH 2026.`
        : 'Интересует участие в выставке решений DEBT TECH 2026.',
    );
  }
  function tabKey(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const id = event.key === 'Home' ? 1 : event.key === 'End' ? 2 : floorId === 1 ? 2 : 1;
    switchFloor(id);
    document.getElementById(`exhibition-tab-${id}`)?.focus();
  }

  return (
    <section className="section exhibition" id="exhibition" aria-labelledby="exhibition-heading">
      <h2 className="section-title" id="exhibition-heading">
        Выставка решений
        <br />
        на DEBT TECH 2026
      </h2>
      <div className="exhibition-intro glass corners">
        <div className="exhibition-intro__copy">
          <p className="eyebrow">Как получить лиды на форуме?</p>
          <h3>
            Станьте экспонентом
            <br />
            Планетария
          </h3>
          <div className="exhibition-stats">
            <div>
              <strong>
                400<span>+</span>
              </strong>
              <p>компаний</p>
            </div>
            <div>
              <strong>
                59<span>%</span>
              </strong>
              <p>собственники и топ-менеджеры бизнеса</p>
            </div>
          </div>
          <button type="button" className="button" onClick={apply}>
            <span className="button-label">Стать партнером</span>
            <ActionArrow />
          </button>
        </div>
        <figure className="exhibition-photo">
          <img
            src={assetUrl('assets/exhibition/exhibition.webp')}
            alt="Участники форума знакомятся с решениями на выставочном стенде"
            width="2048"
            height="1365"
            loading="lazy"
            decoding="async"
          />
        </figure>
      </div>
      <div className="exhibition-benefits">
        {benefits.map(([Icon, title, text]) => (
          <article key={title} className="exhibition-benefit">
            <Icon aria-hidden="true" />
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="exhibition-map-heading">
        <div>
          <h3>Схема площадки</h3>
        </div>
        <p className="exhibition-availability">
          В Планетарии осталось <strong>15 мест под стенды</strong> — выберите свою орбиту на схеме
          ниже
        </p>
      </div>
      <div className="exhibition-map-card">
        <div className="exhibition-toolbar">
          <div className="exhibition-tabs" role="tablist" aria-label="Этаж выставки">
            {floors.map((item) => (
              <button
                key={item.id}
                id={`exhibition-tab-${item.id}`}
                role="tab"
                type="button"
                aria-selected={floorId === item.id}
                aria-controls="exhibition-floor-panel"
                tabIndex={floorId === item.id ? 0 : -1}
                onClick={() => switchFloor(item.id)}
                onKeyDown={tabKey}
              >
                {item.id}-й этаж
              </button>
            ))}
          </div>
          <div className="exhibition-zoom" role="group" aria-label="Масштаб схемы">
            <button
              type="button"
              className="button secondary"
              aria-label="Уменьшить схему"
              disabled={zoom <= 1}
              onClick={() => changeZoom(zoom - 0.5)}
            >
              <Minus aria-hidden="true" />
            </button>
            <output aria-label="Текущий масштаб">{Math.round(zoom * 100)}%</output>
            <button
              type="button"
              className="button secondary"
              aria-label="Увеличить схему"
              disabled={zoom >= 4}
              onClick={() => changeZoom(zoom + 0.5)}
            >
              <Plus aria-hidden="true" />
            </button>
            <button
              type="button"
              className="button secondary"
              aria-label="Показать схему целиком"
              onClick={reset}
            >
              <RotateCcw aria-hidden="true" />
            </button>
          </div>
        </div>
        <div
          id="exhibition-floor-panel"
          role="tabpanel"
          aria-labelledby={`exhibition-tab-${floorId}`}
        >
          <div
            className="exhibition-map-viewport"
            ref={viewport}
            tabIndex={0}
            {...handlers}
            onDoubleClick={(event) => {
              if (!event.target.closest('button')) changeZoom(zoom < 2 ? 2.5 : 1);
            }}
            aria-label={`Схема ${floorId}-го этажа. Интерактивная схема площадки.`}
          >
            <div
              className="exhibition-map-canvas"
              ref={canvas}
              style={{ aspectRatio: `${floor.width} / ${floor.height}` }}
            >
              <img
                src={assetUrl(floor.image)}
                alt={`План ${floorId}-го этажа: ${floorId === 1 ? 'главная и вендорская сцены, кафе, переговорные и стенды 1–24' : 'балкон, Talk Zone и стенды 25–27'}`}
                width={floor.width}
                height={floor.height}
                loading="lazy"
                decoding="async"
                draggable="false"
              />
              {floor.stands.map((stand) => (
                <button
                  key={stand.number}
                  type="button"
                  className="exhibition-map-stand"
                  data-stand={stand.number}
                  data-status={demoStandStatus[stand.number] || 'unknown'}
                  aria-label={`Стенд ${stand.number}, ${floorId}-й этаж`}
                  aria-description={
                    demoStandStatus[stand.number]
                      ? `Демо: ${demoStandStatus[stand.number] === 'occupied' ? 'занят' : 'свободен'}. Доступность уточняется у организатора.`
                      : 'Доступность уточняется у организатора.'
                  }
                  aria-pressed={selected === stand.number}
                  title={`Стенд №${stand.number}${demoStandStatus[stand.number] ? ' · Демо: ' + (demoStandStatus[stand.number] === 'occupied' ? 'занят' : 'свободен') : ' · Доступность уточняется'}`}
                  onClick={() => chooseStand(stand.number)}
                  style={{
                    left: `${((stand.x - 6) / floor.width) * 100}%`,
                    top: `${((stand.y - 6) / floor.height) * 100}%`,
                    width: `${((stand.width + 12) / floor.width) * 100}%`,
                    height: `${((stand.height + 12) / floor.height) * 100}%`,
                  }}
                >
                  <span className="exhibition-map-point" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
          <div className="exhibition-legend" aria-label="Обозначения схемы">
            <span>
              <i data-status="unknown" />
              Доступность уточняется
            </span>
            <span>
              <i data-status="free" />
              Демо: свободен
            </span>
            <span>
              <i data-status="occupied" />
              Демо: занят
            </span>
          </div>
          <div className="exhibition-selection">
            <div className="exhibition-stand-list">
              <p className="eyebrow">Стенды на {floorId}-м этаже</p>
              <div aria-label="Выберите стенд из списка">
                {floor.stands.map((stand) => (
                  <button
                    type="button"
                    key={stand.number}
                    data-status={demoStandStatus[stand.number] || 'unknown'}
                    aria-label={`Показать стенд ${stand.number}`}
                    title={
                      demoStandStatus[stand.number]
                        ? `Демо: ${demoStandStatus[stand.number] === 'occupied' ? 'занят' : 'свободен'}`
                        : 'Доступность уточняется'
                    }
                    aria-pressed={selected === stand.number}
                    onClick={() => chooseStand(stand.number, true)}
                  >
                    <i aria-hidden="true" />
                    {String(stand.number).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>
            <aside className="exhibition-stand-detail" aria-live="polite" aria-atomic="true">
              <div>
                <p className="eyebrow">
                  {selected ? `${floorId}-й этаж · Планетарий` : 'Ваше место на форуме'}
                </p>
                <h4>{selected ? `Стенд №${selected}` : 'Найдите свою орбиту'}</h4>
                {status && (
                  <span className="exhibition-status" data-status={status}>
                    Демо: {status === 'occupied' ? 'занят' : 'свободен'}
                  </span>
                )}
                <p>
                  {status
                    ? 'Пример отображения статуса. Доступность уточняется у организатора.'
                    : company
                      ? company.name
                      : selected
                        ? 'Уточним доступность и условия размещения у организатора.'
                        : 'Доступность и условия — у организатора.'}
                </p>
              </div>
              <button type="button" className="button" onClick={apply}>
                <span className="button-label">
                  {selected ? 'Узнать условия' : 'Стать партнером'}
                </span>
                <ActionArrow />
              </button>
            </aside>
          </div>
        </div>
      </div>
      <div className="exhibition-exhibitors">
        <div className="exhibition-exhibitors__heading">
          <h3>Экспоненты форума</h3>
          <p>
            {floorCompanies.length ? `${floorId}-й этаж` : 'Состав участников выставки пополняется'}
          </p>
        </div>
        {floorCompanies.length ? (
          <div className="exhibition-company-grid">
            {floorCompanies.map((item) => (
              <article key={item.id} className="glass exhibition-company">
                {item.logo && <img src={assetUrl(item.logo)} alt={item.name} loading="lazy" />}
                <h4>{item.name}</h4>
                <p>{item.description}</p>
                <div>
                  {item.standNumbers
                    .filter((n) => floor.stands.some((s) => s.number === n))
                    .map((number) => (
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => chooseStand(number, true)}
                        key={number}
                      >
                        Стенд №{number}
                        <MapPin aria-hidden="true" />
                      </button>
                    ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="exhibition-exhibitors__note">
            Информация о компаниях и их стендах появится здесь после подтверждения участия.
          </p>
        )}
      </div>
    </section>
  );
}
