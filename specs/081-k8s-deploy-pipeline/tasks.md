# Tasks: K8s Deployment Pipeline with Dual Docker Images

**Input**: Design documents from `specs/081-k8s-deploy-pipeline/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: No automated test tasks — this is CI/CD infrastructure. Validation tasks describe manual verification steps corresponding to the spec's acceptance criteria.

**Organization**: Tasks are grouped by user story. US4 (Distroless Image, P1) is foundational and gates US1–US3; US1–US3 can be worked in parallel once the foundation is in place.

**Contract reference**: All implementation tasks reference their matching contract file in `specs/081-k8s-deploy-pipeline/contracts/` as the source of truth.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths are included in all descriptions

---

## Phase 1: Setup (Pre-Implementation Risk & File Creation)

**Purpose**: Resolve the primary technical risk and create new files before any modification work begins.

- [ ] T001 Scan `package.json` and `src/` for native Node.js modules (pg-native, bcrypt, sharp, canvas, etc.) that produce compiled C binaries — document any findings; if native modules exist with Alpine-compiled binaries, flag that the builder stage in `Dockerfile` must use `node:22.21.1-bookworm-slim` instead of Alpine to match the Debian base of the distroless runtime (see Risk section in `specs/081-k8s-deploy-pipeline/plan.md`)
- [ ] T002 [P] Create `Dockerfile.migration` at repo root, copying the content from `specs/081-k8s-deploy-pipeline/contracts/dockerfile-migration.dockerfile` (two-stage Alpine build: builder with full deps → final Alpine stage with pnpm + dist/ + node_modules + package.json + alkemio.yml)
- [ ] T003 [P] Create `manifests/27-server-migration-job.yaml` from `specs/081-k8s-deploy-pipeline/contracts/migration-job.yaml` (k8s `batch/v1 Job` with `backoffLimit: 0`, `ttlSecondsAfterFinished: 3600`, `${MIGRATION_IMAGE}` placeholder for `envsubst`, env sourced from `alkemio-config` ConfigMap and `alkemio-secrets` Secret)
- [ ] T004 [P] Delete `manifests/26-server-migration.yaml` (the `@yearly` CronJob that served as a job template is replaced by the direct Job manifest in T003; deletion removes the misleading resource from the repository)

**Checkpoint**: New files created, risk documented, obsolete manifest removed — ready for Dockerfile rewrite

---

## Phase 2: Foundational — US4 (P1) Minimal and Hardened Runtime Image

**Goal**: Produce a distroless runtime image that has no shell, no package manager, and is measurably smaller than the current single-stage build.

**Independent Test**: Build the image locally, confirm `docker run --entrypoint sh alkemio-server:test -c "echo hi"` fails with "no such file or directory" (no shell), confirm `docker run` starts the application, confirm image size is ≥40% smaller than the old single-stage Alpine image.

**⚠️ CRITICAL**: No pipeline story (US1–US3) can be validated until this phase is complete.

- [ ] T005 Rewrite `Dockerfile` as a two-stage multi-stage build using `specs/081-k8s-deploy-pipeline/contracts/dockerfile-runtime.dockerfile` as the source of truth:
  - Stage 1 (`builder`): `node:22.21.1-alpine` (or `node:22.21.1-bookworm-slim` if native modules found in T001), install pnpm@10.17.1, `pnpm install --frozen-lockfile`, copy `tsconfig.json tsconfig.build.json alkemio.yml src/`, run `pnpm run build`, then `pnpm prune --prod`
  - Stage 2 (runtime): `gcr.io/distroless/nodejs22-debian13:nonroot`, copy `dist/`, `node_modules/`, `package.json`, `alkemio.yml` from builder; set `NODE_OPTIONS=--max-old-space-size=2048`; `CMD ["dist/main.js"]` — **NOT** `CMD ["node", "dist/main.js"]` (distroless ENTRYPOINT is already `node`)
- [ ] T006 [US4] Build and locally validate the rewritten `Dockerfile`:
  - `docker build -f Dockerfile -t alkemio-server:test .` — must succeed
  - `docker run --rm --entrypoint sh alkemio-server:test -c "echo hi"` — must fail (no shell → SC-006 satisfied)
  - `docker run --rm alkemio-server:test` — application must start (or fail with a config error, not a "node not found" error → SC-002 proxy)
  - `docker images alkemio-server:test` vs old single-stage size — must show ≥40% reduction (SC-003)
- [ ] T007 [US4] Build and locally validate `Dockerfile.migration`:
  - `docker build -f Dockerfile.migration -t alkemio-server-migration:test .` — must succeed
  - `docker run --rm alkemio-server-migration:test pnpm --version` — must print pnpm version (pnpm on PATH confirmed)
  - `docker run --rm alkemio-server-migration:test cat package.json | grep migration:run` — migration script confirmed present

**Checkpoint**: Both images build locally and pass acceptance criteria — pipeline work (US1–US3) can begin in parallel

---

## Phase 3: US1 (P1) — Safe Automatic Deployment to Development 🎯 MVP

**Goal**: On every push to `develop`, the pipeline automatically builds both images, runs the migration Job (and waits for it), and only then deploys the runtime image to the dev cluster.

**Independent Test**: Merge a commit to `develop`; verify two images appear in the registry tagged with the commit SHA; verify the deploy job is absent from the run timeline when the migration job is deliberately broken (only migrate job appears, deploy job is skipped).

### Implementation

- [ ] T008 [US1] Update `.github/workflows/build-deploy-k8s-dev-hetzner.yml` using `specs/081-k8s-deploy-pipeline/contracts/workflow-dev.yml` as the reference:
  - All `runs-on: ubuntu-latest` → `runs-on: [self-hosted, m4]`
  - `actions/checkout@v4.1.7` → `actions/checkout@v6.0.2`
  - `azure/setup-kubectl@v4.0.0` → `azure/setup-kubectl@v4.0.1`
  - `azure/k8s-deploy@v5.0.0` → `azure/k8s-deploy@v5.1.0`
  - Build step: add migration image build (`docker build -f Dockerfile.migration`) and push (`alkemio-server-migration:<sha>`) alongside the existing runtime image build; also push `alkemio-server:latest` for dev environment
  - Migrate step: remove `azure/k8s-deploy` (used to update CronJob image) and `kubectl create job --from=cronjob/server-migration`; replace with: (1) `kubectl delete job server-migration-job --ignore-not-found=true`, (2) `MIGRATION_IMAGE=<registry>/alkemio-server-migration:<sha> envsubst < manifests/27-server-migration-job.yaml | kubectl apply -f -`, (3) `kubectl wait --for=condition=complete job/server-migration-job --timeout=300s` with logs-on-failure fallback
- [ ] T009 [US1] Validate US1 acceptance scenario 1: trigger the updated workflow by merging a test commit to `develop`; confirm registry shows both `alkemio-server:<sha>` and `alkemio-server-migration:<sha>` (SC-007)
- [ ] T010 [US1] Validate US1 acceptance scenario 3 (failure isolation): introduce a deliberate migration failure (e.g., temporarily break the migration script or DB creds in a test branch); trigger the pipeline; confirm the deploy job is skipped (shows as "skipped" in GitHub Actions, not "failed") and the live service is unchanged (SC-002)

**Checkpoint**: Dev auto-deploy pipeline fully functional with dual images and safe migration-first sequencing

---

## Phase 4: US2 (P2) — Manual Deployment to Testing Environment

**Goal**: DevOps engineer can manually trigger the testing environment deployment; it follows the identical build → migrate → deploy sequence using the test cluster kubeconfig.

**Independent Test**: Dispatch the test workflow; verify three-phase sequence completes; verify only the test cluster is affected.

### Implementation

- [ ] T011 [US2] Update `.github/workflows/build-deploy-k8s-test-hetzner.yml` using `specs/081-k8s-deploy-pipeline/contracts/workflow-test.yml` as the reference — apply the identical changes as T008, with the one environment-specific difference: all `KUBECONFIG_SECRET_HETZNER_DEV` references remain as `KUBECONFIG_SECRET_HETZNER_TEST`; the build step does NOT push a `latest` tag (test env uses SHA tags only)
- [ ] T012 [US2] Validate US2 acceptance scenario 1: dispatch the test workflow; verify both images pushed with the triggering commit SHA (SC-007)
- [ ] T013 [US2] Validate US2 acceptance scenario 2: dispatch the test workflow a second time on the same commit; verify the pre-existing `server-migration-job` is deleted and replaced without error (FR-008 / SC-004)

**Checkpoint**: Test environment pipeline independently operable; does not affect dev or sandbox clusters

---

## Phase 5: US3 (P3) — Manual Deployment to Staging

**Goal**: DevOps engineer can promote a tested version to the staging (sandbox) environment by manually triggering the staging workflow.

**Independent Test**: Dispatch the sandbox workflow; verify it targets only the sandbox cluster with the correct images and does not affect test or dev.

### Implementation

- [ ] T014 [US3] Update `.github/workflows/build-deploy-k8s-sandbox-hetzner.yml` using `specs/081-k8s-deploy-pipeline/contracts/workflow-sandbox.yml` as the reference — apply the identical changes as T011, with `KUBECONFIG_SECRET_HETZNER_SANDBOX` (already present in the original file)
- [ ] T015 [US3] Validate US3 acceptance scenario 1: dispatch the sandbox workflow; verify it uses `KUBECONFIG_SECRET_HETZNER_SANDBOX` and targets only the sandbox cluster
- [ ] T016 [US3] Validate US3 acceptance scenario 2 (idempotency): re-run the same migration against the sandbox cluster; verify it completes without error (confirms FR-003 — idempotent migrations)

**Checkpoint**: All three in-scope environments (dev/test/sandbox) have independently operable pipeline workflows (SC-005)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: DockerHub release workflow update (FR-014), consistency verification, and local end-to-end validation.

- [ ] T017 [P] Update `.github/workflows/build-release-docker-hub.yml` using `specs/081-k8s-deploy-pipeline/contracts/workflow-dockerhub.yml` as the reference:
  - `runs-on: ubuntu-latest` → `runs-on: [self-hosted, m4]`
  - `docker/metadata-action@v5` → `v6.0.0`; `docker/setup-qemu-action@v3` → `v4.0.0`; `docker/setup-buildx-action@v3` → `v4.0.0`; `docker/login-action@v3` → `v4.0.0`; `docker/build-push-action@v5` → `v7.0.0`; `actions/checkout@v4` → `v6.0.2`
  - Add a second `docker/metadata-action` step for the migration image (`alkemio/<repo>-migration`) with identical semver tag patterns
  - Add a second `docker/build-push-action` step building `Dockerfile.migration` and pushing to the migration image tags
- [ ] T018 [P] Cross-check all four updated workflow files for consistency: confirm every job in every file uses `[self-hosted, m4]`, `actions/checkout@v6.0.2`, `azure/setup-kubectl@v4.0.1`, `azure/k8s-deploy@v5.1.0`; confirm dev/test/sandbox workflows share identical migrate step structure with only kubeconfig secret name differing
- [ ] T019 Run the `quickstart.md` local validation steps: build both images, verify distroless has no shell (SC-006), verify migration image has pnpm, compare image sizes (SC-003)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately; T002/T003/T004 are fully parallel
- **Foundational (Phase 2)**: Depends on T001 (native module risk informs builder base choice); T006/T007 can run in parallel after T005
- **US1 (Phase 3)**: Depends on Phase 2 complete (both images must build successfully first)
- **US2 (Phase 4)**: Depends on Phase 2; can run in parallel with US1 Phase 3
- **US3 (Phase 5)**: Depends on Phase 2; can run in parallel with US1/US2
- **Polish (Phase 6)**: T017/T018 depend on all prior workflows being updated; T019 depends on Phase 2

### User Story Dependencies

- **US4 (Foundational)**: Must complete before US1/US2/US3 — both Dockerfiles must build successfully
- **US1 (P1)**: Depends on US4 complete; independent of US2/US3
- **US2 (P2)**: Depends on US4 complete; independent of US1/US3 (shares same Dockerfiles)
- **US3 (P3)**: Depends on US4 complete; independent of US1/US2 (shares same Dockerfiles)

### Parallel Opportunities

- T002, T003, T004 (Phase 1) — different files, fully parallel
- T006, T007 (Phase 2) — different Dockerfiles, parallel image validation
- T008 (US1), T011 (US2), T014 (US3) — different workflow files, can run in parallel once Phase 2 is done
- T017, T018 (Polish) — different files, parallel

---

## Parallel Example: Phase 2 (Foundational)

```bash
# After T005 (Dockerfile rewrite) completes, run in parallel:
Task T006: "Build runtime image, validate no shell, check size reduction"
Task T007: "Build migration image, validate pnpm available"
```

## Parallel Example: US1/US2/US3 (after Phase 2 complete)

```bash
# All three can be done simultaneously since they touch different workflow files:
Task T008: "Update build-deploy-k8s-dev-hetzner.yml"
Task T011: "Update build-deploy-k8s-test-hetzner.yml"
Task T014: "Update build-deploy-k8s-sandbox-hetzner.yml"
```

---

## Implementation Strategy

### MVP First (US4 + US1 Only)

1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: Foundational — distroless images (T005–T007)
3. Complete Phase 3: US1 — dev auto-deploy pipeline (T008–T010)
4. **STOP and VALIDATE**: Merge to `develop`, observe both images in registry, confirm migration-first ordering
5. Ship — dev pipeline is stable and delivers immediate value

### Incremental Delivery

1. Phase 1 + 2 → Both images build, distroless validated (SC-003, SC-006)
2. Phase 3 (US1) → Dev pipeline live (SC-001, SC-002, SC-004, SC-007)
3. Phase 4 (US2) → Test pipeline live (SC-005 partially satisfied)
4. Phase 5 (US3) → Staging pipeline live (SC-005 fully satisfied)
5. Phase 6 → DockerHub workflow updated (FR-014), consistency confirmed

---

## Notes

- All implementation tasks have a corresponding contract file in `specs/081-k8s-deploy-pipeline/contracts/` — use these as the authoritative reference, not the current file contents
- The `${MIGRATION_IMAGE}` placeholder in `27-server-migration-job.yaml` requires `envsubst` to be available on the runner — it is a standard POSIX tool included in the `gettext` package and is present on all modern Linux runners
- The `backoffLimit: 0` in the Job manifest is intentional: it causes the Job to fail fast rather than retry, which ensures `kubectl wait --for=condition=complete` exits 1 promptly when a migration fails
- The dev workflow pushes an additional `alkemio-server:latest` tag (for convenience with docker-compose in dev); test and sandbox workflows push SHA-only tags
- Validation tasks (T009, T010, T012, T013, T015, T016) are manual steps — they cannot be automated without cluster access
- If T001 finds native modules compiled for musl (Alpine): change builder stage base in `Dockerfile` from `node:22.21.1-alpine` to `node:22.21.1-bookworm-slim` to match the Debian glibc base of `gcr.io/distroless/nodejs22-debian13`
