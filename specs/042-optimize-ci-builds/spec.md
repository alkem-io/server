# Feature Specification: Optimize CI Builds

**Feature Branch**: `042-optimize-ci-builds`
**Created**: 2026-03-09
**Status**: Draft
**Input**: User description: "Use Apple Silicon runner (already hosted, provisioned with https://github.com/alkem-io/infrastructure-provisioning/pull/13) for super-optimized CI builds. Make sure there are no duplicate actions done in the CI (e.g. SonarQube + tests running same tests twice, one time with coverage, one time with no coverage). Add caching layer and potentially other techniques that can make the build faster."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Eliminate Duplicate Test Execution (Priority: P1)

As a developer, I want CI to run tests only once (with coverage) and share the results across workflows, so that PR feedback is faster and compute resources are not wasted on redundant work.

**Why this priority**: Currently, every PR triggers two separate test runs — `ci-tests.yml` (without coverage) and `trigger-sonarqube.yml` (with coverage). This doubles CI time and resource consumption for every PR. Eliminating this duplication provides the single largest time saving.

**Independent Test**: Can be verified by opening a PR and confirming that tests execute exactly once, coverage artifacts are produced, and both the CI gate and SonarQube analysis consume the same test results.

**Acceptance Scenarios**:

1. **Given** a PR is opened against `develop`, **When** CI workflows execute, **Then** tests run exactly once (with coverage enabled) and the results are available to both the CI status check and SonarQube analysis.
2. **Given** a PR triggers CI, **When** the test job completes, **Then** SonarQube consumes the coverage artifact from the test job rather than re-running tests independently.
3. **Given** the unified test run fails, **When** results are reported, **Then** the CI gate reflects the failure and the SonarQube job is skipped (since it depends on the test job completing successfully).

---

### User Story 2 - Migrate CI to Apple Silicon Runner (Priority: P2)

As a platform team member, I want CI workflows to run on the pre-provisioned Apple Silicon (ARM64) runner, so that builds and tests execute faster due to the superior single-threaded and multi-threaded performance of Apple Silicon hardware.

**Why this priority**: The Apple Silicon runner is already provisioned and available. Migrating to it provides a direct speed improvement for all CI jobs without code changes. However, it depends on first understanding which workflows to consolidate (P1).

**Independent Test**: Can be verified by confirming that CI jobs execute on the Apple Silicon runner and complete successfully with correct results.

**Acceptance Scenarios**:

1. **Given** the Apple Silicon runner is provisioned and registered, **When** a CI workflow is triggered, **Then** jobs targeting the new runner execute on the Apple Silicon hardware.
2. **Given** CI runs on Apple Silicon, **When** the test suite completes, **Then** all tests pass with the same results as on the previous runner.
3. **Given** a workflow uses the Apple Silicon runner, **When** it installs dependencies and builds the project, **Then** all native modules compile correctly for the ARM64 architecture.

---

### User Story 3 - Add Build and Dependency Caching (Priority: P3)

As a developer, I want CI to cache build artifacts and dependency installations across runs, so that subsequent CI executions on the same branch are significantly faster.

**Why this priority**: Caching reduces redundant work (dependency installation, TypeScript compilation) on every CI run. While pnpm store caching already exists, there is no caching of TypeScript build output or other intermediate artifacts. This builds on the consolidated pipeline from P1 and P2.

**Independent Test**: Can be verified by triggering two consecutive CI runs on the same branch and confirming the second run is faster due to cache hits.

**Acceptance Scenarios**:

1. **Given** a PR has previously run CI, **When** a new commit is pushed to the same PR, **Then** cached build artifacts are restored and the build step completes faster than a cold run.
2. **Given** dependencies have not changed between commits, **When** CI runs, **Then** the dependency installation step uses the cached pnpm store and completes in under 30 seconds.
3. **Given** source files have changed, **When** the TypeScript build runs, **Then** incremental compilation uses cached output and only recompiles changed modules.

---

### User Story 4 - Remove Duplicate Docker Release Workflow (Priority: P4)

As a platform team member, I want only one Docker release workflow to exist, so that releases are not built and pushed twice and maintenance burden is reduced.

**Why this priority**: Two Docker release workflows (`build-release-docker-hub.yml` and `build-release-docker-hub-new.yml`) both trigger on release events. The newer workflow is cleaner and should be the sole workflow. Lower priority because releases happen less frequently than PR builds.

**Independent Test**: Can be verified by creating a release and confirming a single Docker image is built and pushed with correct tags.

**Acceptance Scenarios**:

1. **Given** a release is published, **When** CI processes the release, **Then** exactly one Docker build-and-push workflow executes.
2. **Given** the legacy workflow is removed, **When** a release is published, **Then** the remaining workflow produces correctly tagged images (latest, semver variants).

---

### Edge Cases

