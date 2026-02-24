# Implementation Plan: Migrate CI/CD to Self-Hosted ARC Runners

**Branch**: `037-self-hosted-runners` | **Date**: 2026-02-24 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/037-self-hosted-runners/spec.md`

## Summary

Migrate all 10 GitHub Actions workflows and 1 Travis CI configuration from GitHub-hosted runners (`ubuntu-latest`) to self-hosted ARC (Actions Runner Controller) ephemeral runners (`arc-runner-set`). The migration is batched into 4 PRs by risk tier (Low → Medium → High → Highest) with sequential verification gates. Local caching is provided via an RWO PVC for the pnpm store and registry-backed Docker build cache in GHCR. The infra/GitOps repository receives Kubernetes manifests (PVC, CronJob, Helm values) as handoff artifacts produced by this plan.

## Technical Context

**Language/Version**: GitHub Actions YAML, Bash, Dockerfile (no application code changes)
**Primary Dependencies**: ARC `gha-runner-scale-set` Helm chart, Docker DinD sidecar, `docker/build-push-action@v5`, `docker/setup-buildx-action@v3`, `docker/setup-qemu-action@v3`
**Storage**: RWO PVC (5 GB) for pnpm store cache; GHCR registry for Docker build cache
**Testing**: Manual verification per PR — workflow runs on `arc-runner-set` produce identical outcomes to `ubuntu-latest`
**Target Platform**: Kubernetes cluster (Hetzner) running ARC controller
**Project Type**: CI/CD infrastructure (no `src/` changes)
**Performance Goals**: pnpm install from local PVC cache < 30s (vs ~2 min from network); Docker builds with registry cache < 50% of uncached time
**Constraints**: Ephemeral runners (pod destroyed per job); all pods pinned to single node (RWO PVC); DinD sidecar requires `--privileged` mode
**Scale/Scope**: 10 workflow files modified/created/deleted, 3 infra manifests produced, 0 application source changes

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| 1. Domain-Centric Design | N/A | No domain logic changes — CI/CD infrastructure only |
| 2. Modular NestJS Boundaries | N/A | No NestJS module changes |
| 3. GraphQL Schema as Stable Contract | N/A | No schema changes. Schema workflows migrated but produce identical output |
| 4. Explicit Data & Event Flow | N/A | No data flow changes |
| 5. Observability & Operational Readiness | PASS | CronJob logs prune operations; workflow failures surface via GitHub Actions UI. No new silent failure paths introduced |
| 6. Code Quality with Pragmatic Testing | PASS | No automated tests added — verification is manual workflow execution per PR tier, which is appropriate for CI/CD infrastructure changes where automated testing of CI itself is impractical |
| 7. API Consistency & Evolution | N/A | No API changes |
| 8. Secure-by-Design Integration | PASS | DinD runs `--privileged` (inherent to Docker-in-Docker); secrets access unchanged; PVC is cluster-local only |
| 9. Container & Deployment Determinism | PASS | ARC runner image uses explicit tag (`ghcr.io/actions/actions-runner:latest` for Phase 1 — should be pinned, see Complexity Tracking). DinD sidecar uses `docker:dind` (pin to `docker:27-dind` in production). Phase 2 custom image will use pinned semver tags |
| 10. Simplicity & Incremental Hardening | PASS | Simplest viable approach: swap `runs-on`, add PVC cache, use registry cache. No over-engineering |

**Post-design re-check**: Principle 9 has a minor concern — both `docker:dind` and `ghcr.io/actions/actions-runner:latest` should be pinned to specific tags in the Helm values. Added to implementation notes and tracked as T027.

## Project Structure

### Documentation (this feature)

```text
specs/037-self-hosted-runners/
├── plan.md                                          # This file
├── spec.md                                          # Feature specification
├── research.md                                      # Phase 0: research findings
├── quickstart.md                                    # Verification guide per PR tier
├── contracts/
│   ├── arc-runner-set-values.yaml                   # ARC Helm values (full pod template)
│   ├── arc-pnpm-store-pvc.yaml                      # RWO PVC for pnpm store (5 GB)
│   └── arc-pnpm-store-prune-cronjob.yaml            # Weekly pnpm store prune CronJob
└── tasks.md                                         # Phase 2 output (/speckit.tasks)
```

### Source Code Changes (repository root)

```text
.github/workflows/
├── review-router.yml                    # PR 1: runs-on → arc-runner-set
├── ci-tests.yml                         # PR 1: NEW — replaces Travis CI
├── trigger-e2e-tests.yml                # PR 1: DELETE
├── schema-contract.yml                  # PR 2: runs-on → arc-runner-set
├── trigger-sonarqube.yml                # PR 2: runs-on → arc-runner-set
├── schema-baseline.yml                  # PR 2: runs-on → arc-runner-set
├── build-deploy-k8s-dev-hetzner.yml     # PR 3: runs-on → arc-runner-set + Buildx + registry cache
├── build-deploy-k8s-test-hetzner.yml    # PR 3: runs-on → arc-runner-set + Buildx + registry cache
├── build-deploy-k8s-sandbox-hetzner.yml # PR 3: runs-on → arc-runner-set + Buildx + registry cache
├── build-release-docker-hub-new.yml     # PR 4: runs-on → arc-runner-set + registry cache
└── build-release-docker-hub.yml         # PR 4: DELETE (consolidated into new workflow)

