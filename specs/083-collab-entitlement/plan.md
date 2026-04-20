# Implementation Plan: Collaboration-Level "Office Documents" Entitlement

**Branch**: `083-collab-entitlement` | **Date**: 2026-04-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/083-collab-entitlement/spec.md`

## Summary

Add a new credential-based licensing entitlement `SPACE_FLAG_OFFICE_DOCUMENTS` at the Collaboration level, following the exact pattern already established by `SPACE_FLAG_MEMO_MULTI_USER`. The feature delivers pure plumbing: a new entitlement enum value, a new credential type, a new credential rule in the single platform-wide License Policy, a new License Plan, and the switch/case wiring in Space and Collaboration license services so the entitlement propagates from the L0 Space down through sub-spaces and into every contained Collaboration. A TypeORM migration updates the existing `license_policy.credentialRules` jsonb column and inserts the new `license_plan` row; the bootstrap JSON is kept in sync. No runtime consumer of the entitlement is added (explicitly out of scope — follow-up feature).

Technical approach is "mirror the memo multi-user precedent end-to-end". Every file currently referencing `SPACE_FLAG_MEMO_MULTI_USER` gets a parallel edit adding `SPACE_FLAG_OFFICE_DOCUMENTS`; no new architectural elements are introduced.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 22 LTS (Volta pinned 22.21.1)
**Primary Dependencies**: NestJS 10, TypeORM 0.3 (custom fork `pkg.pr.new/antst/typeorm`), Apollo Server 4, GraphQL 16
**Storage**: PostgreSQL 17.5 — existing `license_plan` table (row insert) and existing `license_policy` table (jsonb column update); no schema DDL
**Testing**: Vitest 4.x — extend existing `*.license.spec.ts` unit suites; no new test harness
**Target Platform**: Linux server (containerized, existing deploy path)
**Project Type**: Single NestJS backend (monorepo root = `server/`)
**Performance Goals**: None beyond existing licensing framework; migration executes two SQL statements (INSERT + UPDATE) with O(1) cost
**Constraints**: Migration MUST be idempotent and reversible; MUST NOT touch any Space-level data; MUST NOT trigger a license-policy reapplication; bootstrap JSON MUST stay in sync with migration so fresh installs and upgrades converge
**Scale/Scope**: One new enum value in each of two enums; one new CredentialRule entry in a single jsonb column; one new license_plan row; ~6 file edits in `src/` plus one new migration file and one bootstrap JSON edit

**No NEEDS CLARIFICATION remain.** All four clarification questions from `/speckit.clarify` were resolved (see `spec.md` → Clarifications section).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Evaluated against `.specify/memory/constitution.md` v2.0.0:

| # | Principle | Verdict | Notes |
|---|-----------|---------|-------|
| 1 | Domain-Centric Design First | **PASS** | All changes live in `src/domain/*` (collaboration, space) and `src/common/enums/*`. No business logic added to controllers or resolvers. |
| 2 | Modular NestJS Boundaries | **PASS** | No new NestJS modules introduced. Existing `collaboration` and `space` modules are extended in-place; no new providers; no new cross-module dependencies. |
| 3 | GraphQL Schema as Stable Contract | **PASS (additive)** | Adds one new enum value (`SPACE_FLAG_OFFICE_DOCUMENTS`) to `LicenseEntitlementType`. Additive change, not breaking. `schema.graphql`, `schema-lite.graphql`, and `schema-baseline.graphql` must be regenerated and diffed; schema-baseline automation will pick up the change on merge to `develop`. |
| 4 | Explicit Data & Event Flow | **PASS** | No write path added; the migration is the only data mutation and it runs platform-scoped, not per-request. Existing license-policy application path is reused without change. |
| 5 | Observability & Operational Readiness | **PASS** | The licensing engine's existing debug logging on entitlement decisions is reused. No new metrics or dashboards added (per "instrument only what we ingest today"). Migration logs its own up/down steps via TypeORM's runner. |
| 6 | Code Quality with Pragmatic Testing | **PASS** | Tests added where they deliver signal: extend `space.service.license.spec.ts` and `collaboration.service.license.spec.ts` with the new enum value in the existing parameterized cases. No new harness. Manual end-to-end verification via the quickstart script (Phase 1) covers SC-008. |
| 7 | API Consistency & Evolution Discipline | **PASS** | New enum value follows existing naming convention (`SPACE_FLAG_*`). No naming convention violations; no impact on shared enums beyond the additive case. |
| 8 | Secure-by-Design Integration | **PASS** | No new external input. License-plan assignment continues to flow through the existing License Issuer, which already enforces admin-only access. |
| 9 | Container & Deployment Determinism | **PASS** | No container changes. Runtime behavior toggled purely via database (license plan assignment), per principle 9. |
| 10 | Simplicity & Incremental Hardening | **PASS** | This is the simplest viable implementation: mirror the existing `SPACE_FLAG_MEMO_MULTI_USER` precedent verbatim. No architectural escalation. |

**Architecture Standards check**: Migration is idempotent & reversible (Standard 3 ✓). Licensing decisions remain centralized in the license policy service (Standard 4 ✓). Schema baseline handled by post-merge automation (Standard 2 ✓).

**Verdict**: All gates pass. No violations to record in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/083-collab-entitlement/
├── plan.md                         # This file (/speckit.plan output)
├── spec.md                         # Feature specification (already present)
├── research.md                     # Phase 0 output — precedent analysis + decisions
├── data-model.md                   # Phase 1 output — enum additions, credential rule, license plan row
├── quickstart.md                   # Phase 1 output — three-phase manual verification
├── contracts/
│   └── graphql-schema-diff.md      # Phase 1 output — expected GraphQL schema delta
├── checklists/
│   └── requirements.md             # Quality checklist (already present)
└── tasks.md                        # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
server/
├── src/
│   ├── common/enums/
│   │   ├── license.entitlement.type.ts                 # EDIT: add SPACE_FLAG_OFFICE_DOCUMENTS
│   │   └── licensing.credential.based.credential.type.ts  # EDIT: add SPACE_FEATURE_OFFICE_DOCUMENTS
│   ├── domain/
│   │   ├── collaboration/collaboration/
│   │   │   ├── collaboration.service.ts                # EDIT: add entitlement to default init array
│   │   │   ├── collaboration.service.license.ts        # EDIT: add case to switch in extendLicensePolicy
│   │   │   └── collaboration.service.license.spec.ts   # EDIT: extend existing parameterized tests
│   │   ├── space/space/
│   │   │   ├── space.service.ts                        # EDIT: add entitlement to Space license init
│   │   │   ├── space.service.license.ts                # EDIT: add case to switch in extendLicensePolicy
│   │   │   └── space.service.license.spec.ts           # EDIT: extend existing parameterized tests
│   │   └── template/template-content-space/
│   │       └── template.content.space.service.ts       # EDIT: add entitlement to template default init
│   ├── core/bootstrap/platform-template-definitions/license-plan/
│   │   └── license-plans.json                          # EDIT: add SPACE_FEATURE_OFFICE_DOCUMENTS plan
│   └── migrations/
│       └── <timestamp>-add-office-documents-entitlement.ts  # NEW: append credential rule + insert license plan
├── schema.graphql                                      # REGENERATE (pnpm run schema:print)
├── schema-lite.graphql                                 # REGENERATE
└── schema-baseline.graphql                             # UPDATED BY AUTOMATION on merge to develop
```

**Structure Decision**: Single-project NestJS monorepo (existing `server/` root). No new packages, directories, or top-level modules. All edits land in files already present in the repo; one migration file is new.

## Complexity Tracking

No constitution violations. No deviations to justify.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| _(none)_  | _(n/a)_    | _(n/a)_                              |

## Phase 0 — Outline & Research

Output: [`research.md`](./research.md)

Research scope: identify every file and code path that references `SPACE_FLAG_MEMO_MULTI_USER` (the canonical precedent) and document the parallel edit required for `SPACE_FLAG_OFFICE_DOCUMENTS`. Additionally, confirm the exact migration pattern for updating the existing `license_policy.credentialRules` jsonb column without disturbing other rules.

## Phase 1 — Design & Contracts

Outputs:

- [`data-model.md`](./data-model.md) — enum additions, the new `CredentialRule` object shape, the new `license_plan` row shape, and the new entitlement initialization objects embedded in Space / Collaboration / Template services.
- [`contracts/graphql-schema-diff.md`](./contracts/graphql-schema-diff.md) — the expected additive delta to `LicenseEntitlementType` in the public GraphQL schema.
- [`quickstart.md`](./quickstart.md) — manual three-phase end-to-end verification matching the Desired Outcome (Definition of Done) in the spec.
- Agent context: run `.specify/scripts/bash/update-agent-context.sh claude` (done at end of this command).

## Post-Design Constitution Re-check

All Phase 1 artifacts confirm the plan stays within the mirror-the-precedent approach. No new technologies introduced; no new modules; no new integration surface. Re-check verdict: **all gates still pass**.
