# Tasks: Migrate CI/CD to Self-Hosted ARC Runners

**Input**: Design documents from `/specs/037-self-hosted-runners/`
**Prerequisites**: plan.md, spec.md, research.md, contracts/

**Tests**: Not included — verification is manual workflow execution per PR tier (appropriate for CI/CD infrastructure changes).

**Organization**: Tasks are organized by risk-tier PR, which maps to user stories as follows:
- PR 1 (Low): US1 partial + US2 (Travis retirement)
- PR 2 (Medium): US1 partial
- PR 3 (High): US1 partial
- PR 4 (Highest): US1 completion
- Phase 2: US3 + US4 (custom image)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Infra Manifest Preparation)

**Purpose**: Finalize Kubernetes manifests that the operator must apply in the infra/GitOps repository before workflow PRs can be tested.

- [x] T001 Review and finalize PVC manifest in `specs/037-self-hosted-runners/contracts/arc-pnpm-store-pvc.yaml` — confirm storage class, namespace, and 5 GB size are correct for the target cluster
- [x] T002 [P] Review and finalize ARC Helm values in `specs/037-self-hosted-runners/contracts/arc-runner-set-values.yaml` — replace `<runner-node-name>` placeholder with actual hostname, confirm runner image tag, set `githubConfigSecret` name
- [x] T003 [P] Review and finalize CronJob manifest in `specs/037-self-hosted-runners/contracts/arc-pnpm-store-prune-cronjob.yaml` — replace `<runner-node-name>` placeholder, confirm namespace matches ARC installation

---

## Phase 2: Foundational (Infra Handoff + Runner Validation)

**Purpose**: Apply infra manifests in external repo and validate ARC runner pods are functional. BLOCKS all workflow PRs.

**CRITICAL**: No workflow PRs can proceed until the runner is validated.

- [ ] T004 Hand off `contracts/arc-pnpm-store-pvc.yaml` to infra repo operator — PVC must be created in the ARC runner namespace before PR 1
- [ ] T005 Hand off `contracts/arc-runner-set-values.yaml` (basic mode — comment out DinD sidecar for now) to infra repo operator — runner pods must spawn and register with GitHub
- [ ] T006 Validate runner pod is functional: trigger a test workflow on `arc-runner-set` that runs `echo "hello"`, `pnpm store path`, `which git && which curl && which jq && which gpg && which python3` (FR-003 tool validation), and accesses a non-sensitive GitHub secret to confirm pod spawns, pnpm PVC is mounted at `/opt/cache/pnpm-store`, `npm_config_store_dir` resolves correctly, required system tools are available, and secrets injection works (FR-003, FR-008)

**Checkpoint**: ARC runner pods spawn, register with GitHub, have pnpm PVC mounted, and can access secrets. PR 1 can begin.

---

## Phase 3: PR 1 — Low Risk: Runner Swap + Legacy CI Cleanup (US1 + US2)

**Goal**: Prove `arc-runner-set` works for simple workflows. Remove Travis CI and E2E trigger. Create replacement test workflow.

**Independent Test**: Push a PR → `review-router.yml` and `ci-tests.yml` both run on `arc-runner-set` with passing status. `.travis.yml` and `trigger-e2e-tests.yml` are gone.

### Implementation for PR 1

- [x] T007 [P] [US1] Swap `runs-on: ubuntu-latest` to `runs-on: arc-runner-set` in `.github/workflows/review-router.yml` (single job: `pr_metrics`)
- [x] T008 [P] [US2] Delete `.github/workflows/trigger-e2e-tests.yml` entirely (E2E tests will be triggered manually per spec FR-009)
- [x] T009 [P] [US2] Delete `.travis.yml` from repository root and disable Travis CI integration in GitHub repository settings (Travis CI retirement per spec FR-005, US2 acceptance scenario 2)
- [x] T010 [P] [US2] Create new `.github/workflows/ci-tests.yml` replacing Travis CI — runs `pnpm run test:ci:no:coverage` on `arc-runner-set` with Node.js 22, pnpm 10.17.1, `NODE_OPTIONS=--max-old-space-size=4096`. Triggered on `pull_request` to `[develop, main]`. See plan.md section "1.3" for exact YAML.

**Checkpoint**: PR 1 merged. `review-router.yml` confirmed running on `arc-runner-set` post-merge. Travis + E2E files removed. `ci-tests.yml` passes on PRs.

**Verification gate → PR 2**: At least one successful `review-router.yml` run on `arc-runner-set` post-merge. `ci-tests.yml` passes on a test PR.

---

