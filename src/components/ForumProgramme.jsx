import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Minus, Plus, UserRound } from 'lucide-react';
import speakers from '../speakers.json';
import { forumProgramme } from '../programme-data.js';
import { assetUrl } from '../lib/assets.js';

const portraits = new Map(
  speakers.map(({ name, image }) => [
    name,
    image ? assetUrl('assets/figma/' + image.replace(/\.png$/, '.webp')) : null,
  ]),
);

// The five first-session portraits come directly from the supplied Figma node.
// Their blue-background crops are intentionally scoped to the programme.
const figmaPortraits = {
  'Евгений Новиков': 'evgeniy-novikov.webp',
  'Андрей Емелин': 'andrey-emelin.webp',
  'Владимир Вербицкий': 'vladimir-verbitskiy.webp',
  'Константин Виноградов': 'konstantin-vinogradov.webp',
  'Валерий Зоткин': 'valeriy-zotkin.webp',
  'Константин Ипатьев': 'ipatyev.webp',
  'Антон Юдаев': 'yudaev.webp',
};

function ProgrammePortrait({ person }) {
  const [failed, setFailed] = useState(false);
  const source =
    person.photo ||
    (figmaPortraits[person.name]
      ? assetUrl('assets/images/programme/' + figmaPortraits[person.name])
      : portraits.get(person.name));
  useEffect(() => setFailed(false), [source]);
  return (
    <span className="forum-programme__portrait" aria-hidden="true">
      {source && !failed ? (
        <img loading="lazy" decoding="async" alt="" src={source} onError={() => setFailed(true)} />
      ) : (
        <UserRound size={24} strokeWidth={1.2} />
      )}
    </span>
  );
}

function ProgrammePerson({ person, moderator = false }) {
  return (
    <div
      className={
        'forum-programme__person' + (moderator ? ' forum-programme__person--moderator' : '')
      }
    >
      <ProgrammePortrait person={person} />
      <div className="forum-programme__person-copy">
        {moderator && <span className="forum-programme__person-label">Модератор</span>}
        <span className="forum-programme__person-name">{person.name}</span>
        <span className="forum-programme__person-role">{person.role}</span>
      </div>
    </div>
  );
}

function ProgrammeSharedEvent({ entry }) {
  return (
    <div className="forum-programme__event" data-event-id={entry.id}>
      <time className="forum-programme__event-time">{entry.time}</time>
      <span className="forum-programme__event-name">{entry.title}</span>
    </div>
  );
}

function ProgrammeTalk({ talk }) {
  return (
    <div className="forum-programme__talk" data-talk-id={talk.id}>
      <div className="forum-programme__talk-content">
        {talk.title ? (
          <h4>{talk.title}</h4>
        ) : (
          <p className="forum-programme__talk-unconfirmed">
            {talk.note || 'Тема в документе не указана'}
          </p>
        )}
        {talk.note && talk.title && <p className="forum-programme__talk-note">{talk.note}</p>}
      </div>
      <div className="forum-programme__talk-people">
        {talk.speakers.map((person) => (
          <ProgrammePerson key={person.name} person={person} />
        ))}
      </div>
    </div>
  );
}

