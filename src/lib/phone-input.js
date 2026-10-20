import { formatPhone } from './forms.js';

function digitsLeft(value, position) {
  return (value.slice(0, position).match(/\d/g) || []).length;
}

function positionAfterDigits(formatted, amount) {
  if (amount <= 0) return formatted.startsWith('+') ? 1 : 0;
  let found = 0;
  for (let i = 0; i < formatted.length; i += 1) {
    if (/\d/.test(formatted[i]) && ++found >= amount) return i + 1;
  }
  return formatted.length;
}

function update(input, raw, selectedDigits) {
  const formatted = formatPhone(raw);
  input.value = formatted;
  input.setCustomValidity('');
  const caret = positionAfterDigits(formatted, selectedDigits);
  if (document.activeElement === input && input.setSelectionRange) {
    input.setSelectionRange(caret, caret);
  }
}

// Format while typing without throwing the caret to the end. Selection follows
// the logical digit position, including when characters are inserted mid-number.
export function handlePhoneInput(input) {
  const caret = input.selectionStart ?? input.value.length;
  const logicalPosition = digitsLeft(input.value, caret);
  update(input, input.value, logicalPosition);
}

// Backspace/delete on punctuation must remove an adjacent digit instead of
// repeatedly recreating the deleted separator. beforeinput handles soft keyboards.
export function handlePhoneBeforeInput(event) {
  const input = event.target;
  if (input?.name !== 'phone') return;
  const type = event.nativeEvent?.inputType || event.inputType;
  if (type !== 'deleteContentBackward' && type !== 'deleteContentForward') return;
  const start = input.selectionStart;
  if (start === null || start !== input.selectionEnd) return;
  const backward = type === 'deleteContentBackward';
  const adjacent = backward ? start - 1 : start;
  if (adjacent < 0 || adjacent >= input.value.length || /\d/.test(input.value[adjacent])) return;
  let remove = backward ? adjacent - 1 : adjacent + 1;
  while (remove >= 0 && remove < input.value.length && !/\d/.test(input.value[remove])) {
    remove += backward ? -1 : 1;
  }
  if (remove < 0 || remove >= input.value.length) return;
  // Prevent native punctuation deletion, then remove one digit in its place.
  event.preventDefault();
  const logicalPosition = digitsLeft(input.value, remove);
  update(input, input.value.slice(0, remove) + input.value.slice(remove + 1), logicalPosition);
}

// Desktop keyboard fallback: some React versions don't expose every native
// beforeinput deletion event, while touch keyboards use beforeinput directly.
export function handlePhoneKeyDown(event) {
  if (event.key !== 'Backspace' && event.key !== 'Delete') return;
  handlePhoneBeforeInput({
    target: event.target,
    inputType: event.key === 'Backspace' ? 'deleteContentBackward' : 'deleteContentForward',
    preventDefault: () => event.preventDefault(),
  });
}
