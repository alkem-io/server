# Quickstart Guide: Guest Contributions Privilege Management

**Feature**: 014-guest-contributions-privileges
**Date**: 2025-11-05
**Audience**: Developers implementing or testing this feature

## Prerequisites

- Node.js 20.15.1 (Volta managed)
- pnpm 10.17.1
- MySQL 8 running (via `pnpm run start:services`)
- Alkemio server repository cloned and dependencies installed

---

## Development Setup

### 1. Start Services

```bash
# Terminal 1: Start MySQL, RabbitMQ, Redis, etc.
pnpm run start:services

# Wait for services to be healthy (~30 seconds)
# Check with: docker compose -f quickstart-services.yml ps
```

### 2. Run Database Migrations

```bash
# Terminal 1: Apply schema migrations
pnpm run migration:run

# Verify migration succeeded
# Expected output: "Migration addPublicSharePrivilege has been executed successfully"
```

### 3. Start Development Server

```bash
# Terminal 1: Start server with hot reload
pnpm start:dev

# Wait for GraphQL endpoint to be available
# Expected output: "GraphQL server started on http://localhost:3000/graphql"
```

---

## Feature Testing Workflow

### Test Scenario 1: Toggle Guest Contributions ON

**Goal**: Verify PUBLIC_SHARE privilege granted to space admins and whiteboard owners

**Steps**:

1. **Open GraphQL Playground**: Navigate to `http://localhost:3000/graphiql`

2. **Authenticate as Space Admin**:

   ```graphql
   mutation Login {
     login(email: "admin@example.com", password: "test123") {
       token
     }
   }
   ```

   Copy token to HTTP headers: `{ "Authorization": "Bearer <token>" }`

3. **Create Test Space**:

   ```graphql
   mutation CreateSpace {
     createSpace(
       spaceData: {
         nameID: "test-guest-space"
         displayName: "Test Guest Space"
       }
     ) {
       id
       collaboration {
         id
       }
     }
   }
   ```

   Copy `space.id` and `collaboration.id`

4. **Create Test Whiteboard**:

   ```graphql
   mutation CreateWhiteboard {
     createWhiteboard(
       calloutData: {
         collaborationID: "<collaboration.id>"
         type: WHITEBOARD_COLLECTION
       }
       whiteboardData: { content: "Test whiteboard" }
     ) {
       id
       createdBy
       authorization {
         privilegeRules {
           grantedPrivileges
           name
         }
         credentialRules {
           grantedPrivileges
           resourceID
         }
       }
     }
   }
   ```

   **Expected**: No PUBLIC_SHARE privilege yet (setting defaults to false)

5. **Enable Guest Contributions**:

   ```graphql
   mutation UpdateSpaceSettings {
     updateSpaceSettings(
       spaceID: "<space.id>"
       settingsData: { collaboration: { allowGuestContributions: true } }
     ) {
       id
       settings {
         collaboration {
           allowGuestContributions
         }
       }
     }
   }
   ```

   **Expected**: `allowGuestContributions = true`

6. **Verify Privilege Granted**:
   ```graphql
   query CheckWhiteboardAuth {
     whiteboard(ID: "<whiteboard.id>") {
       authorization {
         privilegeRules {
           grantedPrivileges
           name
         }
         credentialRules {
           grantedPrivileges
           resourceID
         }
       }
     }
   }
   ```
   **Expected**:
   ```json
   {
     "privilegeRules": [
       {
         "grantedPrivileges": ["public-share"],
         "name": "space-admin-public-share"
       }
     ],
     "credentialRules": [
       {
         "grantedPrivileges": ["public-share"],
         "resourceID": "<admin.userId>"
       }
     ]
   }
   ```

---

### Test Scenario 2: Toggle Guest Contributions OFF

**Goal**: Verify PUBLIC_SHARE privilege revoked when setting disabled

**Steps**:

1. **Disable Guest Contributions** (starting from Scenario 1 state):

   ```graphql
   mutation DisableGuestContributions {
     updateSpaceSettings(
       spaceID: "<space.id>"
       settingsData: { collaboration: { allowGuestContributions: false } }
     ) {
       settings {
         collaboration {
           allowGuestContributions
         }
       }
     }
   }
   ```

2. **Verify Privilege Revoked**:
   ```graphql
   query CheckWhiteboardAuth {
     whiteboard(ID: "<whiteboard.id>") {
       authorization {
         privilegeRules {
           grantedPrivileges
         }
         credentialRules {
           grantedPrivileges
         }
       }
     }
   }
   ```
   **Expected**: No rules with `grantedPrivileges: ["public-share"]`

---

### Test Scenario 3: Grant Admin Role (with Guest Contributions Enabled)

**Goal**: Verify new admin receives PUBLIC_SHARE on all existing whiteboards

