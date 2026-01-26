# Research: Template Content Options

**Feature**: 030-template-content-options
**Date**: 2026-01-15

## Research Questions

### Q1: How does the existing `updateCollaborationFromSpaceTemplate` handle callout management?

**Answer**:

- Current implementation in `TemplateApplierService.updateCollaborationFromTemplateContentSpace()`
- Uses `addCallouts` boolean parameter (existing)
- When `addCallouts=true`: calls `calloutsSetService.addCallouts()` which creates new callouts and appends to existing array
- When `addCallouts=false`: skips callout creation entirely, only updates innovation flow states
- Does NOT currently delete any existing callouts - only adds or skips

**Source**: `src/domain/template/template-applier/template.applier.service.ts` lines 86-109

---

### Q2: What is the proper way to delete all callouts from a CalloutsSet?

**Answer**:

- Use `CalloutService.deleteCallout(calloutId)` for each callout in a loop
- This method handles:
  - Cascade deletion of contributions, comments room, and profile
  - Authorization policy cleanup
  - Proper TypeORM entity removal with ID preservation
- CalloutsSet has `callouts?: Callout[]` array that must be cleared after deletion
- Alternative: Could use `CalloutsSetService.deleteCalloutsSet()` but that deletes the entire set (not desired - we want to keep the set, just clear callouts)

**Decision**: Loop through `targetCollaboration.calloutsSet.callouts` and call `calloutService.deleteCallout()` for each.

**Authoritative Pattern Reference**: This implementation **MUST** follow the existing pattern in `CalloutsSetService.deleteCalloutsSet()` which loops through callouts calling `this.calloutService.deleteCallout(callout.id)` for each (lines 140-162).

**Why This Pattern Is Correct**:

1. **Encapsulation**: `deleteCallout()` handles all cascade deletion internally
   - Deletes framing (profile, whiteboard, link, memo)
   - Deletes contributions in a loop (each contribution deletes post/whiteboard/link/memo)
   - Deletes comments room
   - Deletes contribution defaults
   - Deletes authorization policies
2. **Authorization**: Deletion checks are at service layer (though in this case parent authorization already verified)
3. **Tested**: `deleteCallout()` has comprehensive test coverage
4. **Safe**: No database schema changes required

**Source**:

- `src/domain/collaboration/callout/callout.service.ts` lines 308-350 (deleteCallout implementation)
- `src/domain/collaboration/callouts-set/callouts.set.service.ts` lines 140-162 (deleteCalloutsSet pattern)

---

### Q3: How to ensure transaction safety when deleting + recreating callouts?

**Answer**:

- TypeORM does NOT automatically wrap service methods in transactions
- Current implementation in `updateCollaborationFromTemplateContentSpace()` performs multiple async operations sequentially without explicit transaction
- Existing pattern relies on:
  1. Individual operations being atomic (TypeORM `save` and `remove`)
  2. Service-level error handling that would propagate up to resolver
  3. Resolver error handling that prevents partial completion
- For "Replace All" scenario:
  - Deletion loop completes before creation begins (sequential execution ensures atomic behavior at service level)
  - If deletion fails midway, error propagates and creation never happens
  - If creation fails, deletions are already committed (acceptable - admin can retry)

**Decision**: Follow existing pattern of sequential async operations without explicit transaction wrapper. Add structured error handling to ensure clean failure propagation.

**Rationale**: Adding transaction wrapper would require significant refactoring of existing code paths and is not required by constitution principle 5 (no new transactional requirements introduced). Sequential execution provides acceptable failure mode.

---

### Q4: What logging is appropriate for deletion operations?

**Answer**:

- Constitution principle 5: "Instrument only what our observability stack ingests today"
- Existing template applier uses `LogContext.TEMPLATES`
- Current logging pattern in `updateTemplateFromSpace()`:
  - No explicit logging for callout deletion
  - Relies on resolver-level instrumentation (`@InstrumentResolver()`)
- Recommended addition:
  - `this.logger.verbose?.()` when deletion starts (count of callouts to delete)
  - `this.logger.verbose?.()` when deletion completes
  - Use existing `LogContext.TEMPLATES` context
  - Include collaborationID and count in context

**Decision**: Add two verbose-level log statements (start/complete) following existing patterns. No debug-level logging needed as resolver instrumentation already captures timing.

---

### Q5: Are there authorization implications for deleting callouts?

**Answer**:

- Current authorization flow:
  1. Resolver checks `AuthorizationPrivilege.UPDATE` on `targetCollaboration.authorization`
  2. Service performs deletion without additional checks
- This follows principle 8: authorization centralized in resolver layer
- Callout deletion via `calloutService.deleteCallout()` does NOT perform its own authorization check (assumes caller has verified access)
- Existing mutation already has UPDATE privilege on collaboration, which should cover deleting child callouts

**Decision**: No additional authorization checks needed. Existing UPDATE privilege on collaboration is sufficient.

**Source**: `src/domain/template/template-applier/template.applier.resolver.mutations.ts` line 69-74

---

## Best Practices Applied

### TypeORM Patterns

- **Entity Deletion**: Use `repository.remove()` + ID preservation pattern (existing callout service follows this)
- **Cascade Behavior**: Rely on TypeORM `onDelete: CASCADE` for related entities (contributions, comments)
- **Array Management**: Clear array after deletion to maintain consistency (`callouts.length = 0` or `callouts = []`)

### NestJS Service Layer

- **Dependency Injection**: Inject `CalloutService` into `TemplateApplierService` (already available)
- **Error Propagation**: Let service-level exceptions bubble up to resolver unchanged
- **Logging Context**: Use `WINSTON_MODULE_NEST_PROVIDER` with structured context

### GraphQL Input Design

- **Optional Parameters**: New `deleteExistingCallouts?: Boolean` with default `false` maintains backward compatibility
- **Parameter Naming**: Use camelCase, descriptive boolean name following existing `addCallouts` pattern
- **Input Object**: Add field to existing `UpdateCollaborationFromSpaceTemplateInput` DTO

---

## Alternatives Considered

### Alternative 1: Use repository.update() to bulk delete

**Rejected Because**: TypeORM `update()` doesn't properly handle cascade deletions or authorization policy cleanup. Would require manual cleanup of related entities.

### Alternative 2: Add transaction wrapper

**Rejected Because**: Would require refactoring existing code paths without constitutional requirement. Sequential async operations provide acceptable failure mode.

### Alternative 3: Create separate mutation for deletion

**Rejected Because**: Spec explicitly requests single operation for "Replace All". Separate mutation would require frontend to coordinate two operations.

---

## Implementation Notes

- Estimated changes: ~150 LOC across 3 files
- No database migration required (schema unchanged)
- No new dependencies needed
- Backward compatible by design (optional parameter with safe default)
