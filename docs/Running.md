# Running the server using containers (docker-compose and docker)

The Alkemio platform is a micro-services architecture, which implies that typically multiple dependencies are needed to run the Server.

To simplify setting up the Server development environment, a pre-configured docker compose script is provided.

## Prerequisites:

- Docker and docker-compose installed on x86 architecture\* (so not an ARM-based architecture like Raspberry pi or MacBook with M1 processor)
- Make sure you're using pnpm @9.0.0 or later. node v22.0.0 is recommended (but it should work with v < 23)

\* If you are not on an x86 architecture:

- Docker Desktop for Mac (Apple Silicon) can run x86/amd64 images using emulation.
- [Colima](https://github.com/abiosoft/colima) offers ARM-native Docker environments, but may be slower still, as it is still an emulation.

## Database Backend

**Alkemio uses PostgreSQL 17.5 as the database backend** for both the Alkemio server and Ory Kratos identity service.

## Steps:

1. Start the services alkemio server is dependent on (PostgreSQL, Ory Kratos, Ory Hydra, Matrix Synapse, RabbitMQ, etc.):

```bash
pnpm run start:services
```

2. Run the migrations

```bash
pnpm run migration:run
```

3. Start alkemio-server

```bash
pnpm start
```

4. Validate that the server is running by visiting the [graphql endpoint](http://localhost:3000/graphql).
5. Optional: verify the OIDC stack

- Hydra discovery endpoint: `curl http://localhost:3000/.well-known/openid-configuration`
- Synapse OIDC callback health: check `docker logs alkemio_dev_synapse | grep oidc-hydra`

## Smoke Tests for Postgres-Only Environment

After starting a Postgres-only deployment, verify core functionality with these smoke tests:

### Database Connectivity

```bash
# Verify Postgres is running and accessible
docker exec alkemio-serverdev-postgres-1 pg_isready -U alkemio

# Check Alkemio database exists and has tables
docker exec alkemio-serverdev-postgres-1 \
  psql -U alkemio -d alkemio -c "\dt" | grep -E "(user|space|organization)"

# Check Kratos database exists and has tables
docker exec alkemio-serverdev-postgres-1 \
  psql -U alkemio -d kratos -c "\dt" | grep -E "(identities|sessions)"

# Verify migrations applied
pnpm run migration:show
```

### API Health Checks

```bash
# GraphQL endpoint is responding
curl -f http://localhost:3000/graphql || echo "GraphQL endpoint not available"

# Kratos health check
curl -f http://localhost:4434/health/ready || echo "Kratos not ready"

# Hydra health check
curl -f http://localhost:4445/health/ready || echo "Hydra not ready"
```

### Basic GraphQL Operations

Test basic queries to ensure database connectivity and GraphQL resolvers work:

```bash
# Query platform configuration (should return data)
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ platform { configuration { authentication { enabled } } } }"}'

# Query spaces (may be empty but should not error)
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ spaces { id nameID } }"}'
```

### Authentication Flow Verification

```bash
# Verify Kratos can access identity database
curl -X GET http://localhost:4433/identities \
  -H "Authorization: Bearer $(echo 'test-token-for-health-check')" \
  || echo "Kratos identity query returned expected error"

# Check session cookie configuration
curl -I http://localhost:4433/sessions/whoami \
  | grep -i "set-cookie" || echo "Session endpoint responding"
```

### Schema Contract Tests

Run automated schema contract tests to verify Postgres schema integrity:

```bash
# Requires Postgres services running
pnpm run test:ci contract-tests/
```

### Common Issues and Troubleshooting

**Connection refused errors:**

- Ensure all services are up: `docker compose -f quickstart-services.yml ps`
- Check service logs: `docker compose -f quickstart-services.yml logs postgres kratos`

**Migration failures:**

- Verify DATABASE_TYPE is set to 'postgres'
- Check connection string environment variables
- Ensure Postgres is ready before running migrations

**Schema mismatch:**

- Regenerate schema: `pnpm run schema:print`
- Compare with baseline: `pnpm run schema:diff`

**Kratos migration issues:**

- Check Kratos logs: `docker logs alkemio-serverdev-kratos-1`
- Verify DSN in Kratos config
- Manually run migrations: `docker exec kratos kratos migrate sql -e --yes`

## Notes

- The docker compose script puts the server listening on port 4001 - to avoid conflict with the default port that is used by local development.
- The server will be almost empty after initially being created. To populate the Server with some sample data please use the [Alkemio Populator](http://github.com/alkem-io/Populator) tool which allows easy population from a local file. Please remember to specify the correct port to connect to!
- Once you set up the services and run the migrations, two alkemio users will be created. Find them in table `users`. You will need to register them in order to set up passwords once you run the web client. If you wish, configure the user needed for notifications via SERVICE_ACCOUNT_USERNAME & SERVICE_ACCOUNT_PASSWORD env variables in .env.docker. The profiles need to be Global Community Admin - you can find this out yourself: Do you see an administration menu item in your Alkemio profiles?
- If you are using Windows you must go to docker settings -> resources -> file sharing and add the paths to .build and .scripts dirs.
- The Synapse ↔ Hydra client credentials are read from `.env.docker` (`SYNAPSE_OIDC_CLIENT_ID` and `SYNAPSE_OIDC_CLIENT_SECRET`). Make sure these values exist before running the services.
- Finally, ports available on localhost:
  - 3000/graphql (alkemio server),
  - 5432 (PostgreSQL database - default)
  - 8888 (traefik dashboard)
  - 3000 (alkemio client)
  - 8008 (synapse server)
  - 4444 (hydra public)
  - 4445 (hydra admin)
  - 4436 (mailslurper UI)
  - 4437 (mailslurper API)
  - 5672 (rabbitMQ amqp)
  - 15672 (rabbitMQ management UI)

It will use the SYNAPSE_XXX from env.docker, create a configuration in /var/lib/docker/volumes/synapse-data/\_data/, copy them to /var/docker_data/matrix and then map the latter to a volume used in docker-compose.

If you want to run a debug version of kratos, run:

```bash
pnpm run start:services:kratos:debug
```

If you want to run a debug version of any AI service (Engine), do the following:

1. Clone the repo in the same root folder as the server
2. Run the following command:

```bash
pnpm run start:services:ai:debug
```

Note: You may need multiple repositories cloned in order for this command to run. You can search the word `build` in `quickstart-services-ai-debug` and check which contexts are being built. If you need only one service to be built, comment the rest of the services which build the Dockerfile from relative path to the Alkemio Server.

## Schema baseline automation prerequisites

- The post-merge workflow `.github/workflows/schema-baseline.yml` regenerates `schema-baseline.graphql` on every push to `develop`, commits the snapshot, and opens a pull request from a temporary branch using the automation service account.
- Configure the following GitHub Action secrets (repository or environment scoped) before enabling the workflow:
  - `ALKEMIO_INFRASTRUCTURE_BOT_GPG_PRIVATE_KEY`: ASCII-armored private key for the automation identity.
  - `ALKEMIO_INFRASTRUCTURE_BOT_GPG_PASSPHRASE`: Passphrase for the key (set to an empty string when the key is unprotected).
- - `ALKEMIO_INFRASTRUCTURE_BOT_GPG_KEY_ID`: Fingerprint uploaded to GitHub so commits appear as verified.
- - `ALKEMIO_INFRASTRUCTURE_BOT_PUSH_TOKEN`: Classic PAT with at least `repo` scope issued for the automation account; used to push the baseline branch and create the PR (also satisfies CLA requirements).
- Grant the automation key push access via the PAT and verify the public key is registered with the bot account that owns the commits.
- After updating secrets, trigger the workflow manually (`workflow_dispatch`) to confirm the baseline branch/PR path succeeds before relying on automatic runs.