**Steps**:

1. **Ensure Guest Contributions Enabled** (from Scenario 1)

2. **Create Second User**:

   ```graphql
   mutation CreateUser {
     createUser(
       userData: { email: "newadmin@example.com", displayName: "New Admin" }
     ) {
       id
     }
   }
   ```

   Copy `user.id`

3. **Grant Admin Role**:

   ```graphql
   mutation GrantAdminRole {
     assignCommunityRoleToUser(
       communityID: "<space.community.id>"
       userID: "<new.user.id>"
       role: ADMIN
     ) {
       id
     }
   }
   ```

4. **Verify New Admin Has Privilege**:
   ```graphql
   query CheckWhiteboardAuth {
     whiteboard(ID: "<whiteboard.id>") {
       authorization {
         privilegeRules {
           grantedPrivileges
           name
         }
       }
     }
   }
   ```
   **Expected**: Privilege rule includes new admin's user ID

---

### Test Scenario 4: Create Whiteboard (in Enabled Space)

**Goal**: Verify new whiteboards automatically get PUBLIC_SHARE privileges

**Steps**:

1. **Create Second Whiteboard** (with guest contributions enabled):
   ```graphql
   mutation CreateSecondWhiteboard {
     createWhiteboard(
       calloutData: {
         collaborationID: "<collaboration.id>"
         type: WHITEBOARD_COLLECTION
       }
       whiteboardData: { content: "Second whiteboard" }
     ) {
       id
       authorization {
         privilegeRules {
           grantedPrivileges
         }
         credentialRules {
           grantedPrivileges
         }
       }
     }
   }
   ```
   **Expected**: PUBLIC_SHARE privilege already present on creation

---

### Test Scenario 5: Rollback on Failure

**Goal**: Verify transaction rollback when privilege update fails

**Setup**: Requires code injection to simulate failure (not testable via GraphQL)

**Integration Test** (see `test/functional/integration/whiteboard-authorization.it.spec.ts`):

```typescript
it('should rollback setting and privileges on failure', async () => {
  // Arrange: Space with 5 whiteboards, setting = false
  const space = await createTestSpace();
  const whiteboards = await createMultipleWhiteboards(space.id, 5);

  // Mock: Simulate failure on 3rd whiteboard
  jest
    .spyOn(authorizationService, 'save')
    .mockImplementationOnce(() => Promise.resolve({})) // Success
    .mockImplementationOnce(() => Promise.resolve({})) // Success
    .mockRejectedValueOnce(new Error('DB connection lost')); // Fail

  // Act: Attempt to enable guest contributions
  await expect(
    spaceService.updateSpaceSettings(space.id, {
      collaboration: { allowGuestContributions: true },
    })
  ).rejects.toThrow();

  // Assert: Setting reverted to false
  const updatedSpace = await spaceService.findById(space.id);
  expect(updatedSpace.settings.collaboration.allowGuestContributions).toBe(
    false
  );

  // Assert: No whiteboards have PUBLIC_SHARE privilege
  for (const whiteboard of whiteboards) {
    const auth = await whiteboardService.getAuthorization(whiteboard.id);
    const hasPublicShare = auth.privilegeRules.some(rule =>
      rule.grantedPrivileges.includes('public-share')
    );
    expect(hasPublicShare).toBe(false);
  }
});
```

---

## Observability

### Logs to Monitor

**Location**: Server console output or `logs/alkemio-server.log`

**Key Log Entries**:

1. **Setting Change Detected**:

   ```json
   {
     "level": "info",
     "message": "Guest contribution setting changed",
     "context": "SpaceService",
     "spaceId": "abc-123",
     "allowGuestContributions": true
   }
   ```

2. **Privilege Update Started**:

   ```json
   {
     "level": "debug",
     "message": "Updating guest contribution privileges",
     "context": "GuestContributionPrivilegeHandler",
     "spaceId": "abc-123",
     "whiteboardCount": 150
   }
   ```

3. **Privilege Update Completed**:

   ```json
   {
     "level": "info",
     "message": "Guest contribution privileges updated",
     "context": "GuestContributionPrivilegeHandler",
     "spaceId": "abc-123",
     "updated": 150,
     "failed": 0,
     "durationMs": 342
   }
   ```

4. **Rollback Triggered**:
   ```json
   {
     "level": "error",
     "message": "Guest contribution privilege update failed - rolling back",
     "context": "GuestContributionPrivilegeHandler",
     "spaceId": "abc-123",
     "error": "DB connection lost",
     "failedWhiteboardId": "wb-456"
   }
   ```

---

### Metrics to Track

**Elastic APM Dashboard**: `http://localhost:8200` (if APM enabled)

**Key Metrics**:

