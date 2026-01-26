# Implementation Plan: Default Post Template for Flow Steps

**Branch**: `029-default-post-template-flow` | **Date**: 2026-01-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/029-default-post-template-flow/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enable Space admins to configure a default CALLOUT template for innovation flow steps. When set, the template ID is exposed via GraphQL query on the flow state, allowing the frontend to fetch and pre-fill the "Add Post" dialog for members creating posts in that specific flow step, ensuring consistent post structure across the flow. Configuration is accessed via Layout Settings three-dot menu, using the existing Template Library dialog with enhanced duplicate-prevention logic.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 20 LTS (Volta pinned 20.15.1)
**Primary Dependencies**: NestJS 10, TypeORM 0.3, Apollo Server 4, GraphQL 16
**Storage**: PostgreSQL 17.5 (existing database with migrations)
**Testing**: Jest (unit tests: `*.spec.ts`, integration: `*.it-spec.ts`)
**Target Platform**: Linux server (Node.js runtime, Docker containerized)
**Project Type**: Web backend (GraphQL API server)
**Performance Goals**: <200ms p95 for GraphQL mutations, minimal query overhead for template lookup
**Constraints**: Must follow GraphQL schema contract process, maintain backward compatibility, admin-only mutation access
**Scale/Scope**: Single feature affecting InnovationFlowState entity (1 new optional relation), 2-3 new GraphQL mutations, 1 GraphQL query enhancement

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**✅ Principle 1: Domain-Centric Design First**

- Core logic resides in `src/domain/collaboration/innovation-flow-state/` (InnovationFlowState entity, service)
- Template association business rule: "flow step can have optional default CALLOUT template"
- GraphQL resolvers in `src/domain/collaboration/innovation-flow/` orchestrate domain service calls
- No business logic in resolvers—validation and authorization via NestJS guards/decorators

**✅ Principle 2: Modular NestJS Boundaries**

- Changes confined to existing modules:
  - `InnovationFlowModule` (domain module for flow state management)
  - `TemplateModule` (reused for template lookup)
  - `CalloutModule` (post creation logic—reads default template if set)
- No new modules required
- No circular dependencies introduced (Template is already used by multiple modules)

**✅ Principle 3: GraphQL Schema as Stable Contract**

- **New field**: `InnovationFlowState.defaultCalloutTemplate?: Template` (nullable, backward compatible)
- **New mutations**:
  - `setDefaultCalloutTemplateOnInnovationFlowState(flowStateID: UUID!, templateID: UUID!): InnovationFlowState!`
  - `removeDefaultCalloutTemplateOnInnovationFlowState(flowStateID: UUID!): InnovationFlowState!`
- **No breaking changes**: existing queries/mutations unaffected
- Input validation via DTOs, GraphQL error codes for domain errors
- Schema regeneration: `pnpm run schema:print && pnpm run schema:sort`
- Schema diff review required before merge

**✅ Principle 4: Explicit Data & Event Flow**

- Mutation flow: validation → authorization → domain service → persistence
- No events required (configuration change, not a domain event trigger)
- Frontend queries `flowState.defaultCalloutTemplate` and loads template before opening dialog (no side effects in backend)

**✅ Principle 5: Observability & Operational Readiness**

- **Structured logs**: Use `LogContext.COLLABORATION` for flow state mutations
- **Log points**:
  - `verbose`: Template set/removed on flow state (include flowStateID, templateID in details)
  - `warning`: Attempt to set non-CALLOUT template (include templateID, templateType in details)
- **No new metrics**: Feature uses existing mutation success/error tracking
- **No health checks**: Read-only configuration, no external dependencies

**✅ Principle 6: Code Quality with Pragmatic Testing**

- **Unit tests** (`innovation.flow.state.service.spec.ts`):
  - Test setting default CALLOUT template
  - Test removing default template
  - Test validation (non-CALLOUT template rejected)
- **Integration tests** (frontend integration):
  - Test querying flow state with default template
  - Test template deletion sets defaultCalloutTemplate to null
- **No snapshot tests**: Schema diff is explicit artifact
- Deliberate omission: No E2E UI tests (frontend out of scope for backend task)

