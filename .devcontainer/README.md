# Dev Container Setup

This folder contains Dev Container configurations for the Alkemio Server.

## Configurations

- **devcontainer.json**: Basic development setup
- **devcontainer-full-stack.json**: Full stack setup with Docker-in-Docker for running dependent services

## Full Stack Setup

The full stack configuration (`devcontainer-full-stack.json`) automatically starts required services (PostgreSQL, RabbitMQ, Redis, etc.) via `pnpm run start:services` when the container starts.

### Verifying Service Health

After the dev container starts, verify that all services are running correctly:

```bash
docker compose -f quickstart-services.yml ps
```

All services should show a healthy status. If any service failed to start, you can:

1. Check service logs: `docker compose -f quickstart-services.yml logs <service-name>`
2. Restart services: `pnpm run start:services`
3. Stop and restart: `docker compose -f quickstart-services.yml down && pnpm run start:services`
