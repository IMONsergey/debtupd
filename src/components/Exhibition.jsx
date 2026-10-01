import { useEffect, useRef, useState } from 'react';
import { useExhibitionMap } from '../hooks/useExhibitionMap.js';
import { Minus, Plus, RotateCcw, MapPin } from 'lucide-react';
import { ExhibitionLegend } from './ExhibitionLegend.jsx';
import { ActionArrow } from './ActionArrow.jsx';
import { assetUrl } from '../lib/assets.js';
import {
  floors,
  exhibitors,
  demoExhibitors,
  getStandStatus,
  occupiedStandArtwork,
} from '../data/exhibition.js';

const benefits = [
  ['01', 'Чек-бейджи', 'Механика приводит участников на ваш стенд'],
  ['02', 'Демо вживую', 'Возможность показать продукт вживую и отработать возражения'],
  ['03', 'Сервис знакомств', 'Организация переговоров между участниками'],
];

// Confirmed company data takes precedence over a sample for the same stand.
const displayedExhibitors = [
  ...exhibitors,
  ...demoExhibitors.filter(
    (sample) =>
      !exhibitors.some((company) =>
        company.standNumbers.some((n) => sample.standNumbers.includes(n)),
      ),
  ),
];

export function Exhibition({ onApply }) {
  const detail = useRef(null);
  const [floorId, setFloorId] = useState(1);
  const [selected, setSelected] = useState(null);
  const floor = floors.find((item) => item.id === floorId);
  const { viewport, canvas, zoom, changeZoom, reset, handlers } = useExhibitionMap(floor);
  const status = selected ? getStandStatus(selected) : null;
  const company = displayedExhibitors.find((item) => item.standNumbers.includes(selected));

  useEffect(() => {
    const clearSelection = (event) => {
      if (event.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', clearSelection);
    return () => window.removeEventListener('keydown', clearSelection);
  }, []);

  function switchFloor(id) {
    setFloorId(id);
    setSelected(null);
    reset();
  }
  function chooseStand(number) {
    if (getStandStatus(number) === 'occupied') return;
    setSelected((current) => (current === number ? null : number));
  }
  function apply(number = null) {
    onApply(
      number
        ? `Интересует стенд №${number}, ${floorId}-й этаж, выставка решений DEBT TECH 2026.`
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
      <div className="exhibition-intro">
        <div className="exhibition-intro__copy">
          <p className="eyebrow">Как получить лиды на форуме?</p>
          <h3>
            Станьте экспонентом
            <br />
            Планетария
          </h3>
          <div className="exhibition-stats">
            <div className="exhibition-stat glass corners">
              <strong>
                <span className="exhibition-stat__value">400</span>
                <span className="exhibition-stat__suffix">+</span>
              </strong>
              <p>компаний</p>
            </div>
            <div className="exhibition-stat glass corners">
              <strong>
                <span className="exhibition-stat__value">59</span>
                <span className="exhibition-stat__suffix">%</span>
              </strong>
              <p>собственники и топ-менеджеры бизнеса</p>
            </div>
          </div>
          <button type="button" className="button" onClick={() => apply()}>
            <span className="button-label">Стать партнером</span>
            <ActionArrow />
          </button>
        </div>
        <figure className="exhibition-photo corners">
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
        {benefits.map(([index, title, text]) => (
          <article key={title} className="exhibition-benefit glass corners">
            <span className="exhibition-benefit__index" aria-hidden="true">
              {index}
            </span>
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
        <div className="exhibition-availability glass corners">
          <strong className="exhibition-availability__count">15</strong>
          <div>
            <p className="exhibition-availability__eyebrow">В Планетарии осталось</p>
            <strong className="exhibition-availability__label">мест под стенды</strong>
            <p>Выберите свою орбиту на схеме ниже</p>
          </div>
        </div>
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
          <div className="exhibition-status-key" aria-label="Статусы стендов">
            <span>
              <span className="exhibition-legend__icon" aria-hidden="true">
                №
              </span>
              Стенд свободен
            </span>
            <span>
              <span
                className="exhibition-legend__icon exhibition-legend__icon--occupied"
                aria-hidden="true"
              >
                №
              </span>
              Стенд забронирован
            </span>
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
              <svg
                className="exhibition-stand-fills"
                viewBox={`0 0 ${floor.width} ${floor.height}`}
                aria-hidden="true"
              >
                {floor.stands
                  .filter(
                    (stand) =>
                      getStandStatus(stand.number) === 'occupied' &&
                      occupiedStandArtwork[stand.number],
                  )
                  .map((stand) => {
                    const cx = stand.x + stand.width / 2;
                    const cy = stand.y + stand.height / 2;
                    return (
                      <g key={stand.number} data-occupied-stand={stand.number}>
                        <path
                          d={occupiedStandArtwork[stand.number].shape}
                          className="exhibition-occupied-shape"
                        />
                        <text
                          x={cx}
                          y={cy}
                          className="exhibition-occupied-number"
                          textAnchor="middle"
                          dominantBaseline="central"
                          transform={stand.number === 8 ? `rotate(-32.35 ${cx} ${cy})` : undefined}
                        >
                          {stand.number}
                        </text>
                      </g>
                    );
                  })}
              </svg>
              {floor.stands.map((stand) => {
                const standStatus = getStandStatus(stand.number);
                const occupied = standStatus === 'occupied';
                const tooltip = occupied ? 'Стенд забронирован' : `Стенд №${stand.number} свободен`;
                return (
                  <button
                    key={stand.number}
                    type="button"
                    className="exhibition-map-stand"
                    data-stand={stand.number}
                    data-status={standStatus}
                    data-tooltip={tooltip}
                    aria-label={`Стенд ${stand.number}, ${floorId}-й этаж, ${occupied ? 'забронирован' : 'свободен'}`}
                    aria-disabled={occupied || undefined}
                    aria-pressed={selected === stand.number}
                    title={tooltip}
                    onClick={() => chooseStand(stand.number)}
                    style={{
                      left: `${((stand.x - 6) / floor.width) * 100}%`,
                      top: `${((stand.y - 6) / floor.height) * 100}%`,
                      width: `${((stand.width + 12) / floor.width) * 100}%`,
                      height: `${((stand.height + 12) / floor.height) * 100}%`,
                    }}
                  />
                );
              })}
            </div>
          </div>
          <ExhibitionLegend floorId={floorId} />
          <div className="exhibition-selection">
            <div className="exhibition-stand-list">
              <p className="eyebrow">Стенды на {floorId}-м этаже</p>
              <div aria-label="Выберите стенд из списка">
                {floor.stands.map((stand) => {
                  const standStatus = getStandStatus(stand.number);
                  const occupied = standStatus === 'occupied';
                  return (
                    <button
                      type="button"
                      key={stand.number}
                      data-status={standStatus}
                      data-tooltip={occupied ? 'Стенд забронирован' : undefined}
                      aria-label={
                        occupied
                          ? `Стенд ${stand.number} забронирован`
                          : `Выбрать стенд ${stand.number}`
                      }
                      aria-disabled={occupied || undefined}
                      title={occupied ? 'Стенд забронирован' : `Стенд №${stand.number} свободен`}
                      aria-pressed={selected === stand.number}
                      onClick={() => chooseStand(stand.number)}
                    >
                      {String(stand.number).padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
            </div>
            <aside
              id="exhibition-stand-detail"
              ref={detail}
              tabIndex={-1}
              className="exhibition-stand-detail"
              aria-live="polite"
              aria-atomic="true"
            >
              <div>
                <p className="eyebrow">
                  {selected ? `${floorId}-й этаж · Планетарий` : 'Ваше место на форуме'}
                </p>
                <h4>{selected ? `Стенд №${selected}` : 'Найдите свою орбиту'}</h4>
                {status && (
                  <span className="exhibition-status" data-status={status}>
                    {status === 'occupied' ? 'Стенд забронирован' : 'Стенд свободен'}
                  </span>
                )}
                {selected && status === 'occupied' ? (
                  <>
                    {company && (
                      <strong className="exhibition-stand-company">
                        {company.name}
                        {company.demo && <small>Демо-компания</small>}
                      </strong>
                    )}
                    <p className="exhibition-stand-description">
                      {company?.description ||
                        'Информация об экспоненте появится после подтверждения участия.'}
                    </p>
                  </>
                ) : (
                  <p>
                    {selected
                      ? 'Уточните возможность размещения и условия участия в выставке.'
                      : 'Выберите свободный стенд на схеме или в списке.'}
                  </p>
                )}
              </div>
              {(!selected || status !== 'occupied') && (
                <button type="button" className="button" onClick={() => apply(selected)}>
                  <span className="button-label">Стать партнером</span>
                  <ActionArrow />
                </button>
              )}
            </aside>
          </div>
        </div>
      </div>
      {displayedExhibitors.length > 0 && (
        <div className="exhibition-exhibitors">
          <div className="exhibition-exhibitors__heading">
            <h3>Экспоненты форума</h3>
            {displayedExhibitors.some((item) => item.demo) && (
              <p>Демо-карточки · участие компаний не подтверждено</p>
            )}
          </div>
          <div className="exhibition-company-grid">
            {displayedExhibitors.map((item) => (
              <article key={item.id} className="exhibition-company glass corners">
                {item.demo && <span className="exhibition-company__demo">Демо</span>}
                {item.logo && <img src={assetUrl(item.logo)} alt={item.name} loading="lazy" />}
                <h4>{item.name}</h4>
                <p>{item.description}</p>
                <div>
                  {item.standNumbers.map((number) => (
                    <button
                      type="button"
                      className="exhibition-company__stand"
                      aria-controls="exhibition-stand-detail"
                      onClick={() => {
                        const targetFloor = floors.find((f) =>
                          f.stands.some((s) => s.number === number),
                        );
                        if (targetFloor.id !== floorId) switchFloor(targetFloor.id);
                        setSelected(number);
                        requestAnimationFrame(() => {
                          detail.current?.focus({ preventScroll: true });
                          detail.current?.scrollIntoView({
                            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                              ? 'instant'
                              : 'smooth',
                            block: 'nearest',
                          });
                        });
                      }}
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
        </div>
      )}
    </section>
  );
}