**✅ Principle 7: API Consistency & Evolution Discipline**

- Mutation naming: imperative verbs (`setDefaultCalloutTemplateOnInnovationFlowState`, `removeDefaultCalloutTemplateOnInnovationFlowState`)
- Input type: `SetDefaultCalloutTemplateOnInnovationFlowStateInput` (single input object)
- Return type: `InnovationFlowState` (existing type, includes new field)
- Error codes: `ENTITY_NOT_FOUND`, `VALIDATION_ERROR` (existing codes)

**✅ Principle 8: Secure-by-Design Integration**

- **Authorization**: Mutations require `UPDATE_INNOVATION_FLOW` privilege (admin-only)
- **Validation**: Ensure templateID exists, ensure template.type === 'CALLOUT'
- **Template visibility**: Uses existing platform template visibility rules (space or platform templates)
- **No secrets**: Configuration data, no credentials involved
- **No external calls**: Local database operations only

**✅ Principle 9: Container & Deployment Determinism**

- Database migration required (add `defaultCalloutTemplateId` column to `innovation_flow_state` table)
- Migration idempotent: `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (PostgreSQL)
- No environment config changes
- No runtime feature flags

**✅ Principle 10: Simplicity & Incremental Hardening**

- Simplest viable: One-to-one optional relation (nullable foreign key)
- No caching layer (template lookup is infrequent, <10 flow steps per space)
- No CQRS: Single entity update, synchronous read
- No speculative features: Just default CALLOUT template (pre-fills add post dialog in frontend)

**GATE STATUS**: ✅ PASS — All principles satisfied, no violations to justify.

**POST-DESIGN RE-EVALUATION** (Phase 1 Complete):

- ✅ Final approach uses CALLOUT templates (not POST templates) as specified in updated requirements
- ✅ Frontend integration pattern confirmed: backend exposes `defaultCalloutTemplate.id`, frontend fetches and pre-fills
- ✅ No backend logic in post creation mutation (template loading is client-side)
- ✅ All Constitution principles remain satisfied with final design
- ✅ GraphQL schema changes remain non-breaking (nullable field, additive mutations)
- ✅ Template deletion behavior: `ON DELETE SET NULL` ensures referential integrity
- ✅ Space template creation exclusion: `defaultCalloutTemplateId` not copied to space templates (instance-specific config)
- ✅ Template source: Can be from space or platform library (no space boundary validation), follows existing template visibility rules

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

```text
src/
├── domain/
│   ├── collaboration/
│   │   ├── innovation-flow-state/
│   │   │   ├── innovation.flow.state.entity.ts          # [MODIFY] Add defaultCalloutTemplate relation
│   │   │   ├── innovation.flow.state.service.ts         # [MODIFY] Add set/remove template methods
│   │   │   └── innovation.flow.state.service.spec.ts    # [MODIFY] Add unit tests
│   │   └── innovation-flow/
│   │       ├── innovation.flow.resolver.mutations.ts     # [MODIFY] Add GraphQL mutations
│   │       ├── innovation.flow.resolver.fields.ts        # [MODIFY] Add field resolver (if needed)
│   │       └── dto/                                      # [NEW] Input DTOs
│   │           ├── innovation.flow.dto.set.default.callout.template.ts
│   │           └── innovation.flow.dto.remove.default.callout.template.ts
│   └── template/
│       └── template/
│           └── template.service.ts                       # [READ ONLY] Existing template lookup
├── migrations/
│   └── [timestamp]-AddDefaultCalloutTemplateToFlowState.ts  # [NEW] Database migration
└── test/
    └── functional/
        └── integration/
            └── innovation-flow-state.it-spec.ts          # [NEW] Integration tests for template relation
```

**Structure Decision**: Backend-only changes in existing NestJS domain modules. No new modules, no frontend changes (frontend work is separate). Frontend will fetch the template ID from the flow state query and load template content before opening the "Add Post" dialog. Migration follows TypeORM pattern. Tests colocated with source (unit tests) and in `test/functional/integration/` (integration tests).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations** — This table is empty.
