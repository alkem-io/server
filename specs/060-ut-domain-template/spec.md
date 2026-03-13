# Specification: Unit Tests for src/domain/template

## Objective
Achieve >=80% test coverage for the `src/domain/template` area by adding unit tests for untested services, authorization services, license services, and resolvers.

## Scope
- **In scope**: All `.service.ts`, `.service.authorization.ts`, `.service.license.ts`, `.resolver.fields.ts`, `.resolver.mutations.ts` files under `src/domain/template/`
- **Out of scope**: `.entity.ts`, `.interface.ts`, `.module.ts`, `.dto.ts`, `.input.ts`, `.enum.ts`, `.type.ts`, `.types.ts`, `.constants.ts`, `index.ts`

## Current State
- 8 existing test files covering 119 tests
- Coverage: ~53.55% statements
- Authorization services, license services, and most resolvers have no tests

## Files Needing New Tests
1. `template/template.service.authorization.ts` - TemplateAuthorizationService
2. `template-content-space/template.content.space.service.authorization.ts` - TemplateContentSpaceAuthorizationService
3. `template-content-space/template.content.space.service.license.ts` - TemplateContentSpaceLicenseService
4. `template-content-space/template.content.space.resolver.fields.ts` - TemplateContentSpaceResolverFields
5. `template-content-space/template.content.space.resolver.mutations.ts` - TemplateContentSpaceResolverMutations
6. `template-default/template.default.service.authorization.ts` - TemplateDefaultAuthorizationService
7. `template-default/template.default.resolver.fields.ts` - TemplateDefaultResolverFields
8. `template/template.resolver.fields.ts` - TemplateResolverFields
9. `templates-set/templates.set.service.authorization.ts` - TemplatesSetAuthorizationService
10. `templates-set/templates.set.resolver.fields.ts` - TemplatesSetResolverFields
11. `templates-set/templates.set.resolver.mutations.ts` - TemplatesSetResolverMutations
12. `templates-manager/templates.manager.service.authorization.ts` - TemplatesManagerAuthorizationService
13. `templates-manager/templates.manager.resolver.fields.ts` - TemplatesManagerResolverFields
14. `templates-manager/templates.manager.resolver.mutations.ts` - TemplatesManagerResolverMutations
15. `template-applier/template.applier.resolver.mutations.ts` - TemplateApplierResolverMutations

## Testing Strategy
- Use Vitest 4.x globals with NestJS Test module
- Mock all dependencies using `defaultMockerFactory` and manual constructor injection
- Follow existing test patterns from the codebase
- Focus on branch coverage for authorization switch statements
