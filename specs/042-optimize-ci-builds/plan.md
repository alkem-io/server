# Implementation Plan: Optimize CI Builds

**Branch**: `042-optimize-ci-builds` | **Date**: 2026-03-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/042-optimize-ci-builds/spec.md`

## Summary

Optimize CI builds by: (1) ~~eliminating duplicate test execution~~ (DONE — `ci-tests.yml` now contains unified `test` → `sonarqube` jobs; `trigger-sonarqube.yml` was merged and deleted), (2) migrating Node.js-based CI workflows from `arc-runner-set` to Apple Silicon runners (`[self-hosted, macOS, ARM64, apple-silicon, m4]`), (3) adding pnpm store and TypeScript build output caching with per-branch keys and `develop` fallback, and (4) ~~removing the legacy Docker release workflow~~ (DONE — only `build-release-docker-hub.yml` remains).

## Technical Context

**Language/Version**: GitHub Actions YAML workflows (no application code changes)
**Primary Dependencies**: `actions/checkout@v4`, `pnpm/action-setup@v4`, `actions/setup-node@v6.2.0`, `actions/cache@v4`, `actions/upload-artifact@v4`, `actions/download-artifact@v4`, `sonarsource/sonarqube-scan-action@v7` (Node.js action, macOS-compatible), `sonarsource/sonarqube-quality-gate-action@v1` (composite action, macOS-compatible)
**Storage**: N/A
**Testing**: Validated by triggering CI on PRs and verifying correct execution
**Target Platform**: GitHub Actions runners — Apple Silicon (macOS 15.6.1, ARM64) for Node.js workflows; `ubuntu-latest` for Docker/K8s workflows
**Project Type**: CI/CD configuration (workflow YAML files only)
**Performance Goals**: ≥30% reduction in CI wall-clock time; cached dependency restore <30s; zero duplicate test runs
**Constraints**: macOS runners do not support Docker container actions (but all actions used are Node.js or composite — no Docker actions remain); Docker release and K8s deploy workflows must remain on Linux runners
**Scale/Scope**: 8 workflow files total; 4 files to modify (runner migration + caching), completed items: `trigger-sonarqube.yml` merged into `ci-tests.yml` and deleted, `build-release-docker-hub-new.yml` renamed to `build-release-docker-hub.yml`

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| 1. Domain-Centric Design | N/A | No domain code changes |
| 2. Modular NestJS Boundaries | N/A | No module changes |
| 3. GraphQL Schema as Stable Contract | N/A | No schema changes |
| 4. Explicit Data & Event Flow | N/A | No data flow changes |
| 5. Observability & Operational Readiness | PASS | CI produces same observable signals (test results, coverage, SonarQube reports) |
| 6. Code Quality with Pragmatic Testing | PASS | Test execution is preserved; coverage artifact shared between CI gate and SonarQube |
| 7. API Consistency & Evolution | N/A | No API changes |
| 8. Secure-by-Design Integration | PASS | Secrets usage unchanged; self-hosted runners use same security model |
| 9. Container & Deployment Determinism | PASS | Docker workflows remain on Linux; deterministic builds preserved |
| 10. Simplicity & Incremental Hardening | PASS | Consolidating workflows reduces complexity |

**Gate result**: PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/042-optimize-ci-builds/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── quickstart.md        # Phase 1 output (verification guide)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
.github/workflows/
├── ci-tests.yml                         # DONE: Unified test→sonarqube workflow; REMAINING: add caching, migrate runner
├── build-release-docker-hub.yml         # DONE: Sole Docker release workflow (legacy deleted, -new renamed)
├── schema-contract.yml                  # MODIFY: Migrate runner to Apple Silicon
├── schema-baseline.yml                  # MODIFY: Migrate runner to Apple Silicon
├── review-router.yml                    # MODIFY: Migrate runner to Apple Silicon
├── build-deploy-k8s-dev-hetzner.yml     # NO CHANGE: Stays on ubuntu-latest
├── build-deploy-k8s-sandbox-hetzner.yml # NO CHANGE: Stays on ubuntu-latest
└── build-deploy-k8s-test-hetzner.yml    # NO CHANGE: Stays on ubuntu-latest
```

**Structure Decision**: This is a CI-only change. All modifications are to GitHub Actions workflow YAML files under `.github/workflows/`. No application source code (`src/`) is changed.

## Complexity Tracking

No constitution violations — table not needed.