- What happens when an Apple Silicon runner is temporarily unavailable? Jobs are distributed across the remaining runners in the pool; if all runners are busy, jobs queue until one becomes available (standard GitHub Actions behavior for self-hosted runner groups).
- What happens when cached artifacts are corrupted or stale? The build must still succeed by falling back to a clean build without manual intervention.
- What happens when a workflow needs to run on a different architecture (e.g., Docker multi-platform builds)? Architecture-specific workflows (Docker release, K8s deploy) must remain on their current Linux runners.
- SonarScanner has native ARM64 support; the SonarQube analysis job runs on the Apple Silicon runner alongside the test job within the same unified workflow.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: CI MUST run the test suite exactly once per PR, with coverage enabled, within a single unified workflow. A `test` job produces coverage artifacts, and a dependent `sonarqube` job downloads and analyzes them — no separate workflow files or duplicate test runs.
- **FR-002**: CI test and build workflows MUST execute on the Apple Silicon runner using the runner labels `[self-hosted, macOS, ARM64, apple-silicon, m4]`.
- **FR-003**: CI MUST cache the pnpm dependency store and restore it on subsequent runs. Cache keys MUST be scoped per-branch with a fallback restore key from `develop`, so new branches benefit from a warm cache on their first run.
- **FR-004**: CI MUST cache TypeScript build output (compilation artifacts) and restore it for incremental builds. The same per-branch-with-`develop`-fallback key strategy applies.
- **FR-005**: CI MUST produce a single set of test results and coverage data consumed by both the pass/fail gate and SonarQube analysis. The SonarQube quality gate remains **advisory** (non-blocking) — its steps use `continue-on-error: true` so a quality gate failure does not fail the CI workflow.
- **FR-006**: The legacy Docker release workflow (`build-release-docker-hub.yml`) MUST be removed, and the newer workflow (`build-release-docker-hub-new.yml`) MUST be renamed to `build-release-docker-hub.yml` to maintain a clean naming convention.
- **FR-007**: CI MUST fall back to a clean (uncached) build if cached artifacts are missing or invalid, without manual intervention.
- **FR-008**: Docker release and Kubernetes deployment workflows MUST remain on their current runners (not moved to Apple Silicon) since they require Linux Docker builds.
- **FR-009**: Schema contract and schema baseline workflows MUST be migrated to the Apple Silicon runner where applicable (they are Node.js workloads).
- **FR-010**: The `review-router.yml` workflow MUST be migrated to the Apple Silicon runner (currently runs on `arc-runner-set`).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Total CI wall-clock time for a standard PR (tests + SonarQube + schema contract) is reduced by at least 30% compared to the current baseline.
- **SC-002**: Tests execute exactly once per PR across all CI workflows (zero duplicate test runs).
- **SC-003**: Cached dependency restoration completes in under 30 seconds on cache-hit runs.
- **SC-004**: All existing CI checks (test gate, SonarQube, schema contract) continue to report correct pass/fail status after the migration.
- **SC-005**: No regressions in test results — all tests that pass on the current runner also pass on the Apple Silicon runner.

## Clarifications

### Session 2026-03-09

- Q: What is the OS of the Apple Silicon runner? → A: macOS 15.6.1 (Apple Silicon Mac hardware)
- Q: What is the GitHub Actions runner label for the Apple Silicon runner? → A: Tags are `self-hosted`, `macOS`, `ARM64`, `apple-silicon`, `m4`
- Q: How should the unified test + SonarQube flow be structured? → A: Single workflow file with two jobs (`test` → `sonarqube`) connected via artifact upload/download
- Q: Should the SonarQube analysis job run on Apple Silicon or Linux? → A: Apple Silicon runner; SonarScanner has native ARM64 support
- Q: How should CI handle concurrency with Apple Silicon runners? → A: Multiple Apple Silicon runners are provisioned for parallel PR builds
- Q: Should `review-router.yml` also be migrated to Apple Silicon? → A: Yes, migrate it alongside the other `arc-runner-set` workflows
- Q: Cache key strategy: per-branch only or with cross-branch fallback? → A: Per-branch with fallback restore key from `develop`
- Q: Should `build-release-docker-hub-new.yml` be renamed after removing the legacy workflow? → A: Yes, rename to `build-release-docker-hub.yml`

## Assumptions

- The Apple Silicon runner pool consists of **multiple runners** already provisioned and registered with GitHub Actions, running **macOS 15.6.1** on Apple Silicon (M4) hardware, and accessible via runner labels: `self-hosted`, `macOS`, `ARM64`, `apple-silicon`, `m4` (as set up in infrastructure-provisioning PR #13). Multiple concurrent PR builds are supported natively.
- The project's Node.js dependencies and native modules are compatible with ARM64/macOS (Apple Silicon). Node.js 22 LTS and pnpm support ARM64 natively.
- Container-based GitHub Actions are not available on macOS runners; all actions used in migrated workflows must be JavaScript/composite actions or direct shell steps.
- SonarQube scanner (SonarScanner) has native ARM64 support and runs on macOS Apple Silicon.
- The `arc-runner-set` label currently used in workflows will be replaced with `[self-hosted, macOS, ARM64, apple-silicon, m4]`.
- Docker release workflows must remain on Linux runners because they build Linux container images.
- The `build-release-docker-hub-new.yml` workflow is the intended replacement for `build-release-docker-hub.yml` and produces equivalent or better output. After removal of the legacy file, the newer workflow will be renamed to `build-release-docker-hub.yml`.
