---
description: Restore databases (alkemio, synapse, optionally kratos) from latest backup set
arguments:
  - name: environment
    description: Environment to restore from (prod/dev/acc/sandbox)
    required: true
  - name: restart_services
    description: Whether to restart services after restore (true/false, default true)
    required: false
  - name: non_interactive
    description: Run without prompts (true/false, default true)
    required: false
  - name: restore_kratos
    description: Whether to also restore kratos database (true/false, default false)
    required: false
---

## Prerequisites

Before running, ensure `.scripts/backups/.env` exists with AWS and PostgreSQL credentials:

```bash
# Check if .env exists
cat .scripts/backups/.env
```

If missing, copy from sample and fill in credentials:
```bash
cp .scripts/backups/.env.sample .scripts/backups/.env
```

Required variables:
- `AWS_ACCESS_KEY_ID` - Scaleway S3 access key
- `AWS_SECRET_ACCESS_KEY` - Scaleway S3 secret key
- `POSTGRES_USER` - PostgreSQL user (typically "synapse")
- `POSTGRES_PASSWORD` - PostgreSQL password
- `POSTGRES_ALKEMIO_DB`, `POSTGRES_KRATOS_DB`, `POSTGRES_SYNAPSE_DB` - Database names

## Execution

1. First verify credentials exist:
```bash
test -f .scripts/backups/.env && echo "Credentials file exists" || echo "ERROR: Missing .scripts/backups/.env - copy from .env.sample and configure"
```

2. If credentials exist, run the restore script. Parse arguments from `$ARGUMENTS` (environment, restart_services, non_interactive, restore_kratos):
```bash
cd .scripts/backups && bash restore_latest_backup_set.sh <environment> [restart_services] [non_interactive] [restore_kratos]
```

**Default behavior:**
- Restores `alkemio` and `synapse` databases
- Kratos is NOT restored by default (pass `true` as 4th argument to include it)
- Services are restarted after restore

**Examples:**
- `/restore-dbs prod` - Restore prod databases (no kratos), restart services
- `/restore-dbs dev false` - Restore dev databases, don't restart services
- `/restore-dbs acc true true true` - Restore acc databases INCLUDING kratos

Report the script output to the user. If credentials are missing, guide the user to set them up.
