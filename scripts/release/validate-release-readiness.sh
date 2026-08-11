#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-dry-run}"
TARGET_ENV="${TARGET_ENV:-staging}"

fail() {
  printf 'release-readiness: %s\n' "$1" >&2
  exit 1
}

require_present() {
  local name="$1"
  [[ -n "${!name:-}" ]] || fail "$name is required"
}

[[ "$MODE" == "dry-run" || "$MODE" == "enforce" ]] || fail "mode must be dry-run or enforce"
[[ "$TARGET_ENV" == "staging" || "$TARGET_ENV" == "production" ]] || fail "TARGET_ENV must be staging or production"

require_present DATABASE_URL
require_present JWT_ACCESS_SECRET
require_present JWT_REFRESH_SECRET
require_present CORS_ORIGINS

[[ "$DATABASE_URL" == postgres://* || "$DATABASE_URL" == postgresql://* ]] || fail "DATABASE_URL must use PostgreSQL"
[[ ${#JWT_ACCESS_SECRET} -ge 32 ]] || fail "JWT_ACCESS_SECRET must be at least 32 characters"
[[ ${#JWT_REFRESH_SECRET} -ge 32 ]] || fail "JWT_REFRESH_SECRET must be at least 32 characters"
[[ "$JWT_ACCESS_SECRET" != "$JWT_REFRESH_SECRET" ]] || fail "JWT access and refresh secrets must differ"

if [[ "$TARGET_ENV" == "production" ]]; then
  [[ "$CORS_ORIGINS" != *localhost* && "$CORS_ORIGINS" != *127.0.0.1* ]] || fail "production CORS cannot include local origins"
fi

printf 'release-readiness: configuration contract valid for %s\n' "$TARGET_ENV"

if [[ "$MODE" == "dry-run" ]]; then
  printf 'release-readiness: dry-run only; no deployment or infrastructure action performed\n'
  exit 0
fi

[[ "${OWNER_RELEASE_APPROVED:-false}" == "true" ]] || fail "explicit owner release approval is required"
[[ "${HOSTING_TARGET_READY:-false}" == "true" ]] || fail "hosting target is not approved/configured"
[[ "${DATABASE_TARGET_READY:-false}" == "true" ]] || fail "managed database target is not approved/configured"
[[ "${PUBLIC_STORAGE_TARGET_READY:-false}" == "true" ]] || fail "durable public storage target is not approved/configured"
[[ "${PRIVATE_STORAGE_TARGET_READY:-false}" == "true" ]] || fail "approved private storage target is not configured"
[[ "${BACKUP_TARGET_READY:-false}" == "true" ]] || fail "offsite backup target is not approved/configured"

printf 'release-readiness: external gates explicitly attested; deployment command is intentionally not implemented here\n'
