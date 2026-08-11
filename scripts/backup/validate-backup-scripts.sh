#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
backup_script="$repo_root/scripts/backup/backup-db.sh"
restore_script="$repo_root/scripts/backup/restore-db.sh"

bash -n "$backup_script"
bash -n "$restore_script"

"$backup_script" --help >/dev/null
"$restore_script" --help >/dev/null

if TARGET_ENVIRONMENT=production \
  RESTORE_CONFIRMATION=I_UNDERSTAND_THIS_WILL_REPLACE_DATA \
  DATABASE_URL='postgresql://example.invalid/morada' \
  "$restore_script" /tmp/nonexistent.dump >/dev/null 2>&1; then
  echo "Restore safeguard failed: production restore was not refused." >&2
  exit 1
fi

if TARGET_ENVIRONMENT=staging \
  RESTORE_CONFIRMATION=I_UNDERSTAND_THIS_WILL_REPLACE_DATA \
  DATABASE_URL='postgresql://example.invalid/morada' \
  "$restore_script" /tmp/nonexistent.dump >/dev/null 2>&1; then
  echo "Restore safeguard failed: staging restore was not refused." >&2
  exit 1
fi

if grep -Eq 'echo .*DATABASE_URL|printf .*DATABASE_URL' "$backup_script" "$restore_script"; then
  echo "Backup scripts must not print DATABASE_URL." >&2
  exit 1
fi

printf 'Backup/restore script safeguards validated.\n'
