# Implementation Plan: Notification Email Blacklist

**Branch**: `015-notification-email-blacklist` | **Date**: 2025-11-19 | **Spec**: [Specification](./spec.md)
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add a platform-level blacklist of fully qualified email addresses that mirrors the `iframeAllowedUrls` structure, exposes add/remove mutations with platform-admin authorization, enforces lowercased canonical storage up to 250 entries, and publishes the authoritative list via GraphQL so downstream notification services can consume it as a configuration input.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.x on Node.js 20 (NestJS server)
**Primary Dependencies**: NestJS GraphQL stack, TypeORM repositories, PlatformSettingsService, class-validator
**Storage**: MySQL 8 via TypeORM (platform settings table holds serialized integration config)
**Testing**: Jest (unit + integration), potential contract tests via existing GraphQL suites
**Target Platform**: Linux containerized server (same deployment as existing API)
**Project Type**: Single back-end service (`src` monolith)
**Performance Goals**: GraphQL read within 1s for ≤100 entries to support downstream sync cadence
**Constraints**: Blacklist capped at 250 entries; platform remains source-of-truth config only (no direct suppression logic); follow existing resolver/service boundaries
**Scale/Scope**: Platform-scoped admins only; single list shared across entire platform (no per-community overrides)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Principle 1**: Blacklist validation/mutation logic resides in platform settings domain services, while enforcement remains with downstream notification microservices to avoid leaking business rules into resolvers.
- **Principle 5**: Rely on existing audit logging for mutation activity; no new suppression metrics added because this feature is configuration-only.
- **Principle 6**: Add unit tests for blacklist validators plus integration tests confirming GraphQL mutations/queries manage the array correctly; downstream enforcement tests remain out of scope.

_Post-Phase-1 Revalidation_: Domain rules remain in `PlatformSettingsService`, observability relies on existing audit logs for admin actions, and planned unit + integration coverage still addresses the risk surface—no constitution violations detected.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

ios/ or android/

```text
src/
├── domain/
│   └── platform-settings/         # value objects for settings validation (if needed)
├── platform/
│   ├── platform-settings/         # integration settings + DTOs
│   └── platform/                  # GraphQL resolvers (mutations)
├── services/
│   └── configuration/             # any shared config loaders (if touched)
└── common/                        # shared validation utilities

test/
├── integration/platform/          # GraphQL mutation/query coverage
└── unit/platform-settings/        # validator + service tests
```

**Structure Decision**: Single NestJS service; work concentrates in `src/platform/platform-settings` and `src/platform/platform` (GraphQL resolvers + DTOs) with corresponding unit and integration tests under `test/`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
