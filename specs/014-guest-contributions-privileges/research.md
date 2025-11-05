# Research: Guest Contributions Privilege Management

**Feature**: 014-guest-contributions-privileges
**Date**: 2025-11-05
**Status**: Complete

## Overview

This document consolidates technical decisions and research findings for implementing automatic PUBLIC_SHARE privilege management tied to the `allowGuestContributions` space setting.

## Technical Decisions

### 1. Privilege Enum Extension

**Decision**: Add `PUBLIC_SHARE = 'public-share'` to `AuthorizationPrivilege` enum

**Rationale**:

- Follows existing privilege naming pattern (kebab-case string values)
- Registered with GraphQL via `registerEnumType` (already in place)
- Distinct from existing privileges to avoid semantic conflicts

**Location**: `src/common/enums/authorization.privilege.ts`

**Alternatives Considered**:

- Reuse existing `CONTRIBUTE` privilege → Rejected: Too broad, doesn't capture guest-specific sharing intent
- Use `SHARE_WITH_GUESTS` → Rejected: Verbose; standard naming is action-oriented

---

### 2. Authorization Service Pattern

**Decision**: Extend `WhiteboardAuthorizationService.applyAuthorizationPolicy()` to conditionally append PUBLIC_SHARE privilege rules based on space setting

**Rationale**:

- Existing pattern: `applyAuthorizationPolicy` rebuilds authorization rules when parent policy changes
- Already handles credential rules (e.g., `CREDENTIAL_RULE_WHITEBOARD_CREATED_BY` for whiteboard owner)
- Supports both `appendCredentialRules` and `appendPrivilegeRules` mechanisms
- Called from multiple trigger points (whiteboard creation, settings update, parent authorization cascade)

**Integration Points**:

1. **Whiteboard creation**: Hook into `WhiteboardService.createWhiteboard()` → apply authorization
2. **Setting toggle**: Hook into `SpaceService` when `allowGuestContributions` changes
3. **Admin role grant**: Hook into role assignment service

**Alternatives Considered**:

- Separate privilege service → Rejected: Adds unnecessary abstraction; authorization service already centralizes privilege logic
- Direct authorization policy mutation → Rejected: Violates encapsulation; `applyAuthorizationPolicy` is the canonical rebuild mechanism

---

### 3. Space Admin Discovery

**Decision**: Query space community roles to identify admins, then apply privilege to all whiteboards in that space

**Rationale**:

- Space admins identified via `RoleSet` on `Space.community`
- Existing pattern: `CommunityResolverService` provides role resolution utilities
- Whiteboard-space relationship: `Whiteboard` → `CalloutContribution` → `Callout` → `Collaboration` → `Space`

**Query Pattern**:

```typescript
// Pseudo-code
const space = await spaceService.getSpace(spaceId, { relations: { community: { roleSet: true } } });
const admins = await communityService.getAdminsForCommunity(space.community.id);
const whiteboards = await whiteboardService.getWhiteboardsInSpace(spaceId);

for (const whiteboard of whiteboards) {
  await whiteboardAuthService.applyAuthorizationPolicy(whiteboard.id, ...);
}
```

**Alternatives Considered**:

- Authorization policy inheritance from space → Rejected: Violates requirement FR-003 (no inheritance; per-whiteboard only)
- Global privilege lookup → Rejected: Scale concerns; better to scope to affected space

---

### 4. Transactional Rollback Strategy

**Decision**: Use TypeORM `EntityManager.transaction()` to wrap setting update + privilege assignments; throw on failure to trigger rollback

**Rationale**:

- TypeORM provides transaction support: `await entityManager.transaction(async manager => { ... })`
- Existing migration patterns confirm transaction usage (`queryRunner.startTransaction()` in migrations)
- Rollback requirement (FR-009): "rollback all privilege changes AND revert allowGuestContributions setting to false"

**Implementation Pattern**:

```typescript
await this.entityManager.transaction(async (transactionalEntityManager) => {
  // 1. Update space settings
  await transactionalEntityManager.save(spaceSettingsCollaboration);

  // 2. Apply privileges to all whiteboards
  for (const whiteboard of whiteboards) {
    const updatedPolicies = await this.whiteboardAuthService.applyAuthorizationPolicy(...);
    await transactionalEntityManager.save(updatedPolicies);
  }

  // If any save fails, transaction auto-rolls back
});
```

**Alternatives Considered**:

- Manual rollback → Rejected: Error-prone; transaction guarantees atomicity
- Saga pattern → Rejected: Over-engineering for synchronous operation

---

### 5. Event Hooks for Triggering Privilege Updates

**Decision**: Subscribe to domain events for setting changes and role grants

**Event Sources**:

1. **Setting Change**: Space service emits event when `allowGuestContributions` toggled
2. **Admin Role Grant**: Role service emits event when admin role assigned to user
3. **Whiteboard Creation**: Existing hook in whiteboard service applies authorization immediately

