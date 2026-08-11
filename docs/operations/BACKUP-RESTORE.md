# Beta 1 Backup and Restore Readiness

## Scope

Morada Beta 1 has two backup domains that must be treated separately:

1. PostgreSQL relational data;
2. uploaded objects, especially private identity, listing-authorization and conversation evidence.

The repository provides deterministic PostgreSQL backup/restore scripts but does not provision an offsite backup service or object-storage backup provider.

## PostgreSQL backup

Run:

```bash
DATABASE_URL='postgresql://...' \
BACKUP_OUTPUT_DIR='./backups' \
./scripts/backup/backup-db.sh
```

The script:

- requires `pg_dump`;
- uses PostgreSQL custom format;
- omits ownership/privilege metadata;
- creates files with restrictive permissions;
- writes to a temporary file before final rename;
- never prints `DATABASE_URL`.

A successful local dump is only one part of production backup readiness. Production must also define encrypted offsite storage, retention, access control and restore ownership for the selected infrastructure.

## Restore drill

Repository restore automation is intentionally limited to disposable/local targets:

```bash
TARGET_ENVIRONMENT=test \
RESTORE_CONFIRMATION=I_UNDERSTAND_THIS_WILL_REPLACE_DATA \
DATABASE_URL='postgresql://...' \
./scripts/backup/restore-db.sh ./backups/morada-db-YYYYMMDDTHHMMSSZ.dump
```

The script refuses `staging` and `production` before invoking `pg_restore`. This is deliberate: production restoration must be a separately reviewed incident/recovery procedure for the chosen database provider and must never be a one-command repository action.

## CI-safe validation

`pnpm backup:validate` performs only non-destructive validation:

- `bash -n` syntax checks;
- help-path execution;
- proves production and staging restore attempts are refused;
- checks that scripts do not directly print `DATABASE_URL`.

It does not connect to a database and does not require production secrets.

## Proposed closed-beta recovery objectives

These values are provisional operational targets, not guarantees:

- target database RPO: 24 hours or better;
- target database RTO: 4 hours during controlled closed beta;
- restore drill: before first production beta and after material backup/provider changes;
- database backup retention proposal: daily backups for 14 days plus an agreed longer retention tier if required by legal/operational policy.

Final values depend on the chosen hosting/database plan and legal retention policy.

## Uploaded-object backup dependency

A PostgreSQL dump does **not** contain uploaded object bytes. The database stores references/keys for several object categories.

Production backup scope must therefore include the approved object-storage provider and cover at minimum:

- private identity-verification evidence;
- private listing-authorization evidence;
- private conversation attachments;
- public listing/profile media when those files are not reproducible elsewhere.

The object backup policy must preserve the same access-control/privacy boundary as primary storage. Backup copies of private evidence must not become public URLs or be copied into CI artifacts.

The current local private-storage implementation is development/test only and must not be treated as a production backup mechanism.

## Production gates requiring owner approval

Before production can claim backup readiness, select/configure:

1. durable database hosting with reviewed backup capability or an equivalent operator-managed encrypted backup destination;
2. durable private/public object storage and its backup/versioning strategy;
3. encryption/access-control/retention settings;
4. a production restore procedure with explicit operator authorization.

Any service that can generate charges must be approved by the owner before activation.
