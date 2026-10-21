const idPattern = /^[a-z0-9][a-z0-9_-]{0,59}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d\s*[–-]\s*([01]\d|2[0-3]):[0-5]\d$/;
const assetPattern =
  /^\/(?:assets\/(?:figma|images\/programme)\/[\w.-]+\.(?:png|webp|jpe?g)|api\/programme\/image\/[a-f0-9]{28}\.(?:png|webp|jpg))$/i;

export class ProgrammeError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function fail(message) {
  throw new ProgrammeError('invalid_programme', message);
}

function text(value, name, limit = 260, required = false) {
  if (typeof value !== 'string') fail('Поле «' + name + '» должно быть текстом.');
  const clean = value
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  if (clean.length > limit || (required && !clean)) fail('Проверьте поле «' + name + '».');
  return clean;
}

function id(value, label, ids) {
  if (typeof value !== 'string' || !idPattern.test(value))
    fail('Некорректный идентификатор: ' + label);
  if (ids.has(value)) fail('Повторяется идентификатор: ' + value);
  ids.add(value);
  return value;
}

function person(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Проверьте ' + label + '.');
  const photo = text(value.photo ?? '', label + ' — изображение', 240);
  if (photo && !assetPattern.test(photo)) fail('Некорректный адрес изображения: ' + label);
  return {
    name: text(value.name, label + ' — имя', 160, true),
    role: text(value.role ?? '', label + ' — должность', 500),
    photo,
  };
}

function validTime(value, name) {
  if (!timePattern.test(value)) fail('Время должно быть в формате 09:00–10:00: ' + name + '.');
  const [start, end] = value.split(/\s*[–-]\s*/).map((part) => {
    const [hour, minute] = part.split(':').map(Number);
    return hour * 60 + minute;
  });
  if (end <= start) fail('Время завершения должно быть позже начала: ' + name + '.');
  return value;
}

function event(value, ids) {
  const result = {
    id: id(value.id, 'событие', ids),
    kind: 'event',
    time: validTime(text(value.time, 'время события', 50, true), 'событие'),
    title: text(value.title, 'название события', 360, true),
    visible: value.visible !== false,
  };
  return result;
}

function session(value, ids) {
  const time = text(value.time, 'время сессии', 50, true);
  validTime(time, 'сессия');
  if (!Array.isArray(value.talks) || value.talks.length > 60)
    fail('Некорректное количество выступлений.');
  const talks = value.talks.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) fail('Некорректное выступление.');
    if (!Array.isArray(item.speakers) || item.speakers.length > 8)
      fail('Некорректный список спикеров.');
    return {
      id: id(item.id, 'выступление', ids),
      title: text(item.title ?? '', 'тема выступления', 800),
      note: text(item.note ?? '', 'примечание к выступлению', 400),
      visible: item.visible !== false,
      speakers: item.speakers.map((speaker) => person(speaker, 'спикер')),
    };
  });
  return {
    id: id(value.id, 'сессия', ids),
    kind: 'session',
    number: (() => {
      if (!Number.isInteger(value.number) || value.number < 1 || value.number > 99)
        fail('Номер сессии должен быть целым числом от 1 до 99.');
      return value.number;
    })(),
    time,
    title: text(value.title, 'название сессии', 440, true),
    category: text(value.category ?? '', 'формат сессии', 200),
    moderator: value.moderator ? person(value.moderator, 'модератор') : null,
    additionalNote: text(value.additionalNote ?? '', 'примечание к сессии', 600),
    visible: value.visible !== false,
    talks,
  };
}

export function validateProgramme(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    fail('Программа должна быть объектом.');
  if (!Array.isArray(value.stages) || value.stages.length === 0 || value.stages.length > 8)
    fail('Программа должна содержать от 1 до 8 сцен.');
  if (!Array.isArray(value.commonEvents) || value.commonEvents.length > 24)
    fail('Некорректные общие события.');
  const ids = new Set();
  const stages = value.stages.map((stage) => {
    if (!stage || typeof stage !== 'object' || Array.isArray(stage)) fail('Некорректная сцена.');
    if (!Array.isArray(stage.entries) || stage.entries.length > 100)
      fail('Некорректное содержимое сцены.');
    return {
      id: id(stage.id, 'сцена', ids),
      title: text(stage.title, 'название сцены', 100, true),
      description: text(stage.description ?? '', 'подпись сцены', 160),
      visible: stage.visible !== false,
      status: stage.status === 'published' ? 'published' : 'upcoming',
      entries: stage.entries.map((entry) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry))
          fail('Некорректный элемент программы.');
        if (entry.kind === 'event') return event(entry, ids);
        if (entry.kind === 'session') return session(entry, ids);
        fail('Недопустимый тип события.');
      }),
    };
  });
  if (!stages.some((stage) => stage.visible)) fail('Хотя бы одна сцена должна быть видимой.');
  return {
    schemaVersion: 1,
    note: text(value.note ?? '', 'примечание к программе', 450),
    commonEvents: value.commonEvents.map((entry) => event(entry, ids)),
    stages,
  };
}