**Rationale**:

- Follows Principle 4 (Explicit Data & Event Flow): "State changes MUST propagate through domain services emitting events"
- Decouples space settings logic from whiteboard authorization logic
- Existing pattern: `ActivityAdapter`, `ContributionReporterService` already consume domain events

**Implementation**:

- Use NestJS `EventEmitter2` for in-process events (no RabbitMQ needed for synchronous flows)
- Event payload: `{ spaceId, allowGuestContributions: boolean }`

**Alternatives Considered**:

- Direct method calls → Rejected: Creates tight coupling between modules
- Polling → Rejected: Introduces latency and complexity

---

### 6. Observability Implementation

**Decision**: Use existing logging/metrics infrastructure

**Logging** (FR-011):

- Logger: `winston` via `WINSTON_MODULE_NEST_PROVIDER`
- Context: `LogContext.AUTHORIZATION` (or create `LogContext.GUEST_CONTRIBUTIONS`)
- Format: Structured JSON with `{ userId, whiteboardId, spaceId, action, timestamp }`

**Metrics** (FR-012):

- APM: Elastic APM already integrated (`@src/apm/decorators`)
- Use `@Profiling()` decorator on privilege assignment methods
- Custom metric: `privilege_assignment_duration_ms` histogram

**Audit** (FR-013):

- Leverage existing `ActivityLog` or `AuditLog` if available
- Otherwise: dedicated audit log table with triggering user/action

**Alternatives Considered**:

- New logging framework → Rejected: Winston already in place
- External audit service → Rejected: Out of scope; table-based audit sufficient

---

### 7. Performance Optimization for Bulk Operations

**Decision**: Batch privilege updates; use bulk save operations

**Rationale**:

- Requirement: 1 second for up to 1000 whiteboards (SC-006)
- TypeORM supports `save([...])` for bulk operations
- Avoid N+1 queries: fetch all whiteboards in one query with necessary relations

**Query Optimization**:

```typescript
const whiteboards = await whiteboardRepository.find({
  where: {
    /* space filter */
  },
  relations: { authorization: true },
  select: { id: true, authorization: { id: true, privilegeRules: true } },
});
```

**Alternatives Considered**:

- Individual saves → Rejected: Too slow for 1000 whiteboards
- Database stored procedure → Rejected: Breaks domain encapsulation

---

## Best Practices Applied

### TypeORM Transactions

- Use `@InjectEntityManager()` for transaction-aware operations
- Let TypeORM handle commit/rollback automatically
- Reference: `src/migrations/` for transaction patterns

### NestJS Dependency Injection

- Inject `WhiteboardAuthorizationService` into `SpaceService` (or vice versa via event handlers)
- Use module imports to manage dependencies
- Avoid circular dependencies via event-driven decoupling

### Authorization Policy Patterns

- Follow `AuthorizationPolicyService.appendCredentialAuthorizationRules()` pattern
- Use `AuthorizationPolicyRulePrivilege` for privilege-based rules
- Use `IAuthorizationPolicyRuleCredential` for user-specific grants

### Testing Strategy

- **Unit**: Mock `WhiteboardAuthorizationService`, test privilege rule generation logic
- **Integration**: Spin up test database, verify transaction rollback behavior
- **E2E**: Full flow from GraphQL mutation to privilege verification

---

## Open Questions (Resolved)

| Question                                   | Resolution                                                                          |
| ------------------------------------------ | ----------------------------------------------------------------------------------- |
| Does PUBLIC_SHARE privilege already exist? | No—confirmed via grep search; must be added to enum                                 |
| How to identify space admins?              | Via `Community.roleSet` relationships; leverage existing `CommunityResolverService` |
| What triggers privilege updates?           | Setting change, admin role grant, whiteboard creation—use domain events             |
| How to handle rollback?                    | TypeORM transactions with automatic rollback on exception                           |
| Where to log audit trail?                  | Reuse existing logging patterns (`winston`, `LogContext.AUTHORIZATION`)             |

---

## Technology Stack Summary

| Component | Technology     | Purpose                                       |
| --------- | -------------- | --------------------------------------------- |
| Language  | TypeScript 5.3 | Type-safe implementation                      |
| Framework | NestJS 10.x    | DI, module boundaries, decorators             |
| ORM       | TypeORM 0.3.x  | Transaction management, bulk operations       |
| Database  | MySQL 8        | JSON column for settings, transaction support |
| Testing   | Jest           | Unit + integration tests                      |
| Logging   | Winston        | Structured logging                            |
| Metrics   | Elastic APM    | Performance profiling                         |
| Events    | EventEmitter2  | In-process domain events                      |

---

## Implementation Readiness

✅ All technical unknowns resolved
✅ Integration points identified
✅ Performance strategy defined
✅ Observability plan complete
✅ Ready for Phase 1 (Data Model & Contracts)
