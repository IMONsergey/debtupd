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
    portrait: 'assets/speakers/fincifra-andrey-emelin.webp',
  },
  {
    name: 'Иван Зимин',
    role: 'Вице-президент по внедрению инновационных государственных технологий и сервисов АО «ТБанк», председатель Комитета НСФР по финтеху',
    portrait: 'assets/speakers/fincifra-ivan-zimin.webp',
  },
];

export function FincifraSeminar({ tariff, onRegister }) {
  // Keep the complete programme visible on desktop, and let small screens
  // expand each topic without forcing a multi-screen section.
  const [compact, setCompact] = useState(() =>
    window.matchMedia('(max-width: 899px)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia('(max-width: 899px)');
    const update = () => setCompact(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return (
    <section
      className="section fincifra-seminar"
      id="fincifra-seminar"
      aria-labelledby="fincifra-seminar-title"
    >
      <div className="fincifra-seminar__panel glass corners">
        <header className="fincifra-seminar__header">
          <div className="fincifra-seminar__heading">
            <p className="fincifra-seminar__eyebrow">IX Практический семинар · В рамках DEBT TECH 2026</p>
            <h2 id="fincifra-seminar-title">«ФинЦифра–2026»</h2>
          </div>
          <div className="fincifra-seminar__time">
            <span>13 ноября · Москва</span>
            <strong>12:30–16:30</strong>
          </div>
        </header>

        <div className="fincifra-seminar__brands" aria-label="Организатор и партнеры семинара">
          <div className="fincifra-seminar__organizer">
            <span className="fincifra-seminar__label">Организатор</span>
            <img src={assetUrl('assets/figma/review/support-nsfr.svg')} width="30" height="30"
              alt="Логотип НСФР" loading="lazy" />
            <span>Ассоциация «Национальный совет финансового рынка» (НСФР)</span>
          </div>
          <div className="fincifra-seminar__partners">
            <span className="fincifra-seminar__label">При поддержке</span>
            <img src={assetUrl('assets/images/organizer/rvz-logo.svg')} width="306" height="55"
              alt="СМИ «Рынок Взыскания»" loading="lazy" />
            <img src={assetUrl('assets/figma/debtprice-logo.svg')} width="317" height="72"
              alt="ЭТП DEBTPRICE" loading="lazy" />
          </div>
        </div>

        <div className="fincifra-seminar__programme">
          <div className="fincifra-seminar__programme-label">
            <h3>Программа семинара</h3>
            <span>2 направления</span>
          </div>
          <div className="fincifra-seminar__topics">
            {programme.map((topic) => (
              <details className="fincifra-seminar__topic" key={topic.number} open={!compact}>
                <summary>
                  <span className="fincifra-seminar__number">{topic.number}</span>
                  <strong>{topic.title}</strong>
                  <span className="fincifra-seminar__toggle" aria-hidden="true" />
                </summary>
                <ul>
                  {topic.points.map((point) => <li key={point}>{point}</li>)}
                </ul>
              </details>
            ))}
          </div>
        </div>

        <div className="fincifra-seminar__footer">
          <div className="fincifra-seminar__hosts">
            <span className="fincifra-seminar__label">Ведущие</span>
            <div className="fincifra-seminar__host-list">
              {hosts.map((host) => (
                <div className="fincifra-seminar__host" key={host.name}>
                  <span className="fincifra-seminar__portrait">
                    <img
                      src={assetUrl(host.portrait)}
                      alt={host.name}
                      width="400"
                      height="400"
                      loading="eager"
                      decoding="async"
                    />
                  </span>
                  <span className="fincifra-seminar__host-copy">
                    <strong>{host.name}</strong>
                    <small title={host.role}>{host.role}</small>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="fincifra-seminar__offer">
            <div className="fincifra-seminar__price">
              <span>Спецтариф для членов НСФР</span>
              <strong>{tariff?.price || '24 500 ₽'}</strong>
              <small>Деловая часть форума + семинар</small>
            </div>
            <div className="fincifra-seminar__action">
              <button type="button" className="button fincifra-seminar__register"
                onClick={() => onRegister(tariff)}>
                <span className="button-label">Зарегистрироваться</span>
                <ActionArrow />
              </button>
              {tariff?.limitNote && <small>{tariff.limitNote}</small>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
