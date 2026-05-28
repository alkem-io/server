# Implementation Plan: Callout Introduction Gating for Collabora Document by License Entitlement

**Branch**: `002-office-docs-gating` | **Date**: 2026-04-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-office-docs-gating/spec.md`

## Summary

Block introduction of a Collabora Document into a Collaboration whose license does not include the `SPACE_FLAG_OFFICE_DOCUMENTS` entitlement. The gate covers both forms — `CalloutFramingType.COLLABORA_DOCUMENT` and `CalloutContributionType.COLLABORA_DOCUMENT` — and is enforced at four GraphQL mutation entry points: `createCalloutOnCalloutsSet`, `createContributionOnCallout`, `moveContributionToCallout`, and `updateCollaborationFromSpaceTemplate`. Multi-callout operations (template apply) fail atomically when any introduced item is a Collabora Document and the target is unentitled. Move operations are evaluated against the target Collaboration only. Errors return a unified user-facing message; internally two distinct exception types separate "absent" (warn) from "unevaluable" (error). No schema changes.

Approach: reuse the existing `LicenseService.isEntitlementEnabledOrFail` primitive at each gated resolver call site (consistent with how role-set / VC entitlements are gated today), with a thin helper on `CollaborationLicenseService` that resolves a Collaboration's license from any of (CalloutsSet ID | Callout ID | Collaboration ID) and applies the Office Docs check. Add one new exception type for fail-closed (license unevaluable). For template-apply, perform a pre-flight scan of the template body before persistence (in `template.applier.service.ts`, before any persistence call, per research §R5).

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 22 LTS (Volta-pinned 22.21.1)
**Primary Dependencies**: NestJS 10, TypeORM 0.3 (custom fork `pkg.pr.new/antst/typeorm`), Apollo Server 4, GraphQL 16, Winston, Elastic APM
**Storage**: PostgreSQL 17.5 (no schema changes — read-only against `license` + `license_entitlement` rows already on Collaboration)
**Testing**: Vitest 4.x — unit (`*.spec.ts`) for the new gating helper and exception classes, integration (`*.it-spec.ts`) for the four gated mutations end-to-end
**Target Platform**: Linux server (existing deployment)
**Project Type**: single (server)
**Performance Goals**: gate adds < 5 ms p95 per gated mutation against an already-loaded license object (SC-004). The check is a synchronous in-memory boolean read; license loading cost is unchanged from current behavior.
**Constraints**: fail-closed when license cannot be evaluated; gate at GraphQL mutation entry only (no RabbitMQ, scheduled job, or migration coverage); no platform-admin bypass; unified user-facing error message; warn log on absent / error log on unevaluable.
**Scale/Scope**: ~4 mutations modified, 1 new exception class, 1 new helper method on `CollaborationLicenseService`, ~6–8 new acceptance tests. No new modules. No GraphQL schema additions.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
| --- | --- | --- |
| 1. Domain-Centric Design First | ✅ | Gate logic placed in `CollaborationLicenseService` (domain layer), called from resolver mutations. Resolvers do not embed business rules. |
| 2. Modular NestJS Boundaries | ✅ | Reuses existing `LicenseModule`, `CollaborationModule`. No new modules introduced. |
| 3. GraphQL Schema as Stable Contract | ✅ | Zero schema changes (no new types, fields, args, deprecations). Behavior change only. `pnpm run schema:diff` should report no diff. |
| 4. Explicit Data & Event Flow | ✅ | Gate runs at `validation → authorization → entitlement → domain operation` order. No new events; no inline side effects. |
| 5. Observability & Operational Readiness | ✅ | FR-010: **debug** on allowed (license-check decision-point as required by principle 5), **warn** on entitlement-absent, **error** on fail-closed; structured context (`{ collaborationId }`) without user data; exception messages and log identifiers are immutable, dynamic data lives in `details` payload. |
| 6. Code Quality with Pragmatic Testing | ✅ | Risk-based: unit tests for the helper + exception classes; integration tests for each of the four gated mutations covering allowed/blocked. Skip resolver-pass-through duplicates. |
| 7. API Consistency & Evolution Discipline | ✅ | Reuses `LicenseEntitlementNotAvailableException` naming pattern for the new fail-closed exception (consistent with existing entitlement exception family). |
| 8. Secure-by-Design Integration | ✅ | The whole feature is a license check before paid-resource mutations — directly satisfies this principle. |
| 9. Container & Deployment Determinism | ✅ | No infra / image changes. |
| 10. Simplicity & Incremental Hardening | ✅ | Reuses existing `LicenseService.isEntitlementEnabledOrFail`; one helper, one exception, four call sites. No new abstractions. |

No violations. **Complexity Tracking section omitted** (no justified deviations).

## Project Structure

### Documentation (this feature)

```text
specs/002-office-docs-gating/
├── plan.md              # This file
├── research.md          # Phase 0 — gate-placement, license-loading, exception design
├── data-model.md        # Phase 1 — entities the gate traverses (no DDL changes)
├── quickstart.md        # Phase 1 — local verification recipe
├── contracts/
│   └── gating-behavior.md  # Mutation-level error contract (no GraphQL schema changes)
├── checklists/          # (existing)
└── tasks.md             # Phase 2 (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── common/
│   └── exceptions/
│       └── license.entitlement.unevaluable.exception.ts   # NEW (FR-008 fail-closed)
├── domain/
│   ├── collaboration/
│   │   ├── collaboration/
│   │   │   ├── collaboration.service.license.ts           # +ensureOfficeDocsAllowedFor*() helpers
│   │   │   └── collaboration.license.module.ts            # NEW (only if T019 detects a circular dep): leaf module that exports CollaborationLicenseService without pulling in the full CollaborationModule — see T019 for the trigger condition
│   │   ├── callouts-set/
│   │   │   └── callouts.set.resolver.mutations.ts         # gate createCalloutOnCalloutsSet
│   │   ├── callout/
│   │   │   └── callout.resolver.mutations.ts              # gate createContributionOnCallout
│   │   └── callout-contribution/
│   │       └── callout.contribution.move.resolver.mutations.ts  # gate moveContributionToCallout
│   └── template/
│       └── template-applier/
│           └── template.applier.service.ts                # gate updateCollaborationFromSpaceTemplate (pre-flight scan, before any persistence — research §R5)
└── (no migrations, no schema changes)

test/functional/integration/
└── collaboration/
    └── office-docs-gating.it-spec.ts                      # NEW — covers all four gated mutations
```

**Structure Decision**: Single-project (server). All edits land within existing `src/domain/*` modules; one new exception under `src/common/exceptions/`. No new modules, no migrations, no schema changes.

## Complexity Tracking

_No constitution violations to justify — section omitted._
