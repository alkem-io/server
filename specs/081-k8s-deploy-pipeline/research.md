# Research: K8s Deployment Pipeline with Dual Docker Images

**Branch**: `081-k8s-deploy-pipeline` | **Phase**: 0 Output

---

## 1. GitHub Actions — Latest Stable Versions

**Decision**: Pin all actions to the exact latest stable tag found as of March 2026.

| Action | Current (in repo) | Latest Stable |
|---|---|---|
| `actions/checkout` | `v4.1.7` | `v6.0.2` |
| `azure/docker-login` | `v2` | `v2` (floating major, no patch releases) |
| `azure/setup-kubectl` | `v4.0.0` | `v4.0.1` |
| `azure/k8s-deploy` | `v5.0.0` | `v5.1.0` |
| `docker/metadata-action` | `v5` | `v6.0.0` |
| `docker/setup-qemu-action` | `v3` | `v4.0.0` |
| `docker/setup-buildx-action` | `v3` | `v4.0.0` |
| `docker/login-action` | `v3` | `v4.0.0` |
| `docker/build-push-action` | `v5` | `v7.0.0` |

**Rationale**: Pinning exact versions prevents silent breakage when upstream releases change action behaviour. `azure/docker-login` publishes only floating major tags; `v2` is the correct canonical reference for that action.

**Alternatives considered**: SHA pinning for maximum immutability — rejected for initial implementation as it adds maintenance burden with no near-term benefit in this context.

---

## 2. Distroless Runtime Image for Node.js 22

**Decision**: Use `gcr.io/distroless/nodejs22-debian13:nonroot` as the runtime base image.

**Rationale**:
- Official Google Distroless images for Node.js 22 are published under `gcr.io/distroless/nodejs22-debian13`.
- The `:nonroot` variant runs as UID 65532 — better security posture for a k8s workload.
- No shell, no package manager, no OS utilities → minimal attack surface satisfying FR-002.
- Debian 13 (Bookworm) base uses glibc (consistent with production parity for node native modules).
- The image sets `ENTRYPOINT ["/nodejs/bin/node"]`, so `CMD` must be the script path: `CMD ["dist/main.js"]`, **not** `CMD ["node", "dist/main.js"]`.

**What must be copied from builder to distroless stage**:
- `dist/` — compiled TypeScript output
- `node_modules/` — **production only** (`pnpm prune --prod` in builder before copy)
- `package.json` — required by runtime libraries for name/version metadata
- `alkemio.yml` — application configuration file

**Alternatives considered**:
- Chainguard `cgr.dev/chainguard/node:latest-22` — zero CVEs, but pinned tags require a paid subscription. Rejected in favour of the open-source distroless option.
- Alpine-based runtime — not distroless; has a shell and package manager. Does not satisfy FR-002.

---

## 3. Migration Image Strategy

**Decision**: Use `node:22.21.1-alpine` as the migration image base (NOT distroless).

**Rationale**:
- The existing migration entrypoint is `pnpm run migration:run`, which requires pnpm on PATH.
- Distroless has no shell and no package manager — pnpm cannot run in it.
- Converting to a compiled `node dist/migrate.js` entrypoint that bypasses pnpm scripts would require a new standalone migration entry file, adding scope and risk.
- The migration container is a short-lived k8s Job (seconds to minutes), not a long-running service — the security exposure window is minimal.
- `node:22.21.1-alpine` matches the Node.js version pinned in the project's Volta config.

**What the migration image contains**:
- pnpm (installed via npm)
- `dist/` — compiled TypeScript
- `node_modules/` — full production set (TypeORM + DB driver + all runtime deps)
- `package.json` — for pnpm script resolution
- `alkemio.yml` — configuration

**Build approach**: Two-stage build within `Dockerfile.migration` — builder stage with full deps for compilation, final Alpine stage for the runtime migration image.

**Alternatives considered**: Single-stage migration image (simpler, no separation) — rejected because it would include `src/`, `tsconfig*.json`, and dev tooling in the final image unnecessarily.

---

## 4. k8s Migration Job Strategy

**Decision**: Replace the existing `CronJob`-based approach with a standalone `Job` template (`manifests/27-server-migration-job.yaml`), applied fresh at each deployment with image substitution via `envsubst`.

**Rationale**:
- The existing `26-server-migration.yaml` is a CronJob with schedule `@yearly`, only used as a template for `kubectl create job --from=cronjob/...`. This is an anti-pattern: CronJob exists solely to be cloned, not to be scheduled.
- FR-007 requires a one-time Job, not a CronJob.
- Using `envsubst` to inject the SHA-tagged image into a Job YAML template is idiomatic and transparent.

**Pipeline steps for migration (per environment)**:
```bash
# 1. Delete any pre-existing job (FR-008)
kubectl delete job server-migration-job --ignore-not-found=true

# 2. Apply the Job with the new migration image
IMAGE_TAG=<registry>/alkemio-server-migration:<sha> \
  envsubst < manifests/27-server-migration-job.yaml | kubectl apply -f -

# 3. Wait for completion (kubectl exits 1 if timeout exceeded)
kubectl wait --for=condition=complete job/server-migration-job --timeout=300s || {
  kubectl logs -l job-name=server-migration-job --tail=100
  exit 1
}
```

**Failure behaviour**: `kubectl wait --for=condition=complete` exits 1 on timeout. With `backoffLimit: 0` in the Job spec, a failing pod marks the Job as `Failed` immediately and the pod exits — causing `kubectl wait` to time out (rather than wait for a retry). This satisfies FR-006: the migrate step fails → `needs: migrate` causes the deploy job to be skipped.

**Job spec parameters**:
- `backoffLimit: 0` — no retries (fail fast)
- `restartPolicy: Never`
- `ttlSecondsAfterFinished: 3600` — automatic cleanup after 1 hour
- Same `env`/`envFrom` as the existing CronJob (configMap + secret refs)

**Alternatives considered**:
- Keep using CronJob as template with `kubectl create job --from=cronjob/...` — rejected as it doesn't satisfy FR-007 and is semantically wrong.
- `azure/k8s-deploy` action for the Job — not used because the action's Job support for image substitution is less tested; raw kubectl is simpler and transparent.

---

## 5. Build Stage Structure

**Decision**: Both images share a common builder stage defined in their respective Dockerfiles. They are built and pushed in the same CI job (not separate jobs) for efficiency.

**Image tag convention** (satisfying FR-004):
- Runtime: `<registry>/alkemio-server:<sha>`
- Migration: `<registry>/alkemio-server-migration:<sha>`

**DockerHub**: The `build-release-docker-hub.yml` workflow uses `docker/build-push-action` with Buildx. Both images will be built and pushed in separate `build-push-action` steps within the same job, using the `file:` parameter to select the Dockerfile.

---

## Summary of Key Decisions

| Topic | Decision |
|---|---|
| Runtime base image | `gcr.io/distroless/nodejs22-debian13:nonroot` |
| Migration base image | `node:22.21.1-alpine` |
| Runtime CMD | `["dist/main.js"]` (ENTRYPOINT is already `node`) |
| Migration CMD | `["pnpm", "run", "migration:run"]` |
| k8s migration resource | `batch/v1 Job` (replacing CronJob) |
| Image substitution in Job | `envsubst` on YAML template |
| Job wait timeout | 300 seconds |
| CI runners | `[self-hosted, m4]` on all jobs |
| Action versions | As per table above |
