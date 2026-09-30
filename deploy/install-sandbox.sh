#!/usr/bin/env bash
set -euo pipefail

# This script has no production-domain or production-service write operations.
root=/srv/imon/projects/debtupd-sandbox
release=${1:?Usage: install-sandbox.sh RELEASE_ID}
[[ "$release" =~ ^[A-Za-z0-9-]+$ ]] || exit 2
source="$root/releases/$release"
test -s "$source/dist/index.html"
test -s "$source/server/forms-telegram.mjs"
test "$(id -u)" = 0

install -d -m 700 "$root/env" "$root/backups"
if [[ ! -e "$root/env/forms.env" ]]; then
    install -m 600 /srv/imon/projects/debt-2026-lite/env/forms.env "$root/env/forms.env"
fi
# Keep credential values only on the server; replace only environment routing.
sed -i -E '/^(HOST|PORT|ALLOWED_ORIGIN|ALLOWED_ORIGINS)=/d' "$root/env/forms.env"
printf '%s\n' 'HOST=127.0.0.1' 'PORT=32027' \
    'ALLOWED_ORIGINS=https://debtupd-sandbox.176.98.177.253.sslip.io' >> "$root/env/forms.env"
chmod 600 "$root/env/forms.env"

old_source=$(readlink "$root/source" || true)
old_current=$(readlink "$root/current" || true)
ln -sfn "$source" "$root/source.next"
mv -Tf "$root/source.next" "$root/source"
ln -sfn "$source/dist" "$root/current.next"
mv -Tf "$root/current.next" "$root/current"
install -m 644 "$source/deploy/debtupd-sandbox-forms.service" /etc/systemd/system/debtupd-sandbox-forms.service
systemctl daemon-reload
systemctl enable --now debtupd-sandbox-forms.service
systemctl restart debtupd-sandbox-forms.service
for attempt in {1..20}; do
    if curl --fail --silent http://127.0.0.1:32027/health; then break; fi
    sleep 1
done
curl --fail --silent http://127.0.0.1:32027/health

backup="$root/backups/Caddyfile-$(date -u +%Y%m%dT%H%M%SZ)"
cp -a /etc/caddy/Caddyfile "$backup"
install -m 644 "$source/deploy/sandbox.caddy" /etc/caddy/debtupd-sandbox.caddy
if ! grep -qxF 'import /etc/caddy/debtupd-sandbox.caddy' /etc/caddy/Caddyfile; then
    printf '\nimport /etc/caddy/debtupd-sandbox.caddy\n' >> /etc/caddy/Caddyfile
fi
if ! caddy validate --config /etc/caddy/Caddyfile; then
    cp -a "$backup" /etc/caddy/Caddyfile
    echo 'Caddy validation failed; running Caddy and production were not reloaded.' >&2
    exit 1
fi
if ! systemctl reload caddy; then
    cp -a "$backup" /etc/caddy/Caddyfile
    echo 'Caddy reload failed; previous config restored on disk. Inspect running state.' >&2
    exit 1
fi
printf '\nSandbox release: %s\nPrevious source: %s\nPrevious frontend: %s\n' "$release" "$old_source" "$old_current"
systemctl is-active debtupd-sandbox-forms.service debt-2026-lite-forms.service caddy
