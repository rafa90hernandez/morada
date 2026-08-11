#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  TARGET_ENVIRONMENT=test \
  RESTORE_CONFIRMATION=I_UNDERSTAND_THIS_WILL_REPLACE_DATA \
  DATABASE_URL=... \
  scripts/backup/restore-db.sh path/to/backup.dump

This repository script intentionally refuses staging and production restores.
Production restore requires a separately reviewed provider-specific procedure.
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

dump_path="${1:-}"
if [[ -z "$dump_path" ]]; then
  usage >&2
  exit 1
fi

target_environment="${TARGET_ENVIRONMENT:-}"
if [[ "$target_environment" == "production" || "$target_environment" == "staging" ]]; then
  echo "Refusing destructive restore in ${target_environment}." >&2
  exit 1
fi

case "$target_environment" in
  development|test|local) ;;
  *)
    echo "TARGET_ENVIRONMENT must be development, test, or local." >&2
    exit 1
    ;;
esac

if [[ "${RESTORE_CONFIRMATION:-}" != "I_UNDERSTAND_THIS_WILL_REPLACE_DATA" ]]; then
  echo "Explicit RESTORE_CONFIRMATION is required." >&2
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required." >&2
  exit 1
fi

if [[ ! -f "$dump_path" ]]; then
  echo "Backup file not found: $dump_path" >&2
  exit 1
fi

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "pg_restore is required." >&2
  exit 1
fi

pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --dbname="$DATABASE_URL" \
  "$dump_path"

printf 'Restore completed for %s environment.\n' "$target_environment"
