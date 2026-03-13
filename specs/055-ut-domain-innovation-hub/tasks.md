# Tasks: Unit Tests for `src/domain/innovation-hub`

## Task 1: Create authorization service tests
- [x] File: `innovation.hub.service.authorization.spec.ts`
- [x] Test `applyAuthorizationPolicy` happy path
- [x] Test `applyAuthorizationPolicy` missing profile error
- [x] Test `extendAuthorizationPolicyRules` via applyAuthorizationPolicy
- [x] Test null authorization guard in extendAuthorizationPolicyRules

## Task 2: Create field resolver tests
- [x] File: `innovation.hub.resolver.fields.spec.ts`
- [x] Test `spaceListFilter` returns ordered spaces
- [x] Test `spaceListFilter` returns undefined for null filter
- [x] Test `provider` delegates to service

## Task 3: Create mutation resolver tests
- [x] File: `innovation.hub.resolver.mutations.spec.ts`
- [x] Test `updateInnovationHub` authorization + delegation
- [x] Test `deleteInnovationHub` authorization + delegation

## Task 4: Verify coverage
- [x] Run coverage report and confirm >= 80%
- [x] Run lint and type check
