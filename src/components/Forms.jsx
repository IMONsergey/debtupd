import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { ActionArrow } from './ActionArrow.jsx';
import { submitLead, formatPhone } from '../lib/forms.js';
import { useDialog } from '../lib/useDialog.js';
import { MAX_CORPORATE_PARTICIPANTS } from '../lib/corporate-pricing.js';
import { content } from '../content.js';
const privacy = content.footer.privacyHref;
const common = [
  {
    name: 'full_name',
    label: 'ФИО участника / ответственного лица',
    type: 'text',
    autoComplete: 'name',
    required: true,
    maxLength: 150,
  },
  {
    name: 'company',
    label: 'Название компании',
    type: 'text',
    autoComplete: 'organization',
    required: true,
    maxLength: 200,
  },
  {
    name: 'phone',
    label: 'Телефон',
    type: 'tel',
    autoComplete: 'tel',
    required: true,
    maxLength: 24,
  },
  {
    name: 'email',
    label: 'E-mail',
    type: 'email',
    autoComplete: 'email',
    required: true,
    maxLength: 120,
  },
];
function phoneInput(e) {
  e.currentTarget.setCustomValidity('');
  e.currentTarget.value = formatPhone(e.currentTarget.value);
}
function validatePhone(form) {
  const input = form.elements.phone;
  const digits = input.value.replace(/\D/g, '');
  input.setCustomValidity(
    digits.length < 10 || digits.length > 15 ? 'Введите телефон: от 10 до 15 цифр.' : '',
  );
  return form.reportValidity();
}
function Consent({ id }) {
  return (
    <label className="consent" htmlFor={id}>
      <input id={id} name="consent" type="checkbox" value="yes" required />
      <span>
        Я соглашаюсь на обработку персональных данных и принимаю условия{' '}
        <a href={privacy} target="_blank" rel="noreferrer">
          политики конфиденциальности
        </a>
        .
      </span>
    </label>
  );
}
function Honeypot() {
  return (
    <label className="honeypot" aria-hidden="true">
      Сайт
      <input name="website" tabIndex={-1} autoComplete="off" />
    </label>
  );
}
export function ApplicationModal({
  kind = 'early-registration',
  tariff,
  completed = false,
  initialComment = '',
  onClose,
}) {
  const ref = useRef(null),
    sending = useRef(false),
    abort = useRef(null);
  const [status, setStatus] = useState(completed ? 'success' : 'idle'),
    [message, setMessage] = useState('');
  useDialog(ref, onClose);
  useEffect(() => () => abort.current?.abort(), []);
  const stand = kind === 'stand-booking',
    id = stand ? 'stand-booking-form' : 'early-registration-form';
  const fields = stand
    ? [
        ...common.slice(0, 2),
        {
          name: 'job_title',
          label: 'Должность',
          type: 'text',
          autoComplete: 'organization-title',
          maxLength: 160,
        },
        ...common.slice(2),
      ]
    : [
        ...common.slice(0, 2),
        {
          name: 'participants_count',
          label: 'Количество участников',
          type: 'number',
          min: 1,
          max: 999,
          required: true,
          defaultValue: '1',
        },
        { name: 'promo_code', label: 'Промокод', type: 'text', maxLength: 120 },
        ...common.slice(2),
      ];
  async function send(e) {
    e.preventDefault();
    if (sending.current || !validatePhone(e.currentTarget)) return;
    const data = new FormData(e.currentTarget);
    sending.current = true;
    setStatus('sending');
    setMessage('');
    abort.current = new AbortController();
    try {
      await submitLead(
        {
          ...Object.fromEntries(data),
          form_id: id,
          consent: data.get('consent') === 'yes',
          ...(tariff
            ? { tariff_id: tariff.id, tariff_name: tariff.title, tariff_price: tariff.price }
            : {}),
        },
        { signal: abort.current.signal },
      );
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setMessage(error.message);
    } finally {
      sending.current = false;
    }
  }
  return createPortal(
    <div
      className="modal-layer"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        className={`form-dialog${tariff ? ' form-dialog--' + tariff.id : ''}`}
        data-tariff-id={tariff?.id}
        role="dialog"
        aria-modal="true"
        aria-labelledby="application-title"
        tabIndex={-1}
      >
        <button className="icon-button modal-close" onClick={onClose} aria-label="Закрыть форму">
          <X />
        </button>
        <span className="eyebrow">DEBT TECH / 2026</span>
        <h2 id="application-title">
          {kind === 'corporate-package'
            ? 'Корпоративное участие'
            : stand
              ? 'Партнерское участие'
              : tariff
                ? `Тариф «${tariff.title}»`
                : 'Ранняя регистрация'}
        </h2>
        {status === 'success' ? (
          <div className="form-success" role="status">
            <h3>Спасибо! Заявка отправлена</h3>
            <p>Мы получили ваши данные и свяжемся с вами в ближайшее время.</p>
            <div className="form-success-actions">
              <a
                className="button"
                href={content.forms.telegramUrl}
                target="_blank"
                rel="noreferrer"
              >
                Наш Telegram <ActionArrow />
              </a>
              <button className="button secondary" onClick={onClose}>
                Закрыть
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="form-description">
              {stand
                ? 'Расскажите о компании и желаемом формате участия. Детали размещения согласуем отдельно.'
                : 'Оставьте контакты и укажите количество участников. Менеджер свяжется с вами и расскажет об условиях участия.'}
            </p>
            {tariff && (
              <p className="selected-tariff">
                Участие в форуме:{' '}
                <strong>
                  {tariff.title} · {tariff.price}
                </strong>
              </p>
            )}
            <form id={id} onSubmit={send}>
              <Honeypot />
              <fieldset disabled={status === 'sending'}>
                <div className="form-grid">
                  {fields.map(({ label, ...f }) => (
                    <label className="field" key={f.name}>
                      <span>
                        {label}
                        {f.required ? ' *' : ''}
                      </span>
                      <input
                        {...f}
                        onInput={f.name === 'phone' ? phoneInput : undefined}
                        inputMode={
                          f.type === 'number'
                            ? 'numeric'
                            : f.type === 'tel'
                              ? 'tel'
                              : f.type === 'email'
                                ? 'email'
                                : undefined
                        }
                      />
                    </label>
                  ))}
                  {stand && (
                    <label className="field span-two">
                      <span>Комментарий / желаемый формат стенда</span>
                      <textarea
                        name="comment"
                        rows={3}
                        maxLength={2000}
                        defaultValue={initialComment}
                      />
                    </label>
                  )}
                </div>
                <Consent id="application-consent" />
                <button className="button" type="submit">
                  {status === 'sending'
                    ? 'Отправляем…'
                    : stand
                      ? 'Стать партнером'
                      : 'Отправить заявку'}
                  <ActionArrow />
                </button>
              </fieldset>
              <p className="form-feedback" aria-live="polite">
                {message}
              </p>
              {status === 'error' && (
                <a href={content.forms.telegramUrl} target="_blank" rel="noreferrer">
                  Связаться с организатором в Telegram ↗
                </a>
              )}
            </form>
          </>
        )}
      </section>
    </div>,
    document.body,
  );
}
export function CorporateForm({ onSuccess }) {
  const [tariffId, setTariff] = useState('full-plus'),
    [count, setCount] = useState('3'),
    [status, setStatus] = useState('idle'),
    [message, setMessage] = useState('');
  const sending = useRef(false);
  const tariff = content.tariffs.items.find((t) => t.id === tariffId);
  async function send(e) {
    e.preventDefault();
    if (sending.current || !validatePhone(e.currentTarget)) return;
    const data = new FormData(e.currentTarget);
    sending.current = true;
    setStatus('sending');
    setMessage('');
    try {
      await submitLead({
        ...Object.fromEntries(data),
        form_id: 'corporate-package-form',
        consent: data.get('consent') === 'yes',
        tariff_name: tariff.title,
        tariff_price: tariff.price,
      });
      setStatus('idle');
      onSuccess();
    } catch (error) {
      setStatus('error');
      setMessage(error.message);
    } finally {
      sending.current = false;
    }
  }
  return (
    <form id="corporate-package-form" className="corporate-form" onSubmit={send}>
      <h3>
        Узнайте стоимость
        <br />
        корпоративного участия
      </h3>
      <Honeypot />
      <fieldset disabled={status === 'sending'}>
        <div className="form-grid">
          <label className="field">
            <span>Количество участников</span>
            <input
              name="participants_count"
              type="number"
              min={1}
              max={MAX_CORPORATE_PARTICIPANTS}
              step={1}
              inputMode="numeric"
              required
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Выберите тариф</span>
            <select
              name="tariff_id"
              value={tariffId}
              onChange={(e) => setTariff(e.target.value)}
              required
            >
              {content.tariffs.items.map((t) => (
                <option value={t.id} key={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field span-two">
            <span>Ваше ФИО</span>
            <input
              name="full_name"
              autoComplete="name"
              placeholder="Иванов Иван Иванович"
              maxLength={150}
              required
            />
          </label>
          <label className="field span-two">
            <span>Номер телефона</span>
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="+7 999 999 99 99"
              maxLength={24}
              onInput={phoneInput}
              required
            />
          </label>
        </div>
        <Consent id="corporate-consent" />
        <button className="button" type="submit">
          {status === 'sending' ? 'Отправляем…' : 'Рассчитать стоимость'}
          <ActionArrow />
        </button>
      </fieldset>
      <p className="form-feedback" aria-live="polite">
        {message}
      </p>
      {status === 'error' && (
        <a href={content.forms.telegramUrl} target="_blank" rel="noreferrer">
          Связаться с организатором в Telegram ↗
        </a>
      )}
    </form>
  );
}
