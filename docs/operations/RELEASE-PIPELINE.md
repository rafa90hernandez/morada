# Beta 1 release pipeline readiness

Morada does not auto-deploy from pull requests. The repository contains only validation and release gates until deployment targets are explicitly approved.

## Safe flow

1. Pull request CI runs quality gates.
2. `Release readiness` runs only configuration dry-run validation with synthetic values.
3. Merge to `main` still does not deploy.
4. A future staging deployment must use an approved hosting target, managed PostgreSQL, durable public storage, approved private storage and offsite backup.
5. Production promotion must be manual and require explicit owner approval.

## Release validation

`bash scripts/release/validate-release-readiness.sh dry-run` validates the environment contract without connecting to or provisioning infrastructure.

`enforce` mode is intentionally only a gate. It requires explicit boolean attestations for owner approval and each external dependency, then exits after validation. There is no deployment command in the script.

## Database migrations

For an approved target, apply committed Prisma migrations with the production migration command supported by the current Prisma setup. Never run schema-reset or development migration commands against production. Take/verify a recoverable backup before migrations once production backup infrastructure exists.

## Hard external gates

The current repository intentionally cannot be declared production-ready until all of these are approved/configured: hosting, managed PostgreSQL, durable public media storage, strictly private evidence/chat storage, offsite encrypted backups and production secrets management. These can create costs and therefore require owner approval before activation.

## Rollback

A release must retain the previous deployable application revision. Application rollback and database recovery are separate decisions; do not reverse a database migration destructively without a tested restore plan. The backup/restore runbook in `BACKUP-RESTORE.md` defines the current local/test drill and external backup gates.
