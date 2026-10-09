#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_dir="$(cd "${script_dir}/../.." && pwd)"
compose_file="${repo_dir}/test/integration/attachment-placement/compose.yml"
project_name="attachment-placement-${PPID}-${RANDOM}"
: "${ATTACHMENT_PLACEMENT_FILE_SERVICE_IMAGE:?set a reviewed capability-bearing image; no default or latest}"
: "${ATTACHMENT_PLACEMENT_FILE_SERVICE_SOURCE:?describe the reviewed source revision, explicitly labelling uncommitted candidates}"
if [[ "${ATTACHMENT_PLACEMENT_FILE_SERVICE_IMAGE}" == *:latest ]]; then
  echo "An unverified latest tag is not accepted" >&2
  exit 1
fi
report_root="${ATTACHMENT_PLACEMENT_REPORT_ROOT:-${TMPDIR:-/tmp}}"
mkdir -p "${report_root}"
report_dir="$(mktemp -d "${report_root}/attachment-placement.XXXXXX")"
chmod 700 "${report_dir}"
image_metadata="$(docker image inspect "${ATTACHMENT_PLACEMENT_FILE_SERVICE_IMAGE}" --format '{{json .}}')"
export ATTACHMENT_PLACEMENT_FILE_SERVICE_SOURCE
node -e '
const image = JSON.parse(process.argv[1]);
const labels = image.Config.Labels || {};
const source = process.env.ATTACHMENT_PLACEMENT_FILE_SERVICE_SOURCE;
if (labels["io.alkemio.uncommitted"] === "true" && !source.includes("uncommitted")) {
  throw new Error("Candidate image must be explicitly recorded as uncommitted");
}
console.log(JSON.stringify({ image: image.Id, source, revision: labels["org.opencontainers.image.revision"] || null, uncommitted: labels["io.alkemio.uncommitted"] === "true" }));
' "${image_metadata}" >"${report_dir}/provenance.json"
cat "${report_dir}/provenance.json"

echo "Fixture project: ${project_name}; evidence: ${report_dir}"
cleanup() {
  status=$?
  if [[ ${status} -ne 0 ]]; then
    docker compose --project-name "${project_name}" --file "${compose_file}" logs --no-color file-service >"${report_dir}/file-service.log" 2>&1 || true
  fi
  docker compose --project-name "${project_name}" --file "${compose_file}" down --volumes --remove-orphans
}
trap cleanup EXIT

docker compose --project-name "${project_name}" --file "${compose_file}" up --detach --wait
export ATTACHMENT_PLACEMENT_DB_PORT
ATTACHMENT_PLACEMENT_DB_PORT="$(docker compose --project-name "${project_name}" --file "${compose_file}" port postgres 5432 | awk -F: '{print $NF}')"
export ATTACHMENT_PLACEMENT_FILE_SERVICE_PORT
ATTACHMENT_PLACEMENT_FILE_SERVICE_PORT="$(docker compose --project-name "${project_name}" --file "${compose_file}" port file-service 4003 | awk -F: '{print $NF}')"
export ATTACHMENT_PLACEMENT_FILE_SERVICE_URL="http://127.0.0.1:${ATTACHMENT_PLACEMENT_FILE_SERVICE_PORT}"
for _ in $(seq 1 30); do
  if curl --fail --silent "${ATTACHMENT_PLACEMENT_FILE_SERVICE_URL}/health" >/dev/null; then break; fi
  sleep 1
done
curl --fail --silent "${ATTACHMENT_PLACEMENT_FILE_SERVICE_URL}/health" >/dev/null
# Missing ref is rejected before DB access; 404/405 means the required direct-content route is absent.
capability_status="$(curl --silent --output "${report_dir}/capability.json" --write-out '%{http_code}' "${ATTACHMENT_PLACEMENT_FILE_SERVICE_URL}/internal/file/by-reference/content")"
if [[ "${capability_status}" != 400 ]]; then
  echo "Missing reference-content capability (HTTP ${capability_status})" >&2
  exit 1
fi
export ATTACHMENT_PLACEMENT_REAL_SERVICES=true
export ATTACHMENT_PLACEMENT_DB_HOST=127.0.0.1
export ATTACHMENT_PLACEMENT_DB_NAME=attachment_placement
export ATTACHMENT_PLACEMENT_DB_USER=attachment_placement
export ATTACHMENT_PLACEMENT_DB_PASSWORD=attachment_placement
cd "${repo_dir}"
test_status=0
pnpm exec vitest run src/domain/communication/message-attachment/message.attachment.placement.postgres.spec.ts --maxWorkers=1 --reporter=default --reporter=json --outputFile="${report_dir}/results.json" "$@" || test_status=$?
node -e '
const report = require(process.argv[1]);
console.log(JSON.stringify({ total: report.numTotalTests, passed: report.numPassedTests, failed: report.numFailedTests, skipped: report.numPendingTests }));
if (!report.numTotalTests || report.numPendingTests || report.numTodoTests || !report.numPassedTests || report.numFailedTests) process.exit(1);
' "${report_dir}/results.json" || test_status=1
exit "${test_status}"
