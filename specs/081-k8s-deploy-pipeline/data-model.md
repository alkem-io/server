# Data Model: K8s Deployment Pipeline with Dual Docker Images

**Branch**: `081-k8s-deploy-pipeline` | **Phase**: 1 Output

---

> **Note**: This feature contains no database schema changes and no new TypeORM entities. The "model" described here is the artifact model — the Docker images, k8s resources, and file artifacts produced and consumed by the pipeline.

---

## Container Image Artifacts

### Runtime Image — `alkemio-server`

| Property | Value |
|---|---|
| Base | `gcr.io/distroless/nodejs22-debian13:nonroot` |
| Dockerfile | `Dockerfile` |
| Registry image | `<REGISTRY>/alkemio-server:<sha>` |
| Contents | `dist/`, `node_modules/` (prod only), `package.json`, `alkemio.yml` |
| Entrypoint | `node dist/main.js` (via distroless `ENTRYPOINT ["node"]`) |
| No shell | Yes — distroless |
| ENV | `NODE_ENV`, `GRAPHQL_ENDPOINT_PORT`, `NODE_OPTIONS` |
| Tags produced | `<sha>` (immutable), `latest` (floating, dev environment only) |

### Migration Image — `alkemio-server-migration`

| Property | Value |
|---|---|
| Base | `node:22.21.1-alpine` (final stage) |
| Dockerfile | `Dockerfile.migration` |
| Registry image | `<REGISTRY>/alkemio-server-migration:<sha>` |
| Contents | pnpm, `dist/`, `node_modules/` (prod), `package.json`, `alkemio.yml` |
| Entrypoint | `pnpm run migration:run` |
| Has shell | Yes (Alpine) |
| Tags produced | `<sha>` (immutable) |

---

## Kubernetes Resource Artifacts

### Migration Job — `server-migration-job`

**Replaces**: `manifests/26-server-migration.yaml` (CronJob, removed from use)

**File**: `manifests/27-server-migration-job.yaml`

| Field | Value |
|---|---|
| `apiVersion` | `batch/v1` |
| `kind` | `Job` |
| `metadata.name` | `server-migration-job` |
| `spec.backoffLimit` | `0` (no retries — fail fast) |
| `spec.ttlSecondsAfterFinished` | `3600` (auto-cleanup) |
| `template.spec.restartPolicy` | `Never` |
| Container image | `${MIGRATION_IMAGE}` — substituted by `envsubst` at deploy time |
| Container command | `["pnpm", "run", "migration:run"]` |
| Image pull secret | `alkemio-server-secret` |
| Env sourced from | `alkemio-config` (ConfigMap), `alkemio-secrets` (Secret) |

**Lifecycle per deployment**:
1. Existing `server-migration-job` deleted (`--ignore-not-found=true`)
2. New Job applied with SHA-tagged migration image
3. `kubectl wait --for=condition=complete` (300s timeout)
4. On timeout or failure: pipeline step exits 1, deploy job skipped

---

## Pipeline Stage Interface

### Build → Migrate Contract

| Output from Build | Consumed by Migrate |
|---|---|
| `<REGISTRY>/alkemio-server:<sha>` pushed | Not consumed by migrate stage |
| `<REGISTRY>/alkemio-server-migration:<sha>` pushed | Used as `MIGRATION_IMAGE` in Job |
| `github.sha` | Passed via `needs.build.outputs` or re-computed from `github.sha` |

### Migrate → Deploy Contract

| Output from Migrate | Consumed by Deploy |
|---|---|
| Job exit code 0 (complete) | Deploy job starts (via `needs: migrate`) |
| Job exit code non-0 | Deploy job skipped (GitHub Actions dependency logic) |

### Deploy Input

| Input | Source |
|---|---|
| Runtime image | `<REGISTRY>/alkemio-server:<sha>` |
| Deployment manifest | `manifests/25-server-deployment-dev.yaml` |
| Service manifest | `manifests/30-server-service.yaml` |
| Kubeconfig | `secrets.KUBECONFIG_SECRET_HETZNER_<ENV>` |

---

## File Inventory

| File | Action | Description |
|---|---|---|
| `Dockerfile` | Modified | Multi-stage: Alpine builder → distroless runtime |
| `Dockerfile.migration` | New | Two-stage: Alpine builder → Alpine migration runner |
| `manifests/27-server-migration-job.yaml` | New | k8s Job template (image substituted by CI) |
| `manifests/26-server-migration.yaml` | Removed | CronJob no longer needed |
| `.github/workflows/build-deploy-k8s-dev-hetzner.yml` | Modified | m4 runners, updated action versions, dual image build, Job-based migrate |
| `.github/workflows/build-deploy-k8s-test-hetzner.yml` | Modified | Same changes, test cluster kubeconfig |
| `.github/workflows/build-deploy-k8s-sandbox-hetzner.yml` | Modified | Same changes, sandbox cluster kubeconfig |
| `.github/workflows/build-release-docker-hub.yml` | Modified | Updated action versions, dual image publish |
