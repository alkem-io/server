# Plan: Unit Tests for src/domain/access

## Strategy
Focus on high-coverage-impact files first, using NestJS Test module with mocked dependencies.

## Phase 1: Service Tests (highest coverage impact)
1. Extend `role.set.service.spec.ts` with tests for: getRoleSetOrFail, createRoleSet, removeRoleSetOrFail, getRolesForActorContext, isMember, isInRole, getApplications, getInvitations, getRoleDefinitions, getRoleNames, etc.
2. Create `application.service.lifecycle.spec.ts` - test getState, getNextEvents, isFinalState
3. Create `invitation.service.lifecycle.spec.ts` - test getState, getNextEvents, isFinalState

## Phase 2: Authorization Service Tests
4. Create `application.service.authorization.spec.ts`
5. Create `invitation.service.authorization.spec.ts`
6. Create `platform.invitation.service.authorization.spec.ts`
7. Create `role.set.service.authorization.spec.ts`

## Phase 3: Additional Service Tests
8. Create `role.set.service.events.spec.ts`
9. Create `role.set.service.license.spec.ts`
10. Create `role.set.service.lifecycle.application.spec.ts`
11. Create `role.set.service.lifecycle.invitation.spec.ts`

## Phase 4: Resolver Tests
12. Create field resolver specs for application, invitation, invitation.platform, role, role-set
13. Create mutation resolver specs where missing

## Phase 5: Data Loader and Misc Tests
14. Create `role.set.data.loaders.actor.roles.spec.ts`
15. Test `actor.role.policy.ts`

## Risk Mitigation
- The role-set service is very large (~1890 lines); focus on the most testable public methods
- Authorization services depend on complex service interactions; mock heavily
- Resolver files are mostly thin wrappers; test instantiation + key delegation patterns
