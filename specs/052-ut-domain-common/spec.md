# Specification: Unit Tests for src/domain/common

## Objective

Achieve >=80% test coverage for all service, authorization, and factory files within `src/domain/common/` by adding unit tests co-located with source files.

## Scope

### In Scope
- All `*.service.ts` files without existing tests or with low coverage
- All `*.service.authorization.ts` files (authorization policy application logic)
- `nvp.factory.ts` (NVP factory service)
- `profile.avatar.service.ts` (avatar management)

### Out of Scope
- Entity files (`*.entity.ts`)
- Interface files (`*.interface.ts`)
- Module files (`*.module.ts`)
- DTO/Input files (`*.dto.*.ts`, `*.input.ts`)
- Enum files (`*.enum.ts`)
- Type files (`*.type.ts`, `*.types.ts`)
- Constants files (`*.constants.ts`)
- Index files (`index.ts`)
- Resolver field files (`*.resolver.fields.ts`) - thin delegation, low value
- Resolver mutation files (`*.resolver.mutations.ts`) - already have some coverage, complex DI

## Test Strategy

- Use Vitest 4.x with globals enabled
- Use NestJS Test module for DI bootstrapping
- Mock external dependencies with `defaultMockerFactory`
- Mock repositories with `repositoryProviderMockFactory`
- Mock Winston logger with `MockWinstonProvider`
- Mock cache with `MockCacheManager`
- Co-locate test files with source files (e.g., `service.spec.ts` next to `service.ts`)

## Existing Test Files (25)

Already have tests: authorization-policy, classification, form, knowledge-base, license-entitlement, license, lifecycle, location, media-gallery, memo, nvp, profile (service + resolver), reference (service + resolver), tagset-template-set, tagset-template, tagset, visual (service + resolver + image compression + image conversion), whiteboard (service + resolver.mutations + guest-access)

## Files Needing New Tests

1. `nvp/nvp.factory.ts` - NVPFactoryService
2. `profile/profile.avatar.service.ts` - ProfileAvatarService
3. `classification/classification.service.authorization.ts` - ClassificationAuthorizationService
4. `license/license.service.authorization.ts` - LicenseAuthorizationService
5. `visual/visual.service.authorization.ts` - VisualAuthorizationService
6. `media-gallery/media.gallery.service.authorization.ts` - MediaGalleryAuthorizationService
7. `memo/memo.service.authorization.ts` - MemoAuthorizationService
8. `profile/profile.service.authorization.ts` - ProfileAuthorizationService
9. `knowledge-base/knowledge.base.service.authorization.ts` - KnowledgeBaseAuthorizationService
10. `whiteboard/whiteboard.service.authorization.ts` - WhiteboardAuthorizationService
