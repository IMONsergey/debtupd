import { ActionArrow } from './ActionArrow.jsx';
import { assetUrl } from '../lib/assets.js';

const programme = [
  {
    number: '01',
    title: 'Взаимодействие финансовых организаций с ГИС',
    points: [
      'Построение системы подтверждения дохода (ГИС «Доход», Цифровой профиль, БКИ, Open banking).',
      'Развитие Цифрового профиля и полномочия Банка России.',
      'Нормативная модель, принципы платности ГИС и SLA.',
    ],
  },
  {
    number: '02',
    title: 'Антифрод-новации и работа с ГИС «Антифрод»',
    points: [
      'Применение 41-ФЗ и 210-ФЗ, фрод-события от операторов связи.',
      'Уведомления, маркировка, МАВ и спецМАВ.',
      'Риск-ориентированный подход при подозрительных операциях.',
    ],
  },
];

const hosts = [
  {
    number: '01',
    initials: 'АЕ',
    name: 'Андрей Емелин',
    position: 'Председатель НСФР',
  },
  {
    number: '02',
    initials: 'ИЗ',
    name: 'Иван Зимин',
    position:
      'Вице-президент по внедрению инновационных государственных технологий и сервисов АО «ТБанк», председатель Комитета НСФР по финтеху',
  },
];

export function FincifraSeminar({ tariff, onRegister }) {
  return (
    <section
      className="section fincifra-seminar"
      id="fincifra-seminar"
      aria-labelledby="fincifra-seminar-title"
    >
      <div className="fincifra-seminar__surface corners">
        <header className="fincifra-seminar__intro">
          <div className="fincifra-seminar__overline">
            <span>IX Практический семинар</span>
            <span>DEBT TECH / 2026</span>
          </div>
          <div className="fincifra-seminar__hero">
            <div className="fincifra-seminar__identity">
              <h2 id="fincifra-seminar-title">
                <span>«ФинЦифра</span>
                <span>–2026»</span>
              </h2>
              <p>В рамках Форума DEBT TECH 2026</p>
            </div>
            <div className="fincifra-seminar__schedule">
              <span className="fincifra-seminar__schedule-label">13 ноября 2026 · Москва</span>
              <div className="fincifra-seminar__hours" aria-label="Время семинара с 12:30 до 16:30">
                <time dateTime="12:30">12:30</time>
                <span aria-hidden="true">—</span>
                <time dateTime="16:30">16:30</time>
              </div>
              <span className="fincifra-seminar__schedule-footer">Практическая программа · 4 часа</span>
            </div>
          </div>
        </header>

        <div className="fincifra-seminar__brands" aria-label="Организатор и партнеры семинара">
          <div className="fincifra-seminar__brand fincifra-seminar__brand--organizer">
            <span className="fincifra-seminar__meta-label">Организатор</span>
            <div className="fincifra-seminar__nsfr">
              <img
                src={assetUrl('assets/figma/review/support-nsfr.svg')}
                width="44"
                height="44"
                alt="Логотип НСФР"
                loading="lazy"
              />
              <p>Ассоциация «Национальный совет финансового рынка» <b>(НСФР)</b></p>
            </div>
          </div>
          <div className="fincifra-seminar__brand fincifra-seminar__brand--support">
            <span className="fincifra-seminar__meta-label">При поддержке</span>
            <div className="fincifra-seminar__brand-logos">
              <img
                src={assetUrl('assets/images/organizer/rvz-logo.svg')}
                width="306"
                height="55"
                alt="СМИ «Рынок Взыскания»"
                loading="lazy"
              />
              <img
                src={assetUrl('assets/figma/debtprice-logo.svg')}
                width="317"
                height="72"
                alt="ЭТП DEBTPRICE"
                loading="lazy"
              />
            </div>
          </div>
        </div>

        <div className="fincifra-seminar__programme">
          <div className="fincifra-seminar__section-heading">
            <h3>В программе</h3>
            <span>Два тематических направления</span>
          </div>
          <div className="fincifra-seminar__agenda">
            {programme.map((topic) => (
              <article className="fincifra-seminar__agenda-row" key={topic.number}>
                <span className="fincifra-seminar__topic-number" aria-hidden="true">
                  {topic.number}
                </span>
                <h4>{topic.title}</h4>
                <ul>
                  {topic.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>

        <div className="fincifra-seminar__hosts">
          <div className="fincifra-seminar__section-heading">
            <h3>Ведущие</h3>
            <span>Эксперты семинара</span>
          </div>
          <div className="fincifra-seminar__host-grid">
            {hosts.map((host) => (
              <article className="fincifra-seminar__host" key={host.number}>
                <div
                  className="fincifra-seminar__photo"
                  role="img"
                  aria-label={'Место для фотографии: ' + host.name}
                >
                  <span className="fincifra-seminar__photo-mark" aria-hidden="true">
                    {host.initials}
                  </span>
                  <span className="fincifra-seminar__photo-label" aria-hidden="true">
                    Фото / {host.number}
                  </span>
                </div>
                <div className="fincifra-seminar__host-info">
                  <h4>{host.name}</h4>
                  <p>{host.position}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="fincifra-seminar__offer">
          <div className="fincifra-seminar__offer-copy">
            <span className="fincifra-seminar__meta-label">Специальное предложение</span>
            <h3>Спецтариф для членов НСФР</h3>
            <p>
              Включает посещение деловой части форума DEBT TECH 2026 и практического
              семинара «ФинЦифра».
            </p>
          </div>
          <div className="fincifra-seminar__offer-action">
            {tariff?.price && <strong>{tariff.price}</strong>}
            <button
              type="button"
              className="button fincifra-seminar__register"
              onClick={() => onRegister(tariff)}
            >
              <span className="button-label">Зарегистрироваться</span>
              <ActionArrow />
            </button>
            {tariff?.limitNote && <small>{tariff.limitNote}</small>}
          </div>
        </div>
      </div>
    </section>
  );
}
