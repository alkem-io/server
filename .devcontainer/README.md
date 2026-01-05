# Dev Container Setup

This folder contains Dev Container configurations for the Alkemio Server.

## Configurations

- **devcontainer.json** (default): Full stack setup with all dependent services running via Docker Compose
- **devcontainer-minimal.json**: Minimal setup with only the app container (for running services externally)

## Full Stack Setup (devcontainer.json)

The default configuration uses `docker-compose.yml` to start all required services automatically:

- PostgreSQL 17.5
- Redis
- RabbitMQ
- Ory Kratos & Oathkeeper (authentication)
- Ory Hydra (OAuth2)
- Matrix Synapse & adapter (communication)
- Mailslurper (email testing)
- Traefik (reverse proxy)
- Whiteboard, file, document, and notification services

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
