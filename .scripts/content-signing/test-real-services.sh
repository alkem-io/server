#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_dir="$(cd "${script_dir}/../.." && pwd)"
compose_file="${repo_dir}/test/integration/content-signing/compose.yml"
project_name="content-signing-${PPID}-${RANDOM}"

export CONTENT_SIGNING_DB_PORT="${CONTENT_SIGNING_DB_PORT:-55426}"
export CONTENT_SIGNING_FILE_SERVICE_PORT="${CONTENT_SIGNING_FILE_SERVICE_PORT:-44003}"
export CONTENT_SIGNING_FILE_SERVICE_IMAGE="${CONTENT_SIGNING_FILE_SERVICE_IMAGE:-aiai2025-file-service-pr1@sha256:fdd302dd8c3f1a272d7215237aec5bc246edcdaf52cce33193b79be968c55144}"
expected_file_service_revision="0a3995b235ef427c9d7cfd1092e7945e5244c137"

image_revision="$(docker image inspect "${CONTENT_SIGNING_FILE_SERVICE_IMAGE}" --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}')"
test "${image_revision}" = "${expected_file_service_revision}"
cleanup() {
  docker compose --project-name "${project_name}" --file "${compose_file}" down --volumes --remove-orphans
}
trap cleanup EXIT

docker compose --project-name "${project_name}" --file "${compose_file}" up --detach --wait

for _ in $(seq 1 30); do
  if curl --fail --silent "http://127.0.0.1:${CONTENT_SIGNING_FILE_SERVICE_PORT}/health" >/dev/null; then
    break
  fi
  sleep 1
done
curl --fail --silent "http://127.0.0.1:${CONTENT_SIGNING_FILE_SERVICE_PORT}/health" >/dev/null

export CONTENT_SIGNING_REAL_SERVICES=true
export CONTENT_SIGNING_DB_HOST=127.0.0.1
export CONTENT_SIGNING_DB_NAME=content_signing
export CONTENT_SIGNING_DB_USER=content_signing
export CONTENT_SIGNING_DB_PASSWORD=content_signing
export CONTENT_SIGNING_FILE_SERVICE_URL="http://127.0.0.1:${CONTENT_SIGNING_FILE_SERVICE_PORT}"

cd "${repo_dir}"
if ! pnpm exec vitest run test/integration/content-signing/signing-attempt.postgres.spec.ts "$@"; then
  docker compose --project-name "${project_name}" --file "${compose_file}" logs file-service
  exit 1
fi
