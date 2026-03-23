# Quickstart: K8s Deployment Pipeline with Dual Docker Images

**Branch**: `081-k8s-deploy-pipeline`

This guide covers how to verify the pipeline locally and end-to-end in the dev environment.

---

## Prerequisites

- Docker installed locally
- kubectl configured with access to the dev cluster (or a local k3s/kind cluster for testing)
- `envsubst` available (`gettext` package on Linux, `brew install gettext` on macOS)
- Access to the container registry secrets (or use local equivalents for testing)

---

## 1. Build Both Images Locally

```bash
# Build the runtime (distroless) image
docker build -f Dockerfile \
  -t alkemio-server:local-test \
  .

# Build the migration image
docker build -f Dockerfile.migration \
  -t alkemio-server-migration:local-test \
  .
```

**Expected outcomes**:
- Runtime image size should be significantly smaller than the current single-stage build (≥40% reduction)
- Migration image retains full Alpine tooling (pnpm, shell)

---

## 2. Verify the Runtime Image (Distroless)

```bash
# Confirm no shell is available (should fail with "exec: no such file or directory" or similar)
docker run --rm --entrypoint sh alkemio-server:local-test -c "echo hi" || echo "PASS: no shell"

# Confirm the compiled entry point exists
docker run --rm alkemio-server:local-test ls dist/main.js 2>/dev/null || true
# (This will fail too — no ls in distroless — that's expected and correct)

# Run the application (requires full env configuration)
docker run --rm alkemio-server:local-test
# Expected: application starts (or fails with config error, not a "node not found" error)
```

---

## 3. Verify the Migration Image

```bash
# Confirm pnpm is available
docker run --rm alkemio-server-migration:local-test pnpm --version

# Confirm the migration script exists in package.json
docker run --rm alkemio-server-migration:local-test cat package.json | grep migration:run
```

---

## 4. Test the k8s Migration Job Locally (kind/k3s)

```bash
# Substitute the image into the Job manifest
MIGRATION_IMAGE=alkemio-server-migration:local-test \
  envsubst < manifests/27-server-migration-job.yaml | kubectl apply -f -

# Watch the job
kubectl get job server-migration-job -w

# Check logs
kubectl logs -l job-name=server-migration-job --follow

# Clean up
kubectl delete job server-migration-job
```

---

## 5. Verify the Dev Pipeline End-to-End

1. Merge a commit to `develop`
2. Open GitHub Actions → "Build, Migrate & Deploy to Dev on Hetzner"
3. Verify:
   - [ ] Build job completes and pushes two images: `alkemio-server:<sha>` and `alkemio-server-migration:<sha>`
   - [ ] Migrate job: creates `server-migration-job`, waits for completion
   - [ ] Deploy job starts only after migrate succeeds
   - [ ] k8s Deployment updated to the new SHA tag

---

## 6. Verify Failure Isolation (FR-006)

To test that a failing migration prevents deployment:

1. Temporarily break a migration (e.g., introduce a syntax error in a migration file)
2. Trigger the pipeline (merge to dev branch or dispatch manually for test env)
3. Verify:
   - [ ] Migrate job fails: `kubectl wait` times out or the Job status is `Failed`
   - [ ] Deploy job is **skipped** (GitHub Actions shows it as "skipped", not "failed")
   - [ ] The currently running service version is unchanged in the cluster

---

## 7. Inspect Image Sizes

```bash
# Compare sizes
docker images alkemio-server:local-test
docker images alkemio-server-migration:local-test

# For comparison, build the old single-stage image
git stash
docker build -f Dockerfile -t alkemio-server:old-single-stage .
git stash pop

docker images alkemio-server:old-single-stage
```

---

## GitHub Secrets Required

| Secret | Description |
|---|---|
| `REGISTRY_LOGIN_SERVER` | Container registry hostname |
| `REGISTRY_USERNAME` | Registry push credentials |
| `REGISTRY_PASSWORD` | Registry push credentials |
| `KUBECONFIG_SECRET_HETZNER_DEV` | Kubeconfig for dev cluster |
| `KUBECONFIG_SECRET_HETZNER_TEST` | Kubeconfig for test cluster |
| `KUBECONFIG_SECRET_HETZNER_SANDBOX` | Kubeconfig for sandbox cluster |
| `DOCKERHUB_USERNAME` | DockerHub publish credentials (release only) |
| `DOCKERHUB_TOKEN` | DockerHub publish credentials (release only) |
