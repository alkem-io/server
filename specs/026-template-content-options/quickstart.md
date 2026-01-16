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

### Phase 3: Testing (2-3 hours)

#### Unit Tests

- [ ] Add test file: `template.applier.service.spec.ts` (if doesn't exist)
  - File: `test/unit/domain/template/template-applier/template.applier.service.spec.ts`

- [ ] Test Case 1: Delete and Add (Replace All)

  ```typescript
  it('should delete existing callouts and add template callouts when both flags true', async () => {
    // Arrange: collaboration with 2 existing callouts, template with 3 callouts
    // Act: updateCollaborationFromTemplateContentSpace(deleteExistingCallouts: true, addCallouts: true)
    // Assert: calloutService.deleteCallout called 2 times, addCallouts called 3 times
  });
  ```

- [ ] Test Case 2: Delete Only

  ```typescript
  it('should delete existing callouts without adding when deleteExistingCallouts=true, addCallouts=false', async () => {
    // Arrange: collaboration with 2 callouts
    // Act: updateCollaborationFromTemplateContentSpace(deleteExistingCallouts: true, addCallouts: false)
    // Assert: calloutService.deleteCallout called 2 times, addCallouts not called
  });
  ```

- [ ] Test Case 3: Backward Compatibility (Flow Only)

  ```typescript
  it('should preserve existing callouts when deleteExistingCallouts=false, addCallouts=false', async () => {
    // Act: updateCollaborationFromTemplateContentSpace(deleteExistingCallouts: false, addCallouts: false)
    // Assert: calloutService.deleteCallout never called
  });
  ```

- [ ] Test Case 4: Backward Compatibility (Add Posts)
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

- [ ] Test Case: Authorization Check
  ```typescript
  it('should enforce UPDATE privilege on Collaboration', async () => {
    // Arrange: User without UPDATE privilege
    // Act: Attempt mutation
    // Assert: ForbiddenException thrown
  });
  ```

**Run Integration Tests**:

```bash
pnpm run test:ci test/functional/integration/collaboration/collaboration.mutations.replace.all.it-spec.ts
```

---

### Phase 4: Manual Verification (30 minutes)

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

#### Test Scenarios

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

### Baseline Measurement

```bash
# Before changes
pnpm run test:ci:no:coverage
# Record execution time

# After changes
pnpm run test:ci:no:coverage
# Compare execution time (should be within 5% variance)
```

### Load Test (Optional)

```graphql
# Execute 10 times with different collaborations
mutation StressTest {
  updateCollaborationFromSpaceTemplate(
    updateData: {
      collaborationID: "collaboration-{{index}}"
      spaceTemplateID: "template-id"
      deleteExistingCallouts: true
      addCallouts: true
    }
  ) {
    id
  }
}
```

**Expected**: Each operation completes in < 500ms (assuming 10 callouts per collaboration).

---

## Rollback Plan

### If Critical Bug Found

1. **Revert Git Commit**:

   ```bash
   git revert HEAD
   git push origin develop
   ```

2. **Emergency Hotfix (If Deployed)**:
   - Deploy previous Docker image tag
   - No database migration involved (feature is code-only)
   - Existing mutations continue working with default `deleteExistingCallouts=false`

3. **Notification**:
   - Inform frontend team to revert UI changes
   - Document issue in GitHub issue
   - Schedule post-mortem

### Partial Rollback (Feature Flag)

If feature flags are available, disable at runtime:

```typescript
if (
  this.configService.getOrThrow('FEATURE_DELETE_EXISTING_CALLOUTS_ENABLED') ===
  'false'
) {
  updateData.deleteExistingCallouts = false;
}
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

### Issue 3: Tests Fail with "calloutService.deleteCallout is not a function"

**Symptom**: Unit tests fail because `calloutService` is not properly mocked

**Solution**:

```typescript
const calloutService = {
  deleteCallout: jest.fn().mockResolvedValue(undefined),
  // ... other methods
};
```

### Issue 4: Callouts Not Actually Deleted

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
- [ ] Add frontend integration example

---

## Definition of Done

- [ ] All 4 behavior combinations tested (unit + integration)
- [ ] Backward compatibility verified (existing clients unaffected)
- [ ] GraphQL schema regenerated and diff reviewed
- [ ] Manual verification completed for Replace All scenario
- [ ] Code coverage ≥ 80% for new code paths
- [ ] Authorization checks enforced
- [ ] Verbose logging added
- [ ] Documentation updated
- [ ] PR approved by code owner
