# Data Model: Template Content Options

**Feature**: `026-template-content-options`
**Date**: 2026-01-15

## Overview

This feature adds a `deleteExistingCallouts` parameter to the existing `updateCollaborationFromSpaceTemplate` mutation. No database schema changes are required—all modifications are at the API and service layer.

## Affected Entities

### UpdateCollaborationFromSpaceTemplateInput (Modified)

**Location**: `src/domain/template/template-applier/dto/template.applier.dto.update.collaboration.ts`

**Current Fields**:

```typescript
collaborationID: string; // UUID of target collaboration
spaceTemplateID: string; // UUID of template to apply
addCallouts: boolean = false; // Whether to add template callouts
```

**New Field**:

```typescript
deleteExistingCallouts: boolean = false; // Whether to delete existing callouts before adding template callouts
```

**Validation**:

- Optional field (backward compatible)
- Default value: `false`
- Type: Boolean
- No additional constraints needed

**Behavior Matrix**:
| `deleteExistingCallouts` | `addCallouts` | Result |
|--------------------------|---------------|---------|
| `false` | `false` | Flow Only (existing behavior) |
| `false` | `true` | Add Template Posts (existing behavior) |
| `true` | `false` | Delete existing posts only (new) |
| `true` | `true` | Replace All (new - primary use case) |

---

## Service Layer Changes

### TemplateApplierService (Modified)

**Location**: `src/domain/template/template-applier/template.applier.service.ts`

**Method**: `updateCollaborationFromTemplateContentSpace()`

**Current Signature**:

```typescript
private async updateCollaborationFromTemplateContentSpace(
  targetCollaboration: ICollaboration,
  templateContentSpace: ITemplateContentSpace,
  addCallouts: boolean,
  userID: string
): Promise<ICollaboration>
```

**New Signature**:

```typescript
private async updateCollaborationFromTemplateContentSpace(
  targetCollaboration: ICollaboration,
  templateContentSpace: ITemplateContentSpace,
  addCallouts: boolean,
  deleteExistingCallouts: boolean,  // NEW PARAMETER
  userID: string
): Promise<ICollaboration>
```

**New Logic** (inserted before existing callout creation):

```typescript
// Delete existing callouts if requested
if (deleteExistingCallouts && targetCollaboration.calloutsSet?.callouts) {
  this.logger.verbose?.(
    `Deleting ${targetCollaboration.calloutsSet.callouts.length} existing callouts from collaboration`,
    LogContext.TEMPLATES,
    { collaborationId: targetCollaboration.id }
  );

  for (const callout of targetCollaboration.calloutsSet.callouts) {
    await this.calloutService.deleteCallout(callout.id);
  }

  targetCollaboration.calloutsSet.callouts = [];

  this.logger.verbose?.(
    'Successfully deleted existing callouts',
    LogContext.TEMPLATES,
    { collaborationId: targetCollaboration.id }
  );
}

// Existing innovation flow update logic continues...
// Existing callout creation logic (if addCallouts=true) continues...
```

**Execution Order**:

1. Delete existing callouts (if `deleteExistingCallouts=true`)
2. Update innovation flow states (always)
3. Add template callouts (if `addCallouts=true`)
4. Ensure callouts in valid states (always)
5. Save collaboration (always)

**Dependencies**:

- Requires `CalloutService` injection (already available in service)
- Uses existing `LogContext.TEMPLATES` for logging
- No new imports needed

---

## Implementation Notes

### Deletion Pattern: Authoritative Reference

The implementation **MUST** follow the existing deletion pattern established in the codebase.

**Pattern Source**: `CalloutsSetService.deleteCalloutsSet()`

- File: `src/domain/collaboration/callouts-set/callouts.set.service.ts`
- Lines: 140-162
- Pattern: Loop through child entities calling service-layer delete methods

```typescript
// Existing pattern from CalloutsSetService (lines 155-159)
if (calloutsSet.callouts) {
  for (const callout of calloutsSet.callouts) {
    await this.calloutService.deleteCallout(callout.id);
  }
}
```

**Why This Pattern Works**:

