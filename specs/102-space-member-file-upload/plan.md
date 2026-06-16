# Implementation Plan: Space Member File Upload for Callout Creation

**Branch**: `102-space-member-file-upload` | **Date**: 2026-06-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/102-space-member-file-upload/spec.md`

## Summary

When a Space's settings allow members to create callouts, those members must also be
able to upload files to the Space's shared storage location — the place where new
callout content (e.g. description images) is held before the callout's own storage
exists. Today members can be granted the ability to *create* a callout without the
matching ability to *upload* the files that callout contains, so the create flow
fails mid-way with a permission error.

The technical approach is authorization-only: when the Space authorization policy is
(re)computed, and only when the "members may create callouts" setting is enabled,
grant the file-upload capability on the Space's shared storage to the same set of
actors who may create callouts. The Space's shared storage is concretely the **Space
profile's storage bucket** (`space.profile.storageBucket`), so the grant is injected
via the Space profile authorization step and cascades to that bucket. This mirrors the
existing pattern that grants the "create subspace" capability to members when "members
may create subspaces" is enabled. No schema, migration, GraphQL contract, or
storage-mechanism change is required.

## Technical Context

**Language/Version**: TypeScript 5.3 on Node.js 22 LTS (Volta-pinned 22.21.1)

**Primary Dependencies**: NestJS 10, TypeORM 0.3 (custom fork `pkg.pr.new/antst/typeorm`), Apollo Server 4, GraphQL 16

**Storage**: PostgreSQL 17.5 — **no schema changes**. The change only affects the
in-database authorization policy JSON that is recomputed by the authorization-reset
engine; no DDL, no migration.

**Testing**: Vitest 4.x — unit specs alongside the affected authorization services
(`*.service.authorization.spec.ts`)

**Target Platform**: Linux server (NestJS GraphQL API)

**Project Type**: Single project (web service backend)

**Performance Goals**: No measurable change. The grant adds at most one credential
rule to the Space-level storage policy; it is computed during the existing
authorization reset and does not add runtime cost on the upload path beyond the
normal rule evaluation.

**Constraints**: Authorization correctness and scoping — the grant MUST be gated by
the Space setting, MUST be scoped to the Space whose setting enables it (and each
subspace governed by its own setting), and MUST NOT escalate privileges for actors
who may not create callouts. Effective only after the Space's authorization is
recomputed.

**Scale/Scope**: Affects every Space whose "members may create callouts" setting is
enabled. One source file plus a constant; one unit-test assertion area.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **1. Domain-Centric Design First** — PASS. The change lives in the domain
  authorization services (`src/domain/space/...` and `src/domain/storage/...`); no
  business logic is added to resolvers or controllers.
- **2. Modular NestJS Boundaries** — PASS. No new modules and no service signature
  changes; the gated rule is passed into the existing `credentialRulesFromParent`
  argument of the profile authorization service the Space authorization service
  already depends on. No new cross-module coupling or circular dependency.
- **3. GraphQL Schema as Stable Contract** — PASS. No schema change. The
  `uploadFileOnStorageBucket` mutation and all types are untouched; only the
  computed authorization policy that the existing privilege check reads changes.
- **4. Explicit Data & Event Flow** — PASS. The write path (file upload) keeps its
  validation → authorization → domain operation ordering; this feature only widens
  *who passes* the authorization step under a specific Space setting.
- **5. Observability & Operational Readiness** — PASS. Authorization decisions are
  already logged by the central authorization service on denial; no new silent
  failure path. No new metrics/dashboards introduced.
- **6. Code Quality with Pragmatic Testing** — PASS. Risk-based unit tests assert
  the grant appears only when the setting is on, is correctly scoped, and is absent
  when off. No snapshot/placeholder tests.
- **7. API Consistency & Evolution Discipline** — PASS. No API naming/shape change.
- **8. Secure-by-Design Integration** — PASS. Input still traverses the centralized
  authorization layer. The grant is deliberately minimal (file-upload capability
  only) and conditional on an existing, audited Space setting; no privilege
  escalation outside that condition.
- **9. Container & Deployment Determinism** — PASS. No env/config/runtime-flag
  change; behavior is driven by the existing database-stored Space setting.
- **10. Simplicity & Incremental Hardening** — PASS. Smallest viable change that
  reuses the established "members may create subspaces" grant pattern; no new
  abstractions.

**Result**: All gates pass. No entries required in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/102-space-member-file-upload/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── authorization-contract.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── common/constants/authorization/
│   └── credential.rule.constants.ts          # add a named constant for the new rule
└── domain/space/space/
    ├── space.service.authorization.ts        # compute the gated member file-upload rule and pass it into the Space profile authorization cascade
    └── space.service.authorization.spec.ts   # assert gating, scoping, target bucket, and absence-when-off
```

**Structure Decision**: Single-project backend. The change is confined to the
authorization computation in the Space authorization service plus one constants file.
The Space authorization service already owns the Space settings, the member credential
criteria, and the call that drives the Space profile authorization cascade — so it is
the correct owner of both the gating decision and the injection point. The rule is
handed to the existing `credentialRulesFromParent` parameter of the profile
authorization service and cascades to `space.profile.storageBucket`. No change to the
storage-aggregator authorization service is required.

## Complexity Tracking

> No constitution violations. Section intentionally empty.
