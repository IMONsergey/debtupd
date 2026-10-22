const root = document.getElementById('app');
const state = {
  csrf: '',
  list: [],
  publishedList: [],
  revision: 0,
  publishedRevision: 0,
  history: [],
  photos: [],
  selected: '',
  search: '',
  filter: 'all',
  mobileView: 'list',
  busy: false,
  dirty: false,
  editVersion: 0,
  saveError: '',
};
let saveTimer;
let noticeTimer;

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (letter) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[letter],
);
const e = escapeHtml;
const randomId = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return 'speaker-' + [...bytes].map((part) => part.toString(16).padStart(2, '0')).join('');
};
const selected = () => state.list.find((item) => item.id === state.selected);
const photoUrl = (speaker) => speaker?.photo ||
  (speaker?.image ? '/assets/figma/' + speaker.image.replace(/\.png$/i, '.webp') : '');
const counts = () => ({
  all: state.list.length,
  visible: state.list.filter((person) => person.visible !== false).length,
  hidden: state.list.filter((person) => person.visible === false).length,
});
const changedSincePublication = () => JSON.stringify(state.list) !== JSON.stringify(state.publishedList);

function notify(text, error = false) {
  document.querySelector('.toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'toast' + (error ? ' bad' : '');
  toast.setAttribute('role', error ? 'alert' : 'status');
  toast.textContent = text;
  document.body.append(toast);
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => toast.remove(), 5200);
}

async function request(path, method = 'GET', body, type = 'application/json') {
  const headers = {};
  if (method !== 'GET') {
    headers['Content-Type'] = type;
    headers['X-Programme-Csrf'] = state.csrf;
  }
  const response = await fetch(path, {
    credentials: 'same-origin',
    cache: 'no-store',
    method,
    headers,
    body: body === undefined ? undefined : type === 'application/json' ? JSON.stringify(body) : body,
  });
  const json = await response.json().catch(() => ({}));
  if (response.status === 401) {
    location.assign('/programme-admin/');
    throw Error('Необходимо войти в редактор.');
  }
  if (!response.ok) throw Error(json.error || 'Запрос не выполнен (' + response.status + ').');
  return json;
}
function stopAutosave() {
  clearTimeout(saveTimer);
  saveTimer = null;
}
function markDirty() {
  state.editVersion++;
  state.dirty = true;
  state.saveError = '';
  refreshStatus();
  queueSave();
}
function queueSave(delay = 1900) {
  stopAutosave();
  if (!state.dirty) return;
  saveTimer = setTimeout(() => {
    if (state.busy) queueSave(600);
    else saveDraft({ quiet: true }).catch(() => {});
  }, delay);
}
function refreshStatus() {
  const label = document.querySelector('#speakers-save-state');
  const wording = state.busy ? 'Сохраняем…' :
    state.saveError ? 'Ошибка: ' + state.saveError :
    state.dirty ? 'Автосохранение черновика…' :
    changedSincePublication() ? 'Черновик сохранён · ещё не на сайте' :
    'Все изменения опубликованы';
  if (label) { label.textContent = wording; label.title = wording; }
  const badge = document.querySelector('.save-indicator');
  badge?.classList.toggle('is-dirty', state.dirty || !!state.saveError);
  badge?.classList.toggle('is-unpublished', !state.dirty && changedSincePublication());
  const save = document.querySelector('#speakers-save');
  if (save) save.disabled = state.busy || !state.dirty;
  const publish = document.querySelector('#speakers-publish');
  if (publish) {
    publish.disabled = state.busy || (!state.dirty && !changedSincePublication());
    publish.title = publish.disabled ? 'На сайте уже последняя версия' :
      'Опубликовать черновик со спикерами на сайте';
  }
}

async function loadData() {
  stopAutosave();
  const response = await request('/api/speakers/admin');
  state.list = structuredClone(response.draft.speakers);
  state.revision = response.draft.revision;
  state.publishedRevision = response.published.revision;
  state.publishedList = structuredClone(response.published.speakers);
  state.history = response.history;
  state.photos = response.portraits;
  state.dirty = false;
  state.saveError = '';
  state.editVersion++;
  if (!selected()) state.selected = state.list[0]?.id || '';
  render();
}
async function init() {
  try {
    const session = await request('/api/programme/session');
    if (!session.authenticated || !session.csrf) {
      location.assign('/programme-admin/');
      return;
    }
    state.csrf = session.csrf;
    await loadData();
  } catch (err) {
    root.innerHTML = '<div class="speakers-fatal"><h1>Редактор недоступен</h1>' +
      '<p>' + e(err.message) + '</p><button class="btn primary" onclick="location.reload()">Повторить</button></div>';
  }
}

