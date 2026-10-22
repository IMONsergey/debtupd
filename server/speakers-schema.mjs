import { ProgrammeError } from './programme-schema.mjs';

const imagePattern = /^[\w-]+\.(?:png|jpe?g|webp)$/i;
const uploadedPattern = /^\/api\/programme\/image\/[a-f0-9]{28}\.(?:png|jpe?g|webp)$/;
const staticPhotoPattern = /^\/assets\/(?:figma|images\/programme)\/[\w.-]+\.(?:png|jpe?g|webp)$/;

function invalid(message) {
  throw new ProgrammeError('invalid_speakers', message);
}

function cleanText(value, label, max, required = false) {
  if (typeof value !== 'string') invalid('Поле «' + label + '» должно быть текстом.');
  const result = value.trim().replace(/\r\n/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  if (result.length > max || (required && !result))
    invalid('Проверьте поле «' + label + '».');
  return result;
}

export function speakerPhotoUrl(person) {
  if (person.photo) return person.photo;
  if (person.image) {
    return '/assets/figma/' + person.image.replace(/\.png$/i, '.webp');
  }
  return '';
}

export function validateSpeakers(input, { publishing = false } = {}) {
  if (!Array.isArray(input) || input.length > 300)
    invalid('Список спикеров должен содержать не более 300 карточек.');
  if (publishing && !input.some((speaker) => speaker?.visible !== false))
    invalid('Для публикации нужен хотя бы один видимый спикер.');
  const ids = new Set();
  const names = new Set();
  return input.map((speaker, index) => {
    if (!speaker || typeof speaker !== 'object' || Array.isArray(speaker))
      invalid('Некорректная карточка спикера №' + (index + 1) + '.');

    const id = cleanText(speaker.id, 'ID спикера', 64, true);
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/i.test(id) || ids.has(id))
      invalid('Повторяющийся или некорректный ID спикера.');
    ids.add(id);

    const name = cleanText(speaker.name, 'ФИО', 160, true);
    const role = cleanText(speaker.role ?? '', 'Должность и организация', 500);
    const key = name.toLocaleLowerCase('ru-RU').replace(/\s+/g, ' ');
    if (names.has(key)) invalid('Спикер «' + name + '» уже есть в списке.');
    names.add(key);

    const image = cleanText(speaker.image ?? '', 'Исходное фото', 160);
    const photo = cleanText(speaker.photo ?? '', 'Фотография', 255);
    if (image && !imagePattern.test(image))
      invalid('Некорректное исходное изображение у «' + name + '».');
    if (photo && !uploadedPattern.test(photo) && !staticPhotoPattern.test(photo))
      invalid('Некорректный адрес фотографии у «' + name + '».');
    const visible = speaker.visible !== false;
    if (publishing && visible && (!role || (!image && !photo)))
      invalid('Для публикации заполните должность и фото спикера «' + name + '» либо скройте карточку.');

    return { id, name, role, image, photo, visible };
  });
}
