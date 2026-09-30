#!/usr/bin/env bash
set -euo pipefail

root=/srv/imon/projects/debt-2026-lite
backup=${1:?Usage: rollback-production.sh ABSOLUTE_BACKUP_DIRECTORY}
[[ "$backup" == "$root/backups/"* ]] || exit 2
test "$(id -u)" = 0
test -s "$backup/previous-current"
test -s "$backup/Caddyfile"
dropin=/etc/systemd/system/debt-2026-lite-forms.service.d/20-debtupd-release.conf

previous=$(<"$backup/previous-current")
test -s "$previous/index.html"
ln -sfn "$previous" "$root/current.rollback"
mv -Tf "$root/current.rollback" "$root/current"
install -m 600 "$backup/forms.env" "$root/env/forms.env"
if [[ -f "$backup/20-debtupd-release.conf" ]]; then
    install -m 644 "$backup/20-debtupd-release.conf" "$dropin"
else
    rm -f "$dropin"
fi
install -m 644 "$backup/Caddyfile" /etc/caddy/Caddyfile
systemctl daemon-reload
systemctl restart debt-2026-lite-forms.service
for attempt in {1..20}; do
    if curl --fail --silent http://127.0.0.1:32026/health; then break; fi
    sleep 1
done
curl --fail --silent http://127.0.0.1:32026/health
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
systemctl reload caddy
printf '\nRestored frontend: %s\n' "$previous"
