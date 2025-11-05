# Quickstart Guide

This quickstart demonstrates how to run the OIDC Service locally with the Synapse + Hydra + Kratos stack used in Alkemio's development environment.

## Prerequisites

- Docker 24+
- Docker Compose v2
- Access to the Docker Hub repository `alkemio/oidc-service` (Docker Hub credentials with pull rights)
- Hydra, Kratos, and Synapse quickstart stack from `quickstart-services.yml`
- Environment file derived from `configs/env.sample`

## Steps

1. **Pull required images**

   ```sh
   docker compose -f quickstart-services.yml pull hydra kratos mailslurper synapse
   docker pull alkemio/oidc-service:latest
   ```

2. **Prepare environment configuration**

   ```sh
   cp configs/env.sample .env.oidc
   # Edit the file to set Hydra/Kratos URLs, admin tokens, cookie domain, and maintenance toggle values
   ```

3. **Launch supporting services**

   ```sh
   docker compose -f quickstart-services.yml up -d hydra kratos mailslurper synapse
   ```

4. **Run the OIDC Service container**

   ```sh
   docker run --rm \
     --env-file .env.oidc \
   --name oidc-service \
     -p 8085:8080 \
   alkemio/oidc-service:latest
   ```

5. **Verify readiness**

   ```sh
   curl -sSf http://localhost:8085/health/ready | jq
   ```

   A healthy response returns `{"status":"ready","hydra":"ok","kratos":"ok"}`.

6. **Exercise login flow**

   ```sh
   curl -i "http://localhost:8085/v1/oidc/login?login_challenge=test"
   ```

   You should receive either a `302` redirect or a structured `400`/`404` error depending on Hydra state.

7. **Toggle maintenance mode**

   ```sh
    docker run --rm \
       --env-file .env.oidc \
       -e OIDC_MAINTENANCE_MODE=true \
       -p 8085:8080 \
       alkemio/oidc-service:latest
   curl -i http://localhost:8085/v1/oidc/login?login_challenge=test
   ```

   Expect HTTP 503 with a JSON body describing maintenance.

8. **Collect metrics**

   ```sh
   curl -s http://localhost:8085/metrics | grep oidc_challenge_latency_seconds
   ```

   Confirm that the metrics endpoint exposes latency histograms and counters required for observability dashboards.

9. **Publish image via GitHub Actions (CI only)**
   - Push to `main` branch in the dedicated repository.
   - The `build-release-docker-hub.yml` workflow runs lint, tests, builds the binary, and publishes the container to Docker Hub (`alkemio/oidc-service`) with SemVer tags and immutable digests.

## Troubleshooting

- If readiness returns `unreachable`, verify Hydra/Kratos URLs and tokens in `.env.oidc`.
- For `INVALID_CHALLENGE` 404 responses, confirm the challenge still exists in Hydra using `hydra tokens introspect`.
- Enable debug logging by setting `OIDC_LOG_LEVEL=debug` before starting the container.
