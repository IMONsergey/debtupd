import { useLayoutEffect, useRef, useState } from 'react';
import {
  BadgeCheck,
  Coffee,
  Handshake,
  MonitorPlay,
  Move,
  Minus,
  Plus,
  RotateCcw,
  MapPin,
} from 'lucide-react';
import { ActionArrow } from './ActionArrow.jsx';
import { assetUrl } from '../lib/assets.js';
import { floors, exhibitors } from '../data/exhibition.js';

const benefits = [
  [BadgeCheck, 'Чек-бейджи', 'Механика приводит участников на ваш стенд'],
  [MonitorPlay, 'Демо вживую', 'Возможность показать продукт вживую и отработать возражения'],
  [Handshake, 'Сервис знакомств', 'Организация переговоров между участниками'],
];

export function Exhibition({ onApply }) {
  const [floorId, setFloorId] = useState(1);
  const [selected, setSelected] = useState(null);
  const [zoom, setZoom] = useState(1);
  const viewport = useRef(null);
  const pendingCenter = useRef(null);
  const floor = floors.find((item) => item.id === floorId);
  const company = exhibitors.find((item) => item.standNumbers.includes(selected));
  const floorCompanies = exhibitors.filter((item) =>
    item.standNumbers.some((n) => floor.stands.some((s) => s.number === n)),
  );

  // Scroll only the map, never the page. Native scrolling keeps touch/pinch gestures reliable.
  useLayoutEffect(() => {
    const node = viewport.current;
    const center = pendingCenter.current;
    if (!node || !center) return;
    node.scrollTo({
      left: center.x * node.scrollWidth - node.clientWidth / 2,
      top: center.y * node.scrollHeight - node.clientHeight / 2,
      behavior: 'instant',
    });
    pendingCenter.current = null;
  }, [zoom, selected, floorId]);

  function switchFloor(id) {
    setFloorId(id);
    setSelected(null);
    setZoom(1);
    pendingCenter.current = { x: 0, y: 0 };
  }
  function changeZoom(next) {
    const node = viewport.current;
    pendingCenter.current = {
      x: (node.scrollLeft + node.clientWidth / 2) / node.scrollWidth,
      y: (node.scrollTop + node.clientHeight / 2) / node.scrollHeight,
    };
    setZoom(Math.max(1, Math.min(3, next)));
  }
  function chooseStand(number, locate = false) {
    setSelected(number);
    if (locate) {
      const stand = floor.stands.find((item) => item.number === number);
      pendingCenter.current = {
        x: (stand.x + stand.width / 2) / floor.width,
        y: (stand.y + stand.height / 2) / floor.height,
      };
      setZoom(viewport.current.clientWidth < 600 ? 3 : 2);
      // Selecting the same stand twice must also recenter the viewport.
      const node = viewport.current;
      const width = node.clientWidth * (node.clientWidth < 600 ? 3 : 2);
      node.scrollTo({
        left: pendingCenter.current.x * width - node.clientWidth / 2,
        top: (pendingCenter.current.y * width * floor.height) / floor.width - node.clientHeight / 2,
      });
    }
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
            width="1920"
            height="1280"
            loading="lazy"
            decoding="async"
          />
          <figcaption>Технологии. Встречи. Новые возможности.</figcaption>
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
          <p className="eyebrow">Ваша орбита в Планетарии</p>
          <h3>
            Выберите место
            <br />
            для новых встреч
          </h3>
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
              disabled={zoom === 1}
              onClick={() => changeZoom(zoom - 0.5)}
            >
              <Minus aria-hidden="true" />
            </button>
            <output aria-label="Текущий масштаб">{zoom * 100}%</output>
            <button
              type="button"
              className="button secondary"
              aria-label="Увеличить схему"
              disabled={zoom === 3}
              onClick={() => changeZoom(zoom + 0.5)}
            >
              <Plus aria-hidden="true" />
            </button>
            <button
              type="button"
              className="button secondary"
              aria-label="Показать схему целиком"
              onClick={() => {
                pendingCenter.current = { x: 0, y: 0 };
                setZoom(1);
                viewport.current.scrollTo(0, 0);
              }}
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
            aria-label={`Схема ${floorId}-го этажа. Увеличенную схему можно прокручивать.`}
          >
            <div
              className="exhibition-map-canvas"
              style={{ width: `${zoom * 100}%`, aspectRatio: `${floor.width} / ${floor.height}` }}
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
                  aria-label={`Стенд ${stand.number}, ${floorId}-й этаж`}
                  aria-pressed={selected === stand.number}
                  title={`Стенд №${stand.number}`}
                  onClick={() => chooseStand(stand.number)}
                  style={{
                    left: `${((stand.x - 6) / floor.width) * 100}%`,
                    top: `${((stand.y - 6) / floor.height) * 100}%`,
                    width: `${((stand.width + 12) / floor.width) * 100}%`,
                    height: `${((stand.height + 12) / floor.height) * 100}%`,
                  }}
                />
              ))}
            </div>
          </div>
          <div className="exhibition-map-caption">
            <span>
              <Move size={16} aria-hidden="true" /> Увеличивайте и перемещайте схему
            </span>
            <span>
              <MapPin size={16} aria-hidden="true" /> Нажмите на номер стенда
            </span>
          </div>
          <div className="exhibition-legend" aria-label="Обозначения схемы">
            <span>Прямоугольники с номером — стенды</span>
            <span>Круги — VIP-переговорные</span>
            <span>
              <Coffee size={16} aria-hidden="true" /> Кофе-брейк
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
                    aria-label={`Показать стенд ${stand.number}`}
                    aria-pressed={selected === stand.number}
                    onClick={() => chooseStand(stand.number, true)}
                  >
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
                <p>
                  {company
                    ? company.name
                    : selected
                      ? 'Уточним доступность и условия размещения у организатора.'
                      : 'Выберите номер на схеме или в списке и узнайте условия участия.'}
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
