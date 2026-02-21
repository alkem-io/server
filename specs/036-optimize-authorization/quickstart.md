# Quickstart: Optimize Credential-Based Authorization

**Branch**: `036-optimize-authorization` | **Date**: 2026-02-21

## Prerequisites

- Node.js 22 LTS (Volta: 22.21.1)
- pnpm 10.17.1
- Docker + Docker Compose (for services)
- PostgreSQL 17.5 running (via docker compose or standalone)

## Setup

```bash
# Clone and checkout branch
git checkout 036-optimize-authorization

# Install dependencies
pnpm install

# Start backing services
pnpm run start:services

# Run migrations
pnpm run migration:run

# Start dev server
pnpm start:dev
```

## Key Files to Modify

### Phase 1: Shared Inherited Rule Sets (Storage Reduction)

| File | Purpose |
|---|---|
| `src/domain/common/inherited-credential-rule-set/inherited.credential.rule.set.entity.ts` | **NEW** — Entity with `credentialRules` JSONB + `parentAuthorizationPolicyId` UNIQUE FK |
| `src/domain/common/inherited-credential-rule-set/inherited.credential.rule.set.interface.ts` | **NEW** — Interface extending IBaseAlkemio |
| `src/domain/common/inherited-credential-rule-set/inherited.credential.rule.set.service.ts` | **NEW** — `resolveForParent()` (find by parent FK, create/update) |
| `src/domain/common/inherited-credential-rule-set/inherited.credential.rule.set.module.ts` | **NEW** — NestJS module, exports service |
| `src/domain/common/authorization-policy/authorization.policy.entity.ts` | Add ManyToOne FK to `InheritedCredentialRuleSet` (eager: true) |
| `src/domain/common/authorization-policy/authorization.policy.interface.ts` | Add `inheritedCredentialRuleSet` field |
| `src/domain/common/authorization-policy/authorization.policy.service.ts` | Modify `inheritParentAuthorization()` — read transient `_childInheritedCredentialRuleSet` from parent |
| `src/domain/common/authorization-policy/authorization.policy.interface.ts` | Add `_childInheritedCredentialRuleSet` transient field |
| `src/domain/common/authorization-policy/authorization.policy.module.ts` | Import `InheritedCredentialRuleSetModule` |
| `src/core/authorization/authorization.service.ts` | Modify `isAccessGrantedForCredentials()` — evaluate inherited + local rules |
| `src/migrations/<timestamp>-sharedInheritedRuleSets.ts` | **NEW** — Create table, add FK column |
| ~15-20 parent authorization service files | Add `resolveForParent()` call before child propagation, inject `InheritedCredentialRuleSetService` |

### Phase 2: Reset Optimization

| File | Purpose |
|---|---|
| `src/domain/space/account/account.service.authorization.ts` | Account tree root — batch load, remove intermediate save |
| `src/domain/space/space/space.service.authorization.ts` | Space subtree — pre-loaded entity acceptance, parallel subspaces, eliminate intermediate saves |
| `src/domain/collaboration/collaboration/collaboration.service.authorization.ts` | Collaboration subtree — accept pre-loaded entities |
| `src/domain/collaboration/callouts-set/callouts.set.service.authorization.ts` | CalloutsSet — accept pre-loaded callouts |
| `src/domain/collaboration/callout/callout.service.authorization.ts` | Individual callout — accept pre-loaded entity |
| `src/domain/community/community/community.service.authorization.ts` | Community subtree — accept pre-loaded entities |
| `src/domain/common/authorization-policy/authorization.policy.service.ts` | `saveAll()` — APM spans |
| `src/services/auth-reset/subscriber/auth-reset.controller.ts` | RabbitMQ consumer — add APM instrumentation, timing logs |
| `src/services/auth-reset/publisher/auth-reset.service.ts` | Event publisher — add APM spans for publishResetAll |

### Observability

| File | Purpose |
|---|---|
| `src/apm/apm.ts` | Existing APM agent — no changes |
| `src/apm/decorators/util/instrument.method.ts` | Existing span utility — can use or extend |

## Testing

### Running the test suite

```bash
# Full CI tests
pnpm test:ci:no:coverage

# Run specific authorization tests
pnpm test -- src/domain/common/authorization-policy/authorization.policy.service.spec.ts
pnpm test -- src/core/authorization/authorization.service.spec.ts

# Run all authorization-related tests
pnpm test -- --testPathPattern="authorization"
```

### Manual verification

1. Start the server with services
2. Use GraphQL playground (`/graphiql`) to:
   - Create a space with subspaces
   - Trigger authorization reset via admin mutation
   - Verify access permissions are unchanged
3. Check server logs for reset timing and policy counts
4. After Phase 1: check `inherited_credential_rule_set` table for parent-owned rows

### Benchmark

To measure reset performance before/after:

1. Create a test account with the hierarchy: 3 L0 spaces, each with 5 L1 subspaces, each with 3 L2 sub-subspaces
2. Trigger `authorizationPolicyResetOnAccount` mutation
3. Measure wall-clock time from log entries:
   - Look for `Starting reset of authorization for account`
   - Look for `Finished resetting authorization for account`
4. Compare duration before and after optimization

To measure storage reduction (Phase 1):

```sql
-- Before migration
SELECT pg_total_relation_size('authorization_policy') AS before_size;

-- After migration + full reset
SELECT pg_total_relation_size('authorization_policy') AS after_policy_size;
SELECT pg_total_relation_size('inherited_credential_rule_set') AS shared_size;
-- Reduction = 1 - (after_policy_size + shared_size) / before_size
```

## Architecture Quick Reference

```
AuthResetService (publisher)
  └─ publishes to RabbitMQ queue ──────────────────────────────────────────────┐
                                                                               │
AuthResetController (consumer)                                                 │
  ├─ authResetAccount()  ◄─────────────────────────────────────────────────────┤
  │     └─ AccountAuthorizationService.applyAuthorizationPolicy()              │
  │           ├─ reset account policy                                          │
  │           ├─ extend with account rules                                     │
  │           ├─ propagate to children                                         │
  │           │     ├─ SpaceAuthorizationService.applyAuthorizationPolicy()    │
  │           │     │     ├─ inheritParentAuthorization()                      │
  │           │     │     │     └─ Phase 1: resolveForParent(parentPolicy)     │
  │           │     │     ├─ extendAuthorizationPolicyLocal() (local rules)    │
  │           │     │     ├─ propagate to child entities                       │
  │           │     │     └─ for each subspace: recurse                        │
  │           │     ├─ VirtualContributorAuthorizationService                  │
  │           │     ├─ InnovationPackAuthorizationService                      │
  │           │     └─ InnovationHubAuthorizationService                       │
  │           └─ saveAll() (single bulk save at end)                           │
  ├─ authResetUser() ◄────────────────────────────────────────────────────────┤
  ├─ authResetOrganization() ◄─────────────────────────────────────────────────┤
  ├─ authResetPlatform() ◄────────────────────────────────────────────────────┤
  └─ authResetAiServer() ◄────────────────────────────────────────────────────┘
```
