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
    name: 'Андрей Емелин',
    role: 'Председатель НСФР',
    portrait: 'assets/speakers/fincifra-andrey-emelin-client.webp',
  },
  {
    name: 'Иван Зимин',
    role: 'Вице-президент по внедрению инновационных государственных технологий и сервисов АО «ТБанк», председатель Комитета НСФР по финтеху',
    portrait: 'assets/speakers/fincifra-ivan-zimin-client.webp',
  },
];

export function FincifraSeminar({ tariff, onRegister }) {
  return (
    <section
      className="section fincifra-seminar"
      id="fincifra-seminar"
      aria-labelledby="fincifra-seminar-title"
    >
      <header className="fincifra-seminar__masthead">
        <div className="fincifra-seminar__heading">
          <p className="fincifra-seminar__eyebrow">IX Практический семинар</p>
          <h2 className="fincifra-seminar__title" id="fincifra-seminar-title">
            «ФинЦифра–2026»
          </h2>
          <p className="fincifra-seminar__context">(в рамках Форума DEBT TECH 2026)</p>
          <p className="fincifra-seminar__session">Малая сцена, Сессии 2 и 3</p>
        </div>
        <div
          className="fincifra-seminar__schedule"
          aria-label="13 ноября 2026, Москва, 12:30–16:30"
        >
          <div className="fincifra-seminar__schedule-location">
            <span>13 ноября 2026</span>
            <strong>Москва</strong>
          </div>
          <time className="fincifra-seminar__hours">12:30–16:30</time>
        </div>
      </header>

      <div className="fincifra-seminar__surface">
        <div className="fincifra-seminar__body">
          <div className="fincifra-seminar__programme">
            <h3>Программа семинара</h3>
            <div className="fincifra-seminar__topics">
              {programme.map((topic) => (
                <article className="fincifra-seminar__topic" key={topic.number}>
                  <div className="fincifra-seminar__topic-heading">
                    <span className="fincifra-seminar__number" aria-hidden="true">
                      {topic.number}
                    </span>
                    <h4>{topic.title}</h4>
                  </div>
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
            <h3>Ведущие</h3>
            <div className="fincifra-seminar__host-list">
              {hosts.map((host) => (
                <article className="fincifra-seminar__host" key={host.name}>
                  <div className="fincifra-seminar__portrait">
                    <img
                      src={assetUrl(host.portrait)}
                      alt={host.name}
                      width="320"
                      height="320"
                      loading="eager"
                      decoding="async"
                    />
                  </div>
                  <div className="fincifra-seminar__host-copy">
                    <h4>{host.name}</h4>
                    <p>{host.role}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="fincifra-seminar__details">
          <div className="fincifra-seminar__brands" aria-label="Организатор и партнёры семинара">
            <div className="fincifra-seminar__organizer">
              <span className="fincifra-seminar__label">Организатор</span>
              <div className="fincifra-seminar__organizer-info">
                <img
                  src={assetUrl('assets/figma/review/support-nsfr.svg')}
                  alt="Логотип НСФР"
                  width="42"
                  height="42"
                  loading="lazy"
                />
                <span>Ассоциация «Национальный совет финансового рынка» (НСФР)</span>
              </div>
            </div>
            <div className="fincifra-seminar__partners">
              <span className="fincifra-seminar__label">При поддержке</span>
              <div className="fincifra-seminar__partner-logos">
                <img
                  src={assetUrl('assets/images/organizer/rvz-logo.svg')}
                  alt="СМИ «Рынок Взыскания»"
                  width="306"
                  height="55"
                  loading="lazy"
                />
                <img
                  src={assetUrl('assets/figma/debtprice-logo.svg')}
                  alt="ЭТП DEBTPRICE"
                  width="317"
                  height="72"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
          <div className="fincifra-seminar__offer">
            <button
              type="button"
              className="button fincifra-seminar__register"
              onClick={() => onRegister(tariff)}
            >
              <span className="button-label">Зарегистрироваться</span>
              <ActionArrow />
            </button>
            <p className="fincifra-seminar__offer-text">
              Доступен <a href="#tariff-plans">спецтариф</a> для членов НСФР: включает посещение
              деловой части форума и семинара «ФинЦифра»
            </p>
            {tariff?.limitNote && (
              <small className="fincifra-seminar__limit">{tariff.limitNote}</small>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
