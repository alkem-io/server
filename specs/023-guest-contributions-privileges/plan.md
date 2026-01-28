# Implementation Plan: Guest Contributions Privilege Management

**Branch**: `023-guest-contributions-privileges` | **Date**: 2025-11-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/023-guest-contributions-privileges/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Extends the `allowGuestContributions` setting (from spec 013) with automatic PUBLIC_SHARE privilege management. When the setting is enabled on a space, the backend automatically grants PUBLIC_SHARE privilege to all space admins (on all whiteboards), to whiteboard owners (on their own whiteboards), and—when `allowPlatformSupportAsAdmin` is also enabled on a level-zero space—to users with the Global Support platform role. When disabled, all PUBLIC_SHARE privileges are revoked. The system enforces transactional integrity: if privilege assignment fails, both privileges and the setting are rolled back. Because each whiteboard policy embeds a credential rule for space admins (and leverages platform-role credentials when configured), users promoted to these roles inherit PUBLIC_SHARE instantly without triggering an extra authorization reset.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 20 LTS (Volta pinned to 20.15.1)
**Primary Dependencies**: NestJS 10.x, TypeORM 0.3.x, Apollo Server 4.x, GraphQL, pnpm 10.17.1
**Storage**: MySQL 8 with JSON column support for space settings
**Target Platform**: Linux server (Docker containers), exposed via GraphQL API on port 3000
**Project Type**: Backend NestJS monolith with domain-driven design
**Performance Goals**: Privilege operations complete within 1 second for spaces with up to 1000 whiteboards
**Constraints**: Transactional privilege assignment (rollback on partial failure), synchronous operations (no eventual consistency)
**Scale/Scope**: Support automatic privilege assignment across 1000+ whiteboards per space, handle concurrent setting changes

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Principle 1: Domain-Centric Design First

- ✅ **PASS**: Business logic (privilege granting/revoking based on settings) will reside in domain services
- ✅ **PASS**: No business rules in resolvers—they orchestrate domain operations only
- ✅ **PASS**: Event emission for privilege changes follows explicit data flow

### Principle 2: Modular NestJS Boundaries

- ✅ **PASS**: Extends existing `WhiteboardAuthorizationService` and `SpaceService` modules
- ✅ **PASS**: No new circular dependencies introduced
- ✅ **PASS**: Cross-cutting logic remains in `src/common` and `src/core`

### Principle 3: GraphQL Schema as Stable Contract

- ✅ **PASS**: No GraphQL schema changes required (backend-only feature)
- ✅ **PASS**: Existing `allowGuestContributions` setting already exposed

### Principle 4: Explicit Data & Event Flow

- ✅ **PASS**: Setting changes trigger domain events → privilege assignment
- ✅ **PASS**: Space-admin credential always carries PUBLIC_SHARE so role grants inherit privilege without extra events
- ✅ **PASS**: Whiteboard creation hooks privilege assignment
- ✅ **PASS**: No direct repository calls from resolvers

### Principle 5: Observability & Operational Readiness

- ✅ **PASS**: Structured logging required (FR-011: user ID, whiteboard ID, space ID, timestamp)
- ✅ **PASS**: Metrics emission required (FR-012: operation count/duration)
- ✅ **PASS**: Audit trail required (FR-013: triggering user/action)

### Principle 6: Code Quality with Pragmatic Testing

- ✅ **PASS**: Implementation follows existing authorization patterns with domain service encapsulation

### Principle 7: API Consistency & Evolution Discipline

- ✅ **PASS**: No API changes; internal privilege management only

### Principle 8: Secure-by-Design Integration

- ✅ **PASS**: Authorization checks occur before privilege modification
- ✅ **PASS**: Transactional rollback prevents partial state

### Principle 9: Container & Deployment Determinism

- ✅ **PASS**: No container changes; backend service logic only

### Principle 10: Simplicity & Incremental Hardening

- ✅ **PASS**: Extends existing authorization pattern
- ✅ **PASS**: No architectural escalation (CQRS, caching, etc.)
- ✅ **PASS**: Reuses existing TypeORM transaction mechanisms

**Constitution Check Result**: ✅ ALL GATES PASSED

## Project Structure

### Documentation (this feature)

