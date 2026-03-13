# Plan: Unit Tests for `src/domain/collaboration`

## Phase 1: Authorization Services (highest impact)

1. `InnovationFlowStateAuthorizationService` - simple, standalone, good starting point
2. `LinkAuthorizationService` - small service, 2 methods
3. `PostAuthorizationService` - medium complexity
4. `CalloutFramingAuthorizationService` - medium, delegates to child services
5. `InnovationFlowAuthorizationService` - medium, has state iteration
6. `CalloutsSetAuthorizationService` - medium, has privilege rules
7. `CalloutContributionAuthorizationService` - complex, many child entity types
8. `CalloutAuthorizationService` - most complex, DRAFT visibility logic
9. `CollaborationAuthorizationService` - orchestrator, many dependencies

## Phase 2: License & Utility Services

10. `CollaborationLicenseService` - license entitlement logic
11. `sortBySortOrder` utility - pure function, trivial

## Phase 3: Verification

- Run full test suite
- Check coverage report
- Fix any TypeScript/lint issues

## Risk Mitigation

- Authorization services have many dependencies; rely on `defaultMockerFactory` for auto-mocking
- Focus on branch coverage for conditional logic (e.g., DRAFT visibility, optional child entities)