1. **Complete Cascade Deletion** (`deleteCallout` implementation at lines 308-350):

   ```typescript
   // 1. Load all relations
   const callout = await this.getCalloutOrFail(calloutID, {
     relations: {
       comments: true,
       contributions: true,
       contributionDefaults: true,
       framing: true,
     },
   });

   // 2. Delete framing (profile, whiteboard, link, memo)
   await this.calloutFramingService.delete(callout.framing);

   // 3. Delete all contributions (each deletes post/whiteboard/link/memo)
   for (const contribution of callout.contributions) {
     await this.contributionService.delete(contribution.id);
   }

   // 4. Delete comments room
   if (callout.comments) {
     await this.roomService.deleteRoom({ roomID: callout.comments.id });
   }

   // 5. Delete contribution defaults
   await this.contributionDefaultsService.delete(callout.contributionDefaults);

   // 6. Delete authorization policy
   if (callout.authorization)
     await this.authorizationPolicyService.delete(callout.authorization);

   // 7. Finally remove the callout entity
   const result = await this.calloutRepository.remove(callout as Callout);
   result.id = calloutID;
   return result;
   ```

2. **Authorization Enforcement**: Each service method checks privileges (though parent authorization already verified)

3. **Consistency**: All deletion flows use service methods, not direct repository operations

4. **Tested**: `deleteCallout()` already has comprehensive test coverage

5. **Safe**: No database schema changes required (no new cascade behaviors)

**Implementation Location**:

- Service: `src/domain/template/template-applier/template.applier.service.ts`
- Method: `updateCollaborationFromTemplateContentSpace()`
- Add deletion loop **before** existing `updateFlowStates()` call

**Anti-Patterns to Avoid**:

- ❌ Using repository methods directly (bypasses authorization and cascade logic)
- ❌ Adding TypeORM cascade options (risky for existing data, requires migration)
- ❌ Batch delete via raw SQL (loses audit trail, bypasses service layer)
- ❌ Deleting via CalloutsSet repository (wrong abstraction level)

---

## API Changes

### GraphQL Mutation (Modified)

**Location**: `src/domain/template/template-applier/template.applier.resolver.mutations.ts`

**Current Mutation**:

```graphql
type Mutation {
  """
  Updates a Collaboration, including InnovationFlow states, using the Space content from the specified Template.
  """
  updateCollaborationFromSpaceTemplate(
    updateData: UpdateCollaborationFromSpaceTemplateInput!
  ): Collaboration!
}
```

**Updated Input Type**:

```graphql
input UpdateCollaborationFromSpaceTemplateInput {
  """
  ID of the Collaboration to be updated
  """
  collaborationID: UUID!

  """
  The Space Template whose Collaboration that will be used for updates to the target Collaboration
  """
  spaceTemplateID: UUID!

  """
  Add the Callouts from the Collaboration Template
  """
  addCallouts: Boolean = false

  """
  Delete existing Callouts before applying template (enables Replace All mode when combined with addCallouts=true)
  """
  deleteExistingCallouts: Boolean = false # NEW FIELD
}
```

**Resolver Changes**:

- Pass `deleteExistingCallouts` parameter through to service method
- No authorization changes needed (existing UPDATE privilege sufficient)
- No additional validation needed (TypeORM handles)

---

## Error Handling

### Existing Error Scenarios (Unchanged)

- `EntityNotFoundException`: Template not found
- `RelationshipNotFoundException`: Collaboration entities not fully loaded
- `ForbiddenException`: User lacks UPDATE privilege on collaboration

### New Error Scenarios

- Callout deletion failure (e.g., database constraint violation)
  - **Handling**: Error propagates from `calloutService.deleteCallout()`
  - **Recovery**: User can retry mutation (idempotent operation)
  - **Logging**: Error details captured by service layer + APM instrumentation

### Transaction Behavior

- No explicit transaction wrapper (follows existing pattern)
- Operations execute sequentially:
  1. Deletions complete before additions begin
  2. If deletion fails, error propagates and addition never happens
  3. If addition fails after deletion, deletion remains committed (admin can retry with correct template)

---

## Performance Considerations

### Time Complexity

- Deletion: O(n) where n = number of existing callouts
- Each deletion involves cascade cleanup (contributions, comments, profile)
- Typical case: 5-20 callouts per collaboration
- Expected deletion time: ~50-200ms per callout

### Performance Impact

- "Replace All" (delete + add): ~2x time vs "Add Template Posts"
- Stays within existing p95 <2s bounds for typical collaborations (10-15 callouts)
- Large collaborations (50+ callouts) may approach 5s total time
- No optimization needed for initial implementation (fits within existing performance contract)

### Monitoring

- Existing APM instrumentation captures total mutation time
- New verbose logs provide deletion timing context
- No new metrics required

---

## Backward Compatibility

### API Compatibility

✅ **Fully Backward Compatible**

- New parameter is optional with default `false`
- Existing clients continue to work without modification
- Behavior unchanged when parameter omitted

### Data Compatibility

✅ **No Schema Changes**

- No database migrations required
- No data model changes
- Existing callouts remain untouched by default

