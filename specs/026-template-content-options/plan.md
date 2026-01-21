# Implementation Plan: Template Content Options

**Branch**: `026-template-content-options` | **Date**: 2026-01-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/026-template-content-options/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add `deleteExistingCallouts` parameter to `updateCollaborationFromSpaceTemplate` mutation to support three distinct template application options: Replace All (delete existing posts + add template posts), Add Template Posts (keep existing + add template posts), and Flow Only (update flow structure only). Primary technical change involves adding deletion logic before the existing callout creation in `TemplateApplierService.updateCollaborationFromTemplateContentSpace()`, with proper cascade cleanup and transaction safety.

## Technical Context

**Language/Version**: TypeScript 5.3 on Node.js 20.15.1 (Volta-pinned)
**Primary Dependencies**: NestJS 10, TypeORM 0.3, Apollo GraphQL 4, GraphQL 16
**Storage**: PostgreSQL 17.5 (via TypeORM for callout deletion cascade)
**Testing**: Jest (unit tests for service layer, integration tests for mutation)
**Target Platform**: Linux server (containerized)
**Project Type**: Monolithic NestJS server with GraphQL API
**Performance Goals**: Template application completes within existing p95 <2s bounds
**Constraints**: Must maintain backward compatibility (new parameter optional, default false)
**Scale/Scope**: Single mutation update, affects 3 service methods, ~150 LOC changes

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Principle 1: Domain-Centric Design First

✅ **PASS** - Deletion logic resides in `TemplateApplierService` (domain service), not in resolver. Resolver handles authorization + orchestration only.

### Principle 2: Modular NestJS Boundaries

✅ **PASS** - Changes isolated to `template-applier` module. No new cross-module dependencies introduced.

### Principle 3: GraphQL Schema as Stable Contract

✅ **PASS** - Adding optional parameter `deleteExistingCallouts?: Boolean` to existing mutation input. Non-breaking (backward compatible with default `false`).

### Principle 4: Explicit Data & Event Flow

✅ **PASS** - Follows existing flow: validation → authorization → domain operation (delete + update) → persistence. No event emission changes needed (deletion cascades handled by TypeORM).

### Principle 5: Observability & Operational Readiness

✅ **PASS** - Will add structured logging at debug/verbose level for deletion operations. Uses existing `LogContext.TEMPLATES` context. No new metrics needed (operation timing already captured by resolver instrumentation).

### Principle 6: Code Quality with Pragmatic Testing

✅ **PASS** - Implementation follows existing patterns (deleteCallout loop from CalloutsSetService). Logging added for operational visibility. Manual validation sufficient for parameter-driven behavior.

### Principle 7: API Consistency & Evolution Discipline

✅ **PASS** - Mutation naming unchanged. Input parameter follows existing pattern (boolean flag, camelCase, descriptive name). Error codes reuse existing `ENTITY_NOT_FOUND` / `RELATIONSHIP_NOT_FOUND` patterns.

### Principle 8: Secure-by-Design Integration

✅ **PASS** - Reuses existing authorization check (UPDATE privilege on collaboration). Deletion respects existing cascade rules (no orphan cleanup needed beyond TypeORM `onDelete: CASCADE`).

### Principle 9: Container & Deployment Determinism

✅ **PASS** - No environment changes. Feature flag not needed (parameter-driven behavior).

### Principle 10: Simplicity & Incremental Hardening

✅ **PASS** - Simplest implementation: add deletion loop before existing callout creation. Reuses `calloutService.deleteCallout()`. No architectural escalation needed.

## Project Structure

### Documentation (this feature)

```text
specs/026-template-content-options/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── graphql-schema.graphql
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/domain/template/template-applier/
├── dto/
│   └── template.applier.dto.update.collaboration.ts  # Add deleteExistingCallouts field
├── template.applier.service.ts                       # Add deletion logic
└── template.applier.resolver.mutations.ts            # Pass parameter through

src/domain/collaboration/callouts-set/
└── callouts.set.service.ts                           # Existing deleteCallout method (no changes)
```

**Structure Decision**: Single-project monolithic structure. Changes isolated to existing `template-applier` module in `src/domain/template/`. No new modules or files required beyond updating existing DTO, service, and resolver files.

## Complexity Tracking

> **No violations** - All constitution checks pass without justification needed.

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
