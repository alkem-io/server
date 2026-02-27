# Research: Migrate CI/CD to Self-Hosted ARC Runners

**Branch**: `037-self-hosted-runners` | **Date**: 2026-02-24

## R1: ARC DinD Custom Volume Limitation

**Decision**: Use full pod template spec instead of simplified `containerMode.type: "dind"`.

**Rationale**: When using the simplified `containerMode.type: "dind"` Helm shorthand, ARC generates the DinD sidecar automatically but **custom volumes mounted on the runner container are NOT visible to containers spawned inside DinD** (GitHub issue [#3281](https://github.com/actions/actions-runner-controller/issues/3281)). For the pnpm store PVC to be accessible to the runner, the full pod template must be defined manually. This also gives us explicit control over the DinD sidecar configuration.

**Alternatives considered**:
- `containerMode.type: "dind"` shorthand — simpler but blocks custom PVC mounts
- Kubernetes mode (`containerMode.type: "kubernetes"`) — runs each step in a separate container, more complex, different execution model

**Impact on spec**: The Helm reference values in the spec should use a full pod template with explicit init containers, volumes, and sidecars rather than the simplified `containerMode` block.

## R2: Docker Registry-Backed Build Cache in DinD

**Decision**: Use `--cache-to=type=registry` / `--cache-from=type=registry` targeting GHCR.

**Rationale**: Registry-backed cache works inside DinD because the DinD sidecar provides a full Docker daemon. The `docker/setup-buildx-action` creates a `docker-container` driver builder by default, which spawns a BuildKit container inside DinD. This supports all cache backends. GHCR is native to GitHub Actions — no extra auth setup needed when using `GITHUB_TOKEN`.

**Key details**:
- Requires `docker-container` driver (not the default `docker` driver) — `docker/setup-buildx-action` handles this
- `--cache-from` silently skips if cache doesn't exist (first run is safe)
- `mode=max` caches all intermediate layers (recommended for build speed)
- K8s deploy workflows currently use raw `docker build` CLI — must be migrated to `docker buildx build` or `docker/build-push-action` to enable registry cache
- Docker Hub release workflow already uses `docker/build-push-action@v5` — just add `cache-from`/`cache-to` inputs

**Alternatives considered**:
- PVC at `/var/lib/docker` on DinD sidecar — requires RWO PVC, DinD state is large and complex to manage
- GitHub Actions cache (`actions/cache` for Docker layers) — network round-trip to GitHub servers makes it slow for self-hosted runners
- No build cache — functional but slow; Docker rebuilds all layers every job

## R3: pnpm Store Directory Configuration

**Decision**: Use `npm_config_store_dir` env var pointing to PVC mount at `/opt/cache/pnpm-store`.

**Rationale**: `npm_config_store_dir` is the cleanest way to override only the store location without affecting other pnpm behavior (unlike `PNPM_HOME`, which also changes global bin directory and binary location). The env var is set in the ARC pod template, so no workflow changes are needed.

**Key details**:
- pnpm resolves store-dir from: CLI flag > env var (`npm_config_store_dir`) > `.npmrc` > `PNPM_HOME/store` > platform default
- The content-addressable store lives at `{store-dir}/v3/` (pnpm 9.x) or `{store-dir}/v10/` (pnpm 10.x)
- Verify with `pnpm store path` at runtime
- Concurrent writes are safe (atomic writes, hard links)
- Note: `npm_config_store_dir` may change in pnpm v11 — monitor when upgrading pnpm

**Alternatives considered**:
- `PNPM_HOME` — works but has side effects on global bin dir
- `.npmrc` `store-dir=` setting — requires modifying repo file, less transparent
- `pnpm config set store-dir` — modifies global config, not suitable for ephemeral runners

## R4: `actions/cache` on ARC Self-Hosted Runners

**Decision**: Keep existing `actions/cache` steps as-is for MVP (they work), but local PVC is the primary pnpm cache for performance.

**Rationale**: `actions/cache` works on ARC runners because runners connect to GitHub's cache service via `ACTIONS_CACHE_URL` (auto-injected). However, for self-hosted runners the cache data must travel over the network to/from GitHub's servers, making it slower than a local PVC mount. The existing `actions/cache` steps in `schema-contract.yml` and `trigger-sonarqube.yml` provide a safety net (if PVC is empty, GitHub cache kicks in), but the PVC is the primary fast path.

**Alternatives considered**:
- Remove `actions/cache` entirely — would lose the remote backup cache
- Self-hosted cache server (e.g., `actions-cache-server`) — additional infrastructure to maintain
- Only use `actions/cache` (no PVC) — functional but slow on self-hosted runners

## R5: K8s Deploy Workflow Docker Build Strategy

**Decision**: Migrate K8s deploy workflows from raw `docker build` CLI to `docker/build-push-action@v5` with Buildx.

**Rationale**: The current K8s deploy workflows use raw `docker build -f Dockerfile . -t ... && docker push ...`. To add registry-backed build cache, we need Buildx (which uses BuildKit under the hood). Rather than converting to raw `docker buildx build` CLI commands, using `docker/build-push-action@v5` is more maintainable, consistent with the Docker Hub release workflow, and natively supports `cache-from`/`cache-to` inputs.

**Key changes per K8s deploy workflow**:
1. Add `docker/setup-buildx-action@v3` step (creates `docker-container` driver builder)
2. Replace `azure/docker-login@v2` with `docker/login-action@v3` (consistent with Docker Hub workflow)
3. Replace raw `docker build` + `docker push` with `docker/build-push-action@v5` (push: true, cache-from, cache-to)
4. Add GHCR login step for cache read/write access

**Alternatives considered**:
- Raw `docker buildx build` CLI — works but less maintainable, no action-level input validation
- Keep raw `docker build` without cache — functional but no cache benefit
- Docker layer cache via PVC on `/var/lib/docker` — complex, large PVC, DinD state management issues

## R6: Infra Repository Manifests

**Decision**: This repo produces reference Kubernetes manifests (NFS server stack, CronJob, Helm values) as handoff artifacts. The operator applies them in the infra/GitOps repo out-of-band.

**Rationale**: ARC Helm values are managed in a separate repository. This repo cannot directly apply infra changes, but it must provide the exact manifests needed, with clear dependency documentation linking PRs to infra prerequisites.

**Manifests to produce**:
1. `arc-nfs-cache-server.yaml` — NFS cache server stack (PVC + Deployment + Service) for shared pnpm store
2. `arc-pnpm-store-prune-cronjob.yaml` — Daily CronJob for `pnpm store prune` (mounts via NFS)
3. ARC Helm values — managed directly in the infra/GitOps repo (not checked into this public repo). Requirements: full pod template with DinD sidecar, NFS volume mount, env vars, resource limits.

## R7: Multi-Node pnpm Cache via NFS Server Pod

**Decision**: Use a lightweight NFS server pod (backed by RWO PVC) instead of a direct RWO PVC mount to share the pnpm cache across runner pods on multiple nodes.

**Rationale**: The cluster has 2 worker nodes but does not support RWX storage classes. A single RWO PVC forces all runner pods to the same node (Kubernetes volume scheduling constraint), creating a resource bottleneck. Node ephemeral storage is limited (17 GB / 15.3 GB), ruling out `hostPath` volumes for a cache serving ~15 repositories (estimated 8–20 GB with deduplication).

An NFS server pod provides RWX-like shared access without requiring a cluster-wide RWX storage class:
- A Deployment runs a single NFS server container (`itsthenetwork/nfs-server-alpine:12`) backed by a 25 Gi RWO PVC
- A ClusterIP Service exposes port 2049
- Runner pods mount the share via `nfs` volume type — this is not PVC-bound, so the scheduler is free to place pods on any node
- pnpm's content-addressable store is concurrent-write-safe (atomic writes, hard links), making it NFS-compatible

**Key details**:
- NFS server requires `privileged: true` (kernel NFS — nfsd/mountd)
- Minimal resources: 50m CPU / 64 Mi memory (requests), 200m CPU / 128 Mi memory (limits)
- If NFS server is down, runner pods fail to mount and stay in `ContainerCreating` — but the Deployment auto-restarts the server pod
- Performance: NFS adds ~5–10ms per file operation. Cached `pnpm install` takes ~10–15s over NFS vs ~5s on local PVC. Both are a major improvement over ~2 min from network
- PVC sized at 25 Gi for ~15 repos with pnpm deduplication (shared dependencies stored once)
- Prune CronJob runs daily (increased from weekly due to higher churn from 15 repos)

**Alternatives considered**:
- Single RWO PVC with `nodeSelector` — forces all pods to one node, wastes second node
- `hostPath` volumes — nodes have insufficient ephemeral storage (17 GB / 15.3 GB)
- Two RunnerScaleSets (one per node) — doubles Helm management overhead
- Install RWX CSI driver (Longhorn, NFS provisioner) — disproportionate infra investment for a cache
- `actions/cache` only (GitHub network cache) — functional but slow (~30–60s overhead vs ~10–15s NFS)