### Behavioral Compatibility

✅ **Existing Behaviors Preserved**

- `addCallouts=false, deleteExistingCallouts=false`: Flow Only (unchanged)
- `addCallouts=true, deleteExistingCallouts=false`: Add Template Posts (unchanged)

---

## Implementation Notes

### Deletion Pattern Reference

The implementation **MUST** follow the existing deletion pattern established in the codebase:

**Authoritative Example**: `CalloutsSetService.deleteCalloutsSet()`

- File: `src/domain/collaboration/callouts-set/callouts.set.service.ts` (lines 140-162)
- Pattern: Loop through child entities calling service-layer delete methods

```typescript
// Existing pattern from CalloutsSetService
if (calloutsSet.callouts) {
  for (const callout of calloutsSet.callouts) {
    await this.calloutService.deleteCallout(callout.id);
  }
}
```

**Why This Pattern Works**:

1. **Encapsulation**: `deleteCallout()` handles all cascade logic internally
   - Deletes contributions (posts, whiteboards, links, memos)
   - Deletes framing (profile, whiteboard, link, memo)
   - Deletes comments room
   - Deletes contribution defaults
   - Deletes authorization policies
2. **Authorization**: Each deletion checks privileges at service layer
3. **Consistency**: All deletion flows use service methods, not direct repository operations
4. **Tested**: `deleteCallout()` already has comprehensive test coverage
5. **Safe**: No database schema changes required (no new cascade behaviors)

**Implementation Location**:

- Service: `src/domain/template/template-applier/template.applier.service.ts`
- Method: `updateCollaborationFromTemplateContentSpace()`
- Add deletion loop **before** existing `updateFlowStates()` call

**Do NOT**:

- ❌ Use repository methods directly (bypasses authorization)
- ❌ Add TypeORM cascade options (risky for existing data)
- ❌ Batch delete via raw SQL (loses audit trail)
- ❌ Delete via CalloutsSet repository (wrong abstraction level)

---

## Testing Strategy

### Unit Tests (Service Layer)

**File**: `template.applier.service.spec.ts`

1. **Test**: Delete existing callouts when `deleteExistingCallouts=true`
   - Setup: Collaboration with 3 callouts
   - Action: Call with `deleteExistingCallouts=true, addCallouts=false`
   - Assert: All 3 callouts deleted, `callouts` array empty

2. **Test**: Skip deletion when `deleteExistingCallouts=false`
   - Setup: Collaboration with 3 callouts
   - Action: Call with `deleteExistingCallouts=false, addCallouts=true`
   - Assert: All 3 original callouts remain, new callouts appended

3. **Test**: Replace all callouts (delete + add)
   - Setup: Collaboration with 3 existing callouts, template with 2 callouts
   - Action: Call with `deleteExistingCallouts=true, addCallouts=true`
   - Assert: Original 3 deleted, new 2 added, total = 2 callouts

4. **Test**: Handle empty callouts array
   - Setup: Collaboration with no callouts
   - Action: Call with `deleteExistingCallouts=true`
   - Assert: No errors, callouts array remains empty

### Integration Tests (Mutation Layer)

**File**: `template.applier.it-spec.ts`

1. **Test**: Full mutation flow with Replace All
   - Setup: Create collaboration with posts, create template with different posts
   - Action: Call mutation with both flags true
   - Assert: Original posts gone, template posts present, innovation flow updated

2. **Test**: Authorization enforcement
   - Setup: User without UPDATE privilege on collaboration
   - Action: Attempt mutation with `deleteExistingCallouts=true`
   - Assert: Returns authorization error

### Contract Tests (GraphQL Schema)

**File**: `schema.contract.spec.ts`

1. **Test**: Parameter is optional and defaults to false
2. **Test**: Parameter accepts boolean values
3. **Test**: Mutation signature unchanged (backward compatible)

---

## Migration Plan

### Phase 1: Backend Implementation (This Feature)

- Add parameter to DTO
- Implement deletion logic in service
- Update resolver to pass parameter
- Add unit + integration tests
- Update GraphQL schema artifacts

### Phase 2: Frontend Integration (Separate Feature)

- Update frontend to present three options
- Map options to parameter combinations:
  - "Replace All" → `{deleteExistingCallouts: true, addCallouts: true}`
  - "Add Template Posts" → `{deleteExistingCallouts: false, addCallouts: true}`
  - "Flow Only" → `{deleteExistingCallouts: false, addCallouts: false}`
- Add confirmation dialog for "Replace All" option

---

## Open Questions

None - all technical questions resolved in research phase.
