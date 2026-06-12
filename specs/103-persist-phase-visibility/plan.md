# Implementation Plan: Innovation Flow — Persist Phase/Tab Visibility

**Branch**: `story/6138-persist-phase-tab-visibility` | **Date**: 2026-06-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/103-persist-phase-visibility/spec.md` (GitHub story alkem-io/server#6138)

## Summary

Add a `visible` boolean (default `true`) to the innovation-flow state settings so a space/subspace admin can hide a phase/tab from member-facing navigation, with the hide state persisted server-side for all users. `visible` is a UI-affordance hint only — it never gates access to the phase's content.

Technical approach: the settings live in the existing JSONB `settings` column of `innovation_flow_state` (already holding `allowNewCallouts`). We extend the GraphQL object type `InnovationFlowStateSettings` and the `UpdateInnovationFlowStateSettingsInput` / `CreateInnovationFlowStateSettingsInput` DTOs with `visible`, default it to `true` on creation, apply it as a non-destructive partial update (omission preserves the stored value), and ship an idempotent data-backfill migration that adds `visible: true` to every existing state's settings JSONB where the key is absent. Authorization is unchanged: edits ride the existing `Update` privilege on the innovation flow. The regenerated `schema.graphql` is committed (additive, non-breaking).

## Technical Context

**Language/Version**: TypeScript 5.3 on Node.js 22 LTS (Volta-pinned 22.21.1)

**Primary Dependencies**: NestJS 10, `@nestjs/graphql` (code-first), TypeORM 0.3 (custom fork `pkg.pr.new/antst/typeorm`), Apollo Server 4, GraphQL 16, class-validator / class-transformer

**Storage**: PostgreSQL 17.5 — existing `innovation_flow_state.settings` JSONB column. **No DDL**; data backfill only.

**Testing**: Vitest 4.x — unit specs (`*.spec.ts`) alongside source

**Target Platform**: Linux server (containerized NestJS GraphQL API)

**Project Type**: Single project (web service / GraphQL API)

**Performance Goals**: No new performance surface — one extra boolean on an already-fetched JSONB settings object; no new queries, joins, or N+1 risk.

**Constraints**: Additive, backward-compatible GraphQL change (no BREAKING contract approval needed); migration MUST be idempotent and reversible; `visible` MUST NOT affect authorization or content accessibility.

**Scale/Scope**: Tiny vertical slice — 1 interface, 2–3 DTOs, 1 service method branch, 1 create-default, 1 data migration, schema regeneration. No new module.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **1. Domain-Centric Design First** — PASS. The flag is owned by the innovation-flow-state domain; the resolver/service layering is unchanged (settings update flows through `InnovationFlowStateService.update`). No business rule added to resolvers.
- **2. Modular NestJS Boundaries** — PASS. No new module; reuses `innovation-flow-state` and `innovation-flow-state-settings`. No new cross-module coupling.
- **3. GraphQL Schema as Stable Contract** — PASS. Change is additive: a new non-nullable output field with a stable default, plus a new optional input field. No removals, no breaking type changes; published `schema.graphql` regenerated and committed. Input still validated at DTO layer.
- **4. Explicit Data & Event Flow** — PASS. Write path stays validation → authorization (existing `Update` privilege) → domain service mutation → persistence via repository `save`. No direct repository writes from resolvers introduced. (No new domain event is warranted — this is a settings field on an existing update, mirroring `allowNewCallouts`, which emits none.)
- **5. Observability & Operational Readiness** — PASS. No new module/log context required; reuses existing innovation-flow log context. No orphaned metrics added.
- **6. Code Quality with Pragmatic Testing** — PASS. Risk-based unit tests for: default on create, partial-update preserve-on-omission, explicit set true/false. No snapshot bloat.
- **7. API Consistency & Evolution Discipline** — PASS. Field naming follows convention; input remains an `Input` type; the mutation surface (`updateInnovationFlowState`) is unchanged in shape.
- **8. Secure-by-Design Integration** — PASS. Input traverses existing DTO validation + authorization. The flag explicitly does NOT widen access (FR-007). No secrets.
- **9. Container & Deployment Determinism** — PASS. No env/runtime toggle; behavior driven by persisted data. Migration is part of the deterministic migration chain.

**Result: PASS — no violations. Complexity Tracking not required.**

## Project Structure

### Documentation (this feature)

```text
specs/103-persist-phase-visibility/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── innovation-flow-state-visibility.graphql.md
├── checklists/
│   └── requirements.md  # from /speckit-specify
└── tasks.md             # /speckit-tasks output (not created here)
```

### Source Code (repository root)

```text
src/domain/collaboration/
├── innovation-flow-state-settings/
│   ├── innovation.flow.settings.interface.ts          # ADD `visible` @Field (Boolean!, default true)
│   └── dto/
│       ├── innovation.flow.state.settings.dto.create.ts   # ADD optional `visible` (defaults true in service)
│       └── innovation.flow.state.settings.dto.update.ts   # ADD optional `visible` (omission preserves)
├── innovation-flow-state/
│   ├── innovation.flow.state.service.ts               # default visible:true on create; partial-update on update
│   └── innovation.flow.state.service.spec.ts          # unit tests for create default + update semantics
└── (no entity DDL change — settings is JSONB)

src/migrations/
└── <timestamp>-BackfillInnovationFlowStateVisible.ts  # idempotent backfill visible:true where absent; reversible down

schema.graphql                                          # regenerated (additive)
```

**Structure Decision**: Single-project NestJS layout. The change is confined to the existing `collaboration/innovation-flow-state-settings` and `collaboration/innovation-flow-state` domain folders plus one migration and the regenerated schema artifact. No new module or directory is introduced — the settings object already exists as a JSONB column, so this is a pure field addition + data backfill.

## Complexity Tracking

No constitution violations — section intentionally empty.
