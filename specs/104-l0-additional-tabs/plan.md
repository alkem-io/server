# Implementation Plan: Adding additional tabs in L0 space

**Branch**: `story/6177-adding-additional-tabs-in-l0-space` | **Date**: 2026-06-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/104-l0-additional-tabs/spec.md`

## Summary

Loosen the L0 (root space) InnovationFlow tab/state bounds so admins can add tabs beyond the fixed 4 — raising the L0 `maximumNumberOfStates` from 4 to 8 (the existing subspace maximum) while keeping `minimumNumberOfStates` at 4 so the first 4 phases stay fixed. The existing `createStateOnInnovationFlow` / `deleteStateOnInnovationFlow` mutations already enforce bounds generically, so they need no signature change — only the bounds they read change. Three code touch-points: (1) L0 creation in `space.service.ts` stops pinning max=4; (2) the Space-Template applier preserves the first 4 fixed states on L0 instead of replacing all; (3) an idempotent migration backfills `maximumNumberOfStates = 8` onto existing L0 spaces. Bound values become named constants to remove the scattered magic numbers. No GraphQL schema change expected.

## Technical Context

**Language/Version**: TypeScript 5.3 on Node.js 22 LTS (Volta-pinned 22.21.1)

**Primary Dependencies**: NestJS 10, TypeORM 0.3 (custom fork `pkg.pr.new/antst/typeorm`), Apollo Server 4, GraphQL 16, class-validator / class-transformer, Winston

**Storage**: PostgreSQL 17.5 — existing `innovation_flow.settings` (`jsonb` column; converted from `json` by migration `1767883714610-convertJsonToJsonb`) carrying `minimumNumberOfStates` / `maximumNumberOfStates`. No DDL; data backfill only (raise max 4→8 on L0 flows). Join path for the migration: `space.level = 0` → `space.collaborationId` → `collaboration.innovationFlowId` → `innovation_flow.settings`.

**Testing**: Vitest 4.x — unit specs (`*.spec.ts`) alongside the service/resolver. Risk-based; reuse the existing `innovation.flow.service.spec.ts` and `template.applier.service.spec.ts` patterns (defaultMockerFactory, vi.mocked).

**Target Platform**: Linux server (NestJS GraphQL backend, `/graphql`).

**Project Type**: web-service (single backend project).

**Performance Goals**: N/A — request-scoped mutations on a single InnovationFlow; no new hot paths. The migration is a single bulk UPDATE bounded by the number of L0 spaces (small).

**Constraints**: Must not regress L1/L2 behavior; must keep the flow-state tagset template in sync; must not change the GraphQL contract (verified by `schema:diff`); migration must be idempotent and reversible.

**Scale/Scope**: ~3k TS files repo; this change is ~3 production touch-points + 1 migration + constants + tests. Within the "Full SDD" band because it carries a migration and a data-shape-affecting behavioral change.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

- **1. Domain-Centric Design First** — PASS. All logic stays in domain services (`innovation-flow`, `space`, `template-applier`). No business rules added to resolvers; the resolver continues to delegate.
- **2. Modular NestJS Boundaries** — PASS. Touches existing modules only; no new module, no circular dependency. Bound constants live in the innovation-flow domain (pure values).
- **3. GraphQL Schema as Stable Contract** — PASS. No field/type changes; the existing mutations are reused. `schema:print` + `schema:diff` gate confirms zero diff (FR-013). No deprecations.
- **4. Explicit Data & Event Flow** — PASS. Mutations keep validation → authorization → domain operation → persistence ordering; no direct repository calls added to resolvers. The applier preservation logic stays in the service layer.
- **5. Observability & Operational Readiness** — PASS. Reuses existing structured exceptions (`ValidationException` with `LogContext`). Migration logs via TypeORM's runner. No orphaned metrics.
- **6. Code Quality with Pragmatic Testing** — PASS. Add focused unit tests for: L0 add beyond 4, L0 delete floor, L0 template-apply preservation, subspace regression. Skip trivial pass-through coverage.
- **7. API Consistency & Evolution Discipline** — PASS. No naming changes; reuses imperative mutation names. No shared enum/scalar changes.
- **8. Secure-by-Design Integration** — PASS. Authorization checks unchanged and still enforced before mutation (FR-012). No new external integration.
- **9. Container & Deployment Determinism** — PASS. No env-var reads outside config bootstrap; bound values are code constants.
- **10. Simplicity & Incremental Hardening** — PASS. Chose the minimal approach: no new immutable-flag column (Clarification Q2); reuse existing bounds + apply-preservation. No speculative infra.

No violations → Complexity Tracking table left empty.

## Project Structure

### Documentation (this feature)

```text
specs/104-l0-additional-tabs/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (GraphQL contract notes)
├── checklists/
│   └── requirements.md  # From /speckit-specify
├── spec.md
└── tasks.md             # /speckit-tasks output (created next step)
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── collaboration/
│   │   ├── innovation-flow/
│   │   │   ├── innovation.flow.constants.ts          # NEW: L0/subspace bound constants
│   │   │   ├── innovation.flow.service.ts            # CHANGE: updateInnovationFlowStatesFromTemplate + isLevelZeroInnovationFlow
│   │   │   └── innovation.flow.service.spec.ts       # add L0 add/delete + template-preserve tests
│   │   └── innovation-flow-settings/
│   │       └── innovation.flow.settings.interface.ts # (min/max fields — unchanged)
│   ├── space/
│   │   └── space/
│   │       └── space.service.ts                      # CHANGE: L0 max 4→8 (use constants)
│   └── template/
│       └── template-applier/
│           ├── template.applier.service.ts           # CHANGE: call ...FromTemplate (L0 preserve)
│           └── template.applier.service.spec.ts       # update mocks to new method name
└── migrations/
    └── <ts>-BackfillL0InnovationFlowMaxStates.ts      # NEW: backfill max=8 on L0 flows
```

**Structure Decision**: Single backend project (Option 1). All changes land in the existing `src/domain/collaboration/innovation-flow`, `src/domain/space/space`, `src/domain/template/template-applier`, and `src/migrations` directories. A new constants file (`innovation.flow.constants.ts`) gives FR-010 its single source of truth, consumed by `space.service.ts` (creation bounds) and the applier (overflow guard).

## Phase 0 — Research

See [research.md](./research.md). Key resolved unknowns: exact constraint locations (`space.service.ts:1284-1285` for L0, `:1373-1374` for subspaces; `innovation.flow.service.ts:352/359` add-guard, `:385/392` delete-guard), the wholesale-replacement behavior of `updateInnovationFlowStates` (the reason L0 template-apply needs special handling), the migration join path, and the backfill migration precedent.

## Phase 1 — Design

- **[data-model.md](./data-model.md)** — entities touched (InnovationFlow, InnovationFlowState, InnovationFlowSettings, Space), the bounds invariants, and the migration's data transformation.
- **[contracts/](./contracts/)** — GraphQL contract notes confirming the reused mutations and the expected zero schema diff.
- **[quickstart.md](./quickstart.md)** — how to validate the feature locally (create L0 space, add a 5th tab, attempt delete to floor, apply a template).

## Phase 2 — Tasks

Generated by `/speckit-tasks` into [tasks.md](./tasks.md). Not produced by this plan step.

## Complexity Tracking

> No constitution violations — table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