1. **Transaction Duration**: `transaction.whiteboard.applyGuestContributionPrivileges`
   - Target: p95 < 1000ms for 1000 whiteboards

2. **Event Emission**: `event.emitted.SpaceSettingsUpdated`
   - Count of setting changes

3. **Database Query Performance**: `span.db.authorization_policy.bulk_update`
   - Target: < 500ms for batch save

---

## Debugging Tips

### Issue: Privileges Not Applied

**Symptom**: `allowGuestContributions = true`, but PUBLIC_SHARE not in authorization policy

**Debugging Steps**:

1. **Check Event Handler Registration**:

   ```bash
   # Search for event listener setup
   grep -r "SpaceSettingsUpdated" src/
   ```

   Expected: Handler registered in module's `providers`

2. **Verify Event Emission**:

   ```typescript
   // Add breakpoint in SpaceService.updateSettings()
   this.eventEmitter.emit('SpaceSettingsUpdated', { ... });
   ```

3. **Check Transaction Rollback**:
   ```bash
   # Search logs for rollback messages
   grep "rolling back" logs/alkemio-server.log
   ```

---

### Issue: Performance Degradation

**Symptom**: Bulk privilege update takes > 1 second for 1000 whiteboards

**Debugging Steps**:

1. **Enable Query Logging**:

   ```typescript
   // In typeorm.config.ts
   {
     logging: ['query', 'error'],
     maxQueryExecutionTime: 100,  // Log slow queries
   }
   ```

2. **Check Query Plan**:

   ```sql
   EXPLAIN SELECT w.*
   FROM whiteboard w
   JOIN callout_contribution cc ON cc.whiteboard_id = w.id
   JOIN callout c ON c.id = cc.callout_id
   JOIN collaboration collab ON collab.id = c.collaboration_id
   JOIN space s ON s.collaboration_id = collab.id
   WHERE s.id = 'abc-123';
   ```

   Expected: Uses indexes on FKs

3. **Profile APM Trace**:
   - Navigate to Elastic APM dashboard
   - Find trace for `updateGuestContributionPrivileges`
   - Identify slowest span (likely `findAllInSpace` query)

---

## Running Tests

### Unit Tests

```bash
# Run all unit tests for authorization service
pnpm test:ci src/services/api/whiteboard/whiteboard.service.authorization.spec.ts
```

**Expected Output**:

```
PASS src/services/api/whiteboard/whiteboard.service.authorization.spec.ts
  ✓ applyGuestContributionPrivileges adds PUBLIC_SHARE for admins (23ms)
  ✓ applyGuestContributionPrivileges adds PUBLIC_SHARE for owner (18ms)
  ✓ applyGuestContributionPrivileges skips when setting disabled (12ms)
  ✓ revokePrivilege removes PUBLIC_SHARE rules (15ms)
```

---

### Integration Tests

```bash
# Run integration tests with services running
pnpm test:ci test/functional/integration/whiteboard-authorization.it.spec.ts
```

**Expected Output**:

```
PASS test/functional/integration/whiteboard-authorization.it.spec.ts
  ✓ should grant PUBLIC_SHARE when guest contributions enabled (450ms)
  ✓ should revoke PUBLIC_SHARE when guest contributions disabled (380ms)
  ✓ should grant PUBLIC_SHARE to new admin (290ms)
  ✓ should apply PUBLIC_SHARE to new whiteboard (210ms)
  ✓ should rollback setting and privileges on failure (520ms)
```

---

## Cleanup

```bash
# Stop services
docker compose -f quickstart-services.yml down

# Remove test data (optional)
pnpm run migration:revert
```

---

## Next Steps

1. **Implement Service Extensions**: Start with `WhiteboardAuthorizationService.applyGuestContributionPrivileges()`
2. **Add Event Handlers**: Create `GuestContributionPrivilegeHandler` module
3. **Write Tests**: Begin with unit tests, then integration tests
4. **Run Schema Validation**: After implementation, run `pnpm run schema:diff` to verify no breaking changes
5. **Update Documentation**: Add PUBLIC_SHARE privilege to `docs/authorization-forest.md`

---

## Common Gotchas

1. **Transaction Scope**: Always pass `EntityManager` to batch operations; using default repository bypasses transaction
2. **Subspace Filtering**: Ensure admin queries filter by space-level community, not subspace communities
3. **Event Timing**: Setting change events fire AFTER transaction commit; ensure privileges updated in same transaction
4. **Idempotency**: `applyAuthorizationPolicy()` rebuilds rules from scratch; avoid calling multiple times in same request

---

## Support

- **Documentation**: See `docs/authorization-forest.md` for authorization flow details
- **Spec Reference**: `specs/014-guest-contributions-privileges/spec.md`
- **Technical Decisions**: `specs/014-guest-contributions-privileges/research.md`
