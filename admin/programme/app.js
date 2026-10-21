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
  selection: { type: 'stage', id: 'main' },
  dirty: false,
  busy: false,
  editVersion: 0,
  mobileView: 'scenes',
};
let toastHandle;

function escapeHtml(value = '') {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character],
  );
}
const e = escapeHtml;
const findStage = () =>
  state.programme.stages.find((x) => x.id === state.stage) || state.programme.stages[0];
const makeId = (prefix) => {
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  return prefix + '-' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};
const label = (text) => `<span class="field-label">${e(text)}</span>`;
const button = (caption, action, cls = 'subtle', extra = '') =>
  `<button type="button" class="btn ${cls}" data-action="${e(action)}" ${extra}>${e(caption)}</button>`;
const iconBtn = (symbol, action, extra = '') => button(symbol, action, 'icon small', extra);
function notice(message, error = false) {
  document.querySelector('.toast')?.remove();
  const node = document.createElement('div');
  node.className = 'toast' + (error ? ' bad' : '');
  node.textContent = message;
  node.role = 'status';
  document.body.append(node);
  clearTimeout(toastHandle);
  toastHandle = setTimeout(() => node.remove(), 4400);
}
async function request(path, method = 'GET', payload, contentType = 'application/json') {
  const headers = {};
  if (method !== 'GET') {
    headers['X-Programme-Csrf'] = state.csrf;
    headers['Content-Type'] = contentType;
  }
  const response = await fetch(API + path, {
    method,
    headers,
    credentials: 'same-origin',
    cache: 'no-store',
    body:
      payload === undefined
        ? undefined
        : contentType === 'application/json'
          ? JSON.stringify(payload)
          : payload,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok)
    throw Error(json.error || 'Сервис временно недоступен (' + response.status + ').');
  return json;
}
function markDirty() {
  state.editVersion += 1;
  state.dirty = true;
  refreshStatus();
}
function refreshStatus() {
  const text = document.getElementById('save-state');
  const buttonSave = document.getElementById('save-draft');
  if (text) text.textContent = state.dirty ? 'Есть несохранённые изменения' : 'Черновик сохранён';
  if (buttonSave) buttonSave.disabled = !state.dirty || state.busy;
  for (const id of ['publish-programme', 'preview-programme', 'logout-programme']) {
    const control = document.getElementById(id);
    if (control) control.disabled = state.busy;
  }
}
async function loadState() {
  const data = await request('/admin');
  state.programme = structuredClone(data.draft.programme);
  state.revision = data.draft.revision;
  state.published = data.published;
  state.history = data.history;
  state.portraits = data.portraits;
  state.dirty = false;
  state.editVersion += 1;
  if (!state.programme.stages.some((s) => s.id === state.stage))
    state.stage = state.programme.stages[0].id;
  state.selection = { type: 'stage', id: state.stage };
  render();
}
function loginPage(error = '') {
  app.innerHTML = `<div class="login-layout">
    <section class="login-brand">
      <p class="brand-mark">DEBT <strong>TECH</strong></p>
      <h1>Управление <span>программой форума</span></h1>
      <p>Сцены, расписание, темы и спикеры. От черновика до публикации — в одном редакторе.</p>
    </section>
    <section class="login-panel">
      <h2>Вход в редактор</h2>
      <p>Введите пароль для доступа к расписанию DEBT TECH 2026.</p>
      <form id="login-form"><label class="field">Пароль
        <input name="password" autocomplete="current-password" required type="password">
      </label><div class="error" role="alert">${e(error)}</div>
      <button class="btn primary full" type="submit">Войти</button></form>
      <p class="muted login-note">Редактор не доступен через меню публичного сайта. Для изменений требуется авторизация.</p>
    </section></div>`;
  app.querySelector('#login-form').addEventListener('submit', async (evt) => {
    evt.preventDefault();
    const form = evt.currentTarget;
    const btn = form.querySelector('button');
    btn.disabled = true;
    try {
      const result = await request('/login', 'POST', { password: form.elements.password.value });
      state.csrf = result.csrf;
      await loadState();
    } catch (err) {
      loginPage(err.message);
    } finally {
      btn.disabled = false;
    }
  });
}
function mobileTabs() {
  const options = [
    ['scenes', 'Сцены'],
    ['agenda', 'Расписание'],
    ['editor', 'Редактор'],
  ];
  return (
    '<nav class="mobile-workspace-tabs" aria-label="Разделы редактора">' +
    options
      .map(([key, title]) =>
        button(title, 'view:' + key, 'mobile-tab' + (state.mobileView === key ? ' active' : '')),
      )
      .join('') +
    '</nav>'
  );
}

function topBar() {
  return `<header class="topbar">
    <div class="top-brand">
      <span class="brand-mark">DEBT <strong >TECH</strong></span>
      <span class="divider"></span><div><h1>Программа форума</h1>
      <p>Редактор расписания · тестовый сайт</p></div>
    </div>
    <div class="toolbar">
      <span class="top-status"><span class="dirty"></span><span class="muted" id="save-state"></span></span>
      ${button('Сохранить черновик', 'save', 'subtle', 'id="save-draft"')}
      ${button('Предпросмотр', 'preview', 'subtle', 'id="preview-programme"')}
      ${button('Опубликовать', 'publish', 'primary', 'id="publish-programme"')}
      ${button('Выйти', 'logout', 'subtle', 'id="logout-programme"')}
    </div></header>`;
}
function select(type, id) {
  state.selection = { type, id };
  state.mobileView = type === 'stage' ? 'agenda' : 'editor';
  render();
}
function move(items, index, direction) {
  const next = index + direction;
  if (next < 0 || next >= items.length) return;
  [items[index], items[next]] = [items[next], items[index]];
  markDirty();
  render();
}
function stageSelect(id) {
  state.stage = id;
  select('stage', id);
}
function render() {
  if (!state.programme) return;
  const positions = ['sidebar', 'listpane', 'inspector'].map(
    (name) => document.querySelector('.' + name)?.scrollTop || 0,
  );
  app.innerHTML = `<div class="shell" data-mobile-view="${state.mobileView}">${topBar()}${mobileTabs()}<div class="workspace">
    <aside class="panel sidebar">${sideBar()}</aside>
    <section class="panel listpane">${listPanel()}</section>
    <section class="panel inspector">${inspectorPanel()}</section>
  </div></div>`;
  ['sidebar', 'listpane', 'inspector'].forEach((name, i) => {
    app.querySelector('.' + name).scrollTop = positions[i];
  });
  refreshStatus();
}
function scopedItem(scope) {
  if (scope === 'programme') return state.programme;
  if (scope === 'moderator') return state.currentEdit?.moderator;
  if (scope?.startsWith('speaker:')) {
    const index = Number(scope.slice('speaker:'.length));
    return state.currentEdit?.speakers?.[index];
  }
  return state.currentEdit;
}

function settingsField(title, scope, property, options = {}) {
  const item = scope ? ` data-scope="${e(scope)}"` : '';
  const ref = `${item} data-field="${e(property)}"`;
  const value = scopedItem(scope)?.[property] ?? '';
  let control = '';
  if (options.type === 'textarea')
    control = `<textarea rows="${options.rows || 3}" ${ref}>${e(value)}</textarea>`;
  else if (options.select)
    control = `<select ${ref}>${options.select
      .map(([v, t]) => `<option value="${e(v)}" ${value === v ? 'selected' : ''}>${e(t)}</option>`)
      .join('')}</select>`;
  else
    control = `<input type="${options.type || 'text'}" value="${e(value)}" ${ref}
    ${options.placeholder ? `placeholder="${e(options.placeholder)}"` : ''}>`;
  return `<label class="field">${label(title)}${control}${options.hint ? `<small class="helper">${e(options.hint)}</small>` : ''}</label>`;
}
function checkField(title, property, obj = state.currentEdit) {
  return `<label class="switchlabel"><input type="checkbox" data-field="${e(property)}" ${obj[property] !== false ? 'checked' : ''}>${e(title)}</label>`;
}
function activeSelection() {
  const id = state.selection.id;
  if (state.selection.type === 'settings') return { type: 'settings', item: state.programme };
  if (state.selection.type === 'stage') return { type: 'stage', item: findStage() };
  if (state.selection.type === 'common')
    return { type: 'common', item: state.programme.commonEvents.find((x) => x.id === id) };
  const parent = findStage().entries.find((x) => x.id === id || x.talks?.some((t) => t.id === id));
  if (state.selection.type === 'talk' && parent)
    return { type: 'talk', item: parent.talks.find((t) => t.id === id), parent };
  return { type: 'entry', item: parent || findStage() };
}

function sideBar() {
  let html = `<p class="panel-kicker">Структура</p><h2>Сцены</h2>
    <p class="panel-summary">Выберите сцену. Порядок и видимость меняются отдельно.</p>
    <nav class="stage-nav">`;
  state.programme.stages.forEach((item, index) => {
    const selected = item.id === state.stage ? ' selected' : '';
    html += `<div class="stage-entry${selected}">
      <button class="stage-pick" data-action="stage:${e(item.id)}">
        <span class="stage-title">${e(item.title)}</span>
        <span class="stage-sub">${item.status === 'upcoming' ? 'Программа уточняется' : item.entries.length + ' элементов'}${item.visible === false ? ' · Скрыта' : ''}</span>
      </button>
      <div class="stage-order">${iconBtn('↑', 'stage-move:' + index + ':-1')}
        ${iconBtn('↓', 'stage-move:' + index + ':1')}</div>
    </div>`;
  });
  html += `</nav>${button('+ Добавить сцену', 'add-stage', 'full')}
    <div class="sectionhead"><h3>Общие события</h3>
      ${button('+', 'add-common', 'small')}</div><div class="stack">`;
  state.programme.commonEvents.forEach((entry, index) => {
    const selected =
      state.selection.type === 'common' && state.selection.id === entry.id ? ' selected' : '';
    html += `<div class="stage-entry${selected}"><button class="stage-pick" data-action="common:${e(entry.id)}">
      <span class="stage-title">${e(entry.time)}</span>
      <span class="stage-sub">${e(entry.title)}</span></button>
      <div class="stage-order">${iconBtn('↑', 'common-move:' + index + ':-1')}
        ${iconBtn('↓', 'common-move:' + index + ':1')}</div></div>`;
  });
  html += `</div><div class="sectionhead"><h3>Дополнительно</h3></div>
    <div class="stack">${button('Настройки программы', 'settings', 'full')}
      ${button('Проверить данные', 'validate', 'full')}
      ${button('Экспорт JSON', 'export', 'full')}
      ${button('Импорт JSON', 'import', 'full')}
      <input type="file" id="import-file" accept=".json,application/json">
    </div><div class="sectionhead"><h3>История публикаций</h3></div>`;
  if (!state.history.length) html += `<p class="muted">Предыдущих версий пока нет.</p>`;
  state.history.slice(0, 12).forEach((item) => {
    html += `<div class="history-item"><div><strong>Версия ${item.revision}</strong>
      <time>${e(new Date(item.updatedAt).toLocaleString('ru-RU'))}</time></div>
      ${button('Вернуть', 'restore:' + item.revision, 'small')}</div>`;
  });
  html += `<p class="sidebar-foot">Сохранение черновика и публикация — разные действия.
  Публичная версия не меняется, пока вы не нажмёте «Опубликовать».</p>`;
  return html;
}

function entryCard(entry, index) {
  const picked =
    (state.selection.type === 'entry' && state.selection.id === entry.id) ||
    (state.selection.type === 'talk' && entry.talks?.some((x) => x.id === state.selection.id));
  return `<article class="listrow${picked ? ' selected' : ''}${entry.visible === false ? ' ghosted' : ''}"
    draggable="true" data-index="${index}">
    <button type="button" class="listrow-main" data-action="entry:${e(entry.id)}">
      <span class="listrow-time">${e(entry.time)}
        ${entry.kind === 'session' ? ' · СЕССИЯ ' + entry.number : ' · СОБЫТИЕ'}</span>
      <span class="listrow-title">${e(entry.title)}</span>
      <span class="listrow-meta">${
        entry.visible === false
          ? 'Скрыто на сайте'
          : entry.kind === 'session'
            ? entry.talks.length + ' выступлений'
            : 'Общее событие'
      }</span>
    </button>
    <div class="listrow-order">
      ${iconBtn('↑', 'entry-move:' + index + ':-1')}
      ${iconBtn('↓', 'entry-move:' + index + ':1')}
    </div></article>`;
}

function listPanel() {
  const selected = findStage();
  return `<p class="panel-kicker">Расписание</p><h2>${e(selected.title)}</h2>
    <p class="panel-summary">${
      selected.status === 'upcoming'
        ? 'Пока программа сцены уточняется. Подготовьте события, затем переключите статус в «Опубликована».'
        : 'События отображаются сверху вниз. Меняйте порядок перетаскиванием или стрелками.'
    }</p>
    <div class="sectionhead"><h3>События и сессии</h3>
      <span class="inline-actions">${button('+ Сессия', 'add-session', 'small')}
        ${button('+ Событие', 'add-event', 'small')}</span></div>
    <div class="card-list">${
      selected.entries.length
        ? selected.entries.map(entryCard).join('')
        : '<p class="panel-summary">На этой сцене пока ничего нет. Создайте сессию или событие.</p>'
    }
    </div><p class="sidebar-foot">Можно подготовить программу заранее.
    Скрытые элементы и неопубликованные сцены не видны посетителям.</p>`;
}

function editHeader(label, title) {
  return `<div class="inspector-toolbar"><div>
    <p class="kicker">${e(label)}</p><h2>${e(title)}</h2>
    </div></div>`;
}
function peoplePhoto(person, scope) {
  const src = person.photo || '';
  const image = src
    ? `<img class="photo-preview" src="${e(src)}" alt="Фото">`
    : '<span class="photo-preview">Фото</span>';
  const groups = new Map();
  const missing = src && !state.portraits.some((p) => p.url === src);
  state.portraits.forEach((item) => {
    const group = groups.get(item.group) || [];
    group.push(
      `<option value="${e(item.url)}" ${src === item.url ? 'selected' : ''}>${e(item.name)}</option>`,
    );
    groups.set(item.group, group);
  });
  let options = `<option value="" ${!src ? 'selected' : ''}>По имени / заглушка</option>`;
  if (missing) options += `<option selected value="${e(src)}">${e(src)}</option>`;
  for (const [title, entries] of groups)
    options += `<optgroup label="${e(title)}">${entries.join('')}</optgroup>`;
  return `<div class="field"><label class="field-label">Фотография</label>
    ${image}<select data-scope="${e(scope)}" data-field="photo">${options}</select>
    <input type="file" accept=".jpg,.jpeg,.png,.webp,image/*" class="photo-upload" data-upload="${e(scope)}">
    ${button('Загрузить фото', 'upload:' + scope, 'small')}
    <small class="helper">До 4 МБ. При выборе файл загрузится в библиотеку.
    Сохраните черновик, затем опубликуйте.</small></div>`;
}

function personFields(person, scope) {
  return `${settingsField('Имя и фамилия', scope, 'name')}
    ${settingsField('Должность и организация', scope, 'role', { type: 'textarea', rows: 2 })}
    ${peoplePhoto(person, scope)}`;
}

function inspectorPanel() {
  const { type, item, parent } = activeSelection();
  state.currentEdit = item;
  if (!item) return '<p class="editor-note">Элемент не найден. Выберите другой.</p>';
  let html = '';
  if (type === 'settings') {
    html += editHeader('Программа', 'Общие настройки');
    html += settingsField('Примечание под заголовком', 'programme', 'note', {
      type: 'textarea',
      rows: 3,
    });
    html +=
      '<p class="editor-note">Черновик виден только редакторам, а посетители видят опубликованные данные.</p>';
    html += button('Сменить пароль', 'change-password');
  }
  if (type === 'stage') {
    html += editHeader('Сцена', item.title);
    html += settingsField('Название сцены', '', 'title');
    html += settingsField('Подпись под названием', '', 'description');
    html += settingsField('Состояние на сайте', '', 'status', {
      select: [
        ['published', 'Программа опубликована'],
        ['upcoming', 'Программа уточняется'],
      ],
    });
    html += checkField('Показывать сцену', 'visible', item);
    html +=
      '<p class="editor-note inspector-note">Готовьте расписание заранее. Пока программа уточняется, посетители видят только заглушку.</p>';
    if (state.programme.stages.length > 1)
      html += button('Удалить сцену', 'delete-stage', 'danger');
  }
  if (type === 'common' || (type === 'entry' && item.kind === 'event')) {
    html += editHeader(type === 'common' ? 'Общее событие' : 'Событие', item.title);
    html += settingsField('Время (09:00–10:00)', '', 'time');
    html += settingsField('Название события', '', 'title', { type: 'textarea', rows: 3 });
    html += checkField('Показывать событие', 'visible', item);
    html += '<div class="separator"></div>' + button('Удалить событие', 'delete-event', 'danger');
  }

  if (type === 'entry' && item.kind === 'session') {
    html += editHeader('Сессия ' + item.number, item.title);
    html += `<div class="form-grid">
      ${settingsField('Время (10:00–12:00)', '', 'time')}
      ${settingsField('Номер сессии', '', 'number', { type: 'number' })}
    </div>`;
    html += settingsField('Название сессии', '', 'title', { type: 'textarea', rows: 3 });
    html += settingsField('Формат', '', 'category');
    html += settingsField('Дополнительная заметка', '', 'additionalNote', {
      type: 'textarea',
      rows: 2,
    });
    html += checkField('Показывать сессию', 'visible', item);
    html += `<div class="sectionhead"><h3>Модератор</h3><div class="inline-actions">${
      item.moderator
        ? button('Убрать', 'remove-moderator', 'small danger')
        : button('+ Указать', 'add-moderator', 'small')
    }</div></div>`;
    if (item.moderator)
      html += `<div class="boxed">${personFields(item.moderator, 'moderator')}</div>`;
    else
      html +=
        '<p class="editor-note">Модератор не указан. На сайте будет нейтральная заглушка.</p>';
    html += `<div class="sectionhead"><h3>Выступления</h3>
      ${button('+ Выступление', 'add-talk', 'small')}</div>`;
    html += '<div class="card-list">';
    if (!item.talks.length) html += '<p class="panel-summary">Добавьте выступление и спикеров.</p>';
    item.talks.forEach((talk, index) => {
      html += `<article class="listrow${talk.visible === false ? ' ghosted' : ''}">
        <button class="listrow-main" data-action="talk:${e(talk.id)}">
          <span class="listrow-title">${e(talk.title || talk.note || 'Тема уточняется')}</span>
          <span class="listrow-meta">${e(talk.speakers.map((x) => x.name).join(', ') || 'Без спикеров')}</span>
        </button><div class="listrow-order">${iconBtn('↑', 'talk-move:' + index + ':-1')}
        ${iconBtn('↓', 'talk-move:' + index + ':1')}</div></article>`;
    });
    html += '</div><div class="separator"></div>';
    if (state.programme.stages.length > 1) {
      html +=
        '<label class="field">Перенести сессию в другую сцену<select id="transfer-stage">' +
        state.programme.stages
          .filter((x) => x.id !== state.stage)
          .map((x) => '<option value="' + e(x.id) + '">' + e(x.title) + '</option>')
          .join('') +
        '</select></label>' +
        button('Перенести в выбранную сцену', 'transfer-entry');
    }
    html += '<div class="inline-actions">';
    html += button('Дублировать сессию', 'clone-session');
    html += button('Удалить сессию', 'delete-session', 'danger');
    html += '</div>';
  }

  if (type === 'talk') {
    html += editHeader('Выступление', parent.title);
    html +=
      button('← Назад к сессии', 'entry:' + parent.id, 'small') + '<div class="separator"></div>';
    html += settingsField('Тема выступления', '', 'title', {
      type: 'textarea',
      rows: 3,
      hint: 'Если тема пока не согласована, можно оставить поле пустым.',
    });
    html += settingsField('Примечание', '', 'note', {
      type: 'textarea',
      rows: 2,
      hint: 'Например, «Тема уточняется».',
    });
    html += checkField('Показывать выступление', 'visible', item);
    html += `<div class="sectionhead"><h3>Спикеры</h3>
      ${button('+ Спикер', 'add-speaker', 'small')}</div>`;
    if (!item.speakers.length) html += '<p class="panel-summary">Здесь пока нет спикеров.</p>';
    item.speakers.forEach((person, index) => {
      html += `<div class="boxed"><div class="inspector-toolbar"><h3>Спикер ${index + 1}</h3>
        ${button('Удалить', 'remove-speaker:' + index, 'small danger')}</div>
        ${personFields(person, 'speaker:' + index)}
        <div class="inline-actions">
          ${button('↑ Выше', 'speaker-move:' + index + ':-1', 'small')}
          ${button('↓ Ниже', 'speaker-move:' + index + ':1', 'small')}
        </div></div>`;
    });
    html +=
      '<div class="separator"></div>' + button('Удалить выступление', 'delete-talk', 'danger');
  }
  html +=
    '<div class="footer-line">Сохраните черновик, проверьте его в предпросмотре и только затем опубликуйте.</div>';
  return html;
}

function createEntry(kind, common = false) {
  const item =
    kind === 'session'
      ? {
          id: makeId('session'),
          kind: 'session',
          number: findStage().entries.filter((x) => x.kind === 'session').length + 1,
          title: 'Новая сессия',
          time: '10:00–11:00',
          category: 'Практическая сессия',
          moderator: null,
          visible: true,
          additionalNote: '',
          talks: [],
        }
      : {
          id: makeId('event'),
          kind: 'event',
          time: '12:00–12:30',
          title: 'Новое событие',
          visible: true,
        };
  (common ? state.programme.commonEvents : findStage().entries).push(item);
  state.selection = { type: common ? 'common' : 'entry', id: item.id };
  state.mobileView = 'editor';
  markDirty();
  render();
}
function removeEntry(item, type) {
  const list = type === 'common' ? state.programme.commonEvents : findStage().entries;
  const index = list.findIndex((x) => x.id === item.id);
  if (index < 0 || !confirm('Удалить «' + item.title + '» из черновика?')) return;
  list.splice(index, 1);
  state.selection = { type: 'stage', id: state.stage };
  markDirty();
  render();
}
function deleteStage() {
  if (state.programme.stages.length <= 1) return notice('Нельзя удалить последнюю сцену.', true);
  if (!confirm('Удалить сцену и все её события из черновика?')) return;
  const index = state.programme.stages.findIndex((s) => s.id === state.stage);
  state.programme.stages.splice(index, 1);
  state.stage = state.programme.stages[0].id;
  state.selection = { type: 'stage', id: state.stage };
  markDirty();
  render();
}
function duplicateSession(item) {
  const copy = structuredClone(item);
  copy.id = makeId('session');
  copy.talks.forEach((t) => (t.id = makeId('talk')));
  const list = findStage().entries;
  list.splice(list.indexOf(item) + 1, 0, copy);
  state.selection = { type: 'entry', id: copy.id };
  markDirty();
  render();
}
function addStage() {
  if (state.programme.stages.length >= 8) return notice('Не больше восьми сцен.', true);
  const next = {
    id: makeId('stage'),
    title: 'Новая сцена',
    description: 'Программа уточняется',
    visible: true,
    status: 'upcoming',
    entries: [],
  };
  state.programme.stages.push(next);
  state.stage = next.id;
  state.selection = { type: 'stage', id: next.id };
  state.mobileView = 'agenda';
  markDirty();
  render();
}
function addTalk(session) {
  const talk = {
    id: makeId('talk'),
    title: 'Новое выступление',
    note: '',
    visible: true,
    speakers: [],
  };
  session.talks.push(talk);
  state.selection = { type: 'talk', id: talk.id };
  state.mobileView = 'editor';
  markDirty();
  render();
}
function removeTalk(talk, session) {
  if (!confirm('Удалить выступление из сессии?')) return;
  session.talks.splice(session.talks.indexOf(talk), 1);
  state.selection = { type: 'entry', id: session.id };
  markDirty();
  render();
}
async function save() {
  if (!state.dirty || state.busy) return;
  state.busy = true;
  const version = state.editVersion;
  const snapshot = structuredClone(state.programme);
  refreshStatus();
  try {
    const payload = await request('/draft', 'PUT', {
      expectedRevision: state.revision,
      programme: snapshot,
    });
    state.revision = payload.draft.revision;
    if (version === state.editVersion) {
      state.programme = structuredClone(payload.draft.programme);
      state.dirty = false;
      render();
      notice('Черновик сохранён. На сайте пока ничего не изменилось.');
    } else {
      notice('Первая версия сохранена. Новые правки остались в редакторе — сохраните ещё раз.');
    }
  } finally {
    state.busy = false;
    refreshStatus();
  }
}
async function publish() {
  if (state.busy) return;
  if (state.dirty) await save();
  if (state.dirty)
    throw Error('Во время сохранения появились новые правки. Сохраните их перед публикацией.');
  if (!confirm('Опубликовать программу в тестовой песочнице? Изменения станут видны посетителям.'))
    return;
  const version = state.editVersion;
  state.busy = true;
  refreshStatus();
  try {
    const result = await request('/publish', 'POST', {
      expectedRevision: state.revision,
      expectedPublishedRevision: state.published.revision,
    });
    state.published = result.published;
    if (version === state.editVersion) {
      await loadState();
      notice('Программа опубликована в песочнице.');
    } else {
      notice('Сохранённая версия опубликована. Новые правки остались в черновике.');
    }
  } finally {
    state.busy = false;
    refreshStatus();
  }
}
async function preview() {
  if (state.busy) return;
  const opened = window.open('about:blank', '_blank');
  if (!opened) throw Error('Разрешите открытие вкладок для предпросмотра.');
  opened.opener = null;
  try {
    if (state.dirty) await save();
    if (state.dirty) throw Error('Новые правки ещё не сохранены. Повторите предпросмотр.');
    opened.location.href = '/programme-admin/preview#programme';
  } catch (error) {
    opened.close();
    throw error;
  }
}
async function logout() {
  if (state.dirty && !confirm('Есть несохранённые изменения. Выйти без сохранения?')) return;
  await request('/logout', 'POST', {});
  state.programme = null;
  state.csrf = '';
  loginPage();
}
async function restore(revision) {
  if (state.dirty && !confirm('Несохранённые изменения будут потеряны. Продолжить?')) return;
  if (
    !confirm(
      'Восстановить версию ' + revision + ' в черновик? Опубликованная программа не изменится.',
    )
  )
    return;
  await request('/restore', 'POST', { revision, expectedRevision: state.revision });
  await loadState();
  notice('Прошлая версия загружена в черновик.');
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
}
async function importJson(file) {
  if (!file) return;
  if (file.size > 1_000_000) throw Error('JSON-файл превышает 1 МБ.');
  let json;
  try {
    json = JSON.parse(await file.text());
  } catch {
    throw Error('Файл не содержит корректный JSON.');
  }
  const { programme } = await request('/validate', 'POST', { programme: json });
  if (!confirm('Заменить текущие изменения проверенными данными из файла?')) return;
  state.programme = programme;
  state.stage = programme.stages[0].id;
  state.selection = { type: 'stage', id: state.stage };
  markDirty();
  render();
  notice('Файл проверен и загружен в черновик. Сохраните его для предпросмотра.');
}
async function validateDraft() {
  const { programme } = await request('/validate', 'POST', { programme: state.programme });
  const count = programme.stages.reduce((total, stage) => total + stage.entries.length, 0);
  notice('Проверка пройдена: ' + programme.stages.length + ' сцен, ' + count + ' событий и сессий. Данные не публиковались.');
}

async function changePassword() {
  const oldPassword = prompt('Текущий пароль');
  if (!oldPassword) return;
  const newPassword = prompt('Новый пароль (от 14 до 128 символов)');
  if (!newPassword) return;
  if (newPassword.length < 14 || newPassword.length > 128)
    throw Error('Пароль должен содержать от 14 до 128 символов.');
  await request('/change-password', 'POST', { oldPassword, newPassword });
  state.csrf = '';
  state.programme = null;
  loginPage();
  notice('Пароль обновлён. Войдите ещё раз с новым паролем.');
}
async function uploadPhoto(scope, input) {
  const file = input.files?.[0];
  if (!file) return;
  if (file.size > 4_000_000) throw Error('Максимальный размер фотографии — 4 МБ.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw Error('Поддерживаются JPG, PNG, WebP.');
  const selection = { ...state.selection };
  const current = activeSelection().item;
  const person =
    scope === 'moderator' ? current?.moderator : current?.speakers?.[Number(scope.split(':')[1])];
  if (!person) throw Error('Выберите модератора или спикера для загрузки.');
  input.disabled = true;
  try {
    const result = await request('/upload', 'POST', file, file.type);
    const stillPresent = state.programme.stages.some((stage) =>
      stage.entries.some((entry) =>
        entry.moderator === person ||
        entry.talks?.some((talk) => talk.speakers.includes(person)),
      ),
    );
    if (!stillPresent) throw Error('Участник был удалён во время загрузки. Фото осталось в библиотеке.');
    person.photo = result.url;
    state.portraits.unshift({ group: 'Загруженные фотографии', name: file.name, url: result.url });
    markDirty();
    if (state.selection.id === selection.id && state.selection.type === selection.type) render();
    notice('Фотография привязана к выбранному участнику. Сохраните черновик.');
  } finally {
    if (input.isConnected) input.disabled = false;
  }
}
async function dispatchAction(action) {
  if (action.startsWith('view:')) {
    state.mobileView = action.slice(5);
    render();
    return;
  }
  if (action === 'save') return save();
  if (action === 'publish') return publish();
  if (action === 'preview') return preview();
  if (action === 'logout') return logout();
  if (action === 'settings') return select('settings', 'settings');
  if (action === 'add-stage') return addStage();
  if (action === 'add-event') return createEntry('event');
  if (action === 'add-session') return createEntry('session');
  if (action === 'add-common') return createEntry('event', true);
  if (action === 'change-password') return changePassword();
  if (action === 'transfer-entry') {
    const targetId = document.getElementById('transfer-stage')?.value;
    const destination = state.programme.stages.find((x) => x.id === targetId);
    const oldStage = findStage();
    const item = activeSelection().item;
    if (!destination || item?.kind !== 'session') throw Error('Невозможно перенести сессию.');
    if (!confirm('Перенести «' + item.title + '» в «' + destination.title + '»?')) return;
    oldStage.entries.splice(oldStage.entries.indexOf(item), 1);
    destination.entries.push(item);
    state.stage = destination.id;
    state.selection = { type: 'entry', id: item.id };
    state.mobileView = 'editor';
    markDirty();
    render();
    return;
  }
  if (action === 'delete-stage') return deleteStage();
  if (action === 'export') return exportJson();
  if (action === 'import') return document.getElementById('import-file')?.click();
  if (action === 'validate') return validateDraft();
  if (action.startsWith('stage:')) return stageSelect(action.slice(6));
  if (action.startsWith('common:')) return select('common', action.slice(7));
  if (action.startsWith('entry:')) return select('entry', action.slice(6));
  if (action.startsWith('talk:')) return select('talk', action.slice(5));
  if (action.startsWith('restore:')) return restore(Number(action.split(':')[1]));
  if (action.startsWith('upload:'))
    return document.querySelector(`[data-upload="${CSS.escape(action.slice(7))}"]`)?.click();
  const parts = action.split(':');
  const code = parts[0],
    index = Number(parts[1]),
    delta = Number(parts[2]);
  if (code === 'stage-move') return move(state.programme.stages, index, delta);
  if (code === 'common-move') return move(state.programme.commonEvents, index, delta);
  if (code === 'entry-move') return move(findStage().entries, index, delta);
  const { type, item, parent } = activeSelection();
  if (code === 'delete-event') return removeEntry(item, type);
  if (code === 'delete-session') return removeEntry(item, 'entry');
  if (code === 'clone-session') return duplicateSession(item);
  if (code === 'add-moderator') {
    item.moderator = { name: 'Новый модератор', role: '', photo: '' };
    markDirty();
    render();
    return;
  }
  if (code === 'remove-moderator') {
    if (!confirm('Убрать модератора из черновика?')) return;
    item.moderator = null;
    markDirty();
    render();
    return;
  }
  if (code === 'add-talk') return addTalk(item);
  if (code === 'delete-talk') return removeTalk(item, parent);
  if (code === 'talk-move') return move(item.talks, index, delta);
  if (code === 'add-speaker') {
    item.speakers.push({ name: 'Новый спикер', role: '', photo: '' });
    markDirty();
    render();
    return;
  }
  if (code === 'speaker-move') return move(item.speakers, index, delta);
  if (code === 'remove-speaker') {
    if (!confirm('Удалить спикера из выступления?')) return;
    item.speakers.splice(index, 1);
    markDirty();
    render();
    return;
  }
}
app.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button || !app.contains(button)) return;
  event.preventDefault();
  Promise.resolve(dispatchAction(button.dataset.action)).catch((error) =>
    notice(error.message, true),
  );
});
app.addEventListener('input', (event) => {
  const control = event.target;
  if (
    !control.matches('[data-field]') ||
    control.type === 'checkbox' ||
    control.tagName === 'SELECT'
  )
    return;
  const scope = control.dataset.scope;
  const item = scopedItem(scope);
  if (!item) return;
  item[control.dataset.field] = control.type === 'number' ? Number(control.value) : control.value;
  markDirty();
});
app.addEventListener('change', (event) => {
  const control = event.target;
  if (control.id === 'import-file') {
    Promise.resolve(importJson(control.files?.[0])).catch((err) => notice(err.message, true));
    return;
  }
  if (control.classList.contains('photo-upload')) {
    Promise.resolve(uploadPhoto(control.dataset.upload, control)).catch((err) =>
      notice(err.message, true),
    );
    return;
  }
  if (!control.matches('[data-field]')) return;
  const scope = control.dataset.scope;
  const item = scopedItem(scope);
  if (!item) return;
  item[control.dataset.field] =
    control.type === 'checkbox'
      ? control.checked
      : control.type === 'number'
        ? Number(control.value)
        : control.value;
  markDirty();
  if (control.type === 'checkbox' || control.tagName === 'SELECT') render();
});
app.addEventListener('dragstart', (event) => {
  const row = event.target.closest('[data-index]');
  if (row) {
    event.dataTransfer.setData('text/plain', row.dataset.index);
    event.dataTransfer.effectAllowed = 'move';
  }
});
app.addEventListener('dragover', (event) => {
  if (event.target.closest('[data-index]')) event.preventDefault();
});
app.addEventListener('drop', (event) => {
  const row = event.target.closest('[data-index]');
  if (!row) return;
  event.preventDefault();
  const from = Number(event.dataTransfer.getData('text/plain')),
    to = Number(row.dataset.index);
  const entries = findStage().entries;
  if (
    !Number.isInteger(from) ||
    from < 0 ||
    from >= entries.length ||
    !Number.isInteger(to) ||
    to < 0 ||
    to >= entries.length ||
    from === to
  )
    return;
  entries.splice(to, 0, entries.splice(from, 1)[0]);
  markDirty();
  render();
});
window.addEventListener('beforeunload', (event) => {
  if (state.dirty) {
    event.preventDefault();
    event.returnValue = '';
  }
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