function button(label, action, cls = 'subtle', attrs = '') {
  return '<button type="button" class="btn ' + cls + '" data-action="' +
    e(action) + '" ' + attrs + '>' + e(label) + '</button>';
}
function topbar() {
  return '<header class="topbar">' +
    '<div class="top-brand"><span class="brand-mark">DEBT <strong>TECH</strong></span>' +
    '<span class="brand-divider"></span><div class="top-title">' +
    '<h1>Управление сайтом</h1><p>Редактор контента <span class="environment">Продакшен</span></p></div></div>' +
    '<nav class="admin-section-nav" aria-label="Разделы админки">' +
    '<a href="/programme-admin/">Программа</a>' +
    '<a href="/programme-admin/speakers/" class="active" aria-current="page">Спикеры</a></nav>' +
    '<div class="toolbar"><div class="top-status" aria-live="polite"><span class="save-indicator"></span>' +
    '<span id="speakers-save-state"></span></div>' +
    button('Предпросмотр', 'preview', 'subtle', 'id="speakers-preview"') +
    button('Сохранить', 'save', 'subtle save', 'id="speakers-save" title="Сохранить черновик (Ctrl/⌘+S)"') +
    button('Опубликовать', 'publish', 'primary', 'id="speakers-publish"') +
    '<details class="tools-menu"><summary class="btn subtle">Ещё ⌄</summary>' +
    '<div class="tools-menu__content">' +
    button('История публикаций', 'history', 'menu-action') +
    button('Проверить список', 'validate', 'menu-action') +
    '<span class="menu-rule"></span><a class="btn menu-action" href="/programme-admin/">Редактор программы</a>' +
    '</div></details></div></header>';
}
function filters() {
  const c = counts();
  return '<div class="speaker-filters" role="group" aria-label="Фильтр спикеров">' +
    [['all','Все',c.all],['visible','На сайте',c.visible],['hidden','Скрытые',c.hidden]].map(([id,label,count]) =>
      '<button type="button" data-filter="' + id + '" aria-pressed="' + (state.filter === id) +
      '" class="' + (state.filter === id ? 'is-active' : '') + '">' + label +
      '<span>' + count + '</span></button>').join('') + '</div>';
}
function speakerRow(person, index) {
  const photo = photoUrl(person);
  return '<article class="speaker-list-row' + (person.id === state.selected ? ' selected' : '') +
    (person.visible === false ? ' is-hidden' : '') + '" data-position="' + index + '" draggable="true">' +
    '<button type="button" class="speaker-list-pick" data-action="select:' + e(person.id) + '" aria-current="' +
    (state.selected === person.id ? 'true' : 'false') + '">' +
    (photo ? '<img src="' + e(photo) + '" loading="lazy" alt="">' :
      '<span class="speaker-mini-fallback" aria-hidden="true">◯</span>') +
    '<span class="speaker-list-name"><strong>' + e(person.name || 'Новый спикер') + '</strong>' +
    '<small>' + e(person.role || 'Должность не указана') + '</small></span>' +
    (person.visible === false ? '<span class="speaker-hidden-marker">Скрыт</span>' : '') +
    '</button><div class="speaker-row-order">' +
    button('↑', 'move:' + index + ':-1', 'order-btn', 'aria-label="Выше" title="Выше"' +
      (index === 0 ? ' disabled' : '')) +
    button('↓', 'move:' + index + ':1', 'order-btn', 'aria-label="Ниже" title="Ниже"' +
      (index === state.list.length - 1 ? ' disabled' : '')) +
    '</div></article>';
}
function listPanel() {
  return '<div class="speaker-list-header"><span class="eyebrow">УЧАСТНИКИ САЙТА</span>' +
    '<h2>Спикеры <span class="count">' + state.list.length + '</span></h2>' +
    '<p>Порядок карточек соответствует порядку на сайте.</p>' +
    button('+ Добавить спикера', 'add', 'primary full') +
    '</div><div class="speaker-search"><input id="speaker-search" type="search" ' +
    'placeholder="Поиск по ФИО и должности" value="' + e(state.search) + '" autocomplete="off" aria-label="Поиск спикера"></div>' +
    filters() +
    '<div class="speaker-list" aria-label="Карточки спикеров">' +
    state.list.map(speakerRow).join('') +
    '</div><div class="speaker-search-empty" hidden>По запросу ничего не найдено.</div>' +
    '<p class="agenda-foot">Перетаскивайте карточки или используйте стрелки. Ctrl/⌘+K — поиск.</p>';
}