.travis.yml                              # PR 1: DELETE
```

**Structure Decision**: No application source changes. All modifications are in `.github/workflows/` and root-level CI config files. The `contracts/` directory contains Kubernetes manifests for the infra/GitOps repository (handoff artifacts — not applied by this repo).

---

## Implementation Design

### Infra Repository Manifests (External Handoff)

The following manifests must be applied in the **infra/GitOps repository** before the corresponding PRs can be verified. They are produced as `contracts/` artifacts in this spec directory.

| Manifest | Target | Required Before | Purpose |
|----------|--------|-----------------|---------|
| `arc-pnpm-store-pvc.yaml` | Infra repo | PR 1 | 5 GB RWO PVC for pnpm store cache |
| `arc-runner-set-values.yaml` | Infra repo | PR 1 (basic), PR 3 (DinD) | Full ARC Helm values with DinD sidecar, PVC mount, env vars |
| `arc-pnpm-store-prune-cronjob.yaml` | Infra repo | After PR 1 | Weekly pnpm store prune maintenance |

**Handoff protocol**:
1. Before PR 1: Apply PVC + basic Helm values (runner + pnpm PVC, no DinD yet). Verify runner pod spawns and `npm_config_store_dir` resolves to `/opt/cache/pnpm-store`.
2. Before PR 3: Update Helm values to include DinD sidecar with `--privileged`. Verify `docker info` works from runner container.
3. After PR 1 stabilizes: Apply CronJob for weekly prune.

**Key research finding (R1)**: The Helm values use a **full pod template** instead of `containerMode.type: "dind"` because the simplified mode does not support custom volume mounts visible to the runner container. See `research.md#R1`.

### PR 1 — Low Risk: Runner Swap + Legacy CI Cleanup

**Infra prerequisites**: Basic ARC runner pods registered with GitHub. No PVC or DinD required — pnpm installs from network (slower but functional). PVC optimization deferred to later phase.

#### 1.1 `review-router.yml` — Swap runner

```yaml
# Before:
runs-on: ubuntu-latest
# After:
runs-on: arc-runner-set
```

No other changes. Python 3 and git are available on the ARC base image.

**Note**: The actual job name in this workflow is `pr_metrics`.

#### 1.2 `trigger-e2e-tests.yml` — Delete file

Remove entirely. E2E tests run manually until `alkem-io/test-suites` migrates.

#### 1.3 `.travis.yml` — Delete and replace with `ci-tests.yml`

Delete `.travis.yml`. Create new `.github/workflows/ci-tests.yml`:

