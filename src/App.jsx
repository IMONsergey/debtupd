import { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, ArrowRight, Play, Info } from 'lucide-react';
import { content } from './content.js';
import { topics, stages, spaces, audience, partnerNames } from './data.js';
import speakers from './speakers.json';
import artDimensions from './art-dimensions.json';
import { OtherConferencesSection } from './components/OtherConferences.jsx';
import { ActionArrow } from './components/ActionArrow.jsx';
import { ProductionMenu } from './components/ProductionMenu.jsx';
import { ApplicationModal, CorporateForm } from './components/Forms.jsx';
import { MediaModal } from './components/MediaModal.jsx';
import { assetUrl } from './lib/assets.js';
import { initAnalytics, goal } from './lib/forms.js';
const art = (n) => assetUrl('assets/figma/' + n.replace(/\.png$/, '.webp'));
function Picture({ name, alt = '', className = '', eager = false, ...props }) {
  return (
    <img
      src={art(name)}
      alt={alt}
      className={'figma-art ' + className}
      width={artDimensions[name]?.[0]}
      height={artDimensions[name]?.[1]}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      {...props}
    />
  );
}
function SectionTitle({ children, className = '', ...props }) {
  return (
    <h2 className={'section-title ' + className} {...props}>
      {children}
    </h2>
  );
}
function ArrowButton({ children, onClick, href, className = '', ...props }) {
  const Tag = href ? 'a' : 'button';
  return (
    <Tag className={'button ' + className} href={href} onClick={onClick} {...props}>
      <span>{children}</span>
      <ActionArrow />
    </Tag>
  );
}
function Channels() {
  return (
    <div className="channels">
      {content.forms.channels.map((c) => (
        <a href={c.href} key={c.id} target="_blank" rel="noreferrer" aria-label={c.label}>
          <img
            src={assetUrl('assets/icons/' + c.id + '-contact.svg')}
            width="39"
            height="39"
            alt=""
          />
        </a>
      ))}
    </div>
  );
}
function InfoBlock({ onVideo, onStand, sidebar = false }) {
  return (
    <div className={'info-block ' + (sidebar ? 'info-block--sidebar' : '')}>
      <div className="video-block">
        <button className="video-caption" onClick={onVideo}>
          Как это было в 2025
        </button>
        <button
          className="video-poster"
          onClick={onVideo}
          aria-label="Смотреть видео DEBT TECH 2025"
        >
          <Picture name="video-poster.png" />
          <span className="video-play">
            <Play size={21} fill="currentColor" />
          </span>
          <span className="video-cta">Смотреть видео ↗</span>
        </button>
      </div>
      <div className="info-meta">
        <div className="info-contact">
          <span className="meta-label">Контакты для связи</span>
          <a href="mailto:redchief@rvzrus.ru">
            redchief@rvzrus.ru <ArrowUpRight size={18} />
          </a>
        </div>
        <div className="info-organizers">
          <span className="meta-label">Организаторы</span>
          <img
            src={assetUrl('assets/icons/organizers.svg')}
            alt="Рынок взыскания и DEBTPRICE"
            width="230"
            height="30"
          />
        </div>
        {sidebar && <ArrowButton href="#tariffs">Ранняя регистрация</ArrowButton>}
        <ArrowButton className="secondary" onClick={onStand}>
          Забронировать стенд
        </ArrowButton>
      </div>
    </div>
  );
}
function Countdown() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.floor((Date.parse(content.hero.countdownTarget) - now) / 1000));
  const vals = [
    Math.floor(seconds / 86400),
    Math.floor(seconds / 3600) % 24,
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ];
  return (
    <div className="countdown" aria-label="Время до запуска">
      <span className="countdown-caption">
        <i />
        Время до запуска
      </span>
      <div className="countdown-grid">
        {vals.map((v, i) => (
          <div className="countdown-cell corners" key={i}>
            <span>{String(v).padStart(2, '0')}</span>
            <small>{['дней', 'часов', 'минут', 'секунд'][i]}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
function Hero() {
  return (
    <header className="hero" id="top">
      <div className="hero-visual" aria-hidden="true">
        <picture>
          <source media="(max-width:599px)" srcSet={art('hero-background-phone.webp')} />
          <source media="(max-width:1180px)" srcSet={art('hero-background-tablet.webp')} />
          <Picture className="hero-scene" name="hero-background-original.webp" eager />
        </picture>
        <div className="hero-rays" />
        <Picture className="hero-wordmark" name="hero-wordmark.png" eager />
      </div>
      <div className="mobile-brand">
        <img src={assetUrl('assets/debttech-logo.svg')} alt="DEBT TECH 2026" />
      </div>
      <h1 className="sr-only">
        DEBT TECH 2026 — форум-выставка технологий на рынке долговых активов
      </h1>
      <div className="hero-date">
        <time dateTime="2026-11-13">13.11.2026</time>
        <span>Москва</span>
      </div>
      <div className="hero-content main-grid">
        <div className="hero-lead">
          <p>
            Стратегии, технологии и инновационные сервисы для работы с долговыми обязательствами
          </p>
          <ArrowButton href="#tariffs" className="hero-register">
            Ранняя регистрация
          </ArrowButton>
        </div>
        <div className="hero-supporters">
          <Picture
            name="supporters.svg"
            alt="При поддержке Саморегулируемой организации МИР, НАПКА и НСФР"
            eager
          />
        </div>
        <Countdown />
      </div>
    </header>
  );
}
function Ticker({ items, className = '' }) {
  return (
    <div className={'ticker ' + className}>
      <div className="ticker-track">
        {[0, 1].map((copy) => (
          <div className="ticker-copy" key={copy} aria-hidden={copy === 1}>
            {items.map((s, i) => (
              <span key={i}>
                <b>[ {s} ]</b>
                <i>//</i>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
function About() {
  return (
    <section className="section about" id="about-forum">
      <Picture className="about-satellite decor" name="about-satellite.png" />
      <SectionTitle>О форуме</SectionTitle>
      <div className="about-grid">
        <div className="about-copy glass">
          <div className="about-lead">
            <Picture className="about-mark" name="about-mark.svg" width="103" height="68" />
            <h3>
              DEBT TECH 2026 — ежегодная форум-выставка о технологиях на рынке долговых активов
            </h3>
          </div>
          <ol className="about-benefits">
            {content.aboutForum.features.map((text, i) => (
              <li key={text}>
                <span>// {String(i + 1).padStart(2, '0')} //</span>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="about-photo corners">
          <Picture name="about-photo.png" alt="Обсуждение технологий взыскания на форуме" />
        </div>
      </div>
      <Ticker className="technology-ticker" items={content.aboutForum.tags.map((t) => t.label)} />
      <div className="stats-grid">
        {content.aboutForum.stats.map((stat) => (
          <div className="stat glass corners" key={stat.value}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
function Participants() {
  const [mode, setMode] = useState(0);
  const change = (v) => {
    setMode(v);
    goal('participants_tab', { mode: v === 0 ? 'stages' : 'spaces' });
  };
  return (
    <section className="section participants" id="participants">
      <div className="participants-heading">
        <SectionTitle>
          Что ждёт
          <br />
          участников
        </SectionTitle>
        <div className="flight-banner">
          <span>
            До встречи
            <br />
            13 ноября в Москве
          </span>
          <img src={assetUrl('assets/menu-spaceship.png')} alt="" />
          <img src={assetUrl('assets/debttech-logo.svg')} alt="DEBT TECH 2026" />
        </div>
      </div>
      <div className="participants-layout">
        <div className="participants-select">
          <div role="tablist" aria-label="Что ждёт участников" className="participant-tabs">
            {['Сцены с деловой программой', 'Пространств для нетворкинга и отдыха'].map(
              (label, i) => (
                <button
                  role="tab"
                  aria-selected={mode === i}
                  id={'tab-' + i}
                  aria-controls={'panel-' + i}
                  tabIndex={mode === i ? 0 : -1}
                  className={'participant-tab glass ' + (mode === i ? 'active' : '')}
                  onClick={() => change(i)}
                  onKeyDown={(e) => {
                    if (
                      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(
                        e.key,
                      )
                    ) {
                      e.preventDefault();
                      const next = e.key === 'Home' ? 0 : e.key === 'End' ? 1 : 1 - mode;
                      change(next);
                      document.getElementById('tab-' + next)?.focus();
                    }
                  }}
                  key={label}
                >
                  <strong>{i === 0 ? '3' : '8+'}</strong>
                  <span>{label}</span>
                  <i aria-hidden="true" />
                </button>
              ),
            )}
          </div>
          <div className="participant-controls">
            <span>{mode + 1} / 2</span>
            <button
              className="circle-button"
              aria-label="Следующий режим участников"
              onClick={() => change(1 - mode)}
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
        <div className="participant-panels">
          {[stages, spaces].map((list, i) => (
            <div
              className={'participant-panel ' + (mode === i ? 'active' : '')}
              role="tabpanel"
              id={'panel-' + i}
              aria-labelledby={'tab-' + i}
              aria-hidden={mode !== i}
              inert={mode !== i ? true : undefined}
              key={i}
            >
              {list.map((card, index) => (
                <article className="participant-card glass" key={card.title}>
                  <div className="participant-copy">
                    <div className="participant-kicker">
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      {card.audience && <small>[ {card.audience} ]</small>}
                    </div>
                    <h3>{card.title}</h3>
                    {card.text?.map((text) => (
                      <p key={text}>{text}</p>
                    ))}
                    {card.items && (
                      <ul>
                        {card.items.map((item) => (
                          <li key={item}>
                            {item}
                            <span className="brand-slash" aria-hidden="true">
                              //
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="participant-photo corners">
                    <Picture name={card.image} alt={card.title} />
                  </div>
                </article>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
function Services({ onRegister }) {
  const benefits = [
    'Отдельный зал с бронированием тайм-слотов',
    'Экран для проведения презентаций',
    'Бар и индивидуальное обслуживание',
    'Помощь в подготовке встреч',
  ];
  return (
    <section className="section services" id="services">
      <Picture name="services-satellite.png" className="services-satellite decor" />
      <div className="section-glow services-glow" aria-hidden="true" />
      <SectionTitle>
        Услуги для
        <br />
        участников форума
      </SectionTitle>
      <div className="service-grid">
        <div className="service-photo corners">
          <Picture name="service-1.png" alt="Деловая встреча участников форума" />
        </div>
        <article className="service-copy glass">
          <h3>
            Зона переговоров
            <br />и сделок
          </h3>
          <p>Организуем деловые встречи на площадке форума</p>
          <Bullets items={benefits} />
          <ArrowButton onClick={onRegister}>Зарегистрироваться</ArrowButton>
        </article>
        <article className="service-copy glass">
          <h3>Сервис деловых знакомств</h3>
          <p>Помогаем найти контакты и договориться о встрече</p>
          <Bullets items={benefits} />
          <h4>[ Как воспользоваться ]</h4>
          <ol className="numbered-list">
            {[
              'Сообщите менеджеру, с кем хотите встретиться',
              'Укажите тему и цель общения',
              'Выберите удобное время (10–15 минут)',
            ].map((text, i) => (
              <li key={text}>
                <span>0{i + 1} /</span>
                {text}
              </li>
            ))}
          </ol>
        </article>
        <div className="service-photo corners">
          <Picture name="service-2.png" alt="Знакомства и общение на DEBT TECH" />
        </div>
        <div className="service-photo corners">
          <Picture name="service-3.png" alt="Интервью в пресс-студии Рынка взыскания" />
        </div>
        <article className="service-copy glass">
          <h3>
            Пресс-студия
            <br />
            «Рынка взыскания»
          </h3>
          <p>Проводим видеоинтервью с гостями</p>
          <Bullets
            items={[
              'Профессиональное оборудование для видеосъёмки',
              'Согласование вопросов и консалтинг',
              'Публикация на сайте и во всех каналах «Рынка Взыскания»',
            ]}
          />
          <ArrowButton href="mailto:redchief@rvzrus.ru" className="secondary interview">
            Записаться на интервью: <em>redchief@rvzrus.ru</em>
          </ArrowButton>
        </article>
      </div>
    </section>
  );
}
function Bullets({ items }) {
  return (
    <ul className="slash-list">
      {items.map((text) => (
        <li key={text}>{text}</li>
      ))}
    </ul>
  );
}
function Topics() {
  return (
    <section className="section topics" id="topics">
      <SectionTitle>Ключевые темы</SectionTitle>
      <div className="topics-grid">
        {topics.map(([title, items], i) => (
          <article className="topic-card glass corners" key={title}>
            <span className="topic-number">0{i + 1}</span>
            <h3>{title}</h3>
            <Bullets items={items} />
          </article>
        ))}
      </div>
    </section>
  );
}
function Speakers() {
  return (
    <section className="section speakers" id="speakers">
      <Picture name="speakers-rocket.png" className="speakers-rocket decor" />
      <SectionTitle>
        Спикеры
        <br />
        форума
        <br />
        DEBT TECH 2026
      </SectionTitle>
      <div className="speakers-grid">
        {speakers.map((s) => (
          <article className="speaker" key={s.name}>
            <div className="speaker-portrait">
              <Picture name={s.image} alt={s.name} />
            </div>
            <div className="speaker-info">
              <h3>
                {s.name.split(' ').map((part, i) => (
                  <span key={i}>{part}</span>
                ))}
              </h3>
              <p>{s.role.replaceAll('\u2028', '\n')}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="speakers-note">
        Финальный состав спикеров согласовывается
        <Picture name="tariff-astronaut.png" />
      </div>
    </section>
  );
}
function Audience() {
  let n = 0;
  return (
    <section className="section audience" id="audience">
      <Picture name="audience-art.png" className="audience-art decor" />
      <SectionTitle>Об участниках</SectionTitle>
      <div className="audience-grid">
        {audience.map((item, i) =>
          item ? (
            <div className="audience-card corners" key={i}>
              <span>[N{String(++n).padStart(2, '0')}]</span>
              <h3>{item}</h3>
            </div>
          ) : (
            <div className="empty-cell" aria-hidden="true" key={i} />
          ),
        )}
      </div>
    </section>
  );
}
function Organizer() {
  const o = content.organizer;
  return (
    <section className="section organizer" id="organizer">
      <div className="organizer-heading">
        <SectionTitle>
          Организатор
          <br />
          форума
        </SectionTitle>
        <div>
          <span className="eyebrow">[ Контакты для связи ]</span>
          <div className="organizer-links">
            <a href={o.contacts.phoneHref}>{o.contacts.phone}</a>
            <a href={'mailto:' + o.contacts.email}>{o.contacts.email}</a>
            <a href={o.contacts.websiteHref} target="_blank" rel="noreferrer">
              Сайт ↗
            </a>
          </div>
          <Channels />
        </div>
      </div>
      <div className="organizer-grid">
        <a
          href={o.media.href}
          className="organizer-card organizer-brand"
          target="_blank"
          rel="noreferrer"
        >
          <img src={o.media.logo} alt="Рынок взыскания" />
          <h3>
            СМИ
            <br />
            «Рынок взыскания»
          </h3>
          <p>{o.media.license}</p>
          <span className="circle-button">
            <ArrowUpRight size={18} />
          </span>
        </a>
        <div className="organizer-card organizer-photo">
          <img src={o.photo.image} alt={o.photo.alt} loading="lazy" />
        </div>
        <a
          className="organizer-card organizer-rating"
          href={o.rating.href}
          target="_blank"
          rel="noreferrer"
        >
          <h3>Рейтинг ПКО-300</h3>
          <p>{o.rating.description}</p>
          <span className="rating-number" aria-hidden="true">
            300
          </span>
          <span className="circle-button">
            <ArrowUpRight size={18} />
          </span>
        </a>
        <div className="organizer-card organizer-metrics">
          <p>
            Единственное отраслевое медиа
            <br />о профессиональном взыскании
          </p>
          {o.metrics.items.map((m) => (
            <div key={m.value}>
              <strong>{m.value}</strong>
              <span>{m.label}</span>
            </div>
          ))}
        </div>
        <div className="organizer-card organizer-features">
          <ol>
            {o.features.map((text, i) => (
              <li key={text}>
                <span>X0{i + 1}</span>
                {text}
              </li>
            ))}
          </ol>
        </div>
        <a
          className="organizer-card organizer-navigator"
          href={o.navigator.href}
          target="_blank"
          rel="noreferrer"
        >
          <img className="navigator-bg" src={o.navigator.image} alt="" loading="lazy" />
          <img className="navigator-logo" src={o.navigator.logo} alt="DEBT TECH Навигатор" />
          <p>{o.navigator.description}</p>
          <span className="circle-button">
            <ArrowUpRight size={18} />
          </span>
        </a>
      </div>
    </section>
  );
}
function Tariffs({ onApply }) {
  return (
    <section className="section tariffs" id="tariffs">
      <div className="tariffs-heading">
        <h2>
          <span>MULTIPASS</span>
          <Picture name="welcome-outline.svg" alt="WELCOME" />
        </h2>
        <Picture className="tariff-planet decor" name="tariff-planet.png" />
        <Picture className="tariff-astronaut decor" name="tariff-astronaut.png" />
      </div>
      <div className="tariff-grid">
        {content.tariffs.items.map((t) => (
          <article className={'tariff tariff--' + t.id + ' corners'} key={t.id}>
            <h3>{t.title}</h3>
            <ul>
              {t.features.map((f) => (
                <li key={f.label} className={f.active ? 'included' : 'not-included'}>
                  <img src={t.icon} width="13" height="13" alt="" />
                  <span>
                    {f.label}
                    <span className="sr-only">
                      {f.active ? ' — входит в тариф' : ' — не входит в тариф'}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="tariff-bottom">
              <span>Стоимость</span>
              <strong>{t.price}</strong>
              <ArrowButton className="secondary" onClick={() => onApply(t)}>
                Принять участие
              </ArrowButton>
            </div>
          </article>
        ))}
      </div>
      <p className="tariff-note">
        <b>*</b>
        <span>
          Стоимость указана по тарифу ранней регистрации и действует <strong>до 1 октября.</strong>
        </span>
      </p>
    </section>
  );
}
function Corporate() {
  return (
    <section className="section corporate glass corners" id="corporate-packages">
      <div className="corporate-offer">
        <SectionTitle>
          Корпоративные
          <br />
          пакеты*
        </SectionTitle>
        <p className="muted">*Скидки не суммируются</p>
        <div className="discounts">
          {[10, 20].map((n) => (
            <div className="discount" key={n}>
              <span>Скидка</span>
              <img
                src={assetUrl(`assets/images/corporate-packages/discount-${n}.svg`)}
                alt={n + '%'}
                width={n === 10 ? 180 : 196}
                height="97"
              />
              <p>
                {n === 10
                  ? 'На третьего и четвёртого участника'
                  : 'На пятого и последующих участников'}
              </p>
            </div>
          ))}
        </div>
      </div>
      <CorporateForm />
    </section>
  );
}
function Sponsor() {
  return (
    <section className="section sponsor" id="partners">
      <SectionTitle>
        Партнёры
        <br />
        конференции
      </SectionTitle>
      <div className="sponsor-panel glass corners">
        <div className="sponsor-brand">
          <Picture name="sponsor-planet.png" className="sponsor-planet" />
          <h3>DEBTPRICE</h3>
          <a
            href="https://debtprice.ru/"
            target="_blank"
            rel="noreferrer"
            className="debtprice-logo"
            aria-label="DEBTPRICE — сайт аукциона"
          >
            <Picture name="debtprice-logo.svg" alt="" />
          </a>
          <h4>
            Титульный спонсор
            <br />и соорганизатор
            <br />
            DEBT TECH 2026
          </h4>
        </div>
        <div className="sponsor-copy">
          <p>
            DEBTPRICE — одна из лидирующих и наиболее технологически развитых электронных торговых
            площадок РФ, специализирующаяся на проведении торгов на уступку прав требования.
          </p>
          <p>
            DEBTPRICE — аукцион залоговых и беззалоговых кредитных, факторинговых портфелей,
            дебиторской задолженности, прав требования по гражданско-правовым договорам и возмещения
            имущественного вреда.
          </p>
          <p>
            DEBTPRICE — это крупнейшие и системно значимые банки РФ, МФО, управляющие компании, ПКО,
            арбитражные управляющие, КПК, факторинговые компании, юридические, краудшерринговые и
            многие другие компании, объединённые на единой площадке.
          </p>
          <p>
            DEBTPRICE — резидент и участник Фонда «Сколково», партнёр и соорганизатор Конференции
            DOLG TALK 2026.
          </p>
        </div>
      </div>
    </section>
  );
}
function Partners() {
  const positions = [1, 3, 4, 5, 6, 8, 9, 10];
  return (
    <section className="section partners" id="information-partners">
      <div className="section-glow partners-glow" aria-hidden="true" />
      <Picture name="partners-satellite.png" className="partners-satellite decor" />
      <SectionTitle>
        Информационные
        <br />
        партнёры
      </SectionTitle>
      <div className="partners-grid">
        {partnerNames.map((name, i) => (
          <div className="partner-card glass corners" style={{ '--cell': positions[i] }} key={name}>
            <Picture name={'partner-' + (i + 1) + '.png'} alt={name} />
          </div>
        ))}
      </div>
    </section>
  );
}
function Contacts() {
  const c = content.contacts;
  return (
    <section className="section contacts" id="contacts">
      <div className="contact-heading">
        <SectionTitle>
          Контактная
          <br />
          информация
        </SectionTitle>
        <a className="press-contact" href={'mailto:' + c.accreditationEmail}>
          Аккредитация СМИ:
          <br />
          {c.accreditationEmail}
          <Info size={32} />
        </a>
      </div>
      <div className="contact-grid">
        <div>
          <h3>{c.tickets.title}</h3>
          <span>E-mail</span>
          <a href={'mailto:' + c.tickets.email}>{c.tickets.email}</a>
          <span>Тел.</span>
          <a href={c.tickets.phoneHref}>{c.tickets.phone}</a>
          <span>Связаться с нами</span>
          <Channels />
        </div>
        <div>
          <h3>{c.partnership.title}</h3>
          <span>E-mail</span>
          <a href={'mailto:' + c.partnership.email}>{c.partnership.email}</a>
          <span>Тел.</span>
          <a href={c.partnership.phoneHref}>{c.partnership.phone}</a>
        </div>
        <div>
          <h3>Другие ресурсы:</h3>
          <span>Сайт</span>
          <a href={c.website} target="_blank" rel="noreferrer">
            rvzrus.ru
          </a>
          <span>Телеграм</span>
          <a href="https://t.me/rvzrus_chat" target="_blank" rel="noreferrer">
            @rvzrus_chat
          </a>
        </div>
      </div>
      <div className="contact-bottom">
        <div className="legal">
          <Picture name="legal-logo.png" alt="DEBTPRICE / Рынок взыскания" />
          <p>© 2026. Все права защищены.</p>
          <a href={content.footer.privacyHref} target="_blank" rel="noreferrer">
            Политика конфиденциальности
            <br />и персональных данных
          </a>
        </div>
        <a
          className="venue-map"
          id="venue"
          href={content.venue.routeHref}
          target="_blank"
          rel="noreferrer"
        >
          <Picture name="venue-map.png" alt="Место проведения DEBT TECH 2026 на карте" />
          <span>
            <strong>{content.venue.name}</strong>
            {content.venue.address}
            <ArrowUpRight size={20} />
          </span>
        </a>
      </div>
    </section>
  );
}
function useMotion() {
  useEffect(() => {
    initAnalytics();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    if (reduced.matches) return;
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        }),
      { rootMargin: '0px 0px 100px 0px', threshold: 0.03 },
    );
    document.querySelectorAll('.section').forEach((n) => {
      if (n.getBoundingClientRect().top > innerHeight) {
        n.classList.add('reveal');
        observer.observe(n);
      }
    });
    return () => observer.disconnect();
  }, []);
}
export default function App() {
  const [form, setForm] = useState(null),
    [media, setMedia] = useState(null);
  const closeForm = useCallback(() => setForm(null), []),
    closeMedia = useCallback(() => setMedia(null), []);
  const openForm = (kind = 'early-registration', tariff = null) => {
    setForm({ kind, tariff });
    goal('form_open', { form: kind, tariff: tariff?.id || '' });
  };
  const openMedia = (kind) => {
    setMedia(kind);
    goal(kind === 'video' ? 'video_open' : 'gallery_open');
  };
  useMotion();
  return (
    <>
      <div id="page-content" className="hero-only-view">
        <a className="skip-link" href="#about-forum">
          Перейти к содержимому
        </a>
        <div className="cosmos" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <ProductionMenu
          onVideo={() => openMedia('video')}
          onGallery={() => openMedia('gallery')}
          onStand={() => openForm('stand-booking')}
        />
        <Hero />
        <main className="main-grid">
          <div className="mobile-info">
            <InfoBlock
              onVideo={() => openMedia('video')}
              onStand={() => openForm('stand-booking')}
            />
          </div>
          <Ticker items={content.ticker.items} />
          <About />
          <Participants />
          <Services onRegister={() => openForm()} />
          <Topics />
          <Speakers />
          <Audience />
          <Organizer />
          <Tariffs onApply={(t) => openForm('early-registration', t)} />
          <Corporate />
          <OtherConferencesSection archive={content.otherConferences} />
          <Sponsor />
          <Partners />
          <Contacts />
        </main>
        <footer className="footer-scene" aria-label="DEBT TECH 2026">
          <Picture name="footer-scene.png" />
          <a href="#top" className="footer-top" aria-label="Вернуться в начало страницы" />
        </footer>
      </div>
      {form && <ApplicationModal {...form} onClose={closeForm} />}{' '}
      {media && <MediaModal kind={media} onClose={closeMedia} />}
    </>
  );
}