function speakerEditor() {
  const person = selected();
  if (!person) return '<div class="speaker-editor-empty"><h2>Выберите спикера</h2>' +
    '<p>Нажмите на карточку слева или создайте нового участника.</p>' +
    button('+ Добавить спикера', 'add', 'primary') + '</div>';
  const src = photoUrl(person);
  const isVisible = person.visible !== false;
  const onSite = state.publishedList.some((item) => item.id === person.id && item.visible);
  const isNew = !state.publishedList.some((item) => item.id === person.id);
  const portrait = src
    ? '<img class="speaker-edit-image" src="' + e(src) + '" alt="Фото спикера">'
    : '<div class="speaker-edit-image speaker-photo-empty"><span>◯</span><small>Нет фотографии</small></div>';
  const number = state.list.indexOf(person) + 1;
  return '<div class="speaker-editor-title">' +
    '<div><span class="eyebrow">КАРТОЧКА ' + String(number).padStart(2,'0') +
    ' / ' + state.list.length + '</span><h2 id="speaker-heading">' +
    e(person.name || 'Новый спикер') + '</h2><p>Изменения сохраняются в черновик автоматически.</p></div>' +
    '<span class="speaker-record-status' + (isVisible ? ' on' : '') + '">' +
    (isVisible ? (onSite ? 'Сейчас на сайте' : 'После публикации') :
      (onSite ? 'Скроется после публикации' : 'Скрыт с сайта')) +
    '</span></div><div class="speaker-edit-card">' +
    '<div class="speaker-edit-fields">' +
    '<label class="field"><span class="field-label">Имя и фамилия</span>' +
    '<input data-speaker-field="name" type="text" value="' + e(person.name) +
    '" placeholder="Например: Анна Иванова" maxlength="160" autocomplete="off"></label>' +
    '<label class="field"><span class="field-label">Должность и организация</span>' +
    '<textarea data-speaker-field="role" rows="4" maxlength="500" placeholder="Должность, компания или организация">' +
    e(person.role) + '</textarea></label>' +
    '<label class="visibility-toggle speaker-visible-toggle"><input type="checkbox" data-speaker-field="visible"' +
    (isVisible ? ' checked' : '') + '><span class="visibility-switch" aria-hidden="true"></span>' +
    '<span>Показывать на сайте</span></label>' +
    '<p class="speaker-field-note">' +
    (isNew
      ? 'Новый спикер пока не виден посетителям. Заполните ФИО, должность и фотографию, включите показ и опубликуйте.'
      : 'Изменения карточки появятся у посетителей только после отдельной публикации.') +
    '</p>' +
    '</div><div class="speaker-photo-panel"><span class="field-label">Фотография спикера</span>' +
    '<div class="speaker-edit-photo" id="speaker-photo-zone">' + portrait + '</div>' +
    '<div class="speaker-edit-photo-actions">' +
    button('Выбрать из библиотеки', 'gallery', 'primary full') +
    button('Загрузить изображение', 'upload-photo', 'subtle full') +
    (src ? button('Убрать фото', 'clear-photo', 'text-danger small') : '') +
    '</div><input type="file" id="speaker-photo-file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" hidden>' +
    '<p class="helper">JPG, PNG или WebP, до 4 МБ. Для качественной карточки выбирайте вертикальный или квадратный портрет.</p>' +
    '</div></div><div class="speaker-editor-actions">' +
    button('Создать копию', 'duplicate', 'subtle') +
    button('Удалить спикера', 'delete', 'text-danger') +
    '</div><div class="speaker-workflow-tip">' +
    '<strong>Как работает публикация</strong>' +
    '<span>Сохраняйте и проверяйте изменения. До нажатия «Опубликовать» посетители видят прежний список спикеров.</span>' +
    '</div>';
}