```yaml
name: CI Tests

on:
  # covers push / force push to these branches
  push:
    branches: [develop, main]
  # covers PRs opened against these branches
  pull_request:
    branches: [develop, main]

jobs:
  test:
    runs-on: arc-runner-set
    env:
      NODE_OPTIONS: "--max-old-space-size=4196"
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "22"

      - name: Enable Corepack
        run: corepack enable

      - name: Install pnpm
        run: corepack prepare pnpm@10.17.1 --activate

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm run test:ci:no:coverage
```

**Note**: `actions/cache` for pnpm is intentionally omitted — when the PVC is provisioned, the local store at `/opt/cache/pnpm-store` (via `npm_config_store_dir` env in pod template) will be the primary cache. Without PVC, pnpm installs from network (functional but slower).

**Trigger parity**: Matches Travis CI's original behavior — runs on both pushes and PRs to `develop`/`main`. Branch protection rules must be updated: remove `continuous-integration/travis-ci/pr` required check, add `CI Tests` as required check.

### PR 2 — Medium Risk: Node.js/pnpm Workflows

**Infra prerequisites**: Same as PR 1 (no DinD needed).

#### 2.1 `schema-contract.yml` — Swap runner

Change `runs-on: ubuntu-latest` to `runs-on: arc-runner-set` for the single job. No other changes needed — Node.js 22, pnpm, git are set up via actions and the local pnpm PVC cache accelerates install.

#### 2.2 `trigger-sonarqube.yml` — Swap runner

