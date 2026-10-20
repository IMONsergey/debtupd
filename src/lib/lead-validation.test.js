import test from 'node:test';
import assert from 'node:assert/strict';
import { fieldError } from './lead-validation.js';
import { formatPhone } from './forms.js';

const field = (name, value, extra = {}) => ({
  name,
  value,
  required: true,
  min: '',
  max: '',
  ...extra,
});

test('field validation rejects whitespace, incomplete email and malformed phones', () => {
  assert.match(fieldError(field('full_name', '  ')), /обязательное/);
  assert.match(fieldError(field('company', ' \n ')), /обязательное/);
  assert.match(fieldError(field('email', 'test@example')), /e-mail/);
  assert.equal(fieldError(field('email', 'person+sales@example.co.uk')), '');
  assert.match(fieldError(field('phone', '+7 999')), /11 цифр/);
  assert.equal(fieldError(field('phone', '+86 138 1234 5678')), '');
  assert.equal(fieldError(field('phone', '+49 170 1234567')), '');
  assert.ok(fieldError(field('participants_count', '1.5', { min: '1', max: '2' })));
  assert.equal(fieldError(field('participants_count', '2', { min: '1', max: '2' })), '');
  assert.ok(fieldError({ name: 'consent', checked: false }));
  assert.equal(fieldError({ name: 'consent', checked: true }), '');
});

test('Russian prefixes normalize without corrupting international +8xx numbers', () => {
  assert.equal(formatPhone('+86 138 1234 5678'), '+8613812345678');
  assert.equal(formatPhone('+49 170 1234567'), '+491701234567');
  assert.equal(formatPhone('89991112233'), '+7 999 111-22-33');
  assert.equal(formatPhone('9991112233'), '+7 999 111-22-33');
  assert.equal(formatPhone('+7 (999) 111-22-33'), '+7 999 111-22-33');
  assert.equal(formatPhone('+7 999 111 22 33 44'), '+7999111223344');
  assert.ok(fieldError(field('phone', formatPhone('+7 999 111 22 33 44'))));
  assert.equal(formatPhone('+86 138 1234 5678 9012'), '+86138123456789012');
  assert.ok(fieldError(field('phone', formatPhone('+86 138 1234 5678 9012'))));
});
