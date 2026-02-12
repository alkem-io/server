# Database Restoration

When asked to restore databases or work with backup data from environments (prod, dev, acc, sandbox), follow this guide.

## Overview

The restore system downloads PostgreSQL backups from Scaleway S3 and restores them to the local Docker PostgreSQL container (`alkemio_dev_postgres`).

**Databases available:**
- `alkemio` - Main application database
- `synapse` - Matrix/Synapse communication database
- `kratos` - Ory Kratos identity database (optional, usually not restored)

## Prerequisites

### 1. Credentials File

Ensure `.scripts/backups/.env` exists:

```bash
# Check if credentials exist
test -f .scripts/backups/.env && echo "OK" || echo "Missing - needs setup"
```

If missing, create from sample:
```bash
cp .scripts/backups/.env.sample .scripts/backups/.env
```

Required variables:
- `AWS_ACCESS_KEY_ID` - Scaleway S3 access key
- `AWS_SECRET_ACCESS_KEY` - Scaleway S3 secret key
- `POSTGRES_USER` - PostgreSQL user (typically "synapse")
- `POSTGRES_PASSWORD` - PostgreSQL password
- `POSTGRES_ALKEMIO_DB` - Alkemio database name
- `POSTGRES_KRATOS_DB` - Kratos database name
- `POSTGRES_SYNAPSE_DB` - Synapse database name

### 2. Docker Services

The PostgreSQL container must be running:
```bash
docker ps | grep alkemio_dev_postgres
```

If not running:
```bash
pnpm run start:services
```

## Restoration Commands

### Restore Full Set (Recommended)

Restores alkemio + synapse (kratos optional):

```bash
cd .scripts/backups && bash restore_latest_backup_set.sh <environment> [restart_services] [non_interactive] [restore_kratos]
```

**Arguments:**
| Arg | Values | Default | Description |
|-----|--------|---------|-------------|
| environment | prod/dev/acc/sandbox | prod | Source environment |
| restart_services | true/false | true | Restart services after |
| non_interactive | true/false | true | Skip confirmation prompts |
| restore_kratos | true/false | false | Include kratos database |

**Examples:**
```bash
# Restore prod, restart services
bash restore_latest_backup_set.sh prod

# Restore dev, no restart
bash restore_latest_backup_set.sh dev false

# Restore acc with kratos
bash restore_latest_backup_set.sh acc true true true
```

### Restore Single Database

For restoring just one database:

```bash
cd .scripts/backups && bash restore_latest_backup.sh <database> <environment> [non_interactive]
```

**Examples:**
```bash
bash restore_latest_backup.sh alkemio prod true
bash restore_latest_backup.sh synapse dev true
bash restore_latest_backup.sh kratos acc true
```

## Environment Mapping

| Environment | S3 Bucket | Region | Matrix Server |
|-------------|-----------|--------|---------------|
| prod | alkemio-s3-backups-prod-paris | fr-par | matrix.alkem.io |
| dev | alkemio-s3-backups-dev | nl-ams | matrix-dev.alkem.io |
| acc | alkemio-s3-backups-dev | nl-ams | matrix-acc.alkem.io |
| sandbox | alkemio-s3-backups-dev | nl-ams | matrix-sandbox.alkem.io |

## Troubleshooting

### AWS CLI Issues
The script auto-installs AWS CLI v2 if missing. If authentication fails:
```bash
aws configure list  # Check current config
cat ~/.aws/credentials  # Verify credentials
```

### Database Connection Errors
Ensure container is running and healthy:
```bash
docker exec alkemio_dev_postgres pg_isready -U synapse
```

### Backup Not Found
List available backups:
```bash
source .scripts/backups/.env
aws s3 ls s3://alkemio-s3-backups-prod-paris/storage/postgres/backups/alkemio/
```
