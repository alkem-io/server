# Tasks: Innovation Flow — Persist Phase/Tab Visibility

**Feature**: 103-persist-phase-visibility | **Story**: alkem-io/server#6138 | **Branch**: `story/6138-persist-phase-tab-visibility`

**Input**: plan.md, spec.md, research.md, data-model.md, contracts/innovation-flow-state-visibility.graphql.md, quickstart.md

**Tech**: TypeScript 5.3 / NestJS 10 / `@nestjs/graphql` (code-first) / TypeORM 0.3 / PostgreSQL 17.5 (JSONB) / Vitest 4.x

All paths are relative to repo root `/Users/borislavkolev/WebstormProjects/server-story-6138-persist-phase-tab-visibility`.

---

## Phase 1: Setup

- [X] T001 Confirm dependencies installed and toolchain ready: run `pnpm install` at repo root; verify `pnpm lint`, `pnpm build`, and `pnpm test` entrypoints are runnable.
- [X] T002 Capture the current published schema as the diff baseline: `pnpm run schema:print && pnpm run schema:sort` then copy `schema.graphql` to `tmp/prev.schema.graphql` (so `pnpm run schema:diff` can classify the change later).

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: The settings value object must carry `visible` before any create/update/backfill work is meaningful. This is the shared contract all user stories depend on.

- [X] T003 Add `visible` to the GraphQL output type in `src/domain/collaboration/innovation-flow-state-settings/innovation.flow.settings.interface.ts`: a non-nullable `@Field(() => Boolean, { nullable: false, description: 'Whether this State/phase is shown in the member-facing navigation. Default true.' }) visible!: boolean;`.

**Checkpoint**: The settings interface now declares `visible`. Output type extended; subsequent stories wire creation, persistence, backfill, and update.

---

## Phase 3: User Story 2 — Existing flows keep current behaviour (Priority: P1) 🎯 MVP co-core

**Goal**: Every pre-existing innovation-flow state reports `visible = true` after deploy; the non-nullable output field never resolves null.

**Independent Test**: On a DB seeded before this change, run the backfill, then read any pre-existing state's `settings.visible` → `true`; reading any state returns a boolean (never null).

- [X] T004 [US2] Create an idempotent, reversible data migration `src/migrations/<epoch-ms>-BackfillInnovationFlowStateVisible.ts` (implements `MigrationInterface`). `up`: `UPDATE innovation_flow_state SET settings = jsonb_set(settings, '{visible}', 'true'::jsonb, true) WHERE settings IS NOT NULL AND settings -> 'visible' IS NULL;`. `down`: `UPDATE innovation_flow_state SET settings = settings #- '{visible}' WHERE settings -> 'visible' IS NOT NULL;`. Add an inline comment documenting idempotency and that it never overwrites an admin-set value. Use the current epoch-ms as the timestamp prefix (greater than the latest existing migration).
- [X] T005 [US2] Add a defensive coercion so a missing/undefined stored `visible` resolves to `true` for the non-null output field. Keep the field non-nullable in `src/domain/collaboration/innovation-flow-state-settings/innovation.flow.settings.interface.ts`. Normalize on read at a single choke point in `src/domain/collaboration/innovation-flow-state/innovation.flow.state.service.ts` `getInnovationFlowStateOrFail` (apply `state.settings.visible ??= true` before returning) so any un-backfilled row still yields `true`. Add an inline comment referencing FR-001 / research Decision 2. (Belt-and-braces alongside the T004 backfill.)

**Checkpoint**: Legacy states are backfilled and the API guarantees a non-null `visible` for every state.

---

## Phase 4: User Story 1 — Admin hides a phase from member navigation (Priority: P1) 🎯 MVP core

**Goal**: An admin can set `visible: false` (and back to `true`) via the existing settings update path; the value persists globally and content access is unchanged.

**Independent Test**: As an admin, update a state's settings with `visible: false`; re-read as any user → `visible == false`; fetch the state's content by id → still accessible.

- [X] T006 [US1] Add optional `visible` to `src/domain/collaboration/innovation-flow-state-settings/dto/innovation.flow.state.settings.dto.update.ts`: `@Field(() => Boolean, { nullable: true, description: 'Optional. Sets whether the phase is shown in member navigation; omission leaves the stored value unchanged.' }) visible?: boolean;`.
- [X] T007 [US1] Implement non-destructive partial update in `src/domain/collaboration/innovation-flow-state/innovation.flow.state.service.ts` `update()`: inside the existing `if (updateData.settings)` block, after assigning `allowNewCallouts`, add `if (updateData.settings.visible !== undefined) { innovationFlowState.settings.visible = updateData.settings.visible; }` so explicit `false` is honored and omission is a no-op. Add an inline comment referencing FR-002 / FR-009.
- [X] T008 [US1] Verify `visible` does NOT gate authorization or content: grep the codebase to confirm `settings.visible` / `visible` is referenced only in the settings interface, DTOs, service create/update, migration, and tests — and never in any `*.authorization.ts`, query filter, or state-list selector. Record the confirmation as an inline note in `innovation.flow.state.service.ts` near the update logic (FR-007).

