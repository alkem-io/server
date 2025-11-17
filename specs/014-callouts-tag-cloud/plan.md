# Implementation Plan: Callouts Tag Cloud with Filtering

**Branch**: `client-7100` | **Date**: 2025-11-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/014-callouts-tag-cloud/spec.md`
**Status**: Retroactive (documenting implemented solution)

**Note**: This plan documents the implementation approach taken for the tag cloud feature, written retroactively to capture the design decisions and technical strategy.

## Summary

Implement tag aggregation and filtering capabilities on the CalloutsSet GraphQL API to enable knowledge base tag cloud visualization. The feature adds a new `tags` field that aggregates and ranks tags by frequency from callouts and their contributions, plus enhances the existing `callouts` query with tag-based filtering. Primary technical approach: extend existing CalloutsSetService with tag extraction logic, add conditional TypeORM query loading for performance, and maintain authorization boundaries throughout the aggregation pipeline.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 20.15.1 (Volta-pinned)
**Primary Dependencies**: NestJS 10.x, TypeORM 0.3.x, Apollo Server 4.x, GraphQL 16.x, class-validator, class-transformer
**Storage**: MySQL 8.0 with existing tagset infrastructure on profiles (callouts, contributions)
**Testing**: Jest with CI config, integration tests for cross-module interactions, unit tests for orchestration logic
**Target Platform**: Linux server (containerized), GraphQL API surface
**Project Type**: NestJS GraphQL API server (single backend project)
**Performance Goals**:

- Tag aggregation query <2s for typical CalloutsSet (<100 callouts)
- Tag aggregation with classification filter <3s for 200 callouts
- Conditional query loading to avoid N+1 problems
  **Constraints**:
- Must respect existing authorization model (READ privilege checks)
- No schema breaking changes (additive only)
- Compatible with existing tagset infrastructure
- Performance-sensitive: avoid loading unused relations
  **Scale/Scope**:
- Extend 1 domain service (~150 LOC new methods)
- Add 1 GraphQL field resolver
- Create 2 new DTO classes
- Add 3 helper methods (private)
- ~400 LOC total across 5 files

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### ✅ Principle 1: Domain-Centric Design First

- **Status**: PASS
- **Evidence**: All tag aggregation logic resides in `CalloutsSetService` (domain service), not in resolvers
- **Implementation**: Service methods `getAllTags()`, `getCalloutTags()`, `filterCalloutsByClassificationTagsets()` encapsulate business rules; resolver delegates to domain

### ✅ Principle 2: Modular NestJS Boundaries

- **Status**: PASS
- **Evidence**: Changes contained within existing `collaboration/callouts-set` module boundary
- **Implementation**: No new modules introduced; extends existing CalloutsSetService, adds DTOs to existing module structure

### ✅ Principle 3: GraphQL Schema as Stable Contract

- **Status**: PASS
- **Evidence**: Additive changes only - new `tags` field and `withTags` argument added; no breaking changes
- **Implementation**:
  - New field: `CalloutsSet.tags(classificationTagsets: [TagsetArgs]): [String!]!`
  - Enhanced arg: `CalloutsSet.callouts(withTags: [String!], ...): [Callout!]!`
  - All inputs properly validated via DTO classes with GraphQL field decorators

### ✅ Principle 4: Explicit Data & Event Flow

- **Status**: PASS (read-only feature - no state changes)
- **Evidence**: Feature is query-only; no mutations, no events to emit
- **Implementation**: Authorization checks delegated to existing `AuthorizationService`; no direct repository calls from resolver

### ✅ Principle 5: Observability & Operational Readiness

- **Status**: PASS
- **Evidence**: Inherits logging context from parent service (`LogContext.COLLABORATION`)
- **Implementation**: Error paths throw typed exceptions; performance optimization (conditional loading) documented in code comments

### ✅ Principle 6: Code Quality with Pragmatic Testing

- **Status**: PASS
- **Evidence**:
  - Integration tests required for new `getAllTags()` service method (cross-entity aggregation)
  - Unit tests for filtering predicate logic (`filterCalloutsByClassificationTagsets`)
  - Tests defend frequency sorting invariant and authorization boundary
- **Implementation**: Test coverage focuses on business logic contracts, not trivial CRUD

### ✅ Principle 7: API Consistency & Evolution Discipline

- **Status**: PASS
- **Evidence**:
  - Query naming: `tags` (descriptive, plural for collection)
  - Argument naming: `classificationTagsets`, `withTags` (consistent with existing `callouts` args)
  - DTOs follow convention: `CalloutsSetArgsTags`, `CalloutsSetArgsCallouts`
- **Implementation**: Reuses existing `TagsetArgs` shared input type for classification filtering

### ✅ Principle 8: Secure-by-Design Integration

- **Status**: PASS
- **Evidence**: Authorization enforced via `@AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)` decorator
- **Implementation**:
  - All GraphQL args validated through class-validator DTOs
  - Authorization checked per-callout in filtering logic
  - Only tags from accessible callouts included in aggregation

### ✅ Principle 9: Container & Deployment Determinism

- **Status**: PASS (no deployment changes)
- **Evidence**: Pure code change; no config, no env vars, no external dependencies
- **Implementation**: Feature enabled immediately on deployment; no feature flags needed

### ✅ Principle 10: Simplicity & Incremental Hardening

- **Status**: PASS
- **Evidence**: Simplest viable implementation chosen
- **Rationale**:
  - In-memory aggregation and sorting (no caching layer) sufficient for expected scale
  - Conditional query loading avoids premature optimization while addressing N+1 concern
  - Frequency counting via plain object (no Redis/separate index) meets performance goals
- **Alternatives Rejected**:
  - Separate tag index table (adds complexity, not needed for <200 callouts use case)
  - Result caching (premature - no observed performance issue)

### Constitution Summary

**Overall Status**: ✅ ALL GATES PASS
**Violations**: None
**Justifications Required**: None

This feature fully complies with the Alkemio Server Engineering Constitution. All changes are additive, domain-centric, properly authorized, and follow established patterns.

## Project Structure

### Documentation (this feature)

```text
specs/014-callouts-tag-cloud/
├── spec.md                          # Feature specification (completed)
├── plan.md                          # This file - implementation plan
├── research.md                      # Phase 0 - technical decisions (to be created)
├── data-model.md                    # Phase 1 - entity/field mapping (to be created)
├── contracts/                       # Phase 1 - GraphQL schema additions (to be created)
│   └── callouts-set-tags.graphql
├── quickstart.md                    # Phase 1 - developer guide (to be created)
└── checklists/
    └── requirements.md              # Spec quality checklist (completed)