function mobileBar() {
  return '<nav class="mobile-workspace-tabs speakers-mobile-tabs" aria-label="Рабочие области">' +
    button('Все спикеры', 'mobile:list', 'mobile-tab' + (state.mobileView === 'list' ? ' active' : '')) +
    button('Карточка', 'mobile:editor', 'mobile-tab' + (state.mobileView === 'editor' ? ' active' : '')) +
    '</nav>';
}
function applyFilter() {
  const search = state.search.trim().toLocaleLowerCase('ru-RU');
  let shown = 0;
  for (const row of root.querySelectorAll('.speaker-list-row')) {
    const speaker = state.list[Number(row.dataset.position)];
    const text = (speaker.name + ' ' + speaker.role).toLocaleLowerCase('ru-RU');
    const matchesFilter = state.filter === 'all' ||
      (state.filter === 'visible' ? speaker.visible !== false : speaker.visible === false);
    const visible = matchesFilter && (!search || text.includes(search));
    row.hidden = !visible;
    if (visible) shown++;
  }
  const empty = root.querySelector('.speaker-search-empty');
  if (empty) empty.hidden = shown > 0;
}
function render({ resetEditor = false } = {}) {
  const scrollList = root.querySelector('.listpane')?.scrollTop || 0;
  const scrollEditor = resetEditor ? 0 : root.querySelector('.inspector')?.scrollTop || 0;
  root.innerHTML = '<div class="shell speakers-shell" data-mobile-view="' + state.mobileView + '">' +
    topbar() + mobileBar() +
    '<div class="workspace speakers-workspace"><aside class="panel listpane speakers-list-pane">' +
    listPanel() + '</aside><main class="panel inspector speakers-inspector" aria-label="Редактор спикера">' +
    '<div class="inspector-inner">' + speakerEditor() + '</div></main></div></div>';
  const list = root.querySelector('.listpane');
  const editor = root.querySelector('.inspector');
  if (list) list.scrollTop = scrollList;
  if (editor) editor.scrollTop = scrollEditor;
  applyFilter();
  refreshStatus();
}
function createSpeaker() {
  const speaker = { id: randomId(), name: 'Новый спикер', role: '', image: '', photo: '', visible: false };
  // Never duplicate the same placeholder name because the validator requires unique people.
  const count = state.list.filter((item) => item.name.startsWith('Новый спикер')).length;
  if (count) speaker.name += ' ' + (count + 1);
  state.list.push(speaker);
  state.selected = speaker.id;
  state.search = '';
  state.filter = 'all';
  state.mobileView = 'editor';
  markDirty();
  render({ resetEditor: true });
  root.querySelector('[data-speaker-field="name"]')?.select();
  notify('Карточка создана в черновике. Заполните данные спикера.');
}
function selectSpeaker(id) {
  if (!state.list.some((s) => s.id === id)) return;
  state.selected = id;
  state.mobileView = 'editor';
  render({ resetEditor: true });
}
function moveSpeaker(index, offset) {
  const destination = index + offset;
  if (index < 0 || destination < 0 || destination >= state.list.length) return;
  [state.list[index], state.list[destination]] = [state.list[destination], state.list[index]];
  markDirty();
  render();
}
function duplicateSpeaker() {
  const person = selected();
  if (!person) return;
  const duplicate = structuredClone(person);
  duplicate.id = randomId();
  duplicate.name += ' (копия)';
  duplicate.visible = false;
  const index = state.list.indexOf(person);
  state.list.splice(index + 1, 0, duplicate);
  state.selected = duplicate.id;
  markDirty();
  render({ resetEditor: true });
  root.querySelector('[data-speaker-field="name"]')?.select();
}
function modal({ title, message, action = 'Продолжить', danger = false }) {
  return new Promise((resolve) => {
    const previousFocus = document.activeElement;
    const overlay = document.createElement('div');
    overlay.className = 'modal-wrap speaker-dialog-wrap';
    overlay.innerHTML = '<section class="modal" role="dialog" aria-modal="true" aria-labelledby="speaker-modal-title">' +
      '<h2 id="speaker-modal-title">' + e(title) + '</h2>' +
      '<p class="modal-copy">' + e(message) + '</p><div class="modal-actions">' +
      '<button type="button" class="btn subtle" data-modal-cancel>Отмена</button>' +
      '<button type="button" class="btn ' + (danger ? 'destructive' : 'primary') +
      '" data-modal-accept>' + e(action) + '</button></div></section>';
    document.body.append(overlay);
    const buttons = [...overlay.querySelectorAll('button')];
    const close = (value) => {
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      if (previousFocus?.isConnected) previousFocus.focus();
      resolve(value);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); close(false); }
      else if (event.key === 'Tab') {
        if (event.shiftKey && document.activeElement === buttons[0]) {
          event.preventDefault(); buttons.at(-1).focus();
        } else if (!event.shiftKey && document.activeElement === buttons.at(-1)) {
          event.preventDefault(); buttons[0].focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    overlay.querySelector('[data-modal-cancel]').addEventListener('click', () => close(false));
    overlay.querySelector('[data-modal-accept]').addEventListener('click', () => close(true));
    overlay.addEventListener('click', (event) => { if (event.target === overlay) close(false); });
    buttons[0].focus();
  });
}
async function deleteSpeaker() {
  const person = selected();
  if (!person) return;
  if (!await modal({ title: 'Удалить спикера?',
    message: '«' + person.name + '» будет удалён из черновика. На сайте карточка останется до следующей публикации.',
    action: 'Удалить', danger: true })) return;
  const index = state.list.indexOf(person);
  state.list.splice(index, 1);
  state.selected = state.list[Math.min(index, state.list.length - 1)]?.id || '';
  markDirty();
  render({ resetEditor: true });
  notify('Спикер удалён из черновика.');
}

async function saveDraft({ quiet = false } = {}) {
  if (state.busy || !state.dirty) return;
  stopAutosave();
  state.busy = true;
  state.saveError = '';
  const version = state.editVersion;
  const snapshot = structuredClone(state.list);
  refreshStatus();
  try {
    const response = await request('/api/speakers/draft', 'PUT', {
      expectedRevision: state.revision,
      speakers: snapshot,
    });
    state.revision = response.draft.revision;
    if (state.editVersion === version) {
      state.dirty = false;
      if (!quiet) notify('Черновик спикеров сохранён. На сайте изменений пока нет.');
    } else if (!quiet) {
      notify('Старые правки сохранены; новые изменения сохранятся отдельно.');
    }
  } catch (error) {
    state.saveError = error.message;
    if (!quiet) notify(error.message, true);
    throw error;
  } finally {
    state.busy = false;
    refreshStatus();
    if (state.dirty && !state.saveError) queueSave(550);
  }
}
async function publish() {
  if (state.busy) return;
  const active = state.list.filter((person) => person.visible !== false).length;
  const approved = await modal({
    title: 'Опубликовать список спикеров?',
    message: 'На публичном сайте появятся ' + active + ' видимых спикеров в указанном порядке. ' +
      'Скрытые карточки останутся в черновике. Изменения программы форума не затрагиваются.',
    action: 'Опубликовать',
  });
  if (!approved) { queueSave(); return; }
  stopAutosave();
  try {
    if (state.dirty) await saveDraft({ quiet: true });
    if (state.dirty) throw Error('Во время сохранения появились новые изменения. Повторите публикацию.');
    state.busy = true;
    refreshStatus();
    await request('/api/speakers/publish', 'POST', {
      expectedRevision: state.revision,
      expectedPublishedRevision: state.publishedRevision,
    });
    state.busy = false;
    await loadData();
    notify('Список спикеров опубликован на сайте.');
  } finally {
    state.busy = false;
    refreshStatus();
    if (state.dirty && !state.saveError) queueSave();
  }
}
async function preview() {
  if (state.busy) return;
  const opened = window.open('about:blank', '_blank');
  if (!opened) throw Error('Разрешите открытие новой вкладки для предпросмотра.');
  opened.opener = null;
  try {
    if (state.dirty) await saveDraft({ quiet: true });
    if (state.dirty) throw Error('Черновик ещё сохраняется. Повторите предпросмотр.');
    opened.location.href = '/programme-admin/speakers/preview#speakers';
  } catch (error) {
    opened.close();
    throw error;
  }
}
async function validate() {
  await request('/api/speakers/validate', 'POST', {
    speakers: state.list,
    publishing: true,
  });
  notify('Проверка пройдена: все видимые спикеры готовы к публикации.');
}
function historyModal() {
  if (document.querySelector('.speaker-dialog-wrap')) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-wrap speaker-dialog-wrap';
  overlay.innerHTML = '<section class="modal speaker-history-dialog" role="dialog" aria-modal="true" aria-labelledby="speakers-history-title">' +
    '<div class="speaker-history-head"><div><span class="eyebrow">АРХИВ</span><h2 id="speakers-history-title">История публикаций</h2>' +
    '<p>Восстановление меняет только черновик. Для изменения сайта потребуется отдельная публикация.</p></div>' +
    '<button type="button" data-close-history class="library-close" aria-label="Закрыть">×</button></div>' +
    '<div class="speaker-history-list">' +
    (state.history.length ? state.history.map((record) =>
      '<div class="history-row"><div><strong>Версия №' + record.revision + '</strong>' +
      '<span>' + e(new Date(record.updatedAt).toLocaleString('ru-RU', {
        dateStyle: 'medium', timeStyle: 'short' })) + ' · ' +
      record.count + ' спикеров</span></div>' +
      button('Восстановить', 'restore:' + record.revision, 'subtle small') + '</div>').join('') :
      '<p class="empty-inline">История появится после первой публикации.</p>') +
    '</div></section>';
  document.body.append(overlay);
  const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (event) => { if (event.key === 'Escape') { event.preventDefault(); close(); } };
  overlay.querySelector('[data-close-history]').addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
    const button = event.target.closest('[data-action^="restore:"]');
    if (button) {
      const revision = Number(button.dataset.action.split(':')[1]);
      close();
      restoreRevision(revision).catch((err) => notify(err.message, true));
    }
  });
  document.addEventListener('keydown', onKey);
  overlay.querySelector('[data-close-history]').focus();
}
async function restoreRevision(revision) {
  const approved = await modal({ title: 'Восстановить версию №' + revision + '?',
    message: 'Список этой версии заменит текущий черновик. Сайт останется без изменений до отдельной публикации.',
    action: 'Восстановить' });
  if (!approved) return;
  stopAutosave();
  if (state.dirty) await saveDraft({ quiet: true });
  const result = await request('/api/speakers/restore', 'POST', {
    revision, expectedRevision: state.revision,
  });
  state.revision = result.draft.revision;
  state.list = structuredClone(result.draft.speakers);
  state.dirty = false;
  state.saveError = '';
  if (!selected()) state.selected = state.list[0]?.id || '';
  render({ resetEditor: true });
  notify('Версия восстановлена в черновик. Публичный сайт не изменился.');
}
async function uploadPhoto(file) {
  if (!file) return;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
    throw Error('Поддерживаются только JPG, PNG и WebP.');
  if (file.size > 4_000_000) throw Error('Фотография должна быть меньше 4 МБ.');
  const person = selected();
  if (!person) throw Error('Сначала выберите карточку спикера.');
  const result = await request('/api/programme/upload', 'POST', file, file.type);
  if (!state.list.includes(person)) throw Error('Карточка была удалена во время загрузки.');
  person.photo = result.url;
  state.photos.unshift({ group: 'Загруженные фотографии', name: file.name, url: result.url });
  markDirty();
  render();
  notify('Фотография загружена. Изменения сохранятся в черновике.');
}

