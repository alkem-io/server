# Quickstart: Template Content Options

## Overview

This feature adds a `deleteExistingCallouts` parameter to `updateCollaborationFromSpaceTemplate`, enabling "Replace All Content" behavior that clears existing posts before applying template posts.

**Key Change**: Single boolean parameter enables four distinct behaviors through parameter combinations.

---

## Prerequisites

- Running Alkemio server (port 3000)
- PostgreSQL with existing Space + SubSpace
- Space Template with callouts configured
- User with UPDATE privilege on target Collaboration

**Verify Prerequisites**:

```bash
# Server running
curl http://localhost:3000/graphql

# Database connectivity
pnpm run migration:show

# Auth configured
curl http://localhost:3000/graphiql
```

---

## Implementation Checklist

### Phase 1: GraphQL Contract (1-2 hours)

- [ ] Add `deleteExistingCallouts: Boolean = false` field to `UpdateCollaborationFromSpaceTemplateInput` DTO
  - File: `src/services/api/collaboration/dto/collaboration.dto.update.from.template.ts`
  - Decorator: `@Field(() => Boolean, { nullable: true, defaultValue: false })`
  - Description: Document "Delete existing Callouts before applying template"

- [ ] Add JSDoc to mutation resolver with behavior matrix
  - File: `src/services/api/collaboration/collaboration.resolver.mutations.ts`
  - Update `@Mutation()` decorator docstring
  - Include 4 behavior combinations
  - Document execution order (delete → flow → add)

- [ ] Regenerate GraphQL schema

  ```bash
  pnpm run schema:print
  pnpm run schema:sort
  pnpm run schema:diff
  ```

- [ ] Verify backward compatibility
  - [ ] Confirm default values work without explicit parameters
  - [ ] Check existing integration tests still pass

**Exit Criteria**: Schema diff shows only additive changes (new optional field).

---

### Phase 2: Service Layer Implementation (2-3 hours)

- [ ] Update `TemplateApplierService.updateCollaborationFromTemplateContentSpace()`
  - File: `src/domain/template/template-applier/template.applier.service.ts`
  - Add `deleteExistingCallouts` parameter to method signature
  - Add deletion logic before `updateFlowStates()` call

- [ ] Implement deletion loop **following existing pattern**

  **Authoritative Reference**: `CalloutsSetService.deleteCalloutsSet()` (lines 140-162)
  - File: `src/domain/collaboration/callouts-set/callouts.set.service.ts`
  - Pattern: Loop through callouts calling `this.calloutService.deleteCallout(callout.id)`

  ```typescript
  if (deleteExistingCallouts) {
    const existingCallouts = collaboration.calloutsSet?.callouts || [];

    this.logger.verbose?.(
      `Deleting ${existingCallouts.length} existing callouts from Collaboration: ${collaboration.id}`,
      LogContext.TEMPLATES
    );

    for (const callout of existingCallouts) {
      await this.calloutService.deleteCallout(callout.id);
    }

    this.logger.verbose?.(
      `Successfully deleted ${existingCallouts.length} callouts from Collaboration: ${collaboration.id}`,
      LogContext.TEMPLATES
    );
  }
  ```

  **Why This Pattern**: `deleteCallout()` handles all cascade deletion internally (contributions, framing, comments, auth policies). This is the same pattern used throughout the codebase for parent-child deletion scenarios.

- [ ] Update resolver to pass through new parameter
  - File: `src/services/api/collaboration/collaboration.resolver.mutations.ts`
  - Pass `deleteExistingCallouts` from `updateData` to service call

- [ ] Add verbose logging
  - [ ] Log deletion count and collaboration ID
  - [ ] Use `LogContext.TEMPLATES` context
  - [ ] Include operation type in log message

**Exit Criteria**: Service method compiles without TypeScript errors.

---

### Phase 3: Verification (1 hour)

#### Manual Validation Scenarios

- [ ] Scenario 1: Replace All (Delete + Add)
  ```typescript
  it('should add template callouts without deletion when deleteExistingCallouts=false, addCallouts=true', async () => {
    // Act: updateCollaborationFromTemplateContentSpace(deleteExistingCallouts: false, addCallouts: true)
    // Assert: calloutService.deleteCallout never called, addCallouts called
  });
  ```

**Run Unit Tests**:

```bash
pnpm run test:ci src/domain/template/template-applier/template.applier.service.spec.ts
```

#### Integration Tests

- [ ] Add test file: `collaboration.mutations.replace.all.it-spec.ts`
  - File: `test/functional/integration/collaboration/collaboration.mutations.replace.all.it-spec.ts`

- [ ] Test Case: Replace All Integration

  ```typescript
  describe('updateCollaborationFromSpaceTemplate - Replace All', () => {
    it('should delete existing callouts and add template callouts', async () => {
      // 1. Create Space with Collaboration (add 2 callouts manually)
      // 2. Create Space Template with different callouts (3 callouts)
      // 3. Execute mutation with deleteExistingCallouts=true, addCallouts=true
      // 4. Query collaboration.calloutsSet.callouts
      // 5. Assert: exactly 3 callouts exist, all match template nameIDs
    });
  });
  ```

---

### Phase 3: Manual Verification (30 minutes)

#### Setup Test Environment

1. **Create Space Template**:

   ```graphql
   mutation CreateTemplate {
     createSpaceTemplate(
       spaceTemplateData: {
         nameID: "test-template-replace-all"
         profileData: { displayName: "Test Template" }
         spaceData: { nameID: "template-space" }
       }
     ) {
       id
       collaboration {
         id
       }
     }
   }
   ```

