# Feature Specification: K8s Deployment Pipeline with Dual Docker Images

**Feature Branch**: `081-k8s-deploy-pipeline`
**Created**: 2026-03-19
**Status**: Draft
**Input**: User description: "Build two Docker images (runtime distroless + migration), update GitHub Actions to latest versions, runners to m4 tag, stable k8s deployment process for testing and staging environments."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Safe Automatic Deployment to Development (Priority: P1)

A developer merges a pull request into the development branch. The CI pipeline automatically builds both the runtime and migration images, tags them with the commit SHA, runs the database migration job against the development cluster, waits for it to complete, and only then deploys the new service version. If the migration fails, the pipeline halts and the running service version is not replaced.

**Why this priority**: This is the daily workflow for the team and the foundation on which all other environments build. Getting this right first ensures correctness of the pattern before applying it to higher environments.

**Independent Test**: Can be fully tested by merging a commit to the development branch and verifying that two distinct images appear in the registry, the migration job completes before the deployment rolls out, and a deliberate migration failure prevents the deployment from proceeding.

**Acceptance Scenarios**:

1. **Given** a commit is merged to the development branch, **When** the pipeline runs, **Then** two images are pushed to the registry — one tagged `alkemio-server:<sha>` and one tagged `alkemio-server-migration:<sha>`
2. **Given** both images are built, **When** the migration job runs, **Then** the deployment job does not start until the migration job reports success
3. **Given** the migration job fails, **When** the deploy job evaluates its dependency, **Then** the deploy job is skipped and the currently running service version remains unchanged
4. **Given** the migration job succeeds, **When** the deploy job runs, **Then** the k8s deployment is updated to reference the new runtime image SHA tag

---

### User Story 2 - Manual Deployment to the Testing Environment (Priority: P2)

A DevOps engineer manually triggers a deployment to the testing environment for a specific commit or branch. The pipeline follows the same build → migrate → deploy sequence, isolated to the testing cluster. No manual steps are required after triggering.

**Why this priority**: The testing environment is the primary validation gate before staging. It must reliably demonstrate that the deployment sequence is correct before promoting to higher environments.

**Independent Test**: Can be fully tested by triggering the workflow against the testing environment and confirming the three-phase sequence completes end-to-end, with the migration image used for the migration phase and the runtime image for the service deployment.

**Acceptance Scenarios**:

1. **Given** a DevOps engineer triggers the testing deployment workflow, **When** the build phase runs, **Then** both images are built and pushed with the triggering commit SHA
2. **Given** the migration phase runs, **When** a previous migration job exists, **Then** it is replaced without error before the new job starts
3. **Given** the migration completes successfully, **When** the deploy phase runs, **Then** the service is updated only in the testing cluster

---

### User Story 3 - Manual Deployment to Staging (Priority: P3)

A DevOps engineer promotes a tested version to the staging environment by manually triggering the staging workflow. The same build → migrate → deploy sequence applies, and the staging environment receives identical images to those validated in testing.

**Why this priority**: Staging is the final validation environment. Consistency of the deployment process across environments is critical.

**Independent Test**: Can be fully tested by triggering the staging deployment workflow and verifying it targets only the staging cluster with the correct images.

**Acceptance Scenarios**:

1. **Given** the staging deployment is triggered, **When** the workflow runs, **Then** it uses the staging cluster credentials and does not affect other environments
2. **Given** a migration has been run successfully in a lower environment, **When** the staging migration runs the same migration, **Then** the migration is idempotent and completes successfully

---

### User Story 4 - Minimal and Hardened Runtime Image (Priority: P1)

The built runtime image contains only the compiled application and its runtime dependencies. It uses a distroless base image, meaning it has no shell, no package manager, and no OS utilities — reducing the attack surface to only the application binary.

**Why this priority**: Security posture is a baseline requirement, and distroless images are an industry standard for production-grade containers. This story is P1 because it shapes the Dockerfile architecture that all other stories depend on.

**Independent Test**: Can be tested by inspecting the final runtime image layers and confirming there is no shell binary, no package manager, and that the image size is significantly smaller than the current single-stage build.

**Acceptance Scenarios**:

