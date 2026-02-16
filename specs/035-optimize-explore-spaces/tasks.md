# Tasks: Optimize ExploreAllSpaces Query

**Input**: Design documents from `/specs/035-optimize-explore-spaces/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: Not explicitly requested in the spec. Tests omitted per constitution principle 6 (pragmatic testing). The optimization is best validated via APM span comparison (see quickstart.md).

**Organization**: US1 (Faster Page Load) and US2 (Batched Lead Contributors) share the same implementation — they are combined into Phase 2. US3 (Stable Performance) is a verification phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Add the batch query method that the organization DataLoader will depend on

**CRITICAL**: Phase 2 cannot start until T001 is complete

- [x] T001 Add `organizationsWithCredentialsBatch(credentialCriteriaArray: CredentialsSearchInput[])` method to `src/domain/community/organization/organization.lookup.service.ts`. Mirror the existing `UserLookupService.usersWithCredentials()` pattern: accept an array of `CredentialsSearchInput`, build OR-based WHERE conditions, execute a single TypeORM `find()` with `relations: { agent: { credentials: true } }`, return flat `IOrganization[]` array. Reference implementation: `src/domain/community/user/user.lookup.service.ts:157-203`.

**Checkpoint**: OrganizationLookupService now supports batched credential queries

---

## Phase 2: US1/US2 - Batched Lead Contributor Loading (Priority: P1) MVP

**Goal**: Replace 60 per-space credential-lookup queries with 2 batched DataLoader queries (1 for users, 1 for organizations). This achieves both US1 (reduced spans) and US2 (batched loading).

**Independent Test**: Execute the `ExploreAllSpaces` query with `DATABASE_LOGGING=true` and verify credential-related SELECT statements drop from ~60 to 2.

### Implementation

- [x] T002 [P] [US1] Create `LeadUsersByRoleSetLoaderCreator` in `src/core/dataloader/creators/loader.creators/roleset/lead.users.by.role.set.loader.creator.ts`. Implement `DataLoaderCreator<IUser[]>` following the `SpaceCommunityWithRoleSetLoaderCreator` pattern. Batch function: accept composite string keys (`credentialType|resourceID`), parse into `CredentialsSearchInput[]`, call `UserLookupService.usersWithCredentials()` once, group returned users by matching `agent.credentials[].type` and `resourceID` against original keys, return `IUser[][]` in input order (empty arrays for keys with no matches). Inject `UserLookupService` via constructor. Use `{ cache: true, name: 'LeadUsersByRoleSetLoader' }` DataLoader options.

- [x] T003 [P] [US1] Create `LeadOrganizationsByRoleSetLoaderCreator` in `src/core/dataloader/creators/loader.creators/roleset/lead.organizations.by.role.set.loader.creator.ts`. Same pattern as T002 but for organizations: inject `OrganizationLookupService`, call `organizationsWithCredentialsBatch()` (from T001), group by `agent.credentials` match. Use `{ cache: true, name: 'LeadOrganizationsByRoleSetLoader' }`.

- [x] T004 [US1] Export both new loader creators from `src/core/dataloader/creators/loader.creators/index.ts`. Add two lines: `export * from './roleset/lead.users.by.role.set.loader.creator';` and `export * from './roleset/lead.organizations.by.role.set.loader.creator';`. They will be auto-registered by `LoaderCreatorModule` which uses `Object.values(creators)`.

- [x] T005 [US1] Update `src/domain/space/space.about.membership/space.about.membership.resolver.fields.ts`: Replace `leadUsers()` resolver — add `@Loader(LeadUsersByRoleSetLoaderCreator) loader: ILoader<IUser[]>` parameter, extract credential via `membership.roleSet.roles?.find(r => r.name === RoleName.LEAD)?.credential`, return `[]` if no credential found, otherwise `loader.load(\`${credential.type}|${credential.resourceID}\`)`. Apply the same pattern to `leadOrganizations()` using `LeadOrganizationsByRoleSetLoaderCreator`. Import `Loader` decorator from `@core/dataloader`, `ILoader` from `@core/dataloader/loader.interface`, and both new loader creators. The `RoleSetService` import can be removed if no other methods in this resolver use it (check `applicationForm` — it still uses `roleSetService`, so keep the import).

**Checkpoint**: US1 and US2 complete. Lead user and organization resolution now batched. Verify by running ExploreAllSpaces query and checking DB logs.

---

## Phase 3: US3 - Stable Performance Verification (Priority: P2)

**Goal**: Confirm that credential-related query count remains constant (2) regardless of space count.

**Independent Test**: Execute `ExploreAllSpaces` with different `limit` values (10, 20, 30) and verify the credential query count stays at 2.

- [x] T006 [US3] Verify constant query count by running `ExploreAllSpaces` query with `options: { limit: 10 }`, `{ limit: 20 }`, and `{ limit: 30 }` with `DATABASE_LOGGING=true`. Confirm: (a) credential-related SELECT statements remain at exactly 2 regardless of limit, (b) all response data is correct for each limit value, (c) no new N+1 patterns appear in logs. Document results inline as a code comment in `lead.users.by.role.set.loader.creator.ts` explaining the batching optimization per constitution principle 5.

**Checkpoint**: All user stories verified. Performance scales O(1) for credential lookups.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Final verification before PR

- [x] T007 Run `pnpm build` to verify TypeScript compilation succeeds with no errors
- [x] T008 Run `pnpm lint` to verify Biome linting passes (no unused imports, proper formatting)
- [x] T009 Execute full quickstart.md validation: run the `ExploreAllSpaces` query from `specs/035-optimize-explore-spaces/quickstart.md`, compare response data pre/post optimization, verify no regressions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately
- **US1/US2 (Phase 2)**: Depends on T001 (org batch method). T002 and T003 can run in parallel once T001 is done.
- **US3 (Phase 3)**: Depends on Phase 2 completion (needs loaders integrated to verify)
- **Polish (Phase 4)**: Depends on all phases complete

### Task Dependency Graph

```
T001 (org batch method)
  ├── T002 [P] (user loader)
  ├── T003 [P] (org loader)
  │     └── depends on T001
  └── T004 (index exports)
        └── depends on T002, T003
              └── T005 (resolver update)
                    └── depends on T004
                          └── T006 (US3 verification)
                                └── T007, T008, T009 (polish)
```

### Parallel Opportunities

- **T002 + T003**: Both DataLoader creator files are independent and can be written simultaneously (different files, no shared code except pattern)
- **T007 + T008**: Build and lint can run in parallel

---

## Parallel Example: Phase 2

```bash
# After T001 (org batch method) is complete, launch both DataLoaders in parallel:
Task: "Create LeadUsersByRoleSetLoaderCreator in src/core/dataloader/creators/loader.creators/roleset/lead.users.by.role.set.loader.creator.ts"
Task: "Create LeadOrganizationsByRoleSetLoaderCreator in src/core/dataloader/creators/loader.creators/roleset/lead.organizations.by.role.set.loader.creator.ts"

# Then sequentially:
Task: "Export both loaders in index.ts"
Task: "Update resolver to use @Loader() pattern"
```

---

## Implementation Strategy

### MVP First (Phase 1 + Phase 2)

1. Complete T001 (foundational batch method)
2. Complete T002-T005 (both DataLoaders + resolver integration)
3. **STOP and VALIDATE**: Run ExploreAllSpaces query, verify credential queries drop from 60 to 2
4. Deploy/demo — immediate APM improvement visible

### Incremental Delivery

1. T001 → Foundation ready
2. T002-T005 → US1+US2 complete → Validate (MVP!)
3. T006 → US3 verified → Document scaling behavior
4. T007-T009 → Polish → PR ready

---

## Notes

- No schema changes — `pnpm run schema:print` / `schema:diff` not needed
- No migrations — no entity changes
- The `RoleSetService` import stays in the resolver (still used by `applicationForm` method)
- Composite key separator `|` is safe because neither credential type nor UUID contain pipe characters
- Both loaders are generic — any resolver that has a loaded `roleSet.roles` can use them, not just `exploreSpaces`