function gallery() {
  const person = selected();
  if (!person || document.querySelector('.speaker-dialog-wrap')) return;
  const focus = document.activeElement;
  const overlay = document.createElement('div');
  overlay.className = 'modal-wrap speaker-dialog-wrap';
  const portraitNames = new Map(state.list.map((item) => [photoUrl(item), item.name]));
  const all = state.photos.map((image) => ({
    ...image,
    text: portraitNames.get(image.url) || image.name.replace(/\.(?:png|jpe?g|webp)$/i, '').replaceAll('-', ' '),
    isKnownSpeaker: portraitNames.has(image.url),
  }));
  all.sort((a,b) =>
    Number(b.isKnownSpeaker) - Number(a.isKnownSpeaker) ||
    Number(b.group === 'Загруженные фотографии') - Number(a.group === 'Загруженные фотографии') ||
    a.text.localeCompare(b.text, 'ru'));
  overlay.innerHTML = '<section class="library-dialog" role="dialog" aria-modal="true" aria-labelledby="speaker-gallery-title">' +
    '<header class="library-head"><div><span class="eyebrow">МЕДИАБИБЛИОТЕКА</span>' +
    '<h2 id="speaker-gallery-title">Выберите фотографию</h2>' +
    '<p>Ищите по имени или названию файла. Используйте свои изображения без водяных знаков и логотипов.</p></div>' +
    '<button type="button" class="library-close" data-close-gallery aria-label="Закрыть">×</button></header>' +
    '<div class="library-filter"><input type="search" id="gallery-search" autocomplete="off" placeholder="Поиск фотографии" aria-label="Поиск фотографий">' +
    '<select id="gallery-group" aria-label="Тип изображений"><option value="Фотографии спикеров" selected>Фото спикеров</option>' +
    '<option value="">Все изображения</option>' +
    ['Фотографии программы','Загруженные фотографии'].map((group) =>
      '<option value="' + group + '">' + group + '</option>').join('') + '</select></div>' +
    '<p class="library-count" id="gallery-count"></p>' +
    '<div class="library-results" id="gallery-results"></div>' +
    '<footer class="library-footer">' +
    button('Загрузить своё фото', 'upload-photo-gallery', 'primary') +
    '</footer></section>';
  document.body.append(overlay);
  let limit = 60;
  const search = overlay.querySelector('#gallery-search');
  const group = overlay.querySelector('#gallery-group');
  const results = overlay.querySelector('#gallery-results');
  const count = overlay.querySelector('#gallery-count');
  const filtered = () => all.filter((item) => (!group.value || item.group === group.value) &&
    (item.name + ' ' + item.text).toLocaleLowerCase('ru-RU')
      .includes(search.value.trim().toLocaleLowerCase('ru-RU')));
  function draw() {
    const available = filtered();
    count.textContent = 'Найдено: ' + available.length +
      (available.length > limit ? ' · показаны первые ' + limit : '');
    results.innerHTML = available.length
      ? available.slice(0, limit).map((item, index) =>
        '<button type="button" class="library-item" data-image-index="' + index + '">' +
        '<img src="' + e(item.url) + '" loading="lazy" alt="">' +
        '<span class="library-item-text"><strong>' + e(item.text) + '</strong>' +
        '<small>' + e(item.group) + '</small></span></button>').join('') +
        (available.length > limit ? '<button class="btn subtle library-more" type="button" data-more>Показать ещё</button>' : '')
      : '<div class="library-empty">Нет подходящих изображений.</div>';
  }
  const close = () => {
    document.removeEventListener('keydown', onKey);
    overlay.remove();
    if (focus?.isConnected) focus.focus();
  };
  const onKey = (event) => {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key !== 'Tab') return;
    const nodes = [...overlay.querySelectorAll('button:not(:disabled),input,select')]
      .filter((item) => item.getBoundingClientRect().width);
    if (event.shiftKey && document.activeElement === nodes[0]) {
      event.preventDefault(); nodes.at(-1).focus();
    } else if (!event.shiftKey && document.activeElement === nodes.at(-1)) {
      event.preventDefault(); nodes[0].focus();
    }
  };
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('error', (event) => {
    if (!(event.target instanceof HTMLImageElement)) return;
    const empty = document.createElement('span');
    empty.className = 'library-photo-empty';
    empty.setAttribute('aria-label', 'Фотография недоступна');
    empty.textContent = '◯';
    event.target.replaceWith(empty);
  }, true);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay || event.target.closest('[data-close-gallery]')) {
      close(); return;
    }
    if (event.target.closest('[data-more]')) { limit += 60; draw(); return; }
    if (event.target.closest('[data-action="upload-photo-gallery"]')) {
      close();
      root.querySelector('#speaker-photo-file')?.click();
      return;
    }
    const tile = event.target.closest('[data-image-index]');
    if (!tile) return;
    const image = filtered()[Number(tile.dataset.imageIndex)];
    if (!image) return;
    if (state.list.includes(person)) {
      person.photo = image.url;
      markDirty(); close(); render();
      notify('Фотография выбрана.');
    } else close();
  });
  search.addEventListener('input', () => { limit = 60; draw(); });
  group.addEventListener('change', () => { limit = 60; draw(); });
  draw();
  search.focus();
}