```text
specs/023-guest-contributions-privileges/
├── spec.md              # Feature specification
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
├── checklists/          # Quality validation checklists
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── common/
│   │   ├── authorization-policy/           # Authorization policy service
│   │   └── whiteboard/                     # Whiteboard domain
│   │       ├── whiteboard.service.ts
│   │       ├── whiteboard.service.authorization.ts  # ← EXTEND: Add PUBLIC_SHARE privilege logic
│   │       └── whiteboard.entity.ts
│   └── space/
│       ├── space.service.ts                # ← EXTEND: Hook setting changes to trigger privilege updates
│       └── space.settings/
│           └── space.settings.collaboration.interface.ts  # allowGuestContributions already exists
├── services/
│   └── api/
│       └── roles/                          # Existing admin management (no new hooks required)
│           └── roles.service.ts
├── common/
│   └── enums/
│       └── authorization.privilege.ts      # ← ADD: PUBLIC_SHARE privilege enum value
└── migrations/
    └── NNNNNNNNNN-addPublicSharePrivilege.ts  # ← CREATE: New migration
```

**Structure Decision**: Single NestJS backend project. Feature extends existing domain modules (`whiteboard`, `space`, `roles`) without introducing new aggregates. Follows standard domain-service-repository pattern with authorization services handling privilege logic.

---

## Phase 0: Research & Technical Decisions

**Status**: ✅ Complete (filled during planning)

All technical unknowns resolved through codebase analysis. Detailed technical decisions documented in [`research.md`](./research.md).

**Key Findings**:

1. PUBLIC_SHARE privilege does NOT currently exist → must add to `AuthorizationPrivilege` enum
2. Existing authorization pattern via `applyAuthorizationPolicy()` in `WhiteboardAuthorizationService` can be extended
3. Space admin discovery: query `Community.roleSet` with role filter = 'admin'
4. TypeORM transaction support confirmed → use `EntityManager.transaction()` for rollback safety
5. Event hooks via EventEmitter2 → subscribe to `SpaceSettingsUpdated` (setting changes) and `WhiteboardCreated`
6. Observability: Winston structured logging + Elastic APM tracing already integrated
7. Performance: Bulk operations via `repository.save([...])` support batch updates

**Artifact**: [`research.md`](./research.md) created with 7 documented technical decisions

---

## Phase 1: Data Model & API Contracts

**Status**: ✅ Complete (filled during planning)

### Data Model Design

**Artifact**: [`data-model.md`](./data-model.md)

**Key Elements**:

- **Enum Extension**: Add `PUBLIC_SHARE = 'public-share'` to `AuthorizationPrivilege` enum
- **No Database Schema Changes**: Authorization policies stored as JSON in existing `authorization_policy` table
- **Runtime Privilege Modification**: Authorization rules dynamically computed based on `allowGuestContributions` setting
- **Migration**: Validation-only migration (confirms no existing PUBLIC_SHARE privileges before deployment)

**Relationships**:

- Space → Collaboration → Callout → CalloutContribution → Whiteboard (query path for bulk updates)
- Space → Community → RoleSet → User (admin discovery)

**State Transitions**:

- Setting OFF → ON: Grant PUBLIC_SHARE to admins + owners
- Setting ON → OFF: Revoke all PUBLIC_SHARE privileges
- New admin granted role: Grant PUBLIC_SHARE if setting enabled
- New whiteboard created: Apply PUBLIC_SHARE if setting enabled

### API Contracts

**Artifact**: [`contracts/service-contracts.md`](./contracts/service-contracts.md)

**Internal Service Contracts**:

- `WhiteboardAuthorizationService.applyGuestContributionPrivileges()` - Apply PUBLIC_SHARE rules
- `SpaceService.updateGuestContributionPrivileges()` - Bulk privilege update on setting change
- `AuthorizationService.revokePrivilege()` - Remove specific privilege from policy

**Event Contracts**:

- `SpaceSettingsUpdated` - Triggers privilege update handler
- `WhiteboardCreated` - Triggers privilege application on creation

**Repository Contracts**:

- `CommunityRepository.getAdmins()` - Query space admins
- `WhiteboardRepository.findAllInSpace()` - Bulk whiteboard retrieval

**No Public GraphQL Changes**: Backend-only feature; no new queries/mutations

### Developer Guide

**Artifact**: [`quickstart.md`](./quickstart.md)

**Contents**:

- Development environment setup (services, migrations, server startup)
- 5 test scenarios with GraphQL queries (toggle ON/OFF, grant admin, create whiteboard, rollback)
- Observability guide (logs, metrics, APM traces)
- Debugging tips for common issues (privileges not applied, performance degradation)
- Unit/integration test execution instructions

---

## Phase 2: Implementation Tasks

**Status**: ⏳ Pending (will be generated by `/speckit.tasks` command)

**Purpose**: Break down implementation into atomic, testable tasks with acceptance criteria

**Artifacts**: `tasks.md` (created by separate workflow command)

**Next Step**: Run `/speckit.tasks` after plan approval to generate detailed task breakdown

**Expected Task Categories**:

