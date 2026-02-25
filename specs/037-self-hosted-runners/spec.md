# Feature Specification: Migrate CI/CD to Self-Hosted ARC Runners

**Feature Branch**: `037-self-hosted-runners`
**Created**: 2026-02-24
**Status**: Draft
**Input**: User description: "I would like to migrate my workflows to a self-hosted runner called arc-runner-set. Analyse the workflow files, the travis file and suggest a proper e2e migrations, include a step after the mvp, where we can also improve the images used with installed tools of our own like node, pnpm etc"

## Clarifications

### Session 2026-02-24

- Q: Should both Docker Hub release workflows (`build-release-docker-hub.yml` and `build-release-docker-hub-new.yml`) be migrated? → A: ~~Originally: migrate both, mark old as deprecated.~~ ~~Revised: Do NOT migrate Docker Hub release workflows — they stay on `ubuntu-latest`.~~ **Re-revised**: YES — migrate ALL workflows including Docker Hub release workflows to `arc-runner-set`. DinD with QEMU/Buildx handles multiplatform builds.
- Q: Where should the custom runner image (Phase 2) be published? → A: GitHub Container Registry (GHCR) — native to GitHub Actions, simplest auth for ARC pulls.
- Q: Should the E2E test trigger workflow (`trigger-e2e-tests.yml`) be migrated to GitHub dispatch, kept as-is, or removed? → A: Remove the E2E trigger workflow entirely. E2E tests will be run manually until the `alkem-io/test-suites` repo is migrated separately.
- Q: Should ARC runners be ephemeral (new pod per job) or persistent (reused across jobs)? → A: Ephemeral — clean state per job, no cross-job contamination, matches GitHub-hosted runner security model. Caching loss is offset by Phase 2 pre-installed tools.
- Q: Should K8s deployment workflows also stay on `ubuntu-latest` (like Docker Hub releases), or migrate to `arc-runner-set`? → A: Migrate K8s deploy workflows to `arc-runner-set` with DinD sidecar for Docker access. (Note: Docker Hub release workflows also now migrated — see re-revised answer above.)
- Q: What base OS for the Phase 2 custom runner image — Ubuntu 22.04 or Alpine? → A: Ubuntu 22.04 — closest to `ubuntu-latest`, full glibc compatibility, no musl-related tool issues.
- Q: Should migration land as one PR, incremental PRs per workflow, or batched by risk tier? → A: ~~Originally: 3 PRs.~~ Revised to **4 PRs** batched by risk tier: (1) Low-risk (review-router + E2E/Travis removal), (2) Medium-risk (schema-contract, sonarqube, schema-baseline), (3) High-risk (K8s deploy dev/test/sandbox with DinD), (4) Highest-risk (Docker Hub release with DinD + QEMU/Buildx).
- Q: Should pnpm caching (`actions/cache`) be kept or removed for ephemeral runners? → A: Keep as-is — GitHub cache service works with ARC runners, no workflow changes needed for MVP.
- Q: Should Docker Hub release workflows keep multiplatform builds (amd64+arm64 via QEMU) when migrated to ARC DinD? → A: Yes — keep multiplatform builds via QEMU emulation inside DinD. `--privileged` mode required on DinD sidecar. Performance hit on arm64 is acceptable for infrequent release builds.
- Q: How should DinD be enabled in ARC — built-in containerMode, custom pod template, or Kubernetes mode? → A: ~~Originally: ARC built-in `containerMode.type: "dind"`.~~ Revised after research: **Full pod template** in Helm values. The simplified `containerMode.type: "dind"` does not support custom volume mounts visible to the runner container ([ARC issue #3281](https://github.com/actions/actions-runner-controller/issues/3281)). The full pod template defines an init container, runner container, and DinD sidecar explicitly, enabling PVC mounts for pnpm store cache.
- Q: Should the two Docker Hub release workflows be consolidated during migration or migrated separately? → A: Consolidate into one workflow — remove the old `build-release-docker-hub.yml`, keep and migrate only `build-release-docker-hub-new.yml`. Reduces maintenance surface.
- Q: Where are the ARC Helm values managed — this repo or a separate infra/GitOps repo? → A: Separate infra/GitOps repository. This spec includes required Helm values as reference documentation; the actual ARC configuration change is out-of-band.
- Q: Does anything external depend on the old `build-release-docker-hub.yml` workflow (dispatch triggers, other repos)? → A: No — nothing external depends on it. Both workflows trigger on the same `release` event; the old one can be safely deleted.
- Q: What dimensions define a workflow's risk tier? → A: Three dimensions: (1) **Infrastructure dependency** (none / DinD / DinD+QEMU), (2) **Blast radius** (PR-only / develop-branch / production deploy / public release), (3) **Reversibility** (revert PR / requires manual cleanup).
- Q: Should risk tier PRs have verification gates between them? → A: Yes — sequential gates. PR N must be merged and verified in production (at least one successful workflow run post-merge) before PR N+1 is opened for review.
- Q: What is the rollback strategy per risk tier? → A: Revert-first with tier-specific remediation. All tiers default to "revert the PR." High/Highest tiers add a remediation checklist (e.g., re-trigger deploy from develop, re-publish image from tag).
- Q: Should the Travis CI replacement (new test workflow) stay in PR 1 (Low) or move to PR 2 (Medium)? → A: Stay in PR 1 (Low) — the test workflow is simple (`pnpm run test:ci:no:coverage`), failure is PR-scoped, and it logically groups with Travis/E2E removal as a "legacy CI cleanup" unit.
- Q: Should the PR 2→PR 3 gate explicitly require ARC DinD Helm values to be applied in the infra repo? → A: Yes — add an explicit infra prerequisite: "ARC DinD Helm values applied and verified (runner pod spawns with DinD sidecar)" before PR 3 can proceed.
- Q: What types of local cache should persist between jobs on ephemeral ARC runners? → A: pnpm store + Docker build layers. These are the two highest-impact caches: pnpm store avoids re-downloading ~800MB+ of dependencies; Docker layer cache avoids rebuilding unchanged layers in K8s deploy and Docker Hub release workflows.
- Q: How should local cache be persisted on the cluster for ephemeral runners? → A: RWO (ReadWriteOnce) PVC for pnpm store (all runner pods pinned to same node via nodeSelector/nodeAffinity) + registry-backed Docker build cache (`--cache-to=type=registry` in GHCR). RWO is universally supported — no RWX/NFS dependency. Multiple pods on the same node can mount an RWO PVC concurrently; pnpm's content-addressable store is safe for concurrent writes.
- Q: Where should the pnpm store PVC be mounted in the runner pod, and how should pnpm find it? → A: Mount at `/opt/cache/pnpm-store` with `npm_config_store_dir` env var set in the ARC pod template. Keeps cache separate from ephemeral workspace, avoids home dir coupling, requires zero workflow changes. (Note: `npm_config_store_dir` controls the pnpm content-addressable store path; `PNPM_HOME` is a different variable that controls the pnpm binary location.)
- Q: Which migration phase should local caching be introduced in? → A: Phase 1 MVP — include from the first PR. pnpm store PVC is an infra-level Helm prerequisite (active for all PRs). Docker registry-backed cache flags (`--cache-to`/`--cache-from`) are added to Docker build workflows in PR 3 (K8s deploy) and PR 4 (Docker Hub release).
- Q: Should the pnpm store cache have a size limit or eviction policy? → A: Fixed 5 GB RWO PVC + weekly CronJob running `pnpm store prune` for automated maintenance. Growth is slow (~50-100 MB per new dependency version) so 5 GB is ample; the CronJob prevents unbounded accumulation of orphaned packages.

## Current State Analysis

The Alkemio server repository has **10 GitHub Actions workflows** and **1 Travis CI configuration**, all using GitHub-hosted runners (`ubuntu-latest`) or Travis infrastructure. The workflows cover schema validation, Docker builds, Kubernetes deployments, SonarQube analysis, PR review metrics, and E2E test triggering.

### Workflow Inventory

| Workflow | File | Trigger | Current Runner | Key Tools |
| -------- | ---- | ------- | -------------- | --------- |
| Schema Contract | `schema-contract.yml` | PR | `ubuntu-latest` | Node.js 22, pnpm 10.17.1, git (full history) |
| Schema Baseline | `schema-baseline.yml` | Push to develop / dispatch | `ubuntu-latest` | Node.js 22, pnpm 10.17.1, git, GPG |
| Docker Hub Release (OLD, TO REMOVE) | `build-release-docker-hub.yml` | Release | `ubuntu-latest` | Docker, QEMU, Buildx — **removed during migration, consolidated into new workflow** |
| Docker Hub Release (NEW, MIGRATING) | `build-release-docker-hub-new.yml` | Release | `ubuntu-latest` → `arc-runner-set` | Docker, QEMU, Buildx (via DinD) |
| Deploy Dev (Hetzner) | `build-deploy-k8s-dev-hetzner.yml` | Push to develop | `ubuntu-latest` | Docker, kubectl 1.27.6 |
| Deploy Test (Hetzner) | `build-deploy-k8s-test-hetzner.yml` | Dispatch | `ubuntu-latest` | Docker, kubectl 1.27.6 |
| Deploy Sandbox (Hetzner) | `build-deploy-k8s-sandbox-hetzner.yml` | Dispatch | `ubuntu-latest` | Docker, kubectl 1.27.6 |
| PR Review Metrics | `review-router.yml` | PR | `ubuntu-latest` | Python 3, git (full history) |
| E2E Test Trigger (TO REMOVE) | `trigger-e2e-tests.yml` | Release | `ubuntu-latest` | Travis CI action |
| SonarQube | `trigger-sonarqube.yml` | PR to develop/main / dispatch | `ubuntu-latest` | Node.js 22, pnpm 10.17.1, SonarQube scanner |
| Travis CI (Legacy) | `.travis.yml` | Push / PR | Travis (Ubuntu Jammy) | Node.js 22.21.1, pnpm 10.17.1 |

### Tool Requirements Across Workflows

| Tool | Used By | Version |
| ---- | ------- | ------- |
| Node.js | Schema Contract, Schema Baseline, SonarQube, Travis | 22 / 22.21.1 |
| pnpm | Schema Contract, Schema Baseline, SonarQube, Travis | 10.17.1 |
| Docker + Buildx | Docker Hub Release (x2), Deploy Dev/Test/Sandbox | Latest |
| kubectl | Deploy Dev/Test/Sandbox | 1.27.6 |
| Python 3 | Review Router | 3.x |
| GPG | Schema Baseline | System |
| git (full clone) | Schema Contract, Schema Baseline, Review Router, SonarQube | System |
| QEMU | Docker Hub Release (x2) | System |
| SonarQube Scanner | SonarQube | v3 |
| jq / curl | Various scripts | System |

## User Scenarios & Testing _(mandatory)_

### User Story 1 - MVP Runner Swap (Priority: P1)

As a DevOps engineer, I want all GitHub Actions workflows to run on the self-hosted `arc-runner-set` runner instead of `ubuntu-latest`, so that builds execute on our own infrastructure with better control over capacity, cost, and security.

**Why this priority**: This is the foundational change — without it, no other improvements matter. A runner swap is the minimum viable migration that proves the self-hosted infrastructure works end-to-end.

**Independent Test**: Can be fully tested by pushing a PR and verifying all workflow jobs execute on the self-hosted runner, producing the same results as `ubuntu-latest`.

**Acceptance Scenarios**:

1. **Given** a PR is opened with code changes, **When** the schema-contract workflow triggers, **Then** it runs on `arc-runner-set` and produces a valid schema diff comment on the PR.
2. **Given** a commit is pushed to `develop`, **When** the schema-baseline and dev-deploy workflows trigger, **Then** both run on `arc-runner-set` and complete successfully (baseline PR created if needed, deployment succeeds).
3. **Given** a release is published, **When** the Docker Hub build workflows fire, **Then** they run on `arc-runner-set` with DinD + QEMU/Buildx and produce a valid multiplatform Docker image pushed to DockerHub.
4. **Given** the SonarQube workflow triggers on a PR, **When** it runs on `arc-runner-set`, **Then** it produces a valid quality gate result with coverage data.
5. **Given** all workflows have been migrated, **When** a full PR-to-release cycle is performed, **Then** no workflow references `ubuntu-latest` and all jobs complete with passing status on `arc-runner-set`.

---

### User Story 2 - Travis CI Retirement (Priority: P2)

As a DevOps engineer, I want to retire the Travis CI configuration and replace its test-running function with a GitHub Actions workflow on the self-hosted runner, so that all CI is consolidated on a single platform.

**Why this priority**: Travis is a legacy system running tests that overlap with SonarQube workflow functionality. Consolidation reduces maintenance burden and eliminates a separate CI dependency.

**Independent Test**: Can be tested by running the replacement GitHub Actions test workflow on a PR and verifying it produces equivalent results to what Travis CI currently produces (test pass/fail, same test scope).

**Acceptance Scenarios**:

1. **Given** Travis CI currently runs `pnpm run test:ci:no:coverage` on PRs, **When** a replacement GitHub Actions workflow is created on `arc-runner-set`, **Then** the same test command executes and reports pass/fail status on the PR.
2. **Given** the Travis CI configuration exists at `.travis.yml`, **When** the migration is complete, **Then** the `.travis.yml` file is removed and Travis CI integration is disabled in the repository settings.
3. **Given** the E2E test trigger workflow (`trigger-e2e-tests.yml`) depends on Travis CI, **When** the migration is complete, **Then** the workflow file is removed and E2E tests are triggered manually until the `test-suites` repo is migrated separately.

---

### User Story 3 - Custom Runner Image with Pre-installed Tools (Priority: P3)

As a DevOps engineer, I want to create a custom runner image with pre-installed tools (Node.js 22, pnpm 10.17.1, Docker, kubectl, Python 3, GPG), so that workflows skip repetitive tool installation steps, reducing build times and improving reliability.

**Why this priority**: This is an optimization layer that builds on the working MVP. It eliminates ~1-2 minutes of setup time per job and removes dependency on external tool installation actions that can fail due to network issues or version changes.

**Independent Test**: Can be tested by building the custom image, deploying it to ARC, and running all workflows — verifying that tool setup steps are skipped and total job duration decreases.

**Acceptance Scenarios**:

1. **Given** a custom runner image is built with Node.js 22 and pnpm 10.17.1 pre-installed, **When** a schema-contract workflow runs, **Then** it skips the `actions/setup-node` and corepack steps and completes faster than the MVP configuration.
2. **Given** the custom image includes Docker CLI, **When** a K8s deployment workflow runs, **Then** the DinD sidecar pairs with pre-installed Docker CLI without additional setup.
3. **Given** the custom image includes kubectl 1.27.6, **When** a deployment workflow runs, **Then** it skips kubectl download and setup.
4. **Given** a new tool version is needed (e.g., Node.js 24), **When** the image definition is updated and rebuilt, **Then** all workflows automatically use the new version without per-workflow changes.

---

### User Story 4 - Custom Image CI/CD Pipeline (Priority: P4)

As a DevOps engineer, I want a dedicated workflow to build and publish the custom runner image, so that image updates are automated and version-controlled.

**Why this priority**: Without a build pipeline for the runner image, updates would be manual and error-prone. This story completes the self-hosted runner infrastructure lifecycle.

**Independent Test**: Can be tested by modifying the runner image definition, pushing a change, and verifying the new image is built and available for ARC to use.

**Acceptance Scenarios**:

1. **Given** the runner image definition is updated (e.g., new Node.js version), **When** the change is pushed, **Then** a CI workflow builds and publishes the updated image to GitHub Container Registry (GHCR).
2. **Given** the runner image build fails, **When** the team is notified, **Then** they can diagnose the failure from build logs and the previous working image continues to serve runners.

---

### Edge Cases

- What happens when the self-hosted runner is offline or at capacity? Workflows should queue and wait, not fail immediately. ARC autoscaling should handle capacity.
- What happens when a workflow needs a tool not installed in the custom image? The workflow can still install it at runtime as a fallback, with a note to add it to the next image version.
- What happens when the DinD sidecar fails? The job should fail with a clear Docker daemon connection error; retrying the workflow should spawn a fresh DinD sidecar (ephemeral mode guarantees fresh pod).
- What happens when QEMU emulation fails during multiplatform Docker builds? The `docker/setup-qemu-action` step should fail explicitly. This is a DinD `--privileged` mode requirement — if privileged mode is not enabled, QEMU registration will fail.
- What happens when GPG signing is needed (schema baseline)? GPG must be available in the runner environment and secrets must be accessible.
- What happens when full git history is needed? `fetch-depth: 0` must work correctly with the self-hosted runner's git configuration.
- What happens when the pnpm store PVC is full? pnpm falls back to downloading packages directly (slower but functional). The weekly CronJob prune should prevent this; if it recurs, increase PVC size.
- What happens when the Docker registry cache is unavailable? Builds proceed without cache (full rebuild) — `--cache-from` is a best-effort hint, not a hard dependency.
- What happens when two concurrent runner pods write to the pnpm store simultaneously? pnpm's content-addressable store uses atomic writes and hard links; concurrent access on the same RWO volume is safe.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: ALL GitHub Actions workflow files MUST replace `runs-on: ubuntu-latest` with `runs-on: arc-runner-set` for every job definition, with no exceptions. This includes the Docker Hub release workflows.
- **FR-002**: The migration MUST preserve all existing workflow functionality — same triggers, same outputs, same artifacts, same PR comments, same deployments.
- **FR-003**: The self-hosted runner environment MUST provide the following system-level tools required by workflows: git, curl, jq, docker, gpg, python3. (The ARC runner image is not `ubuntu-latest` and is not expected to provide the full `ubuntu-latest` tool set — only the tools explicitly used by this repository's workflows.)
- **FR-004**: All workflows requiring Docker operations MUST have access to a Docker daemon on the self-hosted runner via a DinD (Docker-in-Docker) sidecar container running in `--privileged` mode. Docker Hub release workflows additionally require QEMU and Buildx inside DinD for multiplatform image builds (linux/amd64 + linux/arm64).
- **FR-005**: The Travis CI `.travis.yml` configuration MUST be replaced by a GitHub Actions workflow that runs the same test command (`pnpm run test:ci:no:coverage`).
- **FR-006**: A custom runner image definition MUST be created (post-MVP) that bundles Node.js 22, pnpm 10.17.1, Docker, Buildx, kubectl 1.27.6, Python 3, GPG, and common CLI tools.
- **FR-007**: A CI workflow MUST be created to build and publish the custom runner image to GitHub Container Registry (GHCR) when its definition changes.
- **FR-008**: Workflows MUST continue to have access to all required GitHub secrets (Docker Hub credentials, Azure ACR credentials, kubeconfig, GPG keys, SonarQube token, Travis token).
- **FR-009**: The `trigger-e2e-tests.yml` workflow MUST be removed. E2E tests will be triggered manually until the `alkem-io/test-suites` repository is migrated off Travis CI in a separate effort.
- **FR-010**: The old Docker Hub release workflow (`build-release-docker-hub.yml`) MUST be removed. All Docker Hub release functionality is consolidated into `build-release-docker-hub-new.yml`, which is migrated to `arc-runner-set` with DinD + QEMU/Buildx.
- **FR-011**: Ephemeral ARC runners MUST have local caching for the **pnpm store** (via a ReadWriteOnce PVC mounted to all runner pods on the same node) and **Docker build layers** (via registry-backed cache with `--cache-to=type=registry` targeting GHCR). All runner pods MUST be pinned to a single node via `nodeSelector` or `nodeAffinity` to allow RWO PVC sharing without requiring RWX storage. **Availability risk**: The single-node RWO PVC creates a single point of failure — if the pinned node goes down, all runner pods lose cache access and cannot schedule until the node recovers. Mitigation: (1) pnpm falls back to network install (slower but functional), (2) Docker builds proceed without cache, (3) node health should be monitored via cluster alerting, (4) if prolonged outage, update `nodeSelector` to a healthy node and re-provision PVC data.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: ALL GitHub Actions workflow jobs run on `arc-runner-set` with no exceptions. No workflow references `ubuntu-latest` after migration.
- **SC-002**: All existing workflow outcomes are preserved: PR schema comments appear, Docker images are published, Kubernetes deployments succeed, SonarQube reports are generated.
- **SC-003**: Travis CI configuration is removed and its test-running function is handled by a GitHub Actions workflow.
- **SC-004**: (Post-MVP) Custom runner image reduces average workflow setup time (tool installation steps) by at least 50% compared to the MVP runner-swap configuration.
- **SC-005**: (Post-MVP) Runner image updates are automated — a change to the image definition triggers a build and publish within the CI system.
- **SC-006**: No workflow regressions are introduced — all workflows that passed before migration continue to pass after migration.
- **SC-007**: The `trigger-e2e-tests.yml` workflow file is deleted from the repository (FR-009).
- **SC-008**: The old `build-release-docker-hub.yml` workflow file is deleted and all Docker Hub release functionality is served by `build-release-docker-hub-new.yml` (FR-010).
- **SC-009**: pnpm store PVC cache is functional — `pnpm install` on a warm cache completes in under 30 seconds; Docker registry cache is populated in GHCR after first build (FR-011).

## Assumptions

- The ARC (Actions Runner Controller) infrastructure is already deployed and the `arc-runner-set` runner label is configured and available for the repository.
- The self-hosted runners have network access to all required external services (Docker Hub, Azure ACR, Hetzner clusters, SonarQube, GitHub API).
- GitHub secrets are accessible from self-hosted runners (standard GitHub Actions behavior).
- Migrating the `alkem-io/test-suites` repository off Travis CI is out of scope for this feature. The E2E trigger workflow will be removed, and E2E tests will be run manually until that separate migration is completed.
- ARC runner pods are sized at `requests: {cpu: "4", memory: "3Gi"}`, `limits: {cpu: "5", memory: "6Gi"}`. The CPU limit of 5 gives 25% burst headroom above the 4-CPU request — matching the 4 workers + 1 main thread ceiling without meaningful CFS throttling, while preventing runaway pods. Cluster: 2 nodes × 32 CPU × 60 GiB, supporting up to 10 concurrent pods. CI tests use `NODE_OPTIONS=--max-old-space-size=4096` (4 Gi heap, leaving ~2 Gi for native/OS within the 6 Gi memory limit). Vitest uses `pool: 'threads'` with `maxWorkers: 4` to match the 4-CPU request and avoid the process-hang issue seen with `forks` pool on constrained runners.
- DinD is enabled via a **full pod template** in the ARC `AutoScalingRunnerSet` Helm values (not `containerMode.type: "dind"`, which does not support custom volume mounts — see [ARC issue #3281](https://github.com/actions/actions-runner-controller/issues/3281)). The pod template defines an init container, runner container, and DinD sidecar with `--privileged` mode. All workflows needing Docker (K8s deploy + Docker Hub release) use this DinD sidecar. Docker Hub release workflows additionally require QEMU + Buildx setup inside the DinD environment for multiplatform builds.
- ARC runners are configured in ephemeral mode (one pod per job, destroyed after completion). GitHub Actions cache service (`actions/cache`) remains functional since ARC runners connect to GitHub — existing caching steps are preserved as-is.
- ARC Helm values (`AutoScalingRunnerSet`) are managed in a separate infra/GitOps repository. This spec provides the required DinD configuration as reference; the operator applies it out-of-band before PR 3/PR 4 workflows can be tested.
- All ARC runner pods are scheduled on the same node (via `nodeSelector`/`nodeAffinity`), enabling RWO PVC sharing for local cache. The node must have sufficient disk for the pnpm store cache (~1-2 GB) alongside runner workloads.

## Migration Phases

### Phase 1 — MVP: Runner Swap (User Stories 1 & 2)

Swap all `runs-on: ubuntu-latest` to `runs-on: arc-runner-set` across all workflows. Verify each workflow runs successfully. Replace Travis CI with a GitHub Actions equivalent.

**Risk Tier Classification**:

| Tier | Infrastructure Dependency | Blast Radius | Reversibility | Example |
|------|--------------------------|--------------|---------------|---------|
| Low | None (basic runner swap) | PR-only or removal | Revert PR | `review-router.yml`, Travis/E2E removal |
| Medium | None (Node.js/pnpm via actions) | PR + develop branch | Revert PR | `schema-contract.yml`, `trigger-sonarqube.yml`, `schema-baseline.yml` |
| High | DinD sidecar required | Production deploy to live clusters | Revert PR + remediation | `build-deploy-k8s-*.yml` |
| Highest | DinD + QEMU/Buildx | Public release (Docker Hub images) | Revert PR + remediation | `build-release-docker-hub-new.yml` |

**Rollback procedures**:
- **Low / Medium**: Revert the PR. Workflows automatically return to `ubuntu-latest`. No further action needed.
- **High** (K8s deploy): Revert the PR, then re-trigger the dev-deploy workflow from `develop` to ensure the last good deployment state is restored. Verify cluster health.
- **Highest** (Docker Hub release): Revert the PR, then re-publish the Docker image by re-running the release workflow from the latest Git tag on `ubuntu-latest`. Verify image manifests on Docker Hub include both amd64 and arm64.

**Verification gates** (sequential — each gate must pass before next PR):

| Gate | Condition to proceed |
|------|---------------------|
| PR 1 → PR 2 | `review-router.yml` runs successfully on `arc-runner-set` post-merge. Travis + E2E removal confirmed. **Infra prerequisite for PR 1**: ARC runner pods have pnpm store PVC (`arc-pnpm-store`, RWO) mounted at `/opt/cache/pnpm-store` with `npm_config_store_dir` env var set. Runner pods pinned to single node via `nodeSelector`. |
| PR 2 → PR 3 | `schema-contract.yml` produces valid PR comment, `trigger-sonarqube.yml` reports quality gate, `schema-baseline.yml` creates baseline PR — all on `arc-runner-set` post-merge. **Infra prerequisite**: ARC DinD Helm values (full pod template with DinD sidecar, `privileged: true`) applied in infra repo and verified — runner pod spawns with DinD sidecar. |
| PR 3 → PR 4 | At least one K8s deploy workflow (`build-deploy-k8s-dev-hetzner.yml`) completes a successful deployment via DinD post-merge. ARC DinD Helm values confirmed applied in infra repo. |
| PR 4 done | `build-release-docker-hub-new.yml` produces a valid multiplatform Docker image on `arc-runner-set` via DinD + QEMU/Buildx. Old workflow removed. |

**Migration batched by risk tier (4 PRs)**:

**PR 1 — Low risk** (proves runner works, removes legacy CI):
Classification: no infra dependency, PR-scoped blast radius, simple revert.
1. `review-router.yml` — Swap to `arc-runner-set` (simple Python-based metrics)
2. `trigger-e2e-tests.yml` — **Remove entirely** (Travis CI dependency)
3. `.travis.yml` — Remove and replace with new GitHub Actions test workflow on `arc-runner-set` (simple `pnpm run test:ci:no:coverage`, failure visible as PR check — stays Low despite being a new workflow)

**PR 2 — Medium risk** (validates Node.js/pnpm tooling on self-hosted runner):
4. `schema-contract.yml` — Core PR workflow, needs Node.js 22 + pnpm + full git history
5. `trigger-sonarqube.yml` — Runs tests + SonarQube scan, needs Node.js 22 + pnpm
6. `schema-baseline.yml` — Needs GPG signing + push access + Node.js 22 + pnpm

**PR 3 — High risk** (validates Docker/DinD on self-hosted runner):
7. `build-deploy-k8s-dev-hetzner.yml` — Live deployment, needs Docker via DinD sidecar + registry-backed Docker build cache (`--cache-to`/`--cache-from` targeting GHCR)
8. `build-deploy-k8s-test-hetzner.yml` — Same as dev but manual trigger
9. `build-deploy-k8s-sandbox-hetzner.yml` — Same as dev but manual trigger

**PR 4 — Highest risk** (validates DinD + QEMU/Buildx for multiplatform builds):
10. `build-release-docker-hub-new.yml` — Migrate to `arc-runner-set` with DinD + QEMU/Buildx for multiplatform builds + registry-backed Docker build cache
11. `build-release-docker-hub.yml` — **Remove** (consolidated into the new workflow above)

### Phase 2 — Post-MVP: Custom Runner Image (User Stories 3 & 4)

Create a custom container image with all tools pre-installed. Update workflows to skip setup steps. Build a CI pipeline for the image itself.

**Image contents**:

- Base: Ubuntu 22.04 (matches `ubuntu-latest` glibc environment)
- Node.js 22.21.1 (via Volta or direct install)
- pnpm 10.17.1 (via corepack)
- Docker CLI + Buildx plugin
- kubectl 1.27.6
- Python 3.x + pip
- GPG, git, curl, jq, corepack
- GitHub Actions runner binary (required — either base the image on `ghcr.io/actions/actions-runner` or install the runner binary standalone)

### Reference: Required ARC Helm Values

The ARC `AutoScalingRunnerSet` Helm values are managed in the **infra/GitOps repo** (not checked into this public repo). The configuration uses a **full pod template** instead of `containerMode.type: "dind"` because the simplified mode does not support custom volume mounts visible to the runner container ([ARC issue #3281](https://github.com/actions/actions-runner-controller/issues/3281)).

**Summary of Helm values**:
- Full pod template with init container (`init-dind-externals`), runner container, and DinD sidecar
- Runner container: `requests: {cpu: "4", memory: "3Gi"}`, `limits: {cpu: "5", memory: "6Gi"}`, `npm_config_store_dir=/opt/cache/pnpm-store` env var, PVC mount at `/opt/cache/pnpm-store`, `DOCKER_HOST=unix:///var/run/docker.sock`
- DinD sidecar: `docker:27.5.1-dind` with `privileged: true`, shared volumes for socket and work directory
- `maxRunners: 10` — cluster supports up to 10 concurrent pods (2 nodes × 32 CPU × 60 GiB)
- Node pinning via `nodeSelector` for RWO PVC sharing
- Pre-provisioned RWO PVC (`arc-pnpm-store`, 5 GB) — see `contracts/arc-pnpm-store-pvc.yaml`
- Docker build cache uses registry-backed caching (`--cache-to=type=registry,ref=ghcr.io/<org>/buildcache`) — no PVC needed

### Reference: pnpm Store Cache Maintenance CronJob

A weekly CronJob should be deployed alongside ARC to prune orphaned packages from the shared pnpm store. See `contracts/arc-pnpm-store-prune-cronjob.yaml` for the complete, apply-ready manifest (includes resource limits, job history retention, and structured logging).
