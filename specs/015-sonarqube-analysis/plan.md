# Implementation Plan: SonarQube Static Analysis Integration

**Branch**: `001-sonarqube-analysis` | **Date**: 2025-11-14 | **Spec**: `specs/001-sonarqube-analysis/spec.md`
**Input**: Feature specification from `/specs/001-sonarqube-analysis/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Introduce a non-blocking SonarQube static analysis flow for this repository so that every pull request runs analysis on the changed code and reports a clear quality gate status to developers and release managers while keeping merge policy under team control.

At a high level the implementation will:

- Use the official SonarQube `trigger-sonarqube.yml` GitHub Actions template as the frame of reference for the CI job configuration.
- Wire CI jobs to call the existing SonarQube instance at https://sonarqube.alkem.io for every PR.
- Configure project keys, tokens, and branch mapping centrally via the CI secrets manager.
- Publish analysis status back to pull requests and maintain dashboards for the `develop` branch.
- Treat SonarQube as an advisory signal (warnings only, no hard merge blocking) but make failed gates highly visible in release decisions.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.x on Node.js 20 (per repository toolchain)
**Primary Dependencies**: NestJS server, existing CI runner stack, SonarQube at https://sonarqube.alkem.io
**Storage**: N/A (SonarQube stores analysis; server DB not impacted by this feature)
**Testing**: Jest test suites already in this repo; CI jobs extended to run analysis alongside tests
**Target Platform**: Linux-based CI runners executing pnpm workflows against this repository
**Project Type**: Backend service with CI pipeline integration
**Performance Goals**: SonarQube step should not add more than 5 minutes to the typical PR pipeline under normal load
**Constraints**: Analysis must run within CI timeouts; secrets must never be committed to the repo; SonarQube must be treated as warning-only (no hard merge gate)
**Scale/Scope**: Repository of ~3k TypeScript files; assume dozens of active PRs per week and daily `develop` runs

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Principle 1 — Domain-Centric Design First**: This feature operates purely in CI configuration and SonarQube integration; it does not introduce new business rules or touch `src/domain`. No violations expected.
- **Principle 5 — Observability & Operational Readiness**: We will rely on existing CI logs and SonarQube dashboards at https://sonarqube.alkem.io as the primary signals. No new application metrics will be added; any additional logging will be limited to CI step output and documented in the quickstart.
- **Principle 6 — Code Quality with Pragmatic Testing**: No new runtime code paths are added to the server. We will validate the integration with CI pipeline runs and, if needed, a lightweight script or documented manual check that verifies analysis status is reported correctly for a test PR. No Jest tests are required unless we introduce helper scripts in this repo.

## Project Structure

### Documentation (this feature)

```text
specs/001-sonarqube-analysis/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
  ... existing NestJS modules (no new source folders expected for this feature)

.github/
  workflows/
    sonar-*.yml           # New or updated CI workflow(s) invoking SonarQube

scripts/
  sonar/                  # (Optional) Helper scripts for Sonar integration if needed
```

**Structure Decision**: Reuse the existing single backend project layout. All changes are confined to CI configuration under `.github/workflows` and, optionally, a small `scripts/sonar` helper; no new runtime modules under `src/` are required.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
