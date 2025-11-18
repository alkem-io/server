# Feature Specification: SonarQube Static Analysis Integration

**Feature Branch**: `015-sonarqube-analysis`
**Created**: 2025-11-13
**Status**: Draft
**Input**: User description: "do a static code analysis build with sonarqube at https://sonarqube.alkem.io"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Developer sees PR quality gate (Priority: P1)

A contributor pushing a branch or opening a pull request needs the pipeline to run static analysis and surface the quality gate result before merge.

**Why this priority**: Without automated feedback on code health, teams may merge regressions that raise long-term risk; this story guards every change.

**Independent Test**: Trigger a single pull-request build and confirm the SonarQube quality gate result is published back to the pull request status with no additional features.

**Acceptance Scenarios**:

1. **Given** a developer opens a pull request against the default branch, **When** the CI pipeline runs, **Then** the SonarQube analysis executes and its pass/fail status appears on the pull request checks.
2. **Given** the analysis identifies a quality gate failure, **When** the pipeline completes, **Then** the pull request is marked as failing until the quality gate passes.

---

### User Story 2 - Release manager monitors main branch trend (Priority: P2)

A release manager needs to review the latest analysis snapshots on the SonarQube dashboard to confirm the develop branch stays within quality guardrails before a release cut.

**Why this priority**: Proactive visibility into code health reduces release risk and avoids emergency fixes after deployment.

**Independent Test**: Run the analysis on the develop branch and confirm the metrics and quality gate history are visible on the SonarQube project dashboard with no integration to other systems required.

**Acceptance Scenarios**:

1. **Given** the develop branch pipeline completes, **When** the release manager opens the SonarQube project at https://sonarqube.alkem.io, **Then** they see up-to-date metrics (coverage, bugs, vulnerabilities) for the branch within the same business day.

---

### User Story 3 - DevOps secures SonarQube credentials (Priority: P3)

The DevOps engineer must provision and rotate SonarQube authentication tokens without exposing them in source control so that automated analysis remains authorized.

**Why this priority**: Credential hygiene is essential to prevent unauthorized access to the analysis service and to keep builds functioning.

**Independent Test**: Rotate the token once, update the pipeline configuration, and confirm analysis still runs with secrets kept in the secure store.

**Acceptance Scenarios**:

1. **Given** a token rotation request, **When** the engineer updates the secrets store and triggers a build, **Then** the build uses the new token and the previous token is invalidated within 1 hour.

---

### Edge Cases

- SonarQube is unreachable during a build; the pipeline fails fast with a clear retry path and guidance.
- Multiple concurrent branch analyses run; the pipeline queues or parallelizes without exceeding SonarQube rate limits.
- The project key is missing or mismatched; the build surfaces a configuration error rather than silently skipping analysis.
- Analysis hits the default quality gate but local rules diverge; the team follows a documented process for reconciling rule discrepancies.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The CI pipeline MUST trigger a SonarQube analysis for every pull request targeting this repository.
- **FR-002**: The quality gate outcome MUST be reported back to the originating workflow (e.g., pull request checks, pipeline status) within the same run.
- **FR-003**: Authorized users MUST be able to access the SonarQube project dashboard at https://sonarqube.alkem.io to review metrics, issues, and historical trends.
- **FR-004**: Analysis MUST enforce the organization's agreed quality gate (coverage, bugs, vulnerabilities, code smells) and fail builds that do not meet thresholds.
- **FR-005**: SonarQube credentials and project keys MUST be stored in the approved secrets manager and rotated without code changes.
- **FR-006**: Documentation MUST guide contributors on how to trigger or troubleshoot analysis locally when feasible and where to find analysis results.

### Key Entities _(include if feature involves data)_

- **SonarQube Project**: Represents the codebase snapshot held on https://sonarqube.alkem.io; includes project key, quality gate configuration, and metric history per branch.
- **Analysis Run**: A single execution of static analysis; captures timestamp, triggering branch, metrics collected, and quality gate status.
- **Quality Gate Status**: The pass/fail signal returned to CI workflows; includes blocking conditions and links back to the corresponding analysis run.

## Assumptions

- The SonarQube instance at https://sonarqube.alkem.io is accessible from CI runners and already licensed for the necessary features.
- A dedicated SonarQube project (or the ability to create one) exists for this repository, including the desired quality gate configuration.
- CI infrastructure can expose secret values via an approved secrets manager without storing them in the repository.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of pull request builds complete SonarQube analysis and publish a quality gate status within 10 minutes of pipeline start.
- **SC-002**: 100% of builds with failing quality gates still allow merges, but surface a clear failed status that must be explicitly acknowledged during release decisions.
- **SC-003**: Release managers can view develop-branch SonarQube dashboards within the same business day for every successful develop build, with no missing data intervals.
- **SC-004**: Documentation receives positive confirmation from at least two developers in sprint review that they can locate and interpret SonarQube results without additional guidance.

## Clarifications

### Session 2025-11-14

- Q: How strict should the SonarQube quality gate be in terms of blocking merges?  A: SonarQube provides warnings only, no hard blocking.