## Phase 4: PR 2 — Medium Risk: Node.js/pnpm Workflows (US1)

**Goal**: Migrate schema and quality workflows that depend on Node.js 22, pnpm, and full git history.

**Independent Test**: Push a PR with a code change → `schema-contract.yml` posts a schema diff comment, `trigger-sonarqube.yml` reports quality gate, `schema-baseline.yml` creates baseline PR after merge to develop.

### Implementation for PR 2

- [x] T011 [P] [US1] Swap `runs-on: ubuntu-latest` to `runs-on: arc-runner-set` in `.github/workflows/schema-contract.yml` (single job: `diff-and-validate`)
- [x] T012 [P] [US1] Swap `runs-on: ubuntu-latest` to `runs-on: arc-runner-set` in `.github/workflows/trigger-sonarqube.yml` (single job: `sonarqube`)
- [x] T013 [P] [US1] Swap `runs-on: ubuntu-latest` to `runs-on: arc-runner-set` in `.github/workflows/schema-baseline.yml` (single job: `regenerate`)

**Checkpoint**: PR 2 merged. All three workflows confirmed running on `arc-runner-set` post-merge.

**Verification gate → PR 3**: `schema-contract.yml` posts valid PR comment. `trigger-sonarqube.yml` reports quality gate result. `schema-baseline.yml` creates/updates baseline PR on push to develop. **Infra prerequisite**: Update Helm values in infra repo to enable DinD sidecar — see T014.

---

## Phase 5: Infra Handoff — Enable DinD

**Purpose**: Update ARC Helm values to include DinD sidecar with `--privileged` mode. Required before PR 3 and PR 4.

- [ ] T014 Hand off updated `contracts/arc-runner-set-values.yaml` (full version with DinD sidecar) to infra repo operator — runner pods must now spawn with DinD sidecar, Docker socket shared at `/var/run/docker.sock`
- [ ] T015 Validate DinD is functional: trigger a test workflow on `arc-runner-set` that runs `docker info` and `docker buildx version` to confirm DinD sidecar is running and Buildx is available

**Checkpoint**: Runner pods spawn with DinD sidecar. `docker info` succeeds from runner container. PR 3 can begin.

---

## Phase 6: PR 3 — High Risk: K8s Deploy with DinD + Registry Cache (US1)

**Goal**: Migrate K8s deployment workflows from raw `docker build` to `docker/build-push-action@v5` with Buildx and registry-backed Docker build cache.

**Independent Test**: Push to `develop` → `build-deploy-k8s-dev-hetzner.yml` builds image via DinD, pushes to ACR, deploys to K8s cluster. Cluster pods are healthy.

### Implementation for PR 3

- [ ] T016 [US1] Migrate `build` job in `.github/workflows/build-deploy-k8s-dev-hetzner.yml`: swap `runs-on` to `arc-runner-set`, add `docker/setup-buildx-action@v3`, replace `azure/docker-login@v2` with `docker/login-action@v3` for ACR, add `docker/login-action@v3` for GHCR cache auth, replace raw `docker build`+`docker push` with `docker/build-push-action@v5` including `cache-from: type=registry,ref=ghcr.io/alkem-io/server:buildcache-deploy` and `cache-to: type=registry,ref=ghcr.io/alkem-io/server:buildcache-deploy,mode=max`. See plan.md section "3.1-3.3" for exact YAML.
- [ ] T017 [US1] Swap `runs-on: ubuntu-latest` to `runs-on: arc-runner-set` in `migrate` and `deploy` jobs of `.github/workflows/build-deploy-k8s-dev-hetzner.yml` (no Docker changes — kubectl only)
- [ ] T018 [P] [US1] Apply same changes as T016+T017 to `.github/workflows/build-deploy-k8s-test-hetzner.yml` — identical `build` job migration (Buildx + registry cache + ACR login + GHCR login) plus `runs-on` swap on `migrate` and `deploy` jobs
- [ ] T019 [P] [US1] Apply same changes as T016+T017 to `.github/workflows/build-deploy-k8s-sandbox-hetzner.yml` — identical `build` job migration plus `runs-on` swap on `migrate` and `deploy` jobs

**Checkpoint**: PR 3 merged. Dev deploy succeeds via DinD post-merge. Registry cache populated in GHCR (second build should be faster).

**Verification gate → PR 4**: At least one successful deployment via `build-deploy-k8s-dev-hetzner.yml` on `arc-runner-set` post-merge. Cluster pods healthy.

---

## Phase 7: PR 4 — Highest Risk: Docker Hub Release with QEMU/Buildx (US1)

