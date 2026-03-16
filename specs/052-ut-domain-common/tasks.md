# Tasks: Unit Tests for src/domain/common

## Task 1: NVP Factory Service Test
- [ ] Create `src/domain/common/nvp/nvp.factory.spec.ts`
- [ ] Test `toNVPArray` with valid input, empty input

## Task 2: Profile Avatar Service Test
- [ ] Create `src/domain/common/profile/profile.avatar.service.spec.ts`
- [ ] Test `addAvatarVisualToProfile` with explicit avatar URL, Kratos URL, generated avatar
- [ ] Test `isValidHttpUrl` edge cases via integration through public methods

## Task 3: License Authorization Service Test
- [ ] Create `src/domain/common/license/license.service.authorization.spec.ts`
- [ ] Test `applyAuthorizationPolicy` inherits parent auth and pushes credential rules

## Task 4: Visual Authorization Service Test
- [ ] Create `src/domain/common/visual/visual.service.authorization.spec.ts`
- [ ] Test `applyAuthorizationPolicy` inherits parent auth and appends privilege rules

## Task 5: Classification Authorization Service Test
- [ ] Create `src/domain/common/classification/classification.service.authorization.spec.ts`
- [ ] Test `applyAuthorizationPolicy` with valid classification (tagsets inherit)
- [ ] Test error when relations not loaded

## Task 6: Media Gallery Authorization Service Test
- [ ] Create `src/domain/common/media-gallery/media.gallery.service.authorization.spec.ts`
- [ ] Test `applyAuthorizationPolicy` with/without createdBy
- [ ] Test error when storageBucket not loaded

## Task 7: Memo Authorization Service Test
- [ ] Create `src/domain/common/memo/memo.service.authorization.spec.ts`
- [ ] Test credential rules with/without createdBy
- [ ] Test privilege rules for each ContentUpdatePolicy

## Task 8: Profile Authorization Service Test
- [ ] Create `src/domain/common/profile/profile.service.authorization.spec.ts`
- [ ] Test `applyAuthorizationPolicy` iterates all child entities
- [ ] Test error when relations not loaded

## Task 9: Knowledge Base Authorization Service Test
- [ ] Create `src/domain/common/knowledge-base/knowledge.base.service.authorization.spec.ts`
- [ ] Test with visible/not visible knowledge base contents
- [ ] Test credential criteria propagation

## Task 10: Whiteboard Authorization Service Test
- [ ] Create `src/domain/common/whiteboard/whiteboard.service.authorization.spec.ts`
- [ ] Test credential rules with/without createdBy
- [ ] Test privilege rules for each ContentUpdatePolicy
- [ ] Test guest access handling

## Task 11: Verification
- [ ] Run full test suite for domain/common
- [ ] Verify >=80% coverage
- [ ] Run lint
- [ ] Run type check