```

### Source Code (repository root)

```text
src/domain/collaboration/callouts-set/
├── callouts.set.service.ts               # ✏️ MODIFIED - added 3 new methods
│   ├── getAllTags()                      # NEW - aggregate & sort tags by frequency
│   ├── filterCalloutsByClassificationTagsets()  # NEW - filter predicate factory
│   └── getCalloutTags()                  # NEW - extract tags from callout & contributions
├── callouts.set.resolver.fields.ts       # ✏️ MODIFIED - added tags field resolver
├── dto/
│   ├── callouts.set.args.callouts.ts     # ✏️ MODIFIED - added withTags field
│   └── callouts.set.args.tags.ts         # ✨ NEW - args for tags field

src/domain/common/tagset/
└── dto/
    └── tagset.args.ts                    # ⚙️ EXISTING - reused for classification filter

test/functional/integration/
└── callouts-set/
    └── callouts-set-tags.it.spec.ts      # ✨ NEW - integration tests

test/unit/
└── callouts-set/
    └── callouts-set-tags.spec.ts         # ✨ NEW - unit tests for helpers

schema.graphql                             # ✏️ MODIFIED - added CalloutsSet.tags field
```

**Structure Decision**: Single NestJS backend project structure. All changes contained within existing `collaboration/callouts-set` domain module. No new modules required. Changes are:

1. Service layer extensions (domain logic)
2. GraphQL resolver additions (API surface)
3. DTO classes for type safety (validation layer)
4. Test coverage (quality assurance)

This follows the standard NestJS layered architecture pattern already established in the codebase.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations detected. This section is not applicable.

---

## Phase 0: Research & Technical Decisions

### Research Tasks

1. **Tag Aggregation Strategy**
   - **Question**: How to efficiently aggregate tags from multiple nested entities (callouts → contributions → tagsets)?
   - **Research**: Evaluate TypeORM eager loading vs selective loading vs separate queries
   - **Outcome**: Documented in `research.md`

2. **Sorting Performance**
   - **Question**: In-memory vs database-level frequency sorting for potentially 1000+ unique tags?
   - **Research**: Benchmark in-memory object frequency counting vs MySQL GROUP BY + ORDER BY
   - **Outcome**: Documented in `research.md`

3. **Authorization Model**
   - **Question**: Filter tags at query level or post-aggregation? Performance vs security trade-offs
   - **Research**: Review existing authorization patterns in CalloutsSetService
   - **Outcome**: Documented in `research.md`

4. **Conditional Loading Pattern**
   - **Question**: How to avoid loading tagset relations when not needed by query?
   - **Research**: TypeORM conditional relations patterns, spread operator in FindOptions
   - **Outcome**: Documented in `research.md`

### Deliverable

- `research.md` with all decisions documented (Decision / Rationale / Alternatives)

---

## Phase 1: Design & Contracts

### Data Model Changes

**Entities Modified:**

- `CalloutsSet` (interface extension only - no DB schema change)
  - Add GraphQL field `tags` (computed, not persisted)
  - Enhance `callouts` field arguments

**No Database Migrations Required** - feature uses existing tagset infrastructure

### API Contracts

**GraphQL Schema Additions:**

```graphql
type CalloutsSet {
  # ... existing fields ...

  # NEW FIELD
  """
  All the tags of the Callouts and its contributions in this CalloutsSet.
  Sorted by frequency (descending), then alphabetically (ascending).
  """
  tags(
    """
    Filter to include only tags from callouts matching the specified classifications.
    If omitted or empty, returns tags from all accessible callouts.
    """
    classificationTagsets: [TagsetArgs!]
  ): [String!]!

  # ENHANCED FIELD
  callouts(
    # ... existing args ...

    """
    Return only callouts that have at least one of the specified tags
    either on their framing profile or in their contributions.
    """
    withTags: [String!]
  ): [Callout!]!
}