1. **Given** the runtime image is built, **When** a shell execution is attempted inside the container, **Then** there is no shell available and the command fails
2. **Given** the runtime image is built, **When** the container starts, **Then** it successfully runs the compiled application entry point
3. **Given** the runtime and migration images are both built, **When** their sizes are compared, **Then** the runtime image is smaller than the current single-stage image

---

### Edge Cases

- What happens when the migration job is still running from a previous deployment when a new deployment is triggered?
- What happens when the migration job completes with partial failure (some migrations applied, some failed)?
- What happens if the registry push succeeds for the runtime image but fails for the migration image?
- How does the system behave if the k8s migration job cannot be deleted (e.g., permission issues)?
- What happens if the migration image is deployed to k8s but the cluster cannot pull it (image pull secret missing or expired)?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The build pipeline MUST produce two distinct container images per build: a runtime image for running the service, and a migration image for running database migrations.
- **FR-002**: The runtime container image MUST use a distroless base image that excludes a shell, package managers, and non-runtime OS binaries.
- **FR-003**: The migration container image MUST contain all tooling required to execute database schema migrations without depending on the runtime image.
- **FR-004**: Both images MUST share the same commit SHA as their image tag so that the runtime and migration images always correspond to the same codebase version.
- **FR-005**: Database migrations MUST complete successfully before the new service version is deployed to any environment.
- **FR-006**: If the migration job fails, the pipeline MUST stop and the currently running service version MUST NOT be replaced.
- **FR-007**: The migration job in k8s MUST run as a one-time Job that terminates when complete, not as a recurring scheduled process.
- **FR-008**: The pipeline MUST delete any pre-existing completed migration job before creating a new one, to prevent job name conflicts.
- **FR-009**: All GitHub Actions in all deployment workflows MUST use their latest stable pinned versions.
- **FR-010**: All CI/CD workflow jobs MUST run on self-hosted runners tagged `m4`.
- **FR-011**: The development environment workflow MUST trigger automatically on every push to the development branch.
- **FR-012**: The testing and staging environment workflows MUST be triggerable manually via workflow dispatch.
- **FR-013**: Each environment workflow MUST be isolated — a deployment to one environment MUST NOT affect any other environment's cluster, credentials, or running services.
- **FR-014**: The DockerHub release workflow MUST be updated to build and publish both the runtime and migration images with consistent tags.

### Scope Notes

- **In scope**: dev (auto-deploy), testing, and staging environments.
- **Out of scope**: Production environment — deferred to a future feature.
- The "testing" environment corresponds to the existing Hetzner test cluster.
- The "staging" environment corresponds to the existing Hetzner sandbox cluster.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A deployment to any in-scope environment, once triggered, completes the full build → migrate → deploy sequence without any manual intervention.
- **SC-002**: A deliberate migration failure results in the pipeline stopping before the deploy phase, with the live service unaffected.
- **SC-003**: The runtime container image is smaller than the current single-stage build image (expected reduction: ≥40%).
- **SC-004**: The pipeline can be re-triggered on the same commit without manual cleanup of prior migration jobs or image tags.
- **SC-005**: All three in-scope environments (dev, testing, staging) have independently operable deployment workflows that share the same pipeline structure.
- **SC-006**: The runtime image contains no shell binaries or package manager tools.
- **SC-007**: Both images are visible in the container registry with matching commit SHA tags after every successful build.

## Assumptions

- The container registry already exists and registry credentials are available as GitHub secrets.
- The k8s clusters for dev, testing, and staging (Hetzner) already have the required configuration and secrets in place.
- Self-hosted runners tagged `m4` are already provisioned and available to the GitHub Actions workflows in this repository.
- Database migrations are idempotent — re-running a completed migration does not corrupt data.
- The migration tooling produces a non-zero exit code on failure, which k8s Jobs will correctly interpret as failure.
- The DockerHub release workflow is used for public releases and must be updated to publish both images.

## Dependencies

- Self-hosted GitHub Actions runners with tag `m4` must be available before this feature can be verified end-to-end.
- The existing k8s CronJob-based migration approach will be replaced by a one-time Job that references the dedicated migration image.
