# DEBT TECH 2026 — production programme

Public: https://debt-tech.ru/#prog

Private admin (direct URL only): https://debt-tech.ru/programme-admin/

There is no admin navigation entry on the public site.

## Production isolation

- Production website: /srv/imon/projects/debt-2026-lite/current, a symlink to the active release dist.
- Stable CMS backend: /srv/imon/projects/debt-2026-lite/programme-runtime/server.
- Persistent data: /srv/imon/projects/debt-2026-lite/programme-data, containing published.json, draft.json, history, uploaded photographs and password hash.
- Local-only environment: /srv/imon/projects/debt-2026-lite/env/programme-admin.env.
- Initial production credential: /srv/imon/projects/debt-2026-lite/env/programme-admin-initial-password.txt. This secret is never committed and becomes invalid after a password change.
- Service: debt-2026-lite-programme.service, bound to loopback port 32030, separate from live CRM/forms (32026) and sandbox CMS (32029).
- GET /api/programme is public. Private operations require an authenticated session, a CSRF token and an explicitly allowed Origin (apex, www, production preview hostname).
- Uploaded photographs can be read by the website, but are writable only with authentication.

## Publish flow

Choose stage and session or event, edit inline, and wait for draft autosave. Preview the draft. Changes reach the public website only after pressing Publish and confirming. History and restore are retained.

## Future production releases and rollback

The initial production release was built from the active 2026-10-20 Welcome Pass build, not from the older sandbox. The 35 production speaker records, ticket prices, forms/CRM integrations, other site sections, and recent assets were preserved.

Always carry forward the programme component, programme seed, admin assets and Caddy routing. install-production.sh checks that programme files exist and restarts the editor after switching releases, so the private preview matches the current frontend. Do not roll out the older sandbox frontend over production.

The dedicated initial rollout takes a backup of Caddy and the previous frontend symlink and can restore them without changing production forms.


## Несколько модераторов в одной сессии (22.10.2026)

В каждой сессии поддерживается от одного до трёх модераторов (а также отсутствие модератора). В админке: откройте нужную сессию → «Модераторы» → «+ Добавить» или «Из программы». Для каждого доступны ФИО, должность, фото, удаление, замена из библиотеки и изменение порядка стрелками. На публичном сайте модераторы стоят вертикально друг под другом, с выровненными фотографиями.

Существующее поле session.moderator остаётся первым модератором. Дополнительные модераторы находятся в необязательном массиве session.additionalModerators (не более двух). Массив не сохраняется в старых карточках, если пуст. Это обеспечивает полную совместимость опубликованной программы, существующего черновика и архива редакций. Сервер блокирует четвёртого модератора и повтор одного человека в пределах сессии. Автосохранение черновика и ручная публикация остаются раздельными операциями.
