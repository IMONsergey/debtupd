#!/usr/bin/env bash
set -euo pipefail

# Run only after an explicit approval to replace debt-tech.ru production.
root=/srv/imon/projects/debt-2026-lite
release=${1:?Usage: install-production.sh RELEASE_ID EXPECTED_CURRENT_PATH}
expected=${2:?Expected production release is required}
[[ "$release" =~ ^[A-Za-z0-9-]+$ ]] || exit 2
test "$(id -u)" = 0
source="$root/releases/$release"
test -s "$source/dist/index.html"
test -s "$source/server/forms-telegram.mjs"
test "$(readlink -f "$root/current")" = "$expected"
node="$root/toolchain/node-v22/bin/node"
"$node" --check "$source/server/forms-telegram.mjs"

backup="$root/backups/$release"
test ! -e "$backup"
install -d -m 700 "$backup"
printf '%s\n' "$expected" > "$backup/previous-current"
cp -a /etc/caddy/Caddyfile "$backup/Caddyfile"
cp -a /etc/systemd/system/debt-2026-lite-forms.service "$backup/forms.service"
install -m 600 "$root/env/forms.env" "$backup/forms.env"
dropin=/etc/systemd/system/debt-2026-lite-forms.service.d/20-debtupd-release.conf
if [[ -f "$dropin" ]]; then cp -a "$dropin" "$backup/20-debtupd-release.conf"; fi
install -m 700 "$source/deploy/rollback-production.sh" "$backup/rollback.sh"

# Retain older content-addressed assets for visitors with a previously opened page.
cp -an "$expected/assets/." "$source/dist/assets/"
"$node" --input-type=module - "$backup/Caddyfile" "$source/deploy/production.caddy" "$backup/Caddyfile.next" <<'NODE'
import fs from 'node:fs';
const [original, fragment, output] = process.argv.slice(2);
const text = fs.readFileSync(original, 'utf8');
const startMarker = '# DEBT_2026_LITE_BEGIN';
const endMarker = '# DEBT_2026_LITE_END';
if (text.split(startMarker).length !== 2 || text.split(endMarker).length !== 2)
  throw new Error('Production host markers are not unique');
const start = text.indexOf(startMarker);
const end = text.indexOf(endMarker) + endMarker.length;
if (end < start) throw new Error('Production host markers are out of order');
fs.writeFileSync(output, text.slice(0, start) + fs.readFileSync(fragment, 'utf8').trim() + text.slice(end));
NODE
caddy validate --config "$backup/Caddyfile.next" --adapter caddyfile
cmp -s /etc/caddy/Caddyfile "$backup/Caddyfile"
test "$(readlink -f "$root/current")" = "$expected"

on_error() {
    status=$?
    trap - ERR
    printf 'Publication failed; restoring the previous production release.\n' >&2
    bash "$backup/rollback.sh" "$backup"
    exit "$status"
}
trap on_error ERR

# Credentials remain server-side; only bind address and allowed origins change.
awk '!/^(HOST|PORT|ALLOWED_ORIGIN|ALLOWED_ORIGINS)=/' "$backup/forms.env" > "$backup/forms.env.next"
printf '%s\n' 'HOST=127.0.0.1' 'PORT=32026' \
    'ALLOWED_ORIGINS=https://debt-tech.ru,https://www.debt-tech.ru,https://debt-2026-lite.176.98.177.253.sslip.io' >> "$backup/forms.env.next"
install -m 600 "$backup/forms.env.next" "$root/env/forms.env"
install -d -m 755 "$(dirname "$dropin")"
printf '[Service]\nWorkingDirectory=%s\n' "$source" > "$dropin"
chmod 644 "$dropin"
systemctl daemon-reload
systemctl restart debt-2026-lite-forms.service
for attempt in {1..20}; do
    if curl --fail --silent http://127.0.0.1:32026/health; then break; fi
    sleep 1
done
curl --fail --silent http://127.0.0.1:32026/health
ln -sfn "$source/dist" "$root/current.next"
mv -Tf "$root/current.next" "$root/current"
install -m 644 "$backup/Caddyfile.next" /etc/caddy/Caddyfile
systemctl reload caddy
systemctl is-active --quiet debt-2026-lite-forms.service
systemctl is-active --quiet caddy
curl --fail --silent --resolve www.debt-tech.ru:443:127.0.0.1 https://www.debt-tech.ru/ | cmp - "$source/dist/index.html"
trap - ERR
printf '\nProduction release: %s\nRollback: bash %s/rollback.sh %s\n' "$release" "$backup" "$backup"
