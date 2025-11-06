# Implementation Plan: Enable Memo as Valid Collection Contribution Type

**Branch**: `001-memo-collection-contribution` | **Date**: 2025-11-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-memo-collection-contribution/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enable memos as a valid contribution type in collection callouts by wiring the existing Memo entity infrastructure into the CalloutContribution service layer. The implementation primarily involves enabling the existing memo support in the contribution creation flow, resolver queries, and ensuring proper authorization and event handling patterns. No database migrations or schema changes are required as the GraphQL schema already includes MEMO in CalloutContributionType and the entity relationships exist.

## Technical Context

**Language/Version**: TypeScript 5.3.3, Node.js 20.15.1 (Volta pinned)
**Primary Dependencies**: NestJS 10.3.10, TypeORM 0.3.13, Apollo Server 4.10.4, GraphQL 16.9.0
**Storage**: MySQL 8 (mysql2 3.10.3 driver) with existing schema supporting memo contributions
**Testing**: Jest 29.7.0 with test:ci configuration, integration tests for GraphQL resolvers
**Target Platform**: Linux server (Docker containerized), Kubernetes deployment
**Project Type**: Single NestJS backend application (GraphQL API)
**Performance Goals**: <200ms for collection queries with 100 contributions, <50ms authorization checks per contribution
**Constraints**: Must maintain GraphQL schema backward compatibility, no breaking changes to existing CalloutContributionType enum
**Scale/Scope**: Affects CalloutContribution service (~345 LOC), resolver fields, and contribution validation logic; estimated ~200-300 LOC changes

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### ✅ Domain-Centric Design First

- **Status**: PASS
- **Assessment**: Changes are contained within the CalloutContribution domain service and Memo domain service. No business logic leaks into resolvers.
- **Evidence**: Existing CalloutContributionService follows domain-centric pattern; memo creation will delegate to MemoService following same pattern as post/whiteboard.

### ✅ Modular NestJS Boundaries

- **Status**: PASS
- **Assessment**: Feature uses existing MemoModule and CalloutContributionModule boundaries. No new modules required.
- **Evidence**: MemoModule already exports MemoService; CalloutContributionService will inject it following existing dependency pattern.

### ✅ GraphQL Schema as Stable Contract

- **Status**: PASS
- **Assessment**: No schema changes required. CalloutContributionType.MEMO already exists in the enum.
- **Evidence**: Schema baseline already includes MEMO in enum; implementation enables existing contract.

### ✅ Explicit Data & Event Flow

- **Status**: REQUIRES VERIFICATION (Phase 1)
- **Assessment**: Need to verify domain events are emitted for memo contribution lifecycle.
- **Action**: Research existing event patterns for post/whiteboard contributions in Phase 0.

### ✅ Observability & Operational Readiness

- **Status**: PASS
- **Assessment**: Will follow existing logging patterns in CalloutContributionService with LogContext.COLLABORATION.
- **Evidence**: Existing validation exceptions and service operations already log appropriately.

### ✅ Code Quality with Pragmatic Testing

- **Status**: PASS with PLAN
- **Assessment**: Will add integration tests for memo contribution creation/query; unit tests for service orchestration.
- **Plan**: Follow existing test structure in `test/functional/integration/callout-contribution/` directory.

### ✅ API Consistency & Evolution Discipline

- **Status**: PASS
- **Assessment**: Uses existing createCalloutContribution mutation and contribution query patterns.
- **Evidence**: No new mutations required; memo follows post/whiteboard naming conventions.

### ✅ Secure-by-Design Integration

- **Status**: PASS
- **Assessment**: Will reuse existing authorization policy patterns for memo contributions.
- **Evidence**: AuthorizationPolicyType.CALLOUT_CONTRIBUTION already covers all contribution types.

### ✅ Container & Deployment Determinism

- **Status**: PASS (N/A for this feature)
- **Assessment**: No container or deployment changes required.

### ✅ Simplicity & Incremental Hardening

- **Status**: PASS
- **Assessment**: Simplest viable implementation - enable existing infrastructure without architectural escalation.
- **Evidence**: No new patterns, caching, or CQRS required; pure enablement of existing entities.

**Summary**: All constitution gates PASS with one verification required in Phase 0 (domain events for memo contributions).

**Phase 1 Re-check**: ✅ ALL GATES PASS

### Post-Design Verification

**Domain Events**: Confirmed that memo contributions use the `ContributionReporterService` pattern for activity tracking, consistent with whiteboard contributions. The `memoContribution()` method already exists and will be wired during implementation. No domain event bus required - following established pattern.

**Final Assessment**: Feature design fully complies with all constitutional principles. Implementation can proceed to Phase 2 (task breakdown).

## Project Structure

### Documentation (this feature)

