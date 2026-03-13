# Unit Tests for src/domain/community

## Summary

Add comprehensive unit tests for the `src/domain/community` area to achieve >=80% statement coverage. This covers services, resolvers (fields, mutations, queries, subscriptions), and helper files across 17 untested modules.

## Scope

### In Scope
- All `.service.ts` files without adequate tests (user-identity)
- All `.resolver.fields.ts`, `.resolver.mutations.ts`, `.resolver.queries.ts`, `.resolver.subscriptions.ts` files without tests
- Model card resolver fields

### Out of Scope
- Entity files (`.entity.ts`)
- Interface files (`.interface.ts`)
- Module files (`.module.ts`)
- DTO / Input files
- Enum / Type / Constants files
- Index files

## Files Requiring New Tests (17 total)

| File | Type |
|------|------|
| community-guidelines/community.guidelines.resolver.mutations.ts | Resolver mutations |
| community/community.resolver.fields.ts | Resolver fields |
| organization-verification/organization.verification.resolver.mutations.ts | Resolver mutations |
| organization/organization.resolver.fields.ts | Resolver fields |
| organization/organization.resolver.mutations.ts | Resolver mutations |
| organization/organization.resolver.queries.ts | Resolver queries |
| user-group/user-group.resolver.fields.ts | Resolver fields |
| user-group/user-group.resolver.mutations.ts | Resolver mutations |
| user-identity/user.identity.service.ts | Service |
| user/user.resolver.fields.ts | Resolver fields |
| user/user.resolver.mutations.ts | Resolver mutations |
| user/user.resolver.queries.ts | Resolver queries |
| virtual-contributor-model-card/virtual.contributor.model.card.resolver.fields.ts | Resolver fields |
| virtual-contributor/virtual.contributor.resolver.fields.ts | Resolver fields |
| virtual-contributor/virtual.contributor.resolver.mutations.ts | Resolver mutations |
| virtual-contributor/virtual.contributor.resolver.queries.ts | Resolver queries |
| virtual-contributor/virtual.contributor.resolver.subscriptions.ts | Resolver subscriptions |

## Success Criteria
- All 17 new test files pass
- >=80% statement coverage for `src/domain/community`
- No lint errors
- No TypeScript compilation errors