# EXISTING TYPE (reused)
input TagsetArgs {
  name: String!
  tags: [String!]
}
```

### Service Method Signatures

```typescript
// CalloutsSetService

/**
 * Aggregate all tags from callouts and contributions in a CalloutsSet.
 * @param calloutsSetID - ID of the CalloutsSet
 * @param classificationTagsets - Optional filter by classification
 * @returns Array of tags sorted by frequency then alphabetically
 */
public async getAllTags(
  calloutsSetID: string,
  classificationTagsets?: TagsetArgs[]
): Promise<string[]>

/**
 * Extract all tags from a single callout's framing and contributions.
 * @param callout - Callout with loaded tagset relations
 * @returns Flat array of tag strings
 */
private getCalloutTags(callout: ICallout): string[]

/**
 * Create a filter predicate for callouts based on classification tagsets.
 * @param classificationTagsets - Filter criteria
 * @returns Predicate function for Array.filter()
 */
private filterCalloutsByClassificationTagsets(
  classificationTagsets: TagsetArgs[]
): (callout: ICallout) => boolean
```

### Deliverables

- `data-model.md` (entity mapping & relationships)
- `contracts/callouts-set-tags.graphql` (schema fragment)
- `quickstart.md` (developer guide with example queries)

---

## Phase 2: Implementation Breakdown

### Task Sequence (Prioritized)

**P1 - Core Tag Aggregation (User Story 1)**

1. Create `CalloutsSetArgsTags` DTO class
2. Add `getAllTags()` service method with TypeORM query
3. Implement `getCalloutTags()` helper (extract from framing + contributions)
4. Add frequency counting & dual sorting logic
5. Add `tags` field resolver in `CalloutsSetResolverFields`
6. Integration test: tag aggregation & sorting

**P2 - Classification Filtering (User Story 2)** 7. Implement `filterCalloutsByClassificationTagsets()` predicate factory 8. Integrate classification filter in `getAllTags()` 9. Integration test: filtered tag aggregation

**P1 - Tag-Based Callout Filtering (User Story 3)** 10. Extend `CalloutsSetArgsCallouts` DTO with `withTags` field 11. Modify `getCalloutsFromCollaboration()` to accept `withTags` 12. Add conditional query loading for tag relations (performance optimization) 13. Implement tag matching filter logic (OR semantics) 14. Integration test: callout filtering by tags + authorization

**P3 - Combined Filtering (User Story 4)** 15. Integration test: combined `withTags` + `classificationTagsets` filtering

**Testing & Documentation** 16. Unit tests for helper methods 17. Edge case coverage (empty results, null tagsets, authorization) 18. Performance validation (query profiling) 19. Update GraphQL schema documentation 20. Add inline code comments for optimization decisions

### Estimated Effort Distribution

- Service logic: ~150 LOC (40% of work)
- Resolver & DTOs: ~50 LOC (15% of work)
- Tests: ~200 LOC (35% of work)
- Documentation & refinement: (10% of work)

### Deliverable

- `tasks.md` (generated by `/speckit.tasks` command - NOT part of `/speckit.plan`)

---

## Phase 3: Testing Strategy

### Integration Tests (Priority)

1. **Tag Aggregation Suite** (`callouts-set-tags.it.spec.ts`)
   - Tags from callout framing profiles are included
   - Tags from post contributions are included
   - Tags sorted by frequency (primary) then alphabetically (secondary)
   - Empty CalloutsSet returns empty array
   - Authorization: only tags from accessible callouts included

2. **Classification Filtering Suite**
   - Filter by flowState classification
   - Filter by multiple classification tagsets
   - Empty classification filter returns all tags

3. **Callout Filtering Suite**
   - Filter callouts by single tag (OR logic)
   - Filter callouts by multiple tags
   - Tags in framing matched
   - Tags in contributions matched
   - Authorization respected in filtered results

4. **Combined Filtering Suite**
   - Both `withTags` and `classificationTagsets` applied simultaneously

### Unit Tests

1. **Helper Method Suite** (`callouts-set-tags.spec.ts`)
   - `getCalloutTags()` extracts from all sources
   - `getCalloutTags()` handles null/undefined tagsets gracefully
   - `filterCalloutsByClassificationTagsets()` predicate logic
   - Case-insensitive classification matching

### Performance Tests

1. **Query Profiling**
   - Verify conditional loading prevents N+1 queries
   - Measure query time for 100-callout CalloutsSet
   - Measure query time for 200-callout CalloutsSet with classification filter

### Manual Validation

1. **GraphQL Playground Scenarios**
   - Query tag cloud on existing Space knowledge base
   - Apply classification filter in UI flow
   - Filter callouts by selected tags
   - Verify UI tag cloud updates correctly

---

## Phase 4: Deployment & Rollout

### Pre-Deployment Checklist

- [ ] All integration tests passing
- [ ] Unit tests passing
- [ ] Schema contract validation passed (no breaking changes)
- [ ] Performance profiling complete (meets <2s/<3s targets)
- [ ] Code review approved (CODEOWNERS)
- [ ] Documentation complete (inline comments, quickstart.md)

### Deployment Strategy

**Type**: Standard deployment (no feature flag needed)

**Rationale**:

- Additive changes only (no breaking schema changes)
- Read-only queries (no state modification risk)
- Performance optimized (no production impact)
- Immediately available to client applications

### Rollback Plan

**If Issues Detected:**

1. Revert PR merge to develop branch
2. Schema baseline automation will restore previous schema
3. No database migrations to roll back (no schema changes)
4. Client applications gracefully degrade (new field optional)

### Monitoring

**Metrics to Track:**

- `tags` field query latency (p50, p95, p99)
- `callouts` field query latency with `withTags` arg (p50, p95, p99)
- Error rate on CalloutsSet queries
- Authorization denial rate (unexpected spikes indicate bug)

**Alerts:**

- Tag aggregation query >5s (threshold 2x performance goal)
- 5xx error rate >1% on CalloutsSet queries

---

## Risk Assessment & Mitigations

| Risk                                                         | Probability | Impact   | Mitigation                                                                                            |
| ------------------------------------------------------------ | ----------- | -------- | ----------------------------------------------------------------------------------------------------- |
| Performance degradation on large CalloutsSet (>500 callouts) | Medium      | High     | Conditional query loading implemented; performance tests validate; can add pagination later if needed |
| Authorization bypass in tag aggregation                      | Low         | Critical | Authorization checks reuse existing `AuthorizationService` patterns; integration tests validate       |
| Tag frequency counting errors (duplicates, case sensitivity) | Low         | Medium   | Unit tests cover edge cases; inline logic is straightforward frequency map                            |
| Breaking schema changes detected post-merge                  | Very Low    | High     | Schema contract CI gate prevents merge; schema baseline automation validates                          |
| Memory exhaustion with 10,000+ unique tags                   | Very Low    | Medium   | Current design limits: all tags in-memory; acceptable for expected scale; monitor in production       |

---

## Success Metrics (Validation)

### Functional Correctness

- ✅ All acceptance scenarios from spec pass integration tests
- ✅ Authorization boundaries respected (validated via tests)
- ✅ Edge cases handled gracefully (empty arrays, null handling)

### Performance Targets

- ✅ Tag aggregation <2s for <100 callout CalloutsSet (measured via profiling)
- ✅ Tag aggregation with filter <3s for 200 callout CalloutsSet (measured via profiling)
- ✅ No N+1 query problems (validated via query logging)

### Code Quality

- ✅ All constitution principles satisfied (documented in Constitution Check)
- ✅ Integration tests cover cross-entity interactions
- ✅ Unit tests defend business logic invariants
- ✅ Inline comments explain performance optimizations

### User Value

- ✅ Client application can query tag cloud data
- ✅ Client application can filter callouts by tags
- ✅ UI can implement tag cloud similar to Space > Subspaces feature

---

## Related Documentation

- **Specification**: [spec.md](./spec.md)
- **Research Decisions**: [research.md](./research.md) (Phase 0 output)
- **Data Model**: [data-model.md](./data-model.md) (Phase 1 output)
- **API Contract**: [contracts/callouts-set-tags.graphql](./contracts/callouts-set-tags.graphql) (Phase 1 output)
- **Developer Guide**: [quickstart.md](./quickstart.md) (Phase 1 output)
- **GitHub Issue**: [alkem-io/client-web#7100](https://github.com/alkem-io/client-web/issues/7100)
- **Design Reference**: [Figma - Tag Cloud Knowledge Base](https://www.figma.com/design/JECbXDfUPlv9SDiTnGbJx0/Tag-Cloud-Knowledge-Base)

---

**Plan Status**: ✅ COMPLETE (Retroactive documentation)
**Next Step**: Generate Phase 0 research.md, Phase 1 artifacts, or proceed to implementation tasks