**Goal**: Migrate Docker Hub release workflow to `arc-runner-set` with DinD + QEMU/Buildx for multiplatform builds (`linux/amd64,linux/arm64`). Consolidate old workflow. Complete US1.

**Independent Test**: Create a test pre-release → `build-release-docker-hub-new.yml` builds and pushes a multiplatform Docker image via DinD + QEMU/Buildx to Docker Hub. `docker manifest inspect` confirms valid image with both amd64 and arm64 platforms.

### Implementation for PR 4

- [ ] T020 [US1] Migrate `.github/workflows/build-release-docker-hub-new.yml`: swap `runs-on` to `arc-runner-set`, add `docker/login-action@v3` step for GHCR cache auth (before DockerHub login), add `cache-from: type=registry,ref=ghcr.io/alkem-io/server:buildcache-release` and `cache-to: type=registry,ref=ghcr.io/alkem-io/server:buildcache-release,mode=max` to `docker/build-push-action@v5`. Ensure `platforms: linux/amd64,linux/arm64` is set for multiplatform builds (FR-004). See plan.md section "4.1" for exact YAML.
- [ ] T021 [P] [US1] Delete `.github/workflows/build-release-docker-hub.yml` (consolidated into new workflow per spec FR-010 — no external dependencies confirmed)

**Checkpoint**: PR 4 merged. Docker Hub release produces valid multiplatform image on `arc-runner-set`. Old workflow deleted. **US1 and US2 are now complete — all workflows run on `arc-runner-set`, no `ubuntu-latest` references remain.**

---

## Phase 8: Post-MVP — Custom Runner Image (US3 + US4)

**Goal**: Create a custom runner image with pre-installed tools to eliminate tool setup overhead. Build an automated pipeline for the image.

**Independent Test**: Run all workflows with the custom image — tool setup steps are skipped, job duration decreases.

### Implementation for Custom Image

- [ ] T022 [US3] Create `Dockerfile.runner` at repository root (or `runner/Dockerfile`) with Ubuntu 22.04 base, pre-installed: Node.js 22.21.1 (via Volta or direct install), pnpm 10.17.1 (via corepack), Docker CLI + Buildx plugin, kubectl 1.27.6, Python 3.x + pip, GPG, git, curl, jq, corepack. Must be compatible with ARC runner image contract (`ghcr.io/actions/actions-runner` base layers or standalone).
- [ ] T023 [US4] Create `.github/workflows/build-runner-image.yml` — triggered on changes to `Dockerfile.runner`, builds and pushes to GHCR at `ghcr.io/alkem-io/arc-runner:latest` (and semver tags). Runs on `arc-runner-set` with DinD.
- [ ] T024 [US3] Hand off updated `contracts/arc-runner-set-values.yaml` to infra repo operator — change runner image from `ghcr.io/actions/actions-runner:<pinned-version>` to `ghcr.io/alkem-io/arc-runner:<pinned-version>`
- [ ] T025 [P] [US3] Update workflows to remove tool setup steps that are now pre-installed: remove `actions/setup-node`, `corepack enable/prepare`, `azure/setup-kubectl` steps from workflows where the custom image provides these tools. Affects: `ci-tests.yml`, `schema-contract.yml`, `trigger-sonarqube.yml`, `schema-baseline.yml`, K8s deploy workflows.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final maintenance, validation, and Constitution compliance.

- [ ] T026 Hand off `contracts/arc-pnpm-store-prune-cronjob.yaml` to infra repo operator — weekly pnpm store prune CronJob
- [ ] T027 Verify pinned container image tags in `contracts/arc-runner-set-values.yaml` are current per Constitution Principle 9 (Container Determinism): runner image pinned to `ghcr.io/actions/actions-runner:2.321.0` and DinD sidecar pinned to `docker:27-dind` — confirm these are the latest stable versions at time of deployment
- [ ] T028 Final audit: `grep -r 'ubuntu-latest' .github/workflows/` returns zero matches. All workflow files reference `arc-runner-set`. (Deferred until T016–T021 complete — K8s deploy and Docker Hub release workflows still pending migration)
- [ ] T029 Run `specs/037-self-hosted-runners/quickstart.md` full validation checklist across all PRs
- [ ] T030 Update `docs/Developing.md` to note that CI runs on self-hosted ARC runners (if CI setup is documented there)

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Phase 1 (Setup)
  │
  ▼
Phase 2 (Foundational) ── BLOCKS ALL ──┐
  │                                      │
  ▼                                      │
Phase 3 (PR 1 — Low)                    │
  │                                      │
  ▼                                      │
