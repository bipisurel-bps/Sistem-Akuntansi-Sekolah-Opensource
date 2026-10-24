#!/usr/bin/env bash
# Jalankan dari cron/systemd dengan akses Docker. Tidak menghapus backup lama.
set -euo pipefail
umask 077
cd "$(dirname "$0")/.."
SAS_BACKUP_DIR="${SAS_BACKUP_DIR:-/var/backups/sas}"
install -d -m 700 "$SAS_BACKUP_DIR"
exec 9>"$SAS_BACKUP_DIR/.backup.lock"
flock -n 9 || exit 0
SAS_BACKUP_FILE="$SAS_BACKUP_DIR/sas-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
SAS_BACKUP_TEMP="$(mktemp "$SAS_BACKUP_DIR/.sas-backup.XXXXXX")"
trap 'test ! -f "$SAS_BACKUP_TEMP" || rm -- "$SAS_BACKUP_TEMP"' EXIT
docker compose exec -T db sh -c 'exec pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' </dev/null | gzip > "$SAS_BACKUP_TEMP"
gzip -t "$SAS_BACKUP_TEMP"
mv -n "$SAS_BACKUP_TEMP" "$SAS_BACKUP_FILE"
printf 'Backup PostgreSQL SAS selesai: %s\n' "$SAS_BACKUP_FILE"
