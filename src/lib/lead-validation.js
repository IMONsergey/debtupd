const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Match endpoint rules. Native required accepts whitespace-only content.
export function fieldError(field) {
  const name = field.name;
  if (!name || name === 'website') return '';
  if (name === 'consent') return field.checked ? '' : 'Подтвердите согласие на обработку данных.';
  const value = String(field.value || '').trim();

  if (!value && field.required) return 'Заполните обязательное поле.';
  if (!value) return '';

  if (name === 'phone') {
    const digits = value.replace(/\D/g, '');
    if (value.startsWith('+7') && digits.length !== 11) {
      return 'Для номера +7 укажите 11 цифр.';
    }
    return digits.length < 10 || digits.length > 15
      ? 'Введите номер телефона: от 10 до 15 цифр.'
      : '';
  }
  if (name === 'email' && !EMAIL_PATTERN.test(value))
    return 'Укажите корректный e-mail, например name@example.ru.';
  if (name === 'participants_count') {
    const count = Number(value);
    const min = Number(field.min || 1);
    const max = Number(field.max || 999);
    return Number.isInteger(count) && count >= min && count <= max
      ? ''
      : 'Количество участников — целое число от ' + min + ' до ' + max + '.';
  }
  if (name === 'tariff_id') return field.selectedIndex < 0 ? 'Выберите тариф.' : '';
  return '';
}

export function validateFields(form) {
  const errors = {};
  let firstInvalid = null;
  for (const field of Array.from(form.elements)) {
    if (!field.name || field.name === 'website' || field.disabled) continue;
    const message = fieldError(field);
    if (!message) continue;
    errors[field.name] = message;
    if (!firstInvalid) firstInvalid = field;
  }
  return { errors, firstInvalid };
}
