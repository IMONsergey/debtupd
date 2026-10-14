import { useEffect, useState } from 'react';
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
    portrait: 'assets/figma/speaker-hd-03.webp',
  },
  {
    name: 'Иван Зимин',
    role: 'Вице-президент по внедрению инновационных государственных технологий и сервисов АО «ТБанк», председатель Комитета НСФР по финтеху',
    portrait: 'assets/speakers/fincifra-ivan-zimin-astronaut.webp',
  },
];

export function FincifraSeminar({ tariff, onRegister }) {
  const [compact, setCompact] = useState(() => matchMedia('(max-width: 899px)').matches);

  useEffect(() => {
    const media = matchMedia('(max-width: 899px)');
    const sync = () => setCompact(media.matches);
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return (
    <section
      className="section fincifra-seminar"
      id="fincifra-seminar"
      aria-labelledby="fincifra-seminar-title"
    >
      <header className="fincifra-seminar__masthead">
        <div>
          <p className="fincifra-seminar__eyebrow">
            IX практический семинар <span aria-hidden="true">/</span> DEBT TECH 2026
          </p>
          <h2 id="fincifra-seminar-title" className="fincifra-seminar__title">
            «ФинЦифра–2026»
          </h2>
        </div>
        <div
          className="fincifra-seminar__datetime"
          aria-label="13 ноября, Москва, с 12:30 до 16:30"
        >
          <span>13 ноября · Москва</span>
          <strong>12:30–16:30</strong>
        </div>
      </header>

      <div className="fincifra-seminar__panel glass corners">
        <div className="fincifra-seminar__programme">
          <h3>Программа семинара</h3>
          <div className="fincifra-seminar__topics">
            {programme.map((topic) => (
              <details className="fincifra-seminar__topic" key={topic.number} open={!compact}>
                <summary>
                  <span className="fincifra-seminar__number">{topic.number}</span>
                  <strong>{topic.title}</strong>
                  <span className="fincifra-seminar__toggle" aria-hidden="true" />
                </summary>
                <ul>
                  {topic.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </div>

        <div className="fincifra-seminar__brands" aria-label="Организатор и партнёры семинара">
          <div className="fincifra-seminar__organizer">
            <span className="fincifra-seminar__label">Организатор</span>
            <img
              src={assetUrl('assets/figma/review/support-nsfr.svg')}
              alt="Логотип НСФР"
              width="35"
              height="35"
              loading="lazy"
            />
            <span>Ассоциация «Национальный совет финансового рынка» (НСФР)</span>
          </div>
          <div className="fincifra-seminar__partners">
            <span className="fincifra-seminar__label">При поддержке</span>
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

        <div className="fincifra-seminar__bottom">
          <div className="fincifra-seminar__hosts">
            <h3>Ведущие</h3>
            <div className="fincifra-seminar__host-list">
              {hosts.map((host) => (
                <article className="fincifra-seminar__host" key={host.name}>
                  <div className="fincifra-seminar__portrait">
                    <img
                      src={assetUrl(host.portrait)}
                      alt={host.name}
                      width="400"
                      height="400"
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

          <div className="fincifra-seminar__offer">
            <span className="fincifra-seminar__label">Спецтариф для членов НСФР</span>
            <strong className="fincifra-seminar__price">{tariff?.price || '24 500 ₽'}</strong>
            <p>Деловая часть форума и семинар «ФинЦифра»</p>
            <button
              type="button"
              className="button fincifra-seminar__register"
              onClick={() => onRegister(tariff)}
            >
              <span className="button-label">Зарегистрироваться</span>
              <ActionArrow />
            </button>
            {tariff?.limitNote && (
              <small className="fincifra-seminar__limit">{tariff.limitNote}</small>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
