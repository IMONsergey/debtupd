const app = document.getElementById('app');
const API = '/api/programme';
const state = {
  csrf: '',
  programme: null,
  revision: 0,
  published: null,
  history: [],
  portraits: [],
  stage: 'main',
  view: 'stage',
  selection: { type: 'stage', id: 'main' },
  expandedTalk: null,
  editModerator: false,
  query: '',
  dirty: false,
  busy: false,
  editVersion: 0,
  publishedProgramme: null,
  peopleCatalog: [],
  saveError: '',
  mobileView: 'agenda',
};
let toastHandle;
let autosaveTimer;

function clearAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = null;
}
function hasUnpublishedChanges() {
  return !!state.publishedProgramme &&
    JSON.stringify(state.programme) !== JSON.stringify(state.publishedProgramme);
}
function scheduleAutosave(delay = 2200) {
  clearAutosave();
  if (!state.dirty || !state.programme) return;
  autosaveTimer = setTimeout(() => {
    if (!state.busy && state.dirty) save({ silent: true }).catch(() => {});
    else if (state.busy && state.dirty) scheduleAutosave(650);
  }, delay);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  );
}
const e = escapeHtml;
const makeId = (prefix) => {
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  return prefix + '-' + [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
};
const findStage = () => state.programme.stages.find((stage) => stage.id === state.stage) || state.programme.stages[0];
const stageEntries = () => state.view === 'shared' ? state.programme.commonEvents : findStage().entries;
const button = (caption, action, cls = 'subtle', extra = '') =>
  '<button type="button" class="btn ' + cls + '" data-action="' + e(action) + '" ' + extra + '>' + e(caption) + '</button>';
const orderButton = (caption, action, title, disabled = false) =>
  button(caption, action, 'order-btn', 'aria-label="' + e(title) + '" title="' + e(title) + '"' + (disabled ? ' disabled' : ''));
function notice(message, error = false) {
  document.querySelector('.toast')?.remove();
  const node = document.createElement('div');
  node.className = 'toast' + (error ? ' bad' : '');
  node.textContent = message;
  node.setAttribute('role', 'status');
  document.body.append(node);
  clearTimeout(toastHandle);
  toastHandle = setTimeout(() => node.remove(), 5500);
}
async function request(path, method = 'GET', payload, contentType = 'application/json') {
  const headers = {};
  if (method !== 'GET') {
    headers['X-Programme-Csrf'] = state.csrf;
    headers['Content-Type'] = contentType;
  }
  const response = await fetch(API + path, {
    method, headers, credentials: 'same-origin', cache: 'no-store',
    body: payload === undefined ? undefined : contentType === 'application/json' ? JSON.stringify(payload) : payload,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw Error(json.error || 'Сервис недоступен (' + response.status + ').');
  return json;
}
function markDirty() {
  state.editVersion += 1;
  state.dirty = true;
  state.saveError = '';
  refreshStatus();
  scheduleAutosave();
}
function refreshStatus() {
  const status = document.getElementById('save-state');
  const text = state.busy ? 'Сохраняем…' :
    state.saveError ? 'Не сохранено: ' + state.saveError :
    state.dirty ? 'Правки сохраняются автоматически' :
    hasUnpublishedChanges() ? 'Черновик сохранён · ещё не на сайте' :
    'Все изменения опубликованы';
  if (status) {
    status.textContent = text;
    status.title = text;
  }
  const dot = document.querySelector('.save-indicator');
  if (dot) {
    dot.classList.toggle('is-dirty', state.dirty || !!state.saveError);
    dot.classList.toggle('is-unpublished', !state.dirty && hasUnpublishedChanges());
  }
  const save = document.getElementById('save-draft');
  if (save) save.disabled = !state.dirty || state.busy;
  for (const id of ['preview-programme', 'logout-programme']) {
    const control = document.getElementById(id);
    if (control) control.disabled = state.busy;
  }
  const publish = document.getElementById('publish-programme');
  if (publish) {
    publish.disabled = state.busy || !(state.dirty || hasUnpublishedChanges());
    publish.title = state.dirty || hasUnpublishedChanges()
      ? 'Опубликовать сохранённый черновик на тестовом сайте'
      : 'На сайте уже актуальная версия';
  }
}
function resetSelection() {
  if (state.view === 'shared') {
    const first = state.programme.commonEvents[0];
    state.selection = first ? { type: 'common', id: first.id } : { type: 'shared', id: 'shared' };
    return;
  }
  const entries = findStage().entries;
  const first = entries.find((item) => item.kind === 'session') || entries[0];
  state.selection = first ? { type: 'entry', id: first.id } : { type: 'stage', id: state.stage };
}
function selectionExists() {
  const { type, id } = state.selection;
  if (['history', 'settings'].includes(type)) return true;
  if (type === 'shared') return state.view === 'shared';
  if (type === 'stage') return !!state.programme.stages.find((item) => item.id === id);
  if (type === 'common') return state.view === 'shared' && state.programme.commonEvents.some((item) => item.id === id);
  if (type === 'entry') return state.view === 'stage' && findStage().entries.some((item) => item.id === id);
  return false;
}
async function loadState() {
  clearAutosave();
  const firstLoad = !state.programme;
  const [data, live, catalog] = await Promise.all([
    request('/admin'), request(''), request('/people'),
  ]);
  state.programme = structuredClone(data.draft.programme);
  state.peopleCatalog = Array.isArray(catalog.people) ? catalog.people : [];
  state.publishedProgramme = structuredClone(live.programme);
  state.revision = data.draft.revision;
  state.published = data.published;
  state.history = data.history;
  state.portraits = data.portraits;
  state.dirty = false;
  state.saveError = '';
  state.editVersion += 1;
  if (!state.programme.stages.some((item) => item.id === state.stage)) state.stage = state.programme.stages[0].id;
  if (firstLoad || !selectionExists()) resetSelection();
  render({ resetEditor: true });
}
function loginPage(error = '') {
  app.innerHTML = '<div class="login-layout">' +
    '<section class="login-brand"><p class="brand-mark">DEBT <strong>TECH</strong></p>' +
    '<div><span class="login-eyebrow">DEBT TECH 2026 / ПЕСОЧНИЦА</span>' +
    '<h1>Программа под контролем.</h1>' +
    '<p>Сцены, события и участники в одном понятном редакторе.</p></div>' +
    '<span class="login-foot">Редактор доступен только по прямой ссылке.</span></section>' +
    '<section class="login-panel"><div class="login-card"><span class="login-eyebrow">ПАНЕЛЬ УПРАВЛЕНИЯ</span>' +
    '<h2>Войти в редактор</h2><p>Введите пароль, чтобы изменить расписание форума.</p>' +
    '<form id="login-form"><label class="field"><span class="field-label">Пароль</span>' +
    '<input name="password" type="password" autocomplete="current-password" placeholder="Пароль администратора" required>' +
    '</label><p class="error" role="alert">' + e(error) + '</p>' +
    '<button class="btn primary full" type="submit">Войти в админку →</button></form>' +
    '<span class="login-hint">Изменения сначала попадают в черновик. Публикация — отдельное действие.</span>' +
    '</div></section></div>';
  app.querySelector('#login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('button');
    submit.disabled = true;
    try {
      const result = await request('/login', 'POST', { password: form.elements.password.value });
      state.csrf = result.csrf;
      await loadState();
    } catch (err) {
      loginPage(err.message);
    } finally {
      if (submit.isConnected) submit.disabled = false;
    }
  });
}
function toolsMenu() {
  return '<details class="tools-menu"><summary class="btn subtle" aria-label="Дополнительные действия">Ещё <span aria-hidden="true">⌄</span></summary>' +
    '<div class="tools-menu__content">' +
    button('История публикаций', 'history', 'menu-action') +
    button('Настройки программы', 'settings', 'menu-action') +
    button('Проверить данные', 'validate', 'menu-action') +
    '<span class="menu-rule"></span>' +
    button('Экспорт JSON', 'export', 'menu-action') +
    button('Импорт JSON', 'import', 'menu-action') +
    '<span class="menu-rule"></span>' +
    button('Выйти из редактора', 'logout', 'menu-action', 'id="logout-programme"') +
    '<input id="import-file" type="file" accept=".json,application/json">' +
    '</div></details>';
}
function topBar() {
  return '<header class="topbar">' +
    '<div class="top-brand"><span class="brand-mark">DEBT <strong>TECH</strong></span>' +
    '<span class="brand-divider"></span><div class="top-title"><h1>Программа форума</h1>' +
    '<p>Редактор расписания <span class="environment">Продакшен</span></p></div></div>' +
    '<nav class="admin-section-nav" aria-label="Разделы админки">' +
    '<a href="/programme-admin/" class="active" aria-current="page">Программа</a>' +
    '<a href="/programme-admin/speakers/">Спикеры</a></nav>' +
    '<div class="toolbar"><div class="top-status" aria-live="polite"><span class="save-indicator"></span><span id="save-state"></span></div>' +
    button('Предпросмотр', 'preview', 'subtle', 'id="preview-programme"') +
    button('Сохранить', 'save', 'subtle save', 'id="save-draft" aria-label="Сохранить черновик" title="Сохранить черновик (⌘/Ctrl+S)"') +
    button('Опубликовать', 'publish', 'primary', 'id="publish-programme"') +
    toolsMenu() +
    '</div></header>';
}
function sessionsCaption(amount) {
  const last = amount % 10;
  const teen = amount % 100;
  const noun = teen >= 11 && teen <= 14 ? 'сессий' :
    last === 1 ? 'сессия' : last >= 2 && last <= 4 ? 'сессии' : 'сессий';
  return amount + ' ' + noun;
}
function stageStrip() {
  return '<div class="stage-strip"><nav class="stage-tabs" aria-label="Сцены программы">' +
    state.programme.stages.map((stage) => {
      const active = state.view === 'stage' && stage.id === state.stage;
      const status = stage.visible === false ? 'Скрыта' : stage.status === 'upcoming' ? 'Готовится' : sessionsCaption(stage.entries.filter((x) => x.kind === 'session').length);
      return '<button type="button" class="stage-tab' + (active ? ' active' : '') + '" data-action="stage:' + e(stage.id) + '" aria-pressed="' + active + '">' +
        '<span class="stage-tab__name">' + e(stage.title) + '</span><span class="stage-tab__meta">' + e(status) + '</span></button>';
    }).join('') +
    '<button type="button" class="stage-tab stage-tab--shared' + (state.view === 'shared' ? ' active' : '') +
      '" data-action="shared" aria-pressed="' + (state.view === 'shared') + '">' +
      '<span class="stage-tab__name">Общие события</span><span class="stage-tab__meta">Для всех сцен</span></button>' +
    button('+ Сцена', 'add-stage', 'stage-add') +
    '</nav></div>';
}
function viewTitle() {
  return state.view === 'shared' ? 'Общие события' : findStage().title;
}
function liveStatus() {
  const stage = findStage();
  if (state.view === 'shared') return 'Эти события показываются на каждой сцене';
  if (stage.visible === false) return 'Сцена скрыта с сайта';
  if (stage.status === 'upcoming') return 'На сайте: «Программа уточняется»';
  return 'Программа сцены опубликована';
}
function agendaCard(item, index) {
  const active = state.selection.id === item.id &&
    ['entry', 'common'].includes(state.selection.type);
  const kind = item.kind === 'session' ? 'Сессия ' + item.number : 'Событие';
  const extra = item.kind === 'session' ? item.talks.length + ' выступлений' : 'Событие программы';
  const people = item.kind === 'session' ? [item.moderator?.name || '', ...item.talks.flatMap((talk) => talk.speakers.map((person) => person.name))].join(' ') : '';
  const search = (item.time + ' ' + kind + ' ' + item.title + ' ' + people).toLocaleLowerCase('ru-RU');
  const action = state.view === 'shared' ? 'common:' : 'entry:';
  return '<article class="listrow' + (active ? ' selected' : '') + (item.visible === false ? ' ghosted' : '') + '" draggable="true" data-index="' + index + '" data-search="' + e(search) + '">' +
    '<button type="button" class="listrow-main" data-action="' + action + e(item.id) + '" aria-current="' + active + '">' +
    '<span class="listrow-top"><span class="listrow-time" data-time-label="' + e(item.id) + '">' + e(item.time) + '</span>' +
    '<span class="listrow-kind">' + e(kind) + '</span></span>' +
    '<strong class="listrow-title" data-title-label="' + e(item.id) + '">' + e(item.title) + '</strong>' +
    '<span class="listrow-meta">' + (item.visible === false ? '<span class="hidden-dot">Скрыто</span>' : e(extra)) + '</span>' +
    '</button><div class="listrow-order" aria-label="Изменить порядок">' +
    orderButton('↑', 'move:' + index + ':-1', 'Переместить выше', index === 0) +
    orderButton('↓', 'move:' + index + ':1', 'Переместить ниже', index === stageEntries().length - 1) +
    '</div></article>';
}
function listPanel() {
  const items = stageEntries();
  const count = items.length;
  return '<div class="agenda-head"><div><span class="eyebrow">РАСПИСАНИЕ</span>' +
    '<h2>' + e(viewTitle()) + ' <span class="count">' + count + '</span></h2>' +
    '<p class="panel-summary">' + e(liveStatus()) + '</p></div>' +
    (state.view === 'stage' ? button('Настройки', 'scene-settings', 'text-button', 'aria-label="Настроить сцену"') : '') +
    '</div>' +
    '<div class="agenda-actions">' +
      (state.view === 'shared'
        ? button('+ Добавить событие', 'add-common', 'primary full')
        : button('+ Сессия', 'add-session', 'primary') + button('+ Событие', 'add-event', 'subtle')) +
    '</div>' +
    '<div class="agenda-search"><span aria-hidden="true">⌕</span>' +
    '<input id="agenda-search" type="search" placeholder="Найти событие или спикера" autocomplete="off" aria-label="Поиск по расписанию" value="' + e(state.query) + '"></div>' +
    '<div class="card-list" aria-label="События в расписании">' +
    (items.length
      ? items.map(agendaCard).join('')
      : '<div class="empty-list"><strong>Пока нет событий</strong><p>Добавьте первую сессию или событие — оно сразу появится в списке.</p></div>') +
    '</div><div class="search-empty" hidden>Ничего не найдено. Измените запрос.</div>' +
    '<p class="agenda-foot">Поиск по ФИО и событиям: ⌘/Ctrl+K. Порядок меняется перетаскиванием или стрелками.</p>';
}
function currentSelection() {
  const { type, id } = state.selection;
  if (type === 'settings') return { type, item: state.programme };
  if (type === 'history') return { type, item: state.history };
  if (type === 'shared') return { type, item: null };
  if (type === 'stage') return { type, item: findStage() };
  if (type === 'common') return { type, item: state.programme.commonEvents.find((x) => x.id === id) };
  if (type === 'entry') return { type, item: findStage().entries.find((x) => x.id === id) };
  return { type, item: null };
}
function scopedItem(scope = '') {
  if (scope === 'programme') return state.programme;
  const { item } = currentSelection();
  if (!item) return null;
  if (!scope) return item;
  if (scope === 'moderator') return item.moderator;
  if (scope.startsWith('talk:')) {
    const talkId = scope.slice(5);
    return item.talks?.find((talk) => talk.id === talkId);
  }
  if (scope.startsWith('speaker:')) {
    const [talkId, index] = scope.slice(8).split(':');
    const talk = item.talks?.find((candidate) => candidate.id === talkId);
    return talk?.speakers[Number(index)];
  }
  return null;
}
function field(title, scope, name, options = {}) {
  const item = scopedItem(scope);
  const value = item?.[name] ?? '';
  const attrs = 'data-scope="' + e(scope) + '" data-field="' + e(name) + '"';
  const placeholder = options.placeholder ? ' placeholder="' + e(options.placeholder) + '"' : '';
  const control = options.type === 'textarea'
    ? '<textarea rows="' + (options.rows || 2) + '" ' + attrs + placeholder + '>' + e(value) + '</textarea>'
    : options.select
      ? '<select ' + attrs + '>' + options.select.map(([val, text]) =>
          '<option value="' + e(val) + '"' + (value === val ? ' selected' : '') + '>' + e(text) + '</option>').join('') + '</select>'
      : '<input type="' + (options.type || 'text') + '" value="' + e(value) + '" ' + attrs + placeholder +
        (options.type === 'number' ? ' min="1" max="99" step="1"' : '') + '>';
  return '<label class="field' + (options.main ? ' field--main' : '') + '"><span class="field-label">' + e(title) + '</span>' + control +
    (options.hint ? '<span class="helper">' + e(options.hint) + '</span>' : '') + '</label>';
}
function timeField(item, scope = '') {
  const [start, end] = String(item.time || '10:00–11:00').split(/\s*[–-]\s*/);
  return '<div class="time-grid"><label class="field"><span class="field-label">Начало</span>' +
    '<input type="text" inputmode="numeric" maxlength="5" pattern="(?:[01][0-9]|2[0-3]):[0-5][0-9]" placeholder="10:00" data-scope="' + e(scope) + '" data-time-part="start" value="' + e(start) + '" required></label>' +
    '<span class="time-separator" aria-hidden="true">→</span>' +
    '<label class="field"><span class="field-label">Окончание</span><input type="text" data-scope="' + e(scope) +
    '" data-time-part="end" inputmode="numeric" maxlength="5" pattern="(?:[01][0-9]|2[0-3]):[0-5][0-9]" placeholder="11:00" value="' + e(end) + '" required></label></div>';
}
function checkbox(title, scope, property, item) {
  return '<label class="visibility-toggle"><input type="checkbox" data-scope="' + e(scope) +
    '" data-field="' + e(property) + '"' + (item?.[property] === false ? '' : ' checked') +
    '><span class="visibility-switch" aria-hidden="true"></span><span>' + e(title) + '</span></label>';
}
function editorHead(type, title, subtitle = '', status = '') {
  return '<div class="editor-head"><div class="editor-head__copy"><span class="eyebrow">' + e(type) + '</span><h2>' + e(title) +
    '</h2>' + (subtitle ? '<p>' + e(subtitle) + '</p>' : '') + '</div>' +
    (status ? '<span class="item-status">' + e(status) + '</span>' : '') + '</div>';
}

function photoSource(person, scope) {
  const source = person.photo || '';
  const preview = source
    ? '<img class="photo-preview" src="' + e(source) + '" alt="Фото участника">'
    : '<div class="photo-preview photo-placeholder" aria-label="Без фотографии">◯</div>';
  return '<div class="photo-control">' + preview +
    '<div class="photo-actions"><span class="field-label">Фотография</span>' +
    button(source ? 'Заменить фото' : 'Выбрать фото', 'library-photo:' + scope, 'photo-open small') +
    '<input class="photo-upload" type="file" accept=".jpg,.jpeg,.png,.webp,image/*" data-upload="' + e(scope) + '">' +
    button('Загрузить файл', 'upload:' + scope, 'subtle small photo-upload-btn') +
    '</div></div>';
}
function allPeople() {
  const names = new Map();
  const add = (person, primary = false) => {
    if (!person?.name || person.name.startsWith('Новый ')) return;
    const key = person.name.toLocaleLowerCase('ru-RU').trim();
    const current = names.get(key);
    if (primary || !current || (!current.photo && person.photo) || (!current.role && person.role))
      names.set(key, { ...person });
  };
  for (const person of state.peopleCatalog) add(person);
  for (const stage of state.programme.stages) {
    for (const entry of stage.entries) {
      if (entry.kind !== 'session') continue;
      if (entry.moderator) add(entry.moderator, true);
      for (const talk of entry.talks) for (const person of talk.speakers) add(person, true);
    }
  }
  return [...names.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}
function mediaGallery(kind, scope = '') {
  if (document.querySelector('.library-wrap')) return;
  const previousFocus = document.activeElement;
  const overlay = document.createElement('div');
  overlay.className = 'modal-wrap library-wrap';
  const people = allPeople();
  const names = new Map(people.filter((p) => !!p.photo).map((p) => [p.photo, p.name]));
  const photos = state.portraits.map((p) => ({
    ...p,
    label: names.get(p.url) || p.name.replace(/\.webp$|\.png$|\.jpe?g$/i, '').replaceAll('-', ' '),
    keywords: (names.get(p.url) || '') + ' ' + p.name + ' ' + p.group,
    libraryGroup: names.has(p.url) ? 'people' :
      p.group === 'Загруженные фотографии' ? 'uploaded' : 'other',
  }));
  const current = kind === 'photo' ? scopedItem(scope)?.photo : null;
  if (current && !photos.some((p) => p.url === current))
    photos.unshift({ url: current, name: 'Текущее фото', label: 'Текущее фото', keywords: current,
      group: 'Загруженные фотографии', libraryGroup: 'people' });
  const title = kind === 'photo' ? 'Библиотека фотографий' : 'Участники программы';
  overlay.innerHTML = '<section class="library-dialog" role="dialog" aria-modal="true" aria-labelledby="library-title">' +
    '<header class="library-head"><div><span class="eyebrow">DEBT TECH · РЕДАКТОР</span><h2 id="library-title">' + title + '</h2>' +
    '<p>' + (kind === 'photo' ? 'Найдите нужное изображение и нажмите на него.' : 'Выберите участника — имя, должность и фото заполнятся автоматически.') + '</p></div>' +
    '<button type="button" class="library-close" data-library-close aria-label="Закрыть">×</button></header>' +
    '<div class="library-filter">' +
    '<input type="search" id="library-search" placeholder="' + (kind === 'photo' ? 'Поиск по имени или файлу' : 'Поиск по ФИО или должности') + '" aria-label="Поиск в библиотеке" autocomplete="off">' +
    (kind === 'photo' ? '<select id="library-group" aria-label="Источник фотографий">' +
      '<option value="people">Фотографии участников</option><option value="">Все изображения</option>' +
      '<option value="uploaded">Загруженные файлы</option><option value="other">Другие изображения</option></select>' : '') +
    '</div><p class="library-count" id="library-count" aria-live="polite"></p>' +
    '<div class="library-results" id="library-results"></div>' +
    '<footer class="library-footer">' +
    (kind === 'photo' ? '<button type="button" class="btn subtle" data-library-clear>Убрать фото</button>' +
      '<button type="button" class="btn primary" data-library-upload>Загрузить с компьютера</button>' :
      '<span>Не нашли участника? Закройте библиотеку и добавьте нового вручную.</span>') +
    '</footer></section>';
  document.body.append(overlay);
  overlay.addEventListener('error', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLImageElement) || !target.closest('.library-item')) return;
    const empty = document.createElement('span');
    empty.className = 'library-photo-empty';
    empty.setAttribute('aria-label', 'Изображение недоступно');
    empty.textContent = '◯';
    target.replaceWith(empty);
  }, true);
  const results = overlay.querySelector('#library-results');
  const input = overlay.querySelector('#library-search');
  const counter = overlay.querySelector('#library-count');
  let limit = 60;
  function matches() {
    const query = input.value.trim().toLocaleLowerCase('ru-RU');
    const group = overlay.querySelector('#library-group')?.value || '';
    return (kind === 'photo' ? photos : people).filter((item) => {
      const text = kind === 'photo' ? item.keywords : [item.name, item.role].join(' ');
      return (!group || item.libraryGroup === group) &&
        text.toLocaleLowerCase('ru-RU').includes(query);
    });
  }
  function draw() {
    const list = matches();
    counter.textContent = 'Найдено: ' + list.length + (list.length > limit ? ' · показаны первые ' + limit : '');
    results.innerHTML = list.length
      ? list.slice(0, limit).map((item, index) =>
        '<button type="button" class="library-item" data-library-index="' + index + '">' +
        (item.url || item.photo
          ? '<img src="' + e(item.url || item.photo) + '" alt="" loading="lazy">'
          : '<span class="library-photo-empty" aria-hidden="true">◯</span>') +
        '<span class="library-item-text"><strong>' + e(kind === 'photo' ? item.label : item.name) + '</strong>' +
        '<small>' + e(kind === 'photo' ? item.group : item.role || 'Должность не указана') + '</small></span></button>'
      ).join('') + (list.length > limit ? '<button type="button" class="btn subtle library-more" data-library-more>Показать ещё</button>' : '')
      : '<div class="library-empty">Ничего не найдено. Попробуйте другое имя или часть названия.</div>';
  }
  function close() {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
    if (previousFocus?.isConnected) previousFocus.focus();
  }
  function onKey(event) {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key !== 'Tab') return;
    const fields = [...overlay.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled)')].filter(el => el.getBoundingClientRect().width);
    if (event.shiftKey && document.activeElement === fields[0]) { event.preventDefault(); fields.at(-1).focus(); }
    else if (!event.shiftKey && document.activeElement === fields.at(-1)) { event.preventDefault(); fields[0].focus(); }
  }
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay || event.target.closest('[data-library-close]')) return close();
    if (event.target.closest('[data-library-more]')) { limit += 60; return draw(); }
    if (event.target.closest('[data-library-upload]')) {
      const upload = app.querySelector('[data-upload="' + CSS.escape(scope) + '"]');
      close();
      upload?.click();
      return;
    }
    if (event.target.closest('[data-library-clear]')) {
      const person = scopedItem(scope);
      if (!person) return close();
      person.photo = '';
      markDirty(); close(); render();
      return;
    }
    const tile = event.target.closest('[data-library-index]');
    if (!tile) return;
    const chosen = matches()[Number(tile.dataset.libraryIndex)];
    if (!chosen) return;
    if (kind === 'photo') {
      const person = scopedItem(scope);
      if (!person) { close(); return notice('Участник больше не найден.', true); }
      person.photo = chosen.url;
      markDirty(); close(); render();
      notice('Фотография выбрана.');
      return;
    }
    const { type, item } = currentSelection();
    if (type !== 'entry' || item?.kind !== 'session') return close();
    if (scope === 'moderator') {
      item.moderator = { ...chosen };
      state.editModerator = false;
    } else {
      const talk = item.talks.find((t) => t.id === scope);
      if (!talk || talk.speakers.length >= 8) return close();
      if (talk.speakers.some((p) => p.name.toLocaleLowerCase('ru-RU') === chosen.name.toLocaleLowerCase('ru-RU')))
        return notice('Этот участник уже добавлен в выступление.', true);
      talk.speakers.push({ ...chosen });
      state.expandedTalk = scope;
    }
    markDirty(); close(); render();
    notice('Участник добавлен со всеми данными.');
  });
  input.addEventListener('input', () => { limit = 60; draw(); });
  overlay.querySelector('#library-group')?.addEventListener('change', () => { limit = 60; draw(); });
  draw();
  input.focus();
}
function personEditor(person, scope) {
  return '<div class="person-fields">' +
    photoSource(person, scope) +
    '<div class="person-fields__inputs">' +
    field('Имя и фамилия', scope, 'name', { placeholder: 'Введите имя' }) +
    field('Должность и организация', scope, 'role', { type: 'textarea', rows: 2, placeholder: 'Например: директор по развитию, компания' }) +
    '</div></div>';
}
function moderatorEditor(session) {
  const person = session.moderator;
  if (!person) {
    return '<section class="editor-section" id="session-moderator"><div class="section-heading"><div><h3>Модератор</h3><p>Ведущий сессии</p></div>' +
      '<div class="inline-actions">' + button('Из программы', 'library-moderator', 'subtle small') +
      button('+ Добавить', 'add-moderator', 'subtle small') + '</div>' +
      '</div><div class="empty-inline">Модератор не указан. Можно добавить позже.</div></section>';
  }
  return '<section class="editor-section" id="session-moderator"><div class="section-heading"><div><h3>Модератор</h3><p>Ведущий сессии</p></div>' +
    '<div class="inline-actions">' + button('Заменить', 'library-moderator', 'subtle small') +
    button(state.editModerator ? 'Готово' : 'Изменить', 'edit-moderator', 'subtle small') +
    '</div></div>' +
    (state.editModerator
      ? '<div class="card-editor">' + personEditor(person, 'moderator') + '<div class="item-actions">' +
        button('Убрать модератора', 'remove-moderator', 'text-danger small') + '</div></div>'
      : '<div class="moderator-summary">' +
        (person.photo ? '<img class="moderator-photo" src="' + e(person.photo) + '" alt="">' : '<span class="moderator-photo photo-placeholder">◯</span>') +
        '<div><strong>' + e(person.name) + '</strong><span>' + e(person.role || 'Должность не указана') +
        '</span></div></div>') + '</section>';
}
function talkCard(talk, index, session) {
  const open = state.expandedTalk === talk.id;
  const names = talk.speakers.map((person) => person.name).filter(Boolean);
  let details = '';
  if (open) {
    details = '<div class="talk-editor">' +
      field('Тема выступления', 'talk:' + talk.id, 'title', { type: 'textarea', rows: 2, main: true, placeholder: 'О чём будет выступление?' }) +
      field('Дополнительная пометка', 'talk:' + talk.id, 'note', { placeholder: 'Если тема уточняется или на согласовании' }) +
      checkbox('Показывать выступление на сайте', 'talk:' + talk.id, 'visible', talk) +
      '<div class="section-heading section-heading--nested"><div><h4>Спикеры</h4><p>Выберите существующего человека или создайте нового</p></div>' +
      '<div class="inline-actions">' + button('Из программы', 'library-person:' + talk.id, 'subtle small') +
      button('+ Новый', 'add-speaker:' + talk.id, 'subtle small', 'aria-label="+ Спикер"') + '</div></div>' +
      (!talk.speakers.length ? '<div class="empty-inline">Спикеров пока нет. Добавьте участника.</div>' : '') +
      talk.speakers.map((person, speakerIndex) =>
        '<div class="speaker-editor"><div class="speaker-head"><strong>Спикер ' + (speakerIndex + 1) + '</strong>' +
        '<div class="speaker-tools">' +
        orderButton('↑', 'speaker-move:' + talk.id + ':' + speakerIndex + ':-1', 'Переместить спикера выше', speakerIndex === 0) +
        orderButton('↓', 'speaker-move:' + talk.id + ':' + speakerIndex + ':1', 'Переместить спикера ниже', speakerIndex === talk.speakers.length - 1) +
        button('Убрать', 'remove-speaker:' + talk.id + ':' + speakerIndex, 'text-danger small') +
        '</div></div>' +
        personEditor(person, 'speaker:' + talk.id + ':' + speakerIndex) + '</div>'
      ).join('') +
      '<div class="talk-footer"><div class="talk-order">' +
      orderButton('↑', 'talk-move:' + talk.id + ':-1', 'Переместить выступление выше', index === 0) +
      orderButton('↓', 'talk-move:' + talk.id + ':1', 'Переместить выступление ниже', index === session.talks.length - 1) +
      '<span>Порядок выступлений</span></div>' +
      button('Удалить выступление', 'delete-talk:' + talk.id, 'text-danger small') +
      '</div></div>';
  }
  return '<article class="talk-card' + (open ? ' talk-card--open' : '') + '">' +
    '<button type="button" class="talk-pick" data-action="expand-talk:' + e(talk.id) + '" aria-expanded="' + open + '">' +
    '<span class="talk-number">' + String(index + 1).padStart(2, '0') + '</span>' +
    '<span class="talk-heading"><strong>' + e(talk.title || talk.note || 'Тема пока не указана') + '</strong>' +
    '<small>' + e(names.length ? names.join(', ') : 'Спикеры не добавлены') + '</small></span>' +
    (talk.visible === false ? '<span class="item-hidden">Скрыто</span>' : '') +
    '<span class="talk-chevron" aria-hidden="true">' + (open ? '−' : '+') + '</span></button>' +
    details + '</article>';
}
function sessionEditor(session) {
  const subtitle = session.time + ' · ' + session.talks.length + ' выступлений';
  return editorHead('СЕССИЯ ' + session.number, session.title, subtitle,
    session.visible === false ? 'Скрыта' : 'В черновике') +
    '<nav class="editor-jumps" aria-label="Разделы сессии">' +
    '<button type="button" data-jump="session-main">Основное</button>' +
    '<button type="button" data-jump="session-moderator">Модератор</button>' +
    '<button type="button" data-jump="session-talks">Выступления (' + session.talks.length + ')</button>' +
    '</nav>' +
    '<div class="editor-section editor-section--main" id="session-main">' +
    field('Название сессии', '', 'title', { main: true, type: 'textarea', rows: 2, placeholder: 'Название сессии' }) +
    '<div class="form-grid"><div>' + timeField(session) + '</div>' +
    '<div class="form-grid__side">' + field('Номер сессии', '', 'number', { type: 'number' }) + '</div></div>' +
    field('Формат', '', 'category', { placeholder: 'Например: пленарная дискуссия' }) +
    checkbox('Показывать сессию на сайте', '', 'visible', session) +
    '</div>' +
    moderatorEditor(session) +
    '<section class="editor-section" id="session-talks"><div class="section-heading"><div><h3>Выступления <span class="count">' + session.talks.length + '</span></h3>' +
    '<p>Нажмите на выступление, чтобы изменить тему и спикеров</p></div>' +
    button('+ Выступление', 'add-talk', 'subtle small') +
    '</div><div class="talk-list">' +
    (session.talks.length ? session.talks.map((talk, index) => talkCard(talk, index, session)).join('') :
      '<div class="empty-inline">Здесь пока нет выступлений. Добавьте первое.</div>') +
    '</div></section>' +
    '<section class="editor-section editor-section--extra">' +
    '<details class="advanced-panel"><summary>Дополнительные настройки сессии <span>⌄</span></summary>' +
    '<div class="advanced-content">' +
    field('Примечание к сессии', '', 'additionalNote', { type: 'textarea', rows: 2 }) +
    (state.programme.stages.length > 1 ?
      '<label class="field"><span class="field-label">Перенести на другую сцену</span>' +
      '<select id="transfer-stage">' + state.programme.stages.filter((stage) => stage.id !== state.stage).map((stage) =>
        '<option value="' + e(stage.id) + '">' + e(stage.title) + '</option>').join('') + '</select></label>' +
      button('Перенести на выбранную сцену', 'transfer-entry', 'subtle small') : '') +
    '<div class="item-actions">' + button('Дублировать сессию', 'clone-session', 'subtle small') +
    button('Удалить сессию', 'delete-session', 'text-danger small') + '</div>' +
    '</div></details></section>' +
    '<p class="editor-footer">Правки сохраняются в черновике автоматически. На сайте они появятся только после нажатия «Опубликовать».</p>';
}
function eventEditor(item, shared = false) {
  return editorHead(shared ? 'ОБЩЕЕ СОБЫТИЕ' : 'СОБЫТИЕ', item.title,
    shared ? 'Это событие отображается на всех сценах.' : 'Отдельное событие в расписании.') +
    '<div class="editor-section editor-section--main">' +
    field('Название события', '', 'title', { main: true, type: 'textarea', rows: 2, placeholder: 'Например: кофе-брейк' }) +
    timeField(item) +
    checkbox('Показывать событие на сайте', '', 'visible', item) +
    '<div class="item-actions item-actions--separated">' +
    button('Удалить событие', 'delete-event', 'text-danger small') + '</div></div>';
}
function stageEditor(stage) {
  return editorHead('НАСТРОЙКИ СЦЕНЫ', stage.title, 'Управление названием, доступностью и отображением сцены.') +
    '<div class="editor-section editor-section--main">' +
    field('Название сцены', '', 'title', { main: true }) +
    field('Краткая подпись', '', 'description', { placeholder: 'Что посетители увидят под названием сцены' }) +
    field('Состояние программы', '', 'status', { select: [
      ['published', 'Показывать расписание'],
      ['upcoming', 'Программа уточняется'],
    ] }) +
    '<p class="helper helper--standalone">«Программа уточняется» скрывает расписание этой сцены от посетителей, но сохраняет все события в редакторе.</p>' +
    checkbox('Показывать сцену на сайте', '', 'visible', stage) +
    '<div class="item-actions item-actions--separated"><span class="field-label">Порядок сцен</span>' +
    orderButton('↑', 'stage-move:' + state.programme.stages.indexOf(stage) + ':-1', 'Переместить сцену выше', stage === state.programme.stages[0]) +
    orderButton('↓', 'stage-move:' + state.programme.stages.indexOf(stage) + ':1', 'Переместить сцену ниже', stage === state.programme.stages.at(-1)) + '</div>' +
    (state.programme.stages.length > 1 ?
      '<div class="item-actions">' + button('Удалить сцену', 'delete-stage', 'text-danger small') + '</div>' : '') +
    '</div>';
}
function settingsEditor() {
  return editorHead('ПАРАМЕТРЫ', 'Настройки программы', 'Общее описание и доступ к редактору.') +
    '<div class="editor-section editor-section--main">' +
    field('Текст под заголовком «Программа форума»', 'programme', 'note', {
      type: 'textarea', rows: 3, placeholder: 'Краткое примечание для посетителей' }) +
    '<div class="section-heading"><div><h3>Безопасность</h3><p>Смена пароля завершит все активные сеансы</p></div>' +
    button('Сменить пароль', 'change-password', 'subtle small') + '</div>' +
    '</div>';
}
function historyEditor() {
  return editorHead('АРХИВ', 'История публикаций',
    'Восстановленная версия попадёт только в черновик, без изменения сайта.') +
    '<section class="editor-section editor-section--main">' +
    (state.history.length ? state.history.map((record) =>
      '<div class="history-row"><div><strong>Версия №' + record.revision + '</strong>' +
      '<span>' + e(new Date(record.updatedAt).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })) +
      '</span></div>' + button('Восстановить', 'restore:' + record.revision, 'subtle small') + '</div>').join('') :
      '<div class="empty-inline">История появится после первой публикации.</div>') +
    '</section>';
}
function sharedEditor() {
  return editorHead('ДЛЯ ВСЕХ СЦЕН', 'Общие события', 'Регистрация, открытие и другие события, отображаемые на каждой сцене.') +
    '<section class="editor-section editor-section--main"><div class="empty-inline">' +
    'Выберите событие слева или создайте новое. Здесь можно изменить время, название и видимость.' +
    '</div>' + button('+ Добавить событие', 'add-common', 'primary') + '</section>';
}
function inspectorPanel() {
  const { type, item } = currentSelection();
  if (type === 'settings') return settingsEditor();
  if (type === 'history') return historyEditor();
  if (type === 'shared') return sharedEditor();
  if (type === 'stage') return stageEditor(findStage());
  if (!item) return '<div class="empty-editor"><h2>Выберите событие</h2><p>Нажмите на сессию или событие в расписании слева.</p></div>';
  if (type === 'common') return eventEditor(item, true);
  if (item.kind === 'event') return eventEditor(item);
  return sessionEditor(item);
}
function applySearch() {
  const query = state.query.trim().toLocaleLowerCase('ru-RU');
  let visible = 0;
  for (const row of app.querySelectorAll('.listpane .listrow')) {
    const matches = !query || row.dataset.search.includes(query);
    row.hidden = !matches;
    if (matches) visible += 1;
  }
  const empty = app.querySelector('.search-empty');
  if (empty) empty.hidden = !query || visible > 0;
}
function mobileBar() {
  return '<nav class="mobile-workspace-tabs" aria-label="Рабочие области">' +
    button('Расписание', 'view:agenda', 'mobile-tab' + (state.mobileView === 'agenda' ? ' active' : '')) +
    button('Редактор', 'view:editor', 'mobile-tab' + (state.mobileView === 'editor' ? ' active' : '')) +
    '</nav>';
}
function render({ resetEditor = false } = {}) {
  if (!state.programme) return;
  const agendaScroll = document.querySelector('.listpane')?.scrollTop || 0;
  const editorScroll = resetEditor ? 0 : document.querySelector('.inspector')?.scrollTop || 0;
  app.innerHTML = '<div class="shell" data-mobile-view="' + state.mobileView + '">' +
    topBar() + stageStrip() + mobileBar() +
    '<div class="workspace"><aside class="panel listpane" aria-label="Расписание">' + listPanel() + '</aside>' +
    '<main class="panel inspector" aria-label="Редактирование"><div class="inspector-inner">' +
    inspectorPanel() + '</div></main></div></div>';
  const agenda = app.querySelector('.listpane');
  const inspector = app.querySelector('.inspector');
  if (agenda) agenda.scrollTop = agendaScroll;
  if (inspector) inspector.scrollTop = editorScroll;
  applySearch();
  refreshStatus();
}
function choose(type, id, { resetTalk = true } = {}) {
  state.selection = { type, id };
  if (resetTalk) state.expandedTalk = null;
  state.editModerator = false;
  state.mobileView = 'editor';
  render({ resetEditor: true });
}
function stageSelect(id) {
  state.view = 'stage';
  state.stage = id;
  state.query = '';
  resetSelection();
  state.expandedTalk = null;
  state.editModerator = false;
  state.mobileView = 'agenda';
  render({ resetEditor: true });
}
function sharedSelect() {
  state.view = 'shared';
  state.query = '';
  resetSelection();
  state.expandedTalk = null;
  state.mobileView = 'agenda';
  render({ resetEditor: true });
}

