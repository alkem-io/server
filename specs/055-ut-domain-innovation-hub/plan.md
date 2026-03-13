# Plan: Unit Tests for `src/domain/innovation-hub`

## Phase 1: Authorization Service Tests

Create `innovation.hub.service.authorization.spec.ts` covering:
- `applyAuthorizationPolicy` - happy path with profile loaded
- `applyAuthorizationPolicy` - throws when profile is missing
- `extendAuthorizationPolicyRules` - adds credential rules for admins
- `extendAuthorizationPolicyRules` - throws when authorization is not initialized

## Phase 2: Field Resolver Tests

Create `innovation.hub.resolver.fields.spec.ts` covering:
- `spaceListFilter` - returns spaces when filter exists
- `spaceListFilter` - returns undefined when filter is null
- `spaceListFilter` - preserves order from filter
- `provider` - delegates to service

## Phase 3: Mutation Resolver Tests

Create `innovation.hub.resolver.mutations.spec.ts` covering:
- `updateInnovationHub` - checks authorization and delegates to service
- `deleteInnovationHub` - checks authorization and delegates to service

## Phase 4: Verification

- Run `npx vitest run --coverage` to confirm >= 80% coverage
- Run `pnpm lint` and `pnpm exec tsc --noEmit` to ensure no regressions