function ProgrammeSession({ session, expanded, onToggle }) {
  const contentId = 'programme-panel-' + session.id;
  return (
    <article
      className={'forum-programme__session' + (expanded ? ' forum-programme__session--open' : '')}
      data-session-id={session.id}
    >
      {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((position) => (
        <span
          className={'forum-programme__corner forum-programme__corner--' + position}
          aria-hidden="true"
          key={position}
        />
      ))}
      <button
        className="forum-programme__session-toggle"
        type="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        aria-label={
          (expanded ? 'Свернуть' : 'Подробнее о') +
          ' сессии ' +
          session.number +
          ': ' +
          session.title
        }
        onClick={onToggle}
      >
        <div className="forum-programme__session-heading">
          <span className="forum-programme__session-time">
            {session.time}
            <span aria-hidden="true"> /// </span>
            Сессия {session.number}
          </span>
          <h3>{session.title}</h3>
          <p className="forum-programme__session-kind">{session.category}</p>
        </div>
        <div className="forum-programme__session-moderator">
          {session.moderator ? (
            <ProgrammePerson person={session.moderator} moderator />
          ) : (
            <div className="forum-programme__moderator-unconfirmed">
              <span className="forum-programme__portrait" aria-hidden="true">
                <UserRound size={24} strokeWidth={1.1} />
              </span>
              <div>
                <span className="forum-programme__person-label">Модератор</span>
                <span className="forum-programme__person-role">В документе не указан</span>
              </div>
            </div>
          )}
        </div>
        <span className="forum-programme__toggle-icon" aria-hidden="true">
          {expanded ? <Minus size={22} /> : <Plus size={22} />}
          <small>{expanded ? 'Скрыть' : 'Подробнее'}</small>
        </span>
      </button>
      <div
        className="forum-programme__session-body"
        id={contentId}
        aria-hidden={!expanded}
        inert={!expanded}
      >
        <div className="forum-programme__session-body-inner">
          {session.talks
            .filter((talk) => talk.visible !== false)
            .map((talk) => (
              <ProgrammeTalk talk={talk} key={talk.id} />
            ))}
          {session.additionalNote && (
            <p className="forum-programme__invited">
              <span className="forum-programme__invited-dot" aria-hidden="true" />
              {session.additionalNote}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function ProgrammeStageTabs({ selected, onSelect, tabs }) {
  const tabRefs = useRef([]);
  function handleKeys(event, index) {
    let next = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
      next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    onSelect(tabs[next].id);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="forum-programme__stages" role="tablist" aria-label="Выбор сцены">
      {tabs.map((stage, index) => {
        const active = selected === stage.id;
        return (
          <button
            key={stage.id}
            id={'programme-tab-' + stage.id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls="programme-stage-content"
            tabIndex={active ? 0 : -1}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            onClick={() => onSelect(stage.id)}
            onKeyDown={(event) => handleKeys(event, index)}
            className={
              'forum-programme__stage' + (active ? ' forum-programme__stage--selected' : '')
            }
          >
            <span className="forum-programme__stage-copy">
              <strong>{stage.title}</strong>
              <small>{stage.description}</small>
            </span>
            <span className="forum-programme__switch" aria-hidden="true">
              <span />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function initialProgramme() {
  return {
    note: forumProgramme.note,
    commonEvents: forumProgramme.timeline.slice(0, 2),
    stages: forumProgramme.stages.map((item) => ({
      ...item,
      visible: true,
      status: item.id === 'main' ? 'published' : 'upcoming',
      entries: item.id === 'main' ? forumProgramme.timeline.slice(2) : [],
    })),
  };
}

export function ForumProgramme() {
  const [programme, setProgramme] = useState(initialProgramme);
  const [stage, setStage] = useState('main');
  const [expanded, setExpanded] = useState('session-1');
  const isPreview = window.location.pathname === '/programme-admin/preview';

  useEffect(() => {
    const controller = new AbortController();
    fetch(isPreview ? '/api/programme/preview' : '/api/programme', {
      credentials: 'same-origin',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error('programme_fetch_' + response.status);
        return response.json();
      })
      .then((payload) => {
        if (payload.programme?.stages?.length) setProgramme(payload.programme);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') console.warn('Programme fallback data are in use.');
      });
    return () => controller.abort();
  }, [isPreview]);

  const stages = programme.stages.filter((item) => item.visible !== false);
  const selectedStage = stages.find((item) => item.id === stage) || stages[0];
  const stageEntries =
    selectedStage?.status === 'published'
      ? selectedStage.entries.filter((entry) => entry.visible !== false)
      : [];
  const generalEvents = programme.commonEvents.filter((entry) => entry.visible !== false);

  return (
    <section
      id="programme"
      className="section forum-programme"
      aria-labelledby="forum-programme-title"
    >
      <header className="forum-programme__header">
        <h2 id="forum-programme-title">Программа форума</h2>
        <p>{programme.note}</p>
      </header>
      <ProgrammeStageTabs
        selected={selectedStage?.id}
        tabs={stages}
        onSelect={(next) => {
          setStage(next);
          setExpanded(null);
        }}
      />

      <div
        key={selectedStage?.id}
        id="programme-stage-content"
        role="tabpanel"
        aria-labelledby={'programme-tab-' + selectedStage?.id}
        className="forum-programme__stage-content"
      >
        <div className="forum-programme__timeline" aria-label="Общие события">
          {generalEvents.map((entry) => (
            <ProgrammeSharedEvent key={entry.id} entry={entry} />
          ))}
        </div>

        {selectedStage?.status === 'published' && stageEntries.length ? (
          <div
            className="forum-programme__sessions"
            aria-label={'Программа: ' + selectedStage.title}
          >
            {stageEntries.map((entry) =>
              entry.kind === 'event' ? (
                <ProgrammeSharedEvent key={entry.id} entry={entry} />
              ) : (
                <ProgrammeSession
                  key={entry.id}
                  session={entry}
                  expanded={entry.id === expanded}
                  onToggle={() => setExpanded((old) => (old === entry.id ? null : entry.id))}
                />
              ),
            )}
          </div>
        ) : (
          <div className="forum-programme__pending">
            <div className="forum-programme__pending-number" aria-hidden="true">
              {String(stages.findIndex((item) => item.id === selectedStage?.id) + 1).padStart(
                2,
                '0',
              )}
            </div>
            <div>
              <span className="forum-programme__pending-kicker">{selectedStage?.title}</span>
              <h3>Программа уточняется</h3>
              <p>
                Темы и состав участников пока не представлены. Подробная программа появится после
                подтверждения.
              </p>
              {stages.some((item) => item.status === 'published' && item.entries.length > 0) && (
                <button
                  className="forum-programme__return"
                  type="button"
                  onClick={() => {
                    const first = stages.find(
                      (item) => item.status === 'published' && item.entries.length,
                    );
                    setStage(first.id);
                    setExpanded(
                      first.entries.find((entry) => entry.kind === 'session')?.id || null,
                    );
                  }}
                >
                  {stages.some((item) => item.id === 'main' && item.status === 'published')
                    ? 'Посмотреть большую сцену'
                    : 'Посмотреть опубликованную сцену'}{' '}
                  <ArrowRight size={17} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
