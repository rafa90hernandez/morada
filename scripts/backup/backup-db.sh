#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: DATABASE_URL=... [BACKUP_OUTPUT_DIR=./backups] scripts/backup/backup-db.sh

Creates a PostgreSQL custom-format dump with owner/privilege metadata omitted.
The script never prints DATABASE_URL.
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required." >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump is required." >&2
  exit 1
fi

backup_dir="${BACKUP_OUTPUT_DIR:-./backups}"
umask 077
mkdir -p "$backup_dir"

stamp="$(date -u +'%Y%m%dT%H%M%SZ')"
final_path="${backup_dir%/}/morada-db-${stamp}.dump"
temp_path="${final_path}.partial"

cleanup() {
  rm -f "$temp_path"
}
trap cleanup EXIT

pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$temp_path" \
  "$DATABASE_URL"

mv "$temp_path" "$final_path"
chmod 600 "$final_path"
trap - EXIT

printf 'Backup created: %s\n' "$final_path"