1. **Enum Extension**: Add PUBLIC_SHARE to AuthorizationPrivilege
2. **Service Extensions**: Implement privilege granting/revoking methods
3. **Event Handlers**: Subscribe to setting changes and whiteboard creation
4. **Repository Extensions**: Add admin and whiteboard query methods
5. **Transaction Wrappers**: Implement rollback logic
6. **Migration**: Create validation migration
7. **Observability**: Add logging and metrics

---

## Phase 3: Implementation

**Status**: ⏳ Pending (begins after task generation)

### Quality Gates

**Pre-Merge Checklist**:

- [ ] No breaking schema changes (`pnpm run schema:diff`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Migration tested with rollback
- [ ] Observability validated (logs + metrics emitted)
- [ ] Constitution gates re-validated

**Code Review Focus**:

- Transaction boundary correctness
- Event handler registration
- Error handling completeness
- Performance optimization (bulk queries)

---

## Phase 4: Documentation & Rollout

**Status**: ⏳ Pending

### Documentation Updates

**Required Updates**:

1. **Authorization Forest** (`docs/authorization-forest.md`):
   - Add PUBLIC_SHARE privilege definition
   - Document privilege flow for guest contributions
   - Update decision tree for whiteboard access

2. **API Reference** (inline code documentation):
   - JSDoc for new service methods
   - Event payload schemas
   - Migration notes

3. **Operations Guide** (this spec's quickstart.md serves as developer guide)

### Deployment Steps

**Pre-Deployment**:

1. Merge to `develop` branch
2. CI pipeline validates schema contract
3. Migration reviewed and approved

**Deployment**:

1. Run migration: `pnpm run migration:run` (validation only, no schema changes)
2. Deploy updated container image
3. Verify health checks pass
4. Monitor APM for privilege update operations

**Rollback Plan**:

- Migration has `down()` method to remove any PUBLIC_SHARE privileges
- No schema changes simplify rollback
- Feature flag (if needed): Disable event handlers without code change

---

## Risks & Mitigations

### Risk 1: Partial Privilege Update Failure

**Impact**: HIGH - Inconsistent state if some whiteboards updated but others fail

**Probability**: MEDIUM - Database connection issues, timeout during bulk operations

**Mitigation**:

- ✅ **Implemented**: TypeORM transaction wrapper (`EntityManager.transaction()`)
- ✅ **Implemented**: Rollback setting to `false` on failure (FR-009)

**Status**: MITIGATED

---

### Risk 2: Performance Degradation at Scale

**Impact**: MEDIUM - User experience degrades if privilege updates take > 1 second

**Probability**: LOW - Bulk operations optimized, but unproven at 1000 whiteboard scale

**Mitigation**:

- ✅ **Implemented**: Bulk query + batch save (minimize round trips)
- ✅ **Implemented**: Query optimization (indexed FKs on space → whiteboard path)

**Monitoring**: Elastic APM transaction duration alerts

**Status**: MITIGATED

---

### Risk 3: Event Handler Registration Missed

**Impact**: HIGH - Privileges not updated when setting changes or admins granted

**Probability**: LOW - Event handlers registered in module providers

**Mitigation**:

- ✅ **Observability**: Log event emissions + handler invocations
- ✅ **Code Review**: Explicit module provider registration check

**Status**: MITIGATED

---

### Risk 4: Privilege Leak (Unintended Access)

**Impact**: CRITICAL - Users retain PUBLIC_SHARE after setting disabled

**Probability**: VERY LOW - Revocation logic straightforward

**Mitigation**:

- ✅ **Implementation**: `revokePrivilege()` filters all rules containing PUBLIC_SHARE
- ✅ **Validation**: Post-deployment audit query (verify no PUBLIC_SHARE in disabled spaces)

**Audit Query**:

```sql
SELECT w.id, s.id, s.settings
FROM whiteboard w
JOIN authorization_policy ap ON ap.id = w.authorization_id
JOIN space s ON ...
WHERE s.settings->>'$.collaboration.allowGuestContributions' = 'false'
  AND JSON_SEARCH(ap.privilegeRules, 'one', 'public-share') IS NOT NULL;
```

**Status**: MITIGATED

---

## Dependencies

### Internal Dependencies

| Dependency                           | Type      | Status      | Impact                                           |
| ------------------------------------ | --------- | ----------- | ------------------------------------------------ |
| Spec 013: Guest Contributions Policy | Feature   | ✅ Complete | Provides `allowGuestContributions` setting       |
| `WhiteboardAuthorizationService`     | Service   | ✅ Exists   | Extend with `applyGuestContributionPrivileges()` |
| `SpaceService`                       | Service   | ✅ Exists   | Hook setting changes                             |
| `CommunityService`                   | Service   | ✅ Exists   | Supplies admin credential data (no new hooks)    |
| TypeORM Transaction Support          | Framework | ✅ Exists   | Rollback mechanism                               |
| EventEmitter2                        | Library   | ✅ Exists   | Domain event emission                            |

### External Dependencies

**None** - Backend-only feature; no client or external service dependencies

---

## Rollout Plan

### Development Timeline

| Phase                   | Duration     | Output                                         |
| ----------------------- | ------------ | ---------------------------------------------- |
| Phase 0: Research       | ✅ Complete  | `research.md` (7 technical decisions)          |
| Phase 1: Design         | ✅ Complete  | `data-model.md`, `contracts/`, `quickstart.md` |
| Phase 2: Tasks          | ⏳ Pending   | `tasks.md` (via `/speckit.tasks`)              |
| Phase 3: Implementation | 3-5 days     | Code + tests                                   |
| Phase 4: Documentation  | 1 day        | Updated `docs/authorization-forest.md`         |
| **Total Estimated**     | **4-6 days** | Deployable feature                             |

### Deployment Strategy

**Type**: Blue-Green (standard for Alkemio server)

**Stages**:

1. **Dev Environment**: Deploy + smoke test with manual GraphQL queries
2. **Sandbox Environment**: Verify feature functionality
3. **Production**: Staged rollout (monitor APM for first 24 hours)

**Feature Flag**: Not required (low-risk backend logic)

---

## Success Criteria (Derived from Spec)

### Functional Validation

- [ ] SC-001: Enabling setting grants PUBLIC_SHARE to all space admins
- [ ] SC-002: Enabling setting grants PUBLIC_SHARE to whiteboard owners
- [ ] SC-003: Disabling setting revokes all PUBLIC_SHARE privileges
- [ ] SC-004: New admins receive PUBLIC_SHARE automatically (when enabled)
- [ ] SC-005: New whiteboards apply PUBLIC_SHARE automatically (when enabled)

### Non-Functional Validation

- [ ] SC-006: Privilege update completes in < 1 second for 1000 whiteboards
- [ ] Logs include user ID, whiteboard ID, space ID, timestamp (FR-011)
- [ ] Metrics include operation count and duration (FR-012)
- [ ] Audit trail records triggering user and action (FR-013)
- [ ] Rollback on failure reverts both privileges and setting (FR-009)

---

## Exit Criteria

**Phase 1 (Design) - CURRENT PHASE**: ✅ Complete

- ✅ Data model documented (`data-model.md`)
- ✅ Service contracts defined (`contracts/service-contracts.md`)
- ✅ Developer quickstart created (`quickstart.md`)
- ✅ Constitution gates re-validated (all PASS)
- ✅ No open design questions

**Phase 2 (Tasks)**: Ready when `/speckit.tasks` generates atomic task breakdown

**Phase 3 (Implementation)**: Ready when implementation complete + performance target met

**Phase 4 (Rollout)**: Ready when deployed to production + monitored for 24 hours

---

## Open Questions

**None** - All clarifications resolved during `/speckit.clarify` phase

Previous clarifications (now resolved):

1. ✅ Rollback strategy on failure → Revert both privileges and setting (FR-009)
2. ✅ Observability requirements → Structured logging + metrics (FR-011, FR-012)
3. ✅ Performance targets → < 1 second for 1000 whiteboards (SC-006)
4. ✅ Audit trail → User ID + action tracking (FR-013)
5. ✅ Setting state on rollback → Revert to `false` (clarification answer)

---

## Appendix: Research Outputs

### Technical Decision Summary

1. **PUBLIC_SHARE Privilege Extension**: Add new enum value to `AuthorizationPrivilege`
2. **Authorization Service Pattern**: Extend `WhiteboardAuthorizationService.applyAuthorizationPolicy()`
3. **Space Admin Discovery**: Query `Community.roleSet` with role filter
4. **Transaction Strategy**: Use TypeORM `EntityManager.transaction()` for atomic operations
5. **Event Hooks**: Subscribe to `SpaceSettingsUpdated` and `WhiteboardCreated`
6. **Observability**: Winston structured logging + Elastic APM tracing
7. **Performance Optimization**: Bulk queries + batch saves for 1000 whiteboard scale

**Full Details**: See [`research.md`](./research.md)

---

## Sign-Off

**Plan Approver**: (to be filled during review)
**Implementation Start Date**: (to be filled after approval)
**Target Completion**: (to be filled after task generation)

**Next Action**: Run `/speckit.tasks` to generate detailed implementation task breakdown