function move(items, index, direction) {
  const target = index + direction;
  if (!Number.isInteger(index) || !Number.isInteger(direction) || index < 0 || target < 0 || target >= items.length) return;
  [items[index], items[target]] = [items[target], items[index]];
  markDirty();
  render();
}
function addEntry(kind, shared = false) {
  const entries = shared ? state.programme.commonEvents : findStage().entries;
  const sessionCount = findStage().entries.filter((entry) => entry.kind === 'session').length;
  const item = kind === 'session' ? {
    id: makeId('session'), kind: 'session', number: sessionCount + 1,
    title: 'Новая сессия', time: '10:00–11:00', category: 'Дискуссия',
    moderator: null, visible: true, talks: [], additionalNote: '',
  } : { id: makeId('event'), kind: 'event', title: 'Новое событие', time: '12:00–12:30', visible: true };
  entries.push(item);
  state.view = shared ? 'shared' : 'stage';
  state.selection = { type: shared ? 'common' : 'entry', id: item.id };
  state.expandedTalk = null;
  state.mobileView = 'editor';
  state.query = '';
  markDirty();
  render({ resetEditor: true });
  app.querySelector('.inspector [data-field="title"][data-scope=""]')?.focus();
}
async function deleteEntry() {
  const { item, type } = currentSelection();
  if (!item) return;
  const yes = await confirmAction('Удалить «' + item.title + '»?', 'Элемент исчезнет из черновика. На опубликованном сайте ничего не изменится до публикации.', 'Удалить', true);
  if (!yes) return;
  const entries = type === 'common' ? state.programme.commonEvents : findStage().entries;
  const index = entries.findIndex((entry) => entry.id === item.id);
  if (index < 0) return;
  entries.splice(index, 1);
  resetSelection();
  state.expandedTalk = null;
  markDirty();
  render({ resetEditor: true });
  notice('Элемент удалён из черновика. На сайте он пока остаётся.');
}
async function deleteStage() {
  if (state.programme.stages.length <= 1) return notice('Последнюю сцену удалить нельзя.', true);
  const stage = findStage();
  const yes = await confirmAction('Удалить сцену «' + stage.title + '»?', 'Все сессии и события этой сцены будут удалены из черновика. Опубликованная программа пока не изменится.', 'Удалить сцену', true);
  if (!yes) return;
  state.programme.stages.splice(state.programme.stages.indexOf(stage), 1);
  state.stage = state.programme.stages[0].id;
  resetSelection();
  markDirty();
  render({ resetEditor: true });
}
function addStage() {
  if (state.programme.stages.length >= 8) return notice('Максимум восемь сцен.', true);
  const stage = { id: makeId('stage'), title: 'Новая сцена', description: '', visible: true, status: 'upcoming', entries: [] };
  state.programme.stages.push(stage);
  state.stage = stage.id;
  state.view = 'stage';
  state.selection = { type: 'stage', id: stage.id };
  state.mobileView = 'editor';
  state.query = '';
  markDirty();
  render({ resetEditor: true });
  app.querySelector('.inspector [data-field="title"]')?.focus();
}
function duplicateSession() {
  const { item } = currentSelection();
  if (!item || item.kind !== 'session') return;
  const clone = structuredClone(item);
  clone.id = makeId('session');
  clone.number = Math.min(99, Math.max(...findStage().entries.filter((entry) => entry.kind === 'session').map((entry) => entry.number), 0) + 1);
  clone.title += ' — копия';
  clone.talks.forEach((talk) => (talk.id = makeId('talk')));
  const entries = findStage().entries;
  entries.splice(entries.indexOf(item) + 1, 0, clone);
  state.selection = { type: 'entry', id: clone.id };
  state.expandedTalk = null;
  markDirty();
  render({ resetEditor: true });
}
async function transferSession() {
  const session = currentSelection().item;
  const destinationId = app.querySelector('#transfer-stage')?.value;
  const destination = state.programme.stages.find((stage) => stage.id === destinationId);
  if (!destination || session?.kind !== 'session' || destination.id === state.stage) return;
  const yes = await confirmAction('Перенести сессию?', '«' + session.title + '» → «' + destination.title + '». В опубликованную программу изменения пока не попадут.', 'Перенести');
  if (!yes) return;
  const entries = findStage().entries;
  entries.splice(entries.indexOf(session), 1);
  destination.entries.push(session);
  state.stage = destination.id;
  state.selection = { type: 'entry', id: session.id };
  state.expandedTalk = null;
  markDirty();
  render({ resetEditor: true });
  notice('Сессия перенесена в черновике.');
}
function addTalk() {
  const session = currentSelection().item;
  if (session?.kind !== 'session') return;
  const talk = { id: makeId('talk'), title: '', note: '', visible: true, speakers: [] };
  session.talks.push(talk);
  state.expandedTalk = talk.id;
  markDirty();
  render();
  app.querySelector('.talk-card--open [data-field="title"]')?.focus();
}
async function deleteTalk(talkId) {
  const session = currentSelection().item;
  if (!session?.talks) return;
  const talk = session.talks.find((entry) => entry.id === talkId);
  if (!talk) return;
  if (!await confirmAction('Удалить выступление?', 'Из черновика будет удалена тема вместе с привязанными спикерами.', 'Удалить', true)) return;
  session.talks.splice(session.talks.indexOf(talk), 1);
  if (state.expandedTalk === talkId) state.expandedTalk = null;
  markDirty();
  render();
}
function addSpeaker(talkId) {
  const talk = scopedItem('talk:' + talkId);
  if (!talk || talk.speakers.length >= 8) return notice('В одном выступлении может быть не больше восьми спикеров.', true);
  talk.speakers.push({ name: 'Новый спикер', role: '', photo: '' });
  state.expandedTalk = talkId;
  markDirty();
  render();
  const fields = app.querySelectorAll('.talk-card--open [data-field="name"]');
  fields[fields.length - 1]?.focus();
}
async function removeSpeaker(talkId, index) {
  const talk = scopedItem('talk:' + talkId);
  if (!talk?.speakers[index]) return;
  const name = talk.speakers[index].name;
  if (!await confirmAction('Убрать спикера?', '«' + name + '» будет удалён только из этого выступления в черновике.', 'Убрать', true)) return;
  talk.speakers.splice(index, 1);
  markDirty();
  render();
}
function updateLiveLabels(item) {
  if (!item?.id) return;
  const row = [...app.querySelectorAll('.listpane .listrow')].find((node) =>
    node.querySelector('[data-title-label]')?.dataset.titleLabel === item.id);
  if (!row) return;
  const title = row.querySelector('.listrow-title');
  const time = row.querySelector('.listrow-time');
  if (title) title.textContent = item.title;
  if (time) time.textContent = item.time;
  const heading = app.querySelector('.editor-head h2');
  if (heading && currentSelection().item === item &&
      (item.kind === 'session' || item.kind === 'event')) heading.textContent = item.title;
  row.dataset.search = (item.title + ' ' + item.time + ' ' + row.textContent).toLocaleLowerCase('ru-RU');
}
function renderError(message) {
  notice(message, true);
}
async function save({ silent = false } = {}) {
  if (!state.dirty || state.busy) return;
  clearAutosave();
  state.busy = true;
  state.saveError = '';
  const version = state.editVersion;
  const snapshot = structuredClone(state.programme);
  refreshStatus();
  try {
    const result = await request('/draft', 'PUT', {
      expectedRevision: state.revision, programme: snapshot,
    });
    state.revision = result.draft.revision;
    if (version === state.editVersion) {
      // Preserve input and participant object identities while saving in the background.
      state.dirty = false;
      if (!silent) notice('Черновик сохранён. Для изменения сайта нажмите «Опубликовать».');
      refreshStatus();
    } else {
      if (!silent) notice('Первая версия сохранена. Новые правки будут сохранены отдельно.');
    }
  } catch (error) {
    state.saveError = error.message;
    // Never replace in-memory changes with a failed or conflicting server response.
    throw error;
  } finally {
    state.busy = false;
    refreshStatus();
    if (state.dirty && !state.saveError) scheduleAutosave(750);
  }
}
function confirmAction(title, description, action = 'Продолжить', dangerous = false) {
  return new Promise((resolve) => {
    const previousFocus = document.activeElement;
    const overlay = document.createElement('div');
    overlay.className = 'modal-wrap';
    overlay.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
      '<div class="modal-icon" aria-hidden="true">' + (dangerous ? '!' : '✓') + '</div>' +
      '<h2 id="modal-title">' + e(title) + '</h2><p class="modal-copy">' + e(description) + '</p>' +
      '<div class="modal-actions"><button type="button" class="btn subtle" data-modal-cancel>Отмена</button>' +
      '<button type="button" class="btn ' + (dangerous ? 'destructive' : 'primary') + '" data-modal-confirm>' + e(action) + '</button></div></div>';
    document.body.append(overlay);
    function close(result) {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
      if (previousFocus?.isConnected) previousFocus.focus();
      resolve(result);
    }
    function onKey(event) {
      if (event.key === 'Escape') { event.preventDefault(); close(false); }
      if (event.key !== 'Tab') return;
      const controls = [...overlay.querySelectorAll('button')];
      if (event.shiftKey && document.activeElement === controls[0]) {
        event.preventDefault(); controls.at(-1).focus();
      } else if (!event.shiftKey && document.activeElement === controls.at(-1)) {
        event.preventDefault(); controls[0].focus();
      }
    }
    overlay.querySelector('[data-modal-cancel]').addEventListener('click', () => close(false));
    overlay.querySelector('[data-modal-confirm]').addEventListener('click', () => close(true));
    overlay.addEventListener('click', (event) => { if (event.target === overlay) close(false); });
    document.addEventListener('keydown', onKey);
    overlay.querySelector('[data-modal-cancel]').focus();
  });
}
async function publish() {
  if (state.busy) return;
  const count = state.programme.stages.reduce((sum, stage) => sum + stage.entries.length, 0);
  if (!await confirmAction('Опубликовать программу?', 'На тестовом сайте появится текущая версия программы (' +
    state.programme.stages.length + ' сцен, ' + count + ' событий и сессий). ' +
    (state.dirty ? 'Перед публикацией черновик будет сохранён.' : 'Черновик уже сохранён.'), 'Опубликовать')) {
    scheduleAutosave();
    return;
  }
  clearAutosave();
  if (state.dirty) await save({ silent: true });
  if (state.dirty) throw Error('Есть правки, сделанные во время сохранения. Дождитесь автосохранения.');
  const version = state.editVersion;
  state.busy = true;
  refreshStatus();
  try {
    const result = await request('/publish', 'POST', {
      expectedRevision: state.revision, expectedPublishedRevision: state.published.revision,
    });
    state.published = result.published;
    if (version === state.editVersion) {
      await loadState();
      notice('Программа опубликована в песочнице.');
    } else {
      notice('Опубликована сохранённая версия. Новые изменения остались в черновике.');
    }
  } finally {
    state.busy = false;
    refreshStatus();
  }
}
async function preview() {
  if (state.busy) return;
  const opened = window.open('about:blank', '_blank');
  if (!opened) throw Error('Разрешите браузеру открывать вкладки предпросмотра.');
  opened.opener = null;
  try {
    if (state.dirty) await save({ silent: true });
    if (state.dirty) throw Error('Есть новые несохранённые изменения. Повторите предпросмотр.');
    opened.location.href = '/programme-admin/preview#prog';
  } catch (error) {
    opened.close();
    throw error;
  }
}
async function logout() {
  clearAutosave();
  if (state.dirty && !await confirmAction('Выйти без сохранения?', 'Несохранённые изменения будут потеряны, опубликованный сайт не изменится.', 'Выйти', true)) {
    scheduleAutosave();
    return;
  }
  await request('/logout', 'POST', {});
  state.csrf = '';
  state.programme = null;
  loginPage();
}
async function restore(revision) {
  clearAutosave();
  if (state.dirty && !await confirmAction('Заменить несохранённые правки?', 'Перед восстановлением версии сохраните или отмените текущие изменения.', 'Продолжить', true)) {
    scheduleAutosave();
    return;
  }
  if (!await confirmAction('Восстановить версию №' + revision + '?',
    'Эта версия будет загружена в черновик. Текущая опубликованная программа не изменится.', 'Восстановить')) {
    scheduleAutosave();
    return;
  }
  await request('/restore', 'POST', { revision, expectedRevision: state.revision });
  await loadState();
  notice('Версия №' + revision + ' восстановлена в черновик. Для публикации нажмите «Опубликовать».');
}
function exportJson() {
  const blob = new Blob([JSON.stringify(state.programme, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'debt-tech-programme.json';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  document.querySelector('.tools-menu')?.removeAttribute('open');
}
async function importJson(file) {
  if (!file) return;
  if (file.size > 1_000_000) throw Error('Размер файла не должен превышать 1 МБ.');
  let json;
  try { json = JSON.parse(await file.text()); }
  catch { throw Error('Файл не содержит корректный JSON.'); }
  const { programme } = await request('/validate', 'POST', { programme: json });
  if (!await confirmAction('Импортировать программу?', 'Текущие правки в редакторе заменятся содержимым файла. Публикация не произойдёт.', 'Импортировать')) return;
  state.programme = programme;
  state.stage = programme.stages[0].id;
  state.view = 'stage';
  state.query = '';
  resetSelection();
  markDirty();
  render({ resetEditor: true });
  notice('Файл проверен и загружен. Сохраните черновик для предпросмотра.');
}
async function validateDraft() {
  const { programme } = await request('/validate', 'POST', { programme: state.programme });
  const count = programme.stages.reduce((sum, stage) => sum + stage.entries.length, 0);
  document.querySelector('.tools-menu')?.removeAttribute('open');
  notice('Данные корректны: ' + programme.stages.length + ' сцен, ' + count + ' событий и сессий. Публикация не выполнялась.');
}
async function uploadPhoto(scope, input) {
  const file = input.files?.[0];
  if (!file) return;
  if (file.size > 4_000_000) throw Error('Фото должно быть меньше 4 МБ.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw Error('Поддерживаются JPG, PNG и WebP.');
  const selection = { ...state.selection };
  const person = scopedItem(scope);
  if (!person) throw Error('Спикер или модератор не найден.');
  input.disabled = true;
  try {
    const result = await request('/upload', 'POST', file, file.type);
    const present = state.programme.stages.some((stage) => stage.entries.some((entry) =>
      entry.moderator === person || entry.talks?.some((talk) => talk.speakers.includes(person))));
    if (!present) throw Error('Участник был удалён. Файл сохранён в библиотеке, но не привязан.');
    person.photo = result.url;
    state.portraits.unshift({ group: 'Загруженные фотографии', name: file.name, url: result.url });
    markDirty();
    if (state.selection.id === selection.id && state.selection.type === selection.type) render();
    notice('Фото обновлено. Сохраните черновик.');
  } finally {
    if (input.isConnected) input.disabled = false;
  }
}

function changePassword() {
  if (document.querySelector('.modal-wrap')) return;
  if (state.dirty) return notice('Сначала сохраните черновик, затем меняйте пароль.', true);
  const previousFocus = document.activeElement;
  const overlay = document.createElement('div');
  overlay.className = 'modal-wrap';
  overlay.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="password-title">' +
    '<h2 id="password-title">Сменить пароль</h2>' +
    '<p class="modal-copy">Пароль не меньше 14 символов. После смены потребуется снова войти.</p>' +
    '<form id="password-form">' +
    '<label class="field"><span class="field-label">Текущий пароль</span><input type="password" name="oldPassword" autocomplete="current-password" required></label>' +
    '<label class="field"><span class="field-label">Новый пароль</span><input type="password" name="newPassword" autocomplete="new-password" minlength="14" maxlength="128" required></label>' +
    '<label class="field"><span class="field-label">Повторите новый пароль</span><input type="password" name="confirmation" autocomplete="new-password" required></label>' +
    '<p class="error" role="alert" aria-live="polite"></p><div class="modal-actions">' +
    '<button type="button" class="btn subtle" data-cancel>Отмена</button><button class="btn primary" type="submit">Сохранить пароль</button>' +
    '</div></form></div>';
  document.body.append(overlay);
  function close() {
    document.removeEventListener('keydown', onKey);
    overlay.remove();
    if (previousFocus?.isConnected) previousFocus.focus();
  }
  function onKey(event) {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key !== 'Tab') return;
    const items = [...overlay.querySelectorAll('input:not(:disabled),button:not(:disabled)')];
    if (event.shiftKey && document.activeElement === items[0]) {
      event.preventDefault(); items.at(-1).focus();
    } else if (!event.shiftKey && document.activeElement === items.at(-1)) {
      event.preventDefault(); items[0].focus();
    }
  }
  document.addEventListener('keydown', onKey);
  overlay.querySelector('[data-cancel]').addEventListener('click', close);
  overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });
  const form = overlay.querySelector('form');
  form.elements.namedItem('oldPassword').focus();
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const oldPassword = form.elements.namedItem('oldPassword').value;
    const newPassword = form.elements.namedItem('newPassword').value;
    const confirmation = form.elements.namedItem('confirmation').value;
    const error = form.querySelector('.error');
    if (newPassword !== confirmation) return (error.textContent = 'Пароли не совпадают.');
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      await request('/change-password', 'POST', { oldPassword, newPassword });
      close();
      state.csrf = '';
      state.programme = null;
      clearAutosave();
      loginPage();
      notice('Пароль изменён. Войдите с новым паролем.');
    } catch (problem) {
      error.textContent = problem.message;
    } finally {
      submit.disabled = false;
    }
  });
}
async function dispatchAction(action) {
  if (action.startsWith('view:')) {
    state.mobileView = action.slice(5);
    render();
    return;
  }
  if (action === 'save') return save();
  if (action === 'preview') return preview();
  if (action === 'publish') return publish();
  if (action === 'logout') return logout();
  if (action === 'history') return choose('history', 'history');
  if (action === 'settings') return choose('settings', 'settings');
  if (action === 'scene-settings') return choose('stage', state.stage);
  if (action === 'shared') return sharedSelect();
  if (action === 'add-stage') return addStage();
  if (action === 'add-session') return addEntry('session');
  if (action === 'add-event') return addEntry('event');
  if (action === 'add-common') return addEntry('event', true);
  if (action === 'delete-event' || action === 'delete-session') return deleteEntry();
  if (action === 'delete-stage') return deleteStage();
  if (action === 'clone-session') return duplicateSession();
  if (action === 'transfer-entry') return transferSession();
  if (action === 'export') return exportJson();
  if (action === 'import') return app.querySelector('#import-file')?.click();
  if (action === 'validate') return validateDraft();
  if (action === 'change-password') return changePassword();
  if (action === 'library-moderator') return mediaGallery('people', 'moderator');
  if (action.startsWith('library-person:')) return mediaGallery('people', action.slice('library-person:'.length));
  if (action.startsWith('library-photo:')) return mediaGallery('photo', action.slice('library-photo:'.length));
  if (action === 'add-talk') return addTalk();
  if (action === 'add-moderator') {
    const item = currentSelection().item;
    if (!item || item.kind !== 'session') return;
    item.moderator = { name: 'Новый модератор', role: '', photo: '' };
    state.editModerator = true;
    markDirty(); render();
    return;
  }
  if (action === 'edit-moderator') {
    state.editModerator = !state.editModerator;
    render();
    return;
  }
  if (action === 'remove-moderator') {
    if (!await confirmAction('Убрать модератора?', 'Он исчезнет из этой сессии только в черновике.', 'Убрать', true)) return;
    const item = currentSelection().item;
    if (item?.kind === 'session') { item.moderator = null; state.editModerator = false; markDirty(); render(); }
    return;
  }
  if (action.startsWith('stage:')) return stageSelect(action.slice(6));
  if (action.startsWith('entry:')) return choose('entry', action.slice(6));
  if (action.startsWith('common:')) return choose('common', action.slice(7));
  if (action.startsWith('restore:')) return restore(Number(action.slice(8)));
  if (action.startsWith('upload:')) {
    const scope = action.slice(7);
    return app.querySelector('[data-upload="' + CSS.escape(scope) + '"]')?.click();
  }
  if (action.startsWith('expand-talk:')) {
    const talkId = action.slice(12);
    state.expandedTalk = state.expandedTalk === talkId ? null : talkId;
    render();
    return;
  }
  const parts = action.split(':');
  const op = parts[0];
  if (op === 'move') return move(stageEntries(), Number(parts[1]), Number(parts[2]));
  if (op === 'stage-move') return move(state.programme.stages, Number(parts[1]), Number(parts[2]));
  if (op === 'talk-move') {
    const session = currentSelection().item;
    const index = session?.talks?.findIndex((talk) => talk.id === parts[1]);
    if (index >= 0) move(session.talks, index, Number(parts[2]));
    return;
  }
  if (op === 'delete-talk') return deleteTalk(parts[1]);
  if (op === 'add-speaker') return addSpeaker(parts[1]);
  if (op === 'remove-speaker') return removeSpeaker(parts[1], Number(parts[2]));
  if (op === 'speaker-move') {
    const talk = scopedItem('talk:' + parts[1]);
    if (talk) move(talk.speakers, Number(parts[2]), Number(parts[3]));
  }
}
function onFieldInput(control) {
  if (control.hasAttribute('data-time-part')) {
    const item = scopedItem(control.dataset.scope);
    if (!item) return;
    const [start, end] = String(item.time || '10:00–11:00').split(/\s*[–-]\s*/);
    const updated = control.dataset.timePart === 'start' ? [control.value, end] : [start, control.value];
    if (!updated[0] || !updated[1]) return;
    item.time = updated.join('–');
    markDirty();
    updateLiveLabels(item);
    return;
  }
  if (!control.matches('[data-field]') || control.type === 'checkbox' || control.tagName === 'SELECT') return;
  const item = scopedItem(control.dataset.scope);
  if (!item) return;
  item[control.dataset.field] = control.type === 'number' ? Number(control.value) : control.value;
  markDirty();
  if (!control.dataset.scope) updateLiveLabels(item);
}
app.addEventListener('click', (event) => {
  const jump = event.target.closest('[data-jump]');
  if (jump && app.contains(jump)) {
    event.preventDefault();
    const target = app.querySelector('#' + CSS.escape(jump.dataset.jump));
    if (!target) return;
    const panel = app.querySelector('.inspector');
    if (panel) panel.scrollTo({ top: target.getBoundingClientRect().top -
      panel.getBoundingClientRect().top + panel.scrollTop - 12, behavior: 'smooth' });
    return;
  }
  const action = event.target.closest('[data-action]');
  if (!action || !app.contains(action)) return;
  event.preventDefault();
  Promise.resolve(dispatchAction(action.dataset.action)).catch((error) => renderError(error.message));
});
app.addEventListener('input', (event) => {
  const input = event.target;
  if (input.id === 'agenda-search') {
    state.query = input.value;
    applySearch();
    return;
  }
  onFieldInput(input);
});
app.addEventListener('change', (event) => {
  const control = event.target;
  if (control.id === 'import-file') {
    importJson(control.files?.[0]).catch((error) => renderError(error.message));
    return;
  }
  if (control.matches('[data-upload]')) {
    uploadPhoto(control.dataset.upload, control).catch((error) => renderError(error.message));
    return;
  }
  if (!control.matches('[data-field]')) return;
  if (control.type !== 'checkbox' && control.tagName !== 'SELECT') return;
  const item = scopedItem(control.dataset.scope);
  if (!item) return;
  item[control.dataset.field] = control.type === 'checkbox' ? control.checked : control.value;
  markDirty();
  render();
});
app.addEventListener('error', (event) => {
  const image = event.target;
  if (!(image instanceof HTMLImageElement) || !image.matches('.photo-preview, .moderator-photo')) return;
  const placeholder = document.createElement('span');
  placeholder.className = image.className + ' photo-placeholder';
  placeholder.setAttribute('aria-label', 'Фото недоступно');
  placeholder.textContent = '◯';
  image.replaceWith(placeholder);
}, true);
app.addEventListener('dragstart', (event) => {
  const row = event.target.closest('.listrow[data-index]');
  if (!row) return;
  event.dataTransfer.setData('text/plain', row.dataset.index);
  event.dataTransfer.effectAllowed = 'move';
});
app.addEventListener('dragover', (event) => {
  if (event.target.closest('.listrow[data-index]')) event.preventDefault();
});
app.addEventListener('drop', (event) => {
  const row = event.target.closest('.listrow[data-index]');
  if (!row) return;
  event.preventDefault();
  const from = Number(event.dataTransfer.getData('text/plain'));
  const to = Number(row.dataset.index);
  const items = stageEntries();
  if (!Number.isInteger(from) || from < 0 || from >= items.length ||
      !Number.isInteger(to) || to < 0 || to >= items.length || from === to) return;
  items.splice(to, 0, items.splice(from, 1)[0]);
  markDirty();
  render();
});
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && state.programme) {
    event.preventDefault();
    if (document.querySelector('.modal-wrap')) return;
    if (state.mobileView !== 'agenda') {
      state.mobileView = 'agenda';
      render();
    }
    app.querySelector('#agenda-search')?.focus();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's' && state.programme) {
    event.preventDefault();
    if (!document.querySelector('.modal-wrap')) save().catch((error) => renderError(error.message));
  }
});
window.addEventListener('beforeunload', (event) => {
  if (state.dirty) { event.preventDefault(); event.returnValue = ''; }
});
(async () => {
  try {
    const session = await request('/session');
    if (session.authenticated) {
      state.csrf = session.csrf;
      await loadState();
    } else loginPage();
  } catch (error) {
    loginPage(error.message);
  }
})();
