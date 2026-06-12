---
description: "Task list for Space Member File Upload for Callout Creation"
---

# Tasks: Space Member File Upload for Callout Creation

**Input**: Design documents from `/specs/102-space-member-file-upload/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/authorization-contract.md, quickstart.md

**Tests**: Targeted unit tests ARE included. Rationale: this is an authorization
change (a domain invariant). Per the constitution's risk-based testing principle and
the explicit verification hooks in `contracts/authorization-contract.md`, unit tests
on the computed authorization policy deliver real signal and are in scope. No e2e or
schema tests are warranted (no schema/API change).

**Organization**: Tasks are grouped by user story. Note that this feature is small
and authorization-only: a single shared rule realizes all three stories, so the US1
implementation (Phase 3) also satisfies the *behavior* asserted by US2 and US3; their
phases add the gating- and scoping-specific assertions and manual verification.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are included in each task.

## Path Conventions

Single-project backend. Source under `src/`, unit specs co-located as
`*.service.authorization.spec.ts`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Introduce the shared, named identifier used by the new authorization rule.

- [X] T001 [P] Add the credential-rule name constant `CREDENTIAL_RULE_SPACE_STORAGE_MEMBER_FILE_UPLOAD` (value `'credentialRule-spaceStorageMemberFileUpload'`) in `src/common/constants/authorization/credential.rule.constants.ts`, placed in alphabetical order near `CREDENTIAL_RULE_SPACE_MEMBERS_READ`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Confirm the injection point. The Space profile authorization step
(`profileAuthorizationService.applyAuthorizationPolicy`) already accepts a
`credentialRulesFromParent` argument that cascades to the profile's storage bucket, so
no plumbing change is required — the gated rule from Phase 3 is passed straight into
this existing parameter.

**⚠️ CRITICAL**: User-story work cannot begin until this phase is complete.

- [X] T002 No code change. Verify that `ProfileAuthorizationService.applyAuthorizationPolicy(profileID, parentAuthorization, credentialRulesFromParent)` in `src/domain/common/profile/profile.service.authorization.ts` pushes `credentialRulesFromParent` onto the profile authorization and that the profile's `storageBucket` inherits cascading rules — i.e. a `cascade: true` rule passed here reaches `space.profile.storageBucket`. (No storage-aggregator change: the grant must NOT land on `directStorage`.)

**Checkpoint**: Injection point confirmed; the Space profile authorization will carry the rule to the Space profile storage bucket.

---

## Phase 3: User Story 1 - Member creates a callout containing an image (Priority: P1) 🎯 MVP

**Goal**: A plain member of a Space whose settings allow members to create callouts
can create a callout with an embedded image without a permission error.

**Independent Test**: As a non-admin member in a setting-ON Space, create a callout
with an embedded image — it succeeds and the image is attached (per
`quickstart.md` → "Verify (happy path — US1)").

### Implementation for User Story 1

- [X] T003 [US1] Add a private helper `getStorageMemberFileUploadRules(roleSet, spaceSettings, spaceMembershipAllowed)` in `src/domain/space/space/space.service.authorization.ts` that returns `[]` when `!spaceMembershipAllowed` or `spaceSettings.collaboration.allowMembersToCreateCallouts` is false; otherwise builds a credential rule granting `[AuthorizationPrivilege.FILE_UPLOAD]` to the create-callout actor criteria (reuse the existing `getActorCriteria(roleSet, spaceSettings)` helper), sets `cascade = true`, names it with `CREDENTIAL_RULE_SPACE_STORAGE_MEMBER_FILE_UPLOAD`, and returns it as a single-element array (return `[]` if the criteria set is empty). Import the new constant.
- [X] T004 [US1] In `propagateAuthorizationToChildEntities` in `src/domain/space/space/space.service.authorization.ts`, compute the rules via the new helper (using `space.community.roleSet`, `space.settings`, `spaceMembershipAllowed`) and pass them as the third argument (`credentialRulesFromParent`) to the **Space profile** authorization call: `profileAuthorizationService.applyAuthorizationPolicy(space.profile!.id, space.authorization!, storageMemberFileUploadRules)`. Do NOT pass them to the storage-aggregator or the Space About authorization calls.

### Tests for User Story 1

- [X] T005 [P] [US1] In `src/domain/space/space/space.service.authorization.spec.ts`, add a test asserting that when `allowMembersToCreateCallouts` is true, the rules passed to the **Space profile** authorization call include a `FILE_UPLOAD` credential rule named `CREDENTIAL_RULE_SPACE_STORAGE_MEMBER_FILE_UPLOAD` (cascading), and a sibling test asserting the rule is **absent** from both the storage-aggregator call (no extra-rules argument) and the Space About authorization call.

### Verification for User Story 1

- [X] T006 [US1] Manually verify per `quickstart.md` happy path: trigger an authorization reset on a setting-ON Space, sign in as a plain member, create a callout with an embedded image, confirm success and that the staged file is relocated onto the new callout.

**Checkpoint**: Members in setting-ON spaces can upload callout content; MVP complete.

---

## Phase 4: User Story 2 - Upload ability is gated by the create-callout setting (Priority: P2)

**Goal**: The member upload capability exists only while the "members may create
callouts" setting is on; turning it off removes the capability on the next reset.

**Independent Test**: In a setting-OFF Space a plain member is denied both callout
creation and upload to the Space's shared storage (per `quickstart.md` → "Verify
(gating — US2)").

### Tests for User Story 2

- [X] T007 [P] [US2] In `src/domain/space/space/space.service.authorization.spec.ts`, add tests asserting that when `allowMembersToCreateCallouts` is false — and, separately, when `spaceMembershipAllowed` is false (archived) — the Space profile authorization call receives no `CREDENTIAL_RULE_SPACE_STORAGE_MEMBER_FILE_UPLOAD` rule.

### Verification for User Story 2

- [X] T008 [US2] Manually verify per `quickstart.md` gating: confirm a member in a setting-OFF Space is denied; then toggle a previously-ON Space off, trigger an authorization reset, and confirm the member can no longer upload to the Space's shared storage.

**Checkpoint**: Gating proven in both directions; no standing privilege escalation.

---

## Phase 5: User Story 3 - Correct scoping across spaces and subspaces (Priority: P3)

**Goal**: The grant is scoped per Space; enabling it in one Space grants nothing in
another, and each subspace is governed by its own setting.

**Independent Test**: With the setting ON in Space A and OFF in Space B, only Space A
members may upload to Space A's shared storage; repeat for a parent/subspace pair
(per `quickstart.md` → "Verify (scoping — US3)").

### Tests for User Story 3

- [X] T009 [P] [US3] In `src/domain/space/space/space.service.authorization.spec.ts`, add a test asserting the rule passed to the Space profile authorization call targets the create-callout actor criteria (members, plus inherited parent-space members where `inheritMembershipRights` + public applies) and is marked to cascade — i.e. it matches the criteria returned by `getActorCriteria` and reaches `space.profile.storageBucket`.

### Verification for User Story 3

- [X] T010 [US3] Manually verify per `quickstart.md` scoping: confirm no cross-space leakage between an enabled Space A and a disabled Space B, and that a subspace is governed by its own setting independent of its parent.

**Checkpoint**: All three stories independently verified.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Quality gates and final validation.

- [X] T011 [P] Run `pnpm lint` (tsc --noEmit + biome) and fix any issues in the changed files (`space.service.authorization.ts` + spec, and the reverted `storage.aggregator.service.authorization.ts`).
- [X] T012 [P] Run the affected unit specs: `pnpm test -- src/domain/space/space/space.service.authorization.spec.ts` (and `src/domain/storage/storage-aggregator/` to confirm the storage-aggregator revert is clean).
- [X] T013 Sanity-check that no schema change leaked: `pnpm run schema:print && pnpm run schema:sort` produce no diff to `schema.graphql`.
- [X] T014 Run the `quickstart.md` regression check: confirm an admin can still create a callout with an embedded image exactly as before.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1, T001)**: No dependencies — can start immediately.
- **Foundational (Phase 2, T002)**: Verification-only (no code change); confirms the Space profile authorization injection point. Precedes story work.
- **User Story 1 (Phase 3)**: Depends on T001 + T002. Implements the rule (T003 → T004); this also realizes the behavior asserted by US2 and US3.
- **User Story 2 (Phase 4)** and **User Story 3 (Phase 5)**: Depend on the US1 implementation (T003–T004) existing, since they assert properties of the same rule. Their test/verification tasks are otherwise independent of each other.
- **Polish (Phase 6)**: Depends on all desired stories being complete.

### Within Each User Story

- US1: T003 (helper) before T004 (wiring); T005 test can be written alongside; T006 manual after T004.
- US2/US3: test task and manual verification can run in parallel once US1 implementation exists.

### Parallel Opportunities

- T001 is independent ([P]).
- T005, T007, T009 all edit the same spec file (`space.service.authorization.spec.ts`) — despite [P] on each for clarity of story ownership, run them sequentially or as one coordinated edit to avoid a same-file conflict.
- T011 and T012 ([P]) are independent of each other.

---

## Parallel Example: tests vs. manual verification (after US1 implementation)

```bash
# After T003–T004 land, the following are logically parallel work items
# (mind the shared spec file — coordinate edits to it):
Task: "US2 gating-off unit assertion in space.service.authorization.spec.ts"   # T007
Task: "US3 criteria/cascade unit assertion in space.service.authorization.spec.ts" # T009
Task: "US2 manual gating verification per quickstart.md"                        # T008
Task: "US3 manual scoping verification per quickstart.md"                       # T010
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (T001) + Phase 2 (T002) — shared plumbing.
2. Phase 3 (T003–T006) — the gated rule + happy-path verification.
3. **STOP and VALIDATE**: a plain member can create a callout with an image in a setting-ON Space.
4. This is shippable; US2/US3 add gating/scoping assurance on top of the same code.

### Incremental Delivery

1. Setup + Foundational → plumbing ready.
2. US1 → member upload works → MVP.
3. US2 → gating assured (off ⇒ denied).
4. US3 → scoping assured (per-space, per-subspace).
5. Polish → lint, tests, schema sanity, regression.

---

## Notes

- [P] = different files, no dependencies. The three spec-file test tasks are marked
  [P] for story traceability but touch one file — coordinate those edits.
- This feature changes authorization computation only: no schema, migration, GraphQL
  contract, or storage-mechanism change (see `data-model.md`).
- **Target bucket**: the grant lands on the Space profile's storage bucket
  (`space.profile.storageBucket`) — NOT the storage aggregator's `directStorage`, and
  NOT the About profile storage (`space.about.profile.storageBucket`).
- **Client follow-up (separate repo)**: the client `SpaceStorageConfig` query
  (`client-web`) currently resolves the create-callout upload target to
  `space.about.profile.storageBucket`; it must be repointed to
  `space.profile.storageBucket` for the end-to-end flow to use the granted bucket.
- The new capability takes effect per Space at the next authorization reset
  (`quickstart.md` covers triggering it).
- Commit after each logical group; keep migrations N/A (none here).