async function action(name) {
  if (name === 'add') return createSpeaker();
  if (name === 'save') return saveDraft();
  if (name === 'publish') return publish();
  if (name === 'preview') return preview();
  if (name === 'validate') return validate();
  if (name === 'history') return historyModal();
  if (name === 'gallery') return gallery();
  if (name === 'upload-photo') return root.querySelector('#speaker-photo-file')?.click();
  if (name === 'clear-photo') {
    const person = selected();
    if (person) { person.photo = ''; person.image = ''; markDirty(); render(); }
    return;
  }
  if (name === 'duplicate') return duplicateSpeaker();
  if (name === 'delete') return deleteSpeaker();
  if (name.startsWith('select:')) return selectSpeaker(name.slice(7));
  if (name.startsWith('mobile:')) {
    state.mobileView = name.slice(7);
    return render();
  }
  if (name.startsWith('move:')) {
    const [index, offset] = name.slice(5).split(':').map(Number);
    return moveSpeaker(index, offset);
  }
}

root.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button || !root.contains(button)) return;
  event.preventDefault();
  Promise.resolve(action(button.dataset.action)).catch((error) => notify(error.message, true));
});
root.addEventListener('input', (event) => {
  const element = event.target;
  if (element.id === 'speaker-search') {
    state.search = element.value;
    applyFilter();
    return;
  }
  if (!element.matches('[data-speaker-field]') || element.type === 'checkbox') return;
  const person = selected();
  if (!person) return;
  person[element.dataset.speakerField] = element.value;
  markDirty();
  const row = [...root.querySelectorAll('.speaker-list-row')].find((node) =>
    state.list[Number(node.dataset.position)] === person);
  if (row) {
    const name = row.querySelector('.speaker-list-name strong');
    const role = row.querySelector('.speaker-list-name small');
    if (name) name.textContent = person.name;
    if (role) role.textContent = person.role;
  }
  if (element.dataset.speakerField === 'name') {
    const heading = root.querySelector('#speaker-heading');
    if (heading) heading.textContent = person.name;
  }
});
root.addEventListener('change', (event) => {
  const element = event.target;
  if (element.id === 'speaker-photo-file') {
    uploadPhoto(element.files?.[0]).catch((error) => notify(error.message, true));
    return;
  }
  if (element.matches('[data-speaker-field="visible"]')) {
    const person = selected();
    if (person) {
      person.visible = element.checked;
      markDirty();
      render();
    }
  }
});
root.addEventListener('click', (event) => {
  const control = event.target.closest('[data-filter]');
  if (!control) return;
  state.filter = control.dataset.filter;
  root.querySelectorAll('[data-filter]').forEach((button) => {
    button.classList.toggle('is-active', button === control);
    button.setAttribute('aria-pressed', button === control ? 'true' : 'false');
  });
  applyFilter();
});
root.addEventListener('dragstart', (event) => {
  const row = event.target.closest('.speaker-list-row[data-position]');
  if (!row) return;
  event.dataTransfer.setData('text/plain', row.dataset.position);
  event.dataTransfer.effectAllowed = 'move';
});
root.addEventListener('dragover', (event) => {
  if (event.target.closest('.speaker-list-row')) event.preventDefault();
});
root.addEventListener('drop', (event) => {
  const row = event.target.closest('.speaker-list-row[data-position]');
  if (!row) return;
  event.preventDefault();
  const from = Number(event.dataTransfer.getData('text/plain'));
  const to = Number(row.dataset.position);
  if (!Number.isInteger(from) || from < 0 || from >= state.list.length ||
      !Number.isInteger(to) || to < 0 || to >= state.list.length || from === to) return;
  state.list.splice(to, 0, state.list.splice(from,1)[0]);
  markDirty();
  render();
});
root.addEventListener('error', (event) => {
  const image = event.target;
  if (!(image instanceof HTMLImageElement)) return;
  if (!image.closest('.speaker-list-row, .speaker-edit-photo')) return;
  const span = document.createElement('span');
  span.className = 'speaker-mini-fallback';
  span.textContent = '◯';
  span.setAttribute('aria-label', 'Фото недоступно');
  image.replaceWith(span);
}, true);
document.addEventListener('keydown', (event) => {
  if (document.querySelector('.speaker-dialog-wrap')) return;
  if (!(event.metaKey || event.ctrlKey)) return;
  if (event.key.toLowerCase() === 's') {
    event.preventDefault();
    saveDraft().catch((error) => notify(error.message, true));
  }
  if (event.key.toLowerCase() === 'k') {
    event.preventDefault();
    state.mobileView = 'list';
    render();
    root.querySelector('#speaker-search')?.focus();
  }
});
window.addEventListener('beforeunload', (event) => {
  if (!state.dirty) return;
  event.preventDefault();
  event.returnValue = '';
});
init();
