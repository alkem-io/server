# Dev Container Setup

This folder contains Dev Container configurations for the Alkemio Server.

## Configurations

- **devcontainer.json** (default): Full stack setup with all dependent services running via Docker Compose
- **devcontainer-minimal.json**: Minimal setup with only the app container (for running services externally)

## Full Stack Setup (devcontainer.json)

The default configuration uses `docker-compose.yml` to start all required services automatically:

- PostgreSQL 18.6
- Redis
- RabbitMQ
- Ory Kratos & Oathkeeper (authentication)
- Ory Hydra (OAuth2)
- Matrix Synapse & adapter (communication)
- Swarmail (email testing; UI on http://localhost:4436, MailSlurper-compatible API on :4437)
- Traefik (reverse proxy)
- Whiteboard, file, document, and notification services

### Upgrading from PostgreSQL 17

An existing `postgres-data` volume from PostgreSQL 17 stops the `postgres` container from starting. Restarting does not help, and `.scripts/migrate-postgres-volume.sh` only covers the quickstart stack. If you have no data worth keeping, remove the volume and skip the dump and restore steps.

Otherwise, stop the dev container, then run these from the repository root. Find the volume name with `docker volume ls | grep postgres-data`.

```bash
docker compose -f .devcontainer/docker-compose.yml down
VOLUME=<project>_postgres-data

# Dump everything with PostgreSQL 17
docker run -d --name pg17-dump -v "$VOLUME":/var/lib/postgresql/data postgres:17.5
until docker exec pg17-dump pg_isready -q -U synapse; do sleep 1; done
docker exec pg17-dump pg_dumpall -U synapse --clean --if-exists > pg17-dump.sql

# Replace the volume, only after checking that pg17-dump.sql holds your data
docker rm -f pg17-dump
docker volume rm "$VOLUME"

# Restore into PostgreSQL 18
docker compose -f .devcontainer/docker-compose.yml up -d --no-deps --wait postgres
docker compose -f .devcontainer/docker-compose.yml exec -T postgres psql -q -U synapse -d postgres < pg17-dump.sql
```

The restore reports `current user cannot be dropped` and `role "synapse" already exists`. Both are expected. Reopen the dev container afterwards. If your dev container runs under a different compose project name, pass the same `-p` to the compose commands so they find the same volume.

### Verifying Service Health

After the dev container starts, verify that all services are running correctly:

```bash
docker compose -f .devcontainer/docker-compose.yml ps
```

All services should show a healthy status. If any service failed to start, you can:

1. Check service logs: `docker compose -f .devcontainer/docker-compose.yml logs <service-name>`
2. Restart a specific service: `docker compose -f .devcontainer/docker-compose.yml restart <service-name>`
3. Stop and restart all: `docker compose -f .devcontainer/docker-compose.yml down && docker compose -f .devcontainer/docker-compose.yml up -d`

## Minimal Setup (devcontainer-minimal.json)

The minimal configuration builds only the app container without dependent services. Use this when:

- Running services on your host machine
- Connecting to external/shared development services
- You need a lighter-weight setup

To use this configuration, rename it to `devcontainer.json` or select it in your IDE's dev container picker.
