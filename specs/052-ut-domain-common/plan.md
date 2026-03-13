# Plan: Unit Tests for src/domain/common

## Phase 1: Simple Services & Factories
- **nvp.factory.spec.ts**: Test `toNVPArray` method - pure transformation logic
- **profile.avatar.service.spec.ts**: Test URL validation, avatar source selection logic

## Phase 2: Authorization Services (Simple)
- **license.service.authorization.spec.ts**: Synchronous, no DB calls, inherits + pushes rules
- **visual.service.authorization.spec.ts**: Synchronous, inherits + appends privilege rules
- **classification.service.authorization.spec.ts**: Async, loads entity, iterates tagsets

## Phase 3: Authorization Services (Complex)
- **media.gallery.service.authorization.spec.ts**: Loads entity with storage bucket, visual auth delegation
- **memo.service.authorization.spec.ts**: Credential rules based on createdBy, privilege rules based on contentUpdatePolicy
- **profile.service.authorization.spec.ts**: Complex relations loading, iterates references/tagsets/visuals/storageBucket
- **knowledge.base.service.authorization.spec.ts**: Credential definitions, calloutsSet delegation
- **whiteboard.service.authorization.spec.ts**: Most complex - guest access, space settings, community resolution

## Approach

Each authorization service test follows the same pattern:
1. Set up NestJS Test module with the service under test
2. Mock all dependencies using `defaultMockerFactory`
3. Test `applyAuthorizationPolicy` with valid inputs
4. Test error paths (missing relations throwing RelationshipNotFoundException)
5. Test credential rule generation based on entity state (e.g., createdBy present/absent)

## Risk Assessment

- **Low risk**: Factory and simple authorization services - pure logic, easy to mock
- **Medium risk**: Complex authorization services - deep dependency chains, many relation loads
- **Mitigation**: Use `defaultMockerFactory` which auto-creates mocks for class-based tokens