Phase 4 (PR 2 — Medium)                 │
  │                                      │
  ▼                                      │
Phase 5 (Infra: Enable DinD) ──────────┘
  │
  ▼
Phase 6 (PR 3 — High)
  │
  ▼
Phase 7 (PR 4 — Highest)
  │
  ▼
Phase 8 (Post-MVP: US3+US4) ── can start after Phase 7
  │
  ▼
Phase 9 (Polish) ── after all desired phases complete
```

### User Story Dependencies

- **US1 (Runner Swap)**: Spans Phases 3-7. Each PR is independently valuable and verifiable. US1 is fully complete when PR 4 merges.
- **US2 (Travis Retirement)**: Entirely within Phase 3 (PR 1). Independent of other PRs.
- **US3 (Custom Image)**: Depends on US1 completion (all workflows on `arc-runner-set`). Phase 8.
- **US4 (Image Pipeline)**: Depends on US3 Dockerfile existing. Phase 8.

### Infra Handoff Dependencies (External Repo)

| Task | Required Before | Infra Manifest |
|------|-----------------|----------------|
| T004+T005 | PR 1 (Phase 3) | PVC + basic Helm values |
| T014 | PR 3 (Phase 6) | Helm values with DinD sidecar |
| T024 | Phase 8 | Helm values with custom image |
| T026 | Phase 9 | CronJob for pnpm prune |

### Parallel Opportunities

**Within Phase 1 (Setup)**:
- T002, T003 can run in parallel (different manifests)

**Within PR 1 (Phase 3)**:
- T007, T008, T009, T010 can ALL run in parallel (different files, no dependencies between them)

**Within PR 2 (Phase 4)**:
- T011, T012, T013 can all run in parallel (different files)

**Within PR 3 (Phase 6)**:
- T016+T017 (dev) must be done first as the template
- T018 (test) and T019 (sandbox) can run in parallel after dev is done

**Within PR 4 (Phase 7)**:
- T020 and T021 can run in parallel (different files)

---

## Parallel Example: PR 1

```bash
# Launch all four tasks in parallel (all different files):
Task: "Swap runs-on in .github/workflows/review-router.yml"           # T007
Task: "Delete .github/workflows/trigger-e2e-tests.yml"                # T008
Task: "Delete .travis.yml"                                            # T009
Task: "Create .github/workflows/ci-tests.yml"                         # T010
```

## Parallel Example: PR 3

```bash
# First: migrate dev workflow as template:
Task: "Migrate build job in .github/workflows/build-deploy-k8s-dev-hetzner.yml"  # T016+T017

# Then: apply same pattern to test + sandbox in parallel:
Task: "Migrate .github/workflows/build-deploy-k8s-test-hetzner.yml"              # T018
Task: "Migrate .github/workflows/build-deploy-k8s-sandbox-hetzner.yml"           # T019
```

---

## Implementation Strategy

### MVP First (PR 1 Only)

1. Complete Phase 1: Setup (finalize infra manifests)
2. Complete Phase 2: Foundational (apply PVC + Helm, validate runner)
3. Complete Phase 3: PR 1 (runner swap + Travis removal)
4. **STOP and VALIDATE**: `review-router.yml` runs on `arc-runner-set`, `ci-tests.yml` passes
5. This alone proves the self-hosted runner works and removes legacy CI

### Incremental Delivery (4 PRs)

1. PR 1 → Validate → Merge (proves runner, removes legacy CI)
2. PR 2 → Validate → Merge (proves Node.js/pnpm tooling)
3. Enable DinD in infra → Validate
4. PR 3 → Validate → Merge (proves Docker/DinD for deploys)
5. PR 4 → Validate → Merge (proves QEMU/Buildx for multiplatform releases)
6. **US1+US2 complete** — all workflows on `arc-runner-set`

### Post-MVP (Phase 2 Custom Image)

7. Build custom image + pipeline (US3+US4)
8. Update workflows to skip setup steps
9. Measure setup time reduction (target: 50%+)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Infra handoff tasks (T004, T005, T014, T024, T026) are applied out-of-band in a separate repository
- Each PR has an explicit verification gate before the next can proceed
- Rollback for any PR: revert the PR to restore `ubuntu-latest`
- The pnpm PVC cache is transparent to workflows — no `actions/cache` changes needed (PVC works via `npm_config_store_dir` env in pod template)
- Registry-backed Docker cache is a best-effort optimization — builds succeed without cache (just slower)
- T027 scope includes ALL image tags in Helm values (runner image + DinD sidecar) per Constitution Principle 9