Change `runs-on: ubuntu-latest` to `runs-on: arc-runner-set`. The existing `actions/cache` step for pnpm can remain as a fallback (it works on ARC runners via GitHub's remote cache service), but the primary cache is the local PVC.

#### 2.3 `schema-baseline.yml` — Swap runner

Change `runs-on: ubuntu-latest` to `runs-on: arc-runner-set`. GPG keys import via secrets (unchanged). PAT-based push via `ALKEMIO_INFRASTRUCTURE_BOT_PUSH_TOKEN` (unchanged).

### PR 3 — High Risk: K8s Deploy with DinD + Registry Cache

**Infra prerequisites**: Helm values updated with DinD sidecar (`--privileged`). Verified: `docker info` works from runner.

#### 3.1-3.3 K8s Deploy Workflows (dev/test/sandbox)

All three workflows get the same structural changes. Taking `build-deploy-k8s-dev-hetzner.yml` as the example:

**Changes to `build` job**:

```yaml
build:
  runs-on: arc-runner-set  # was: ubuntu-latest
  steps:
    - name: Checkout
      uses: actions/checkout@v4

    # NEW: Setup Buildx (creates docker-container driver builder inside DinD)
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3

    # CHANGED: Use docker/login-action (consistent with Docker Hub workflow)
    - name: Login to ACR
      uses: docker/login-action@v3
      with:
        registry: ${{ secrets.REGISTRY_LOGIN_SERVER }}
        username: ${{ secrets.REGISTRY_USERNAME }}
        password: ${{ secrets.REGISTRY_PASSWORD }}

    # NEW: Login to GHCR for registry-backed build cache
    - name: Login to GHCR (cache)
      uses: docker/login-action@v3
      with:
        registry: ghcr.io
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    # CHANGED: Use build-push-action with registry cache
    - name: Build and push
      uses: docker/build-push-action@v5
      with:
        context: .
        file: ./Dockerfile
        push: true
        tags: |
          ${{ secrets.REGISTRY_LOGIN_SERVER }}/alkemio-server:${{ github.sha }}
          ${{ secrets.REGISTRY_LOGIN_SERVER }}/alkemio-server:latest
        cache-from: type=registry,ref=ghcr.io/alkem-io/server:buildcache-deploy
        cache-to: type=registry,ref=ghcr.io/alkem-io/server:buildcache-deploy,mode=max
```

**Changes to `migrate` and `deploy` jobs**: Only `runs-on: arc-runner-set`. No Docker operations in these jobs — they use kubectl only.

**Key research finding (R5)**: The raw `docker build` CLI is replaced with `docker/build-push-action@v5` to enable registry-backed build cache. This requires `docker/setup-buildx-action@v3` which creates a BuildKit builder inside the DinD daemon.

### PR 4 — Highest Risk: Docker Hub Release with QEMU/Buildx + Registry Cache

**Infra prerequisites**: Same as PR 3 (DinD with `--privileged`).

#### 4.1 `build-release-docker-hub-new.yml` — Swap runner + add cache

```yaml
jobs:
  docker:
    runs-on: arc-runner-set  # was: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Docker meta
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: alkemio/${{ github.event.repository.name }}
          tags: |
            type=semver,pattern=v{{version}}
            type=semver,pattern=v{{major}}.{{minor}}
            type=semver,pattern=v{{major}}
            type=raw,value=latest,enable=${{ github.event.release.prerelease == false }}

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      # NEW: Login to GHCR for registry-backed build cache
      - name: Login to GHCR (cache)
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Login to DockerHub
        if: github.event_name != 'pull_request'
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile
          platforms: linux/amd64,linux/arm64
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          # NEW: Registry-backed build cache
          cache-from: type=registry,ref=ghcr.io/alkem-io/server:buildcache-release
          cache-to: type=registry,ref=ghcr.io/alkem-io/server:buildcache-release,mode=max
```

#### 4.2 `build-release-docker-hub.yml` — Delete file

Remove entirely. Consolidated into the new workflow above.

---

## Dependency Graph

```
[Infra: Basic ARC runner (no PVC, no DinD)]
         │
         ▼
    ┌─ PR 1 (Low — no PVC/DinD needed) ────────────┐
    │  review-router.yml → swap runner              │
    │  schema-contract.yml → swap runner            │
    │  trigger-sonarqube.yml → swap runner          │
    │  schema-baseline.yml → swap runner            │
    │  .travis.yml → DELETE + ci-tests.yml (NEW)    │
    └───────────────────┬───────────────────────────┘
                        │ Gate: all 5 workflows pass on arc-runner-set
                        │       PR reporting works (schema diff, sonarqube)
                        │       Branch protection updated (Travis → CI Tests)
                        ▼
    [Infra: Add PVC for pnpm cache (performance)]
                        │
                        ▼
    ┌─ PR 2 (Medium — legacy cleanup) ─────────────┐
    │  trigger-e2e-tests.yml → DELETE               │
    └───────────────────┬──────────────────────────┘
                        │
    [Infra: Update Helm values with DinD sidecar]
                        │
                        ▼
    ┌─ PR 3 (High — DinD required) ────────────────┐
    │  build-deploy-k8s-dev-hetzner.yml             │
    │    → swap runner + Buildx + registry cache    │
    │  build-deploy-k8s-test-hetzner.yml (same)     │
    │  build-deploy-k8s-sandbox-hetzner.yml (same)  │
    └───────────────────┬──────────────────────────┘
                        │ Gate: dev deploy succeeds via DinD
                        ▼
    ┌─ PR 4 (Highest — DinD + QEMU) ───────────────┐
    │  build-release-docker-hub-new.yml             │
    │    → swap runner + QEMU/Buildx + cache        │
    │    → multiplatform: linux/amd64,linux/arm64   │
    │  build-release-docker-hub.yml → DELETE         │
    └──────────────────────────────────────────────┘
```

## Complexity Tracking

| Concern | Resolution |
|---------|------------|
| DinD `--privileged` security | Inherent to Docker-in-Docker. Mitigated by ephemeral pods (no persistent state), single-tenant cluster, and pod isolation via node pinning |
| Full pod template vs `containerMode.type: "dind"` | Required due to ARC issue #3281 (custom volumes not visible to runner in simplified mode). Adds Helm complexity but enables PVC caching |
| `docker:dind` tag pinning | Must pin to `docker:27-dind` in production Helm values (per Constitution Principle 9). Tracked as T027 |
| `ghcr.io/actions/actions-runner:latest` tag pinning | Must pin to specific version (e.g., `ghcr.io/actions/actions-runner:2.321.0`) in Helm values (per Constitution Principle 9). Tracked as T027 extension |
| Multiplatform builds in DinD | QEMU emulation inside DinD with `--privileged` mode. Performance hit on arm64 acceptable for infrequent release builds. Platforms: `linux/amd64,linux/arm64` |