**Checkpoint**: Hiding/unhiding persists for all users via the existing admin-gated mutation; content remains reachable. US1 + US2 together are the shippable MVP.

---

## Phase 5: User Story 3 — Newly created phases default to visible (Priority: P2)

**Goal**: A new state created without a visibility value defaults to `visible: true`.

**Independent Test**: Create a new state on an innovation flow without supplying visibility → `settings.visible == true`.

- [X] T009 [US3] Add optional `visible` to `src/domain/collaboration/innovation-flow-state-settings/dto/innovation.flow.state.settings.dto.create.ts`: `@Field(() => Boolean, { nullable: true, description: 'Optional. Defaults to true when omitted.' }) visible?: boolean;`. (Additive for contract parity; create-time consumption is defined in T010.)
- [X] T010 [US3] In `src/domain/collaboration/innovation-flow-state/innovation.flow.state.service.ts` `createInnovationFlowState()`, extend the hardcoded settings object so it includes `visible`. NOTE: the existing code sets `settings = { allowNewCallouts: true }` and does NOT currently read `stateData.settings` at all (neither `allowNewCallouts` nor anything else). To preserve current behavior and satisfy FR-005 minimally, set `settings = { allowNewCallouts: true, visible: stateData.settings?.visible ?? true }` — i.e. default `visible` to `true`, honoring an explicit create-time `visible: false` if supplied, while leaving the pre-existing `allowNewCallouts: true` default untouched. Do NOT start consuming `stateData.settings.allowNewCallouts` (out of scope — avoids changing unrelated create semantics). Add an inline comment referencing FR-005.

**Checkpoint**: New phases are visible by default; admins can still create a hidden phase by passing `visible: false`.

---

## Phase 6: User Story 4 — Admin-gated toggle & safe partial updates (Priority: P2)

**Goal**: Only holders of the existing innovation-flow `Update` privilege can change `visible`; omitting `visible` on an update preserves the stored value. (Largely satisfied by T007's `!== undefined` guard and the unchanged resolver authorization; this phase adds explicit verification + tests.)

**Independent Test**: Non-privileged member update is denied by existing authz; admin update omitting `visible` preserves prior value.

- [X] T011 [US4] Confirm authorization is unchanged and sufficient: verify in `src/domain/collaboration/innovation-flow/innovation.flow.resolver.mutations.ts` that `updateInnovationFlowState` (the path carrying `settings`) is gated by `AuthorizationPrivilege.UPDATE` on the innovation flow, and that no `visible`-specific authorization branch was added. Record confirmation as an inline note (FR-006).

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T012 [P] Add/extend unit tests in `src/domain/collaboration/innovation-flow-state/innovation.flow.state.service.spec.ts`: (a) create defaults `visible: true` when omitted; (b) create honors explicit `visible: false`; (c) update with `visible: false` sets it; (d) update with `visible: true` sets it; (e) update omitting `visible` preserves the prior value; (f) update changing only `visible` does not alter `allowNewCallouts` (FR-009).
- [X] T013 Regenerate and validate the published schema: `pnpm run schema:print && pnpm run schema:sort`, then `pnpm run schema:diff` and review `change-report.json` — confirm the change is classified additive/non-breaking (new `visible` on the type + optional `visible` on the two inputs); commit the updated `schema.graphql`.
- [X] T014 Run the local exit gates in order and fix until green: `pnpm test:ci:no:coverage` (or targeted `pnpm test`), `pnpm build`, `pnpm lint`. Ensure the working tree is clean and `schema.graphql` is committed.

---

## Dependencies & Execution Order

- **Phase 1 (Setup)** → **Phase 2 (Foundational, T003)** must complete before any user-story phase (the output field is the shared contract).
- **Phase 3 (US2)** and **Phase 4 (US1)** are the co-critical P1 MVP. T005 (read coercion) depends on T003. T007 (update) depends on T003 + T006. T004 (migration) depends only on the table (independent of code) but is grouped with US2.
- **Phase 5 (US3)** depends on T003; independent of US1/US2 code paths (touches create only).
- **Phase 6 (US4)** verification depends on T007 existing.
- **Phase 7**: T012 depends on T007 + T010; T013 depends on T003/T006/T009; T014 is last.

### Parallel opportunities

- T012 (tests) is `[P]` — different file from production code; can be written alongside once T007/T010 land.
- T004 (migration) can be authored in parallel with T006/T007 (different file, no code dependency), then sequenced before T013/T014.

## Implementation Strategy

- **MVP = Phase 1 + Phase 2 + Phase 3 (US2) + Phase 4 (US1)**: existing flows stay visible, and admins can hide/unhide phases globally without affecting content access. This satisfies the story's headline acceptance criteria.
- **Increment 2 = Phase 5 (US3) + Phase 6 (US4)**: new-phase default + explicit authz/partial-update verification.
- **Finalize = Phase 7**: tests, schema regeneration/diff, and exit gates.