2. **Add Callouts to Template**:

   ```graphql
   mutation AddTemplateCallout {
     createCalloutOnCollaboration(
       calloutData: {
         collaborationID: "template-collaboration-id"
         framing: { profile: { displayName: "Template Post 1" } }
         type: POST
       }
     ) {
       id
       nameID
     }
   }
   ```

3. **Create Target Space**:

   ```graphql
   mutation CreateSpace {
     createSpace(
       spaceData: {
         nameID: "test-space-replace"
         profileData: { displayName: "Test Space" }
       }
     ) {
       id
       collaboration {
         id
         calloutsSet {
           callouts {
             id
             nameID
           }
         }
       }
     }
   }
   ```

4. **Add Existing Callouts to Space**:
   ```graphql
   mutation AddExistingCallout {
     createCalloutOnCollaboration(
       calloutData: {
         collaborationID: "space-collaboration-id"
         framing: { profile: { displayName: "Existing Post 1" } }
         type: POST
       }
     ) {
       id
       nameID
     }
   }
   ```

#### Validation Scenarios

- [ ] **Scenario 1: Replace All**

  ```graphql
  mutation ReplaceAll {
    updateCollaborationFromSpaceTemplate(
      updateData: {
        collaborationID: "space-collaboration-id"
        spaceTemplateID: "template-id"
        deleteExistingCallouts: true
        addCallouts: true
      }
    ) {
      id
      calloutsSet {
        callouts {
          id
          nameID
          framing {
            profile {
              displayName
            }
          }
        }
      }
    }
  }
  ```

  **Expected**: Only template callouts visible, no existing callouts remain

- [ ] **Scenario 2: Add Posts (Existing Behavior)**

  ```graphql
  mutation AddPosts {
    updateCollaborationFromSpaceTemplate(
      updateData: {
        collaborationID: "space-collaboration-id"
        spaceTemplateID: "template-id"
        deleteExistingCallouts: false
        addCallouts: true
      }
    ) {
      id
      calloutsSet {
        callouts {
          nameID
        }
      }
    }
  }
  ```

  **Expected**: Both existing and template callouts visible

- [ ] **Scenario 3: Flow Only (Existing Behavior)**

  ```graphql
  mutation FlowOnly {
    updateCollaborationFromSpaceTemplate(
      updateData: {
        collaborationID: "space-collaboration-id"
        spaceTemplateID: "template-id"
        deleteExistingCallouts: false
        addCallouts: false
      }
    ) {
      id
      innovationFlow {
        states {
          displayName
        }
      }
      calloutsSet {
        callouts {
          nameID
        }
      }
    }
  }
  ```

  **Expected**: Innovation flow updated, existing callouts unchanged

- [ ] **Scenario 4: Delete Only**
  ```graphql
  mutation DeleteOnly {
    updateCollaborationFromSpaceTemplate(
      updateData: {
        collaborationID: "space-collaboration-id"
        spaceTemplateID: "template-id"
        deleteExistingCallouts: true
        addCallouts: false
      }
    ) {
      id
      calloutsSet {
        callouts {
          nameID
        }
      }
    }
  }
  ```
  **Expected**: No callouts visible, innovation flow updated

#### Verification Queries

- [ ] **Check Callout Count**:

  ```graphql
  query VerifyCallouts {
    space(ID: "space-id") {
      collaboration {
        calloutsSet {
          callouts {
            id
            nameID
            framing {
              profile {
                displayName
              }
            }
          }
        }
      }
    }
  }
  ```

- [ ] **Check Database Directly**:
  ```sql
  SELECT c.id, c.nameID, p.displayName
  FROM callout c
  JOIN profile p ON c.framingId = p.id
  WHERE c.calloutsSetId = 'callouts-set-id'
  ORDER BY c.createdDate DESC;
  ```

---

## Performance Verification

### Runtime Check

```bash
# Verify mutation completes in acceptable time
# Monitor server logs for deletion timing
# Expected: < 500ms for typical collaboration (10 callouts)
```

---

## Common Issues & Solutions

### Issue 1: TypeScript Compilation Error

**Symptom**: `Property 'deleteExistingCallouts' does not exist on type 'UpdateCollaborationFromSpaceTemplateInput'`

**Solution**:

- Verify DTO field added with `@Field()` decorator
- Run `pnpm build` to regenerate types
- Restart TypeScript language server in IDE

### Issue 2: GraphQL Schema Not Updated

**Symptom**: GraphiQL doesn't show new field

**Solution**:

```bash
pnpm run schema:print
pnpm run schema:sort
# Restart server
pnpm start
```

### Issue 3: Callouts Not Actually Deleted

**Symptom**: Query shows callouts still exist after mutation

**Debug Steps**:

1. Check server logs for deletion messages
2. Verify `deleteExistingCallouts` parameter is `true` in request
3. Add breakpoint in `TemplateApplierService.updateCollaborationFromTemplateContentSpace()`
4. Confirm `calloutService.deleteCallout()` is being called

**Common Cause**: Authorization failure (user lacks DELETE privilege on callouts)

---

## Documentation Updates Required

- [ ] Update `docs/Templates.md` with new parameter
- [ ] Add behavior matrix diagram
- [ ] Update API changelog

---

## Definition of Done

- [x] All 4 behavior combinations implemented
- [x] Backward compatibility verified (default `false`)
- [x] GraphQL schema regenerated and diffed
- [x] Authorization checks reused (existing UPDATE privilege)
- [x] Verbose logging added with `LogContext.TEMPLATES`
- [ ] Manual verification completed for all 4 scenarios
- [ ] Documentation updated (`docs/Templates.md`)
- [ ] PR approved by code owner