```text
specs/001-memo-collection-contribution/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── memo-contribution.graphql  # GraphQL query/mutation examples
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── collaboration/
│   │   ├── callout-contribution/
│   │   │   ├── callout.contribution.service.ts          # MODIFY: Add memo creation logic
│   │   │   ├── callout.contribution.resolver.fields.ts  # MODIFY: Add memo resolver field
│   │   │   └── callout.contribution.module.ts           # MODIFY: Import MemoModule
│   │   └── callout/
│   │       └── callout.service.ts                       # VERIFY: Memo counting logic exists
│   └── common/
│       └── memo/
│           └── memo.service.ts                          # USE: Existing memo creation
│
├── services/
│   └── external/
│       └── elasticsearch/
│           └── contribution-reporter/
│               └── contribution.reporter.service.ts      # VERIFY: Memo contribution indexing
│
└── common/
    └── enums/
        └── callout.contribution.type.ts                 # VERIFY: MEMO enum exists

test/
├── functional/
│   └── integration/
│       └── callout-contribution/
│           └── memo-contribution.it.spec.ts             # CREATE: Integration tests
└── mocks/
    └── callout-contribution.mock.ts                     # EXTEND: Add memo mock data
```

**Structure Decision**: Single NestJS backend application following domain-driven design. Changes are concentrated in the CalloutContribution domain service with integration of existing MemoService. No new modules or architectural patterns required.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

_No violations identified. All gates pass or require verification only._

---

## Implementation Phases Summary

### ✅ Phase 0: Research (Complete)

**Deliverables**:

- [research.md](./research.md) - Comprehensive investigation of existing patterns and requirements

**Key Findings**:

- All database schema and GraphQL contracts already exist
- MemoService infrastructure complete and tested
- ContributionReporterService.memoContribution() method exists
- Implementation is pure enablement - no new patterns required

---

### ✅ Phase 1: Design & Contracts (Complete)

**Deliverables**:

- [data-model.md](./data-model.md) - Entity relationships and validation rules
- [contracts/memo-contribution.graphql.md](./contracts/memo-contribution.graphql.md) - API contracts and examples
- [quickstart.md](./quickstart.md) - Step-by-step implementation guide
- Updated agent context in `.github/copilot-instructions.md`

**Key Design Decisions**:

- Follow post/whiteboard/link contribution patterns exactly
- Reuse AuthorizationPolicyType.CALLOUT_CONTRIBUTION
- Use ContributionReporterService for activity indexing (not domain events)
- No schema changes required - all types already defined

---

### 🔜 Phase 2: Task Breakdown (Next Step)

**Command**: `/speckit.tasks`

**Expected Tasks**:

1. Module dependency setup (MemoModule import)
2. Service injection (MemoService in CalloutContributionService)
3. Memo creation logic implementation
4. getMemo() method implementation
5. Resolver field addition
6. Contribution reporter wiring
7. NameID handling
8. Integration test creation
9. Schema validation
10. Documentation updates

**Estimated Effort**: 6-8 hours total (4-6 dev + 2-3 test)

---

## Risk Assessment

| Risk                              | Impact   | Mitigation                                 | Status       |
| --------------------------------- | -------- | ------------------------------------------ | ------------ |
| Missing getMemo() method          | High     | Implement following getWhiteboard pattern  | To Address   |
| NameID collision handling missing | Medium   | Add setNameIdOnMemoData() method           | To Address   |
| Contribution reporter not called  | Low      | Wire in createContributionOnCallout        | To Address   |
| Authorization gaps                | Low      | Reuse existing CALLOUT_CONTRIBUTION policy | Mitigated    |
| Schema contract violation         | Critical | Validated - no changes required            | Mitigated ✅ |

---

## Next Actions

**For Developer**:

1. Review [quickstart.md](./quickstart.md) for implementation steps
2. Run `/speckit.tasks` to generate detailed task breakdown
3. Begin implementation following task order
4. Use [contracts/memo-contribution.graphql.md](./contracts/memo-contribution.graphql.md) for testing

**For Reviewer**:

1. Verify constitution compliance (all gates pass ✅)
2. Review data model for domain purity
3. Check API contracts for consistency
4. Validate test coverage plan

---

## Success Metrics

**Technical**:

- Zero schema breaking changes ✅
- All existing tests pass
- Memo contribution creation <100ms
- Contribution queries <200ms for 100 items
- Authorization checks <50ms per contribution

**Functional**:

- Users can create memo contributions where enabled
- Memo contributions appear in collection queries
- Contribution counts include memos accurately
- Validation errors provide clear messages

---

**Plan Status**: ✅ Complete and Ready for Implementation
**Last Updated**: 2025-11-06
**Next Command**: `/speckit.tasks`
