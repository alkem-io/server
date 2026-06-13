# Phase 0 Research: Persist Phase/Tab Visibility

No `NEEDS CLARIFICATION` markers remained after `/speckit-clarify`. This document records the design decisions that shape the implementation.

## Decision 1 — Persistence location for `visible`

- **Decision**: Store `visible` as a key inside the existing JSONB `settings` column of the `innovation_flow_state` table, alongside the existing `allowNewCallouts`. No new column or table.
- **Rationale**: `IInnovationFlowStateSettings` is already persisted as a structured JSONB object (`@Column('jsonb') settings`). `allowNewCallouts` lives there today. Adding a sibling boolean keeps the settings model cohesive and requires only a data backfill of existing rows — no DDL, no entity-shape migration. This mirrors the established repo pattern `AddPushFieldToPollNotificationSettings` (adds a field into an existing JSONB settings object).
- **Alternatives considered**:
  - *Dedicated `visible` column on `innovation_flow_state`*: rejected — splits the settings concept across JSONB + scalar column, inconsistent with `allowNewCallouts`, and the client contract models `visible` as part of `settings`.

## Decision 2 — GraphQL schema contract classification

- **Decision**: Treat the change as additive / non-breaking. `InnovationFlowStateSettings.visible: Boolean!` is a new output field; `UpdateInnovationFlowStateSettingsInput.visible: Boolean` is a new optional input field. Regenerate and commit `schema.graphql`; no `BREAKING-APPROVED` required.
- **Rationale**: Adding a field to an output type does not break existing consumers. Adding an *optional* field to an input type is backward compatible (existing callers omit it). The repo's schema-contract system (`schema:diff` → `change-report.json`) classifies field additions as non-breaking; only removals/type-narrowing require approval.
- **Note on non-nullability of the output field**: `visible` is `Boolean!` (non-null) on output. This is safe because the backfill migration guarantees every persisted state carries the key, and `createInnovationFlowState` defaults it — so the resolver never returns null. To be defensive against any row the backfill could not reach, the field resolution coerces a missing/undefined stored value to `true` (treat-absent-as-visible), matching the client's graceful-degradation semantics.
- **Alternatives considered**:
  - *Make output `visible` nullable (`Boolean`)*: rejected — the story's acceptance criteria explicitly require `visible: Boolean!` (default true), and the client contract expects non-null.

## Decision 3 — Update semantics (omission vs explicit value)

- **Decision**: `visible` on `UpdateInnovationFlowStateSettingsInput` is optional. When present it sets the stored value (including explicit `false`); when omitted, the stored value is preserved.
- **Rationale**: Matches FR-002 and the client mutation, which sends `visible` only when toggling. Mirrors how `description` and other optional update fields are handled. Prevents accidental hiding when an unrelated settings update is issued.
- **Implementation detail**: In `InnovationFlowStateService.update`, guard with `if (updateData.settings.visible !== undefined)` before assigning, so `false` is honored but `undefined` is a no-op.
- **Alternatives considered**:
  - *Non-nullable input `visible`*: rejected — would force every settings update to carry visibility and break partial updates.

## Decision 4 — Authorization

- **Decision**: Reuse the existing `Update` privilege on the innovation flow that already gates `updateInnovationFlowState`. No new role or privilege.
- **Rationale**: The story states "same privilege that edits innovation-flow state settings". The settings update path is already guarded in `innovation.flow.resolver.mutations.ts` via `AuthorizationPrivilege.UPDATE`. The visibility flag rides this exact path, so authorization is satisfied without change.
- **Alternatives considered**: introducing a `HIDE_PHASE` privilege — rejected as over-engineering and contrary to the story.

## Decision 5 — Content access independence

- **Decision**: `visible` is a pure UI/navigation hint. It is NOT read anywhere in authorization policy computation, content fetching, or filtering of states/callouts on the server.
- **Rationale**: FR-007 / acceptance criterion: hidden phases remain reachable by direct URL. The server must not filter hidden states out of any query or alter any authorization policy based on `visible`.
- **Verification approach**: confirm via code search that `visible` is referenced only in (a) the settings interface/DTOs, (b) the service create/update assignment, and (c) the migration — never in authorization services or query filters.

## Decision 6 — Migration idempotency & reversibility

- **Decision**: Backfill uses `jsonb_set(settings, '{visible}', 'true', true)` guarded by `WHERE settings -> 'visible' IS NULL`, so it only writes where the key is absent. `down()` removes the key via `settings #- '{visible}'`.
- **Rationale**: Idempotent (re-runs are no-ops on already-set rows), reversible, and never overwrites an admin's chosen `false`. Follows FR-008 and the repo's migration conventions (idempotent, inline rollback).
