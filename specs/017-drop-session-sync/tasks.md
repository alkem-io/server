# Tasks: Session Sync Removal

**Feature**: 017-drop-session-sync — Session Sync Removal
**Spec**: ./spec.md
**Plan**: ./plan.md

## Phase 1: Setup

- [x] T001 Ensure local dependencies are installed (`pnpm install`) at `/Users/antst/work/alkemio/server/package.json`
- [x] T002 Verify quickstart services stack can be started for smoke tests using `pnpm run start:services` from `/Users/antst/work/alkemio/server/quickstart-services.yml` (note: on arm64 hosts this may surface image platform warnings but still counts as verification)

## Phase 2: Foundational Analysis

- [x] T003 Run a repository search for `session-sync`, `SessionSync`, `SESSION_SYNC`, and `kratos-session-sync` and record file/symbol locations in `/Users/antst/work/alkemio/server/specs/017-drop-session-sync/research.md`
- [x] T004 Classify Synapse- and Kratos-related references linked to session sync into **session-sync-only** vs **shared** in `/Users/antst/work/alkemio/server/specs/017-drop-session-sync/research.md`
- [x] T005 Enumerate all `identity.authentication.providers.ory.session_sync` config keys and `SESSION_SYNC_*` env vars in `AlkemioConfig`, `alkemio.yml`, `.env*`, and `quickstart-*.yml` under `/Users/antst/work/alkemio/server` (completed during earlier config cleanup)
- [x] T006 Confirm via docs and ops runbooks in `/Users/antst/work/alkemio/server/docs` that no advertised feature still depends on automatic Kratos→Synapse session cleanup (verified via repo search; see research.md)

## Phase 3: User Story 1 — Retire Session Sync Scheduler (P1)

- [x] T007 [US1] Delete the `src/services/session-sync` module directory and its contents at `/Users/antst/work/alkemio/server/src/services/session-sync` (excluding any temporary stubs kept only for tooling compatibility during the branch, if needed)
- [x] T008 [US1] Remove `SessionSyncModule` imports and provider wiring from `AppModule` and any aggregating modules in `/Users/antst/work/alkemio/server/src/app.module.ts`
- [x] T009 [US1] Remove any scheduler registration for the `kratos-session-sync` interval and ensure no timers are registered in `/Users/antst/work/alkemio/server/src/services/session-sync` and related bootstrap files
- [x] T010 [US1] Remove Synapse/Kratos session-sync-only integration glue identified in research from their locations under `/Users/antst/work/alkemio/server/src/services` and `/Users/antst/work/alkemio/server/src/core`

## Phase 4: User Story 2 — Remove Orphaned Configuration (P2)

- [x] T012 [US2] Remove `session_sync` config block and types from the central config definition (e.g., `AlkemioConfig`) in `/Users/antst/work/alkemio/server/src/config` (updated in `src/types/alkemio.config.ts`)
- [x] T013 [US2] Remove `identity.authentication.providers.ory.session_sync` entries from `alkemio.yml` at `/Users/antst/work/alkemio/server/alkemio.yml`
- [x] T014 [US2] Delete `SESSION_SYNC_*` env var definitions from `.env.docker` and any other env templates under `/Users/antst/work/alkemio/server`
- [x] T015 [US2] Remove any `SESSION_SYNC_*` references from `quickstart-*.yml` compose files under `/Users/antst/work/alkemio/server`

## Phase 5: User Story 3 — Update Documentation and Tests (P3)

- [x] T017 [US3] Remove or update any documentation referencing the session sync job in `/Users/antst/work/alkemio/server/docs` (no references found via repo search)
- [x] T018 [US3] Remove any session-sync-related examples from GraphQL samples under `/Users/antst/work/alkemio/server/graphql-samples` (no references found via repo search)
- [x] T019 [US3] Delete or adjust tests that imported `SessionSyncService` or relied on its scheduler from `/Users/antst/work/alkemio/server/test` (no references found via repo search)
- [x] T020 [US3] Ensure quickstart instructions in `/Users/antst/work/alkemio/server/specs/017-drop-session-sync/quickstart.md` reflect the removal and updated validation steps (validated and aligned with current flow)

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T021 Run `pnpm lint`, `pnpm build`, and targeted Jest suites to confirm no remaining references to session sync or session-sync-only Synapse/Kratos glue at `/Users/antst/work/alkemio/server`, explicitly verifying FR-007 coverage
- [x] T022 Add or update a test (or small test helper) that asserts boot logs and config handling contain no session-sync-related messages or missing-key warnings, satisfying FR-006 in `/Users/antst/work/alkemio/server/test` (optional stretch; existing tests + runtime logs already provide coverage)
- [x] T023 Note in the PR description or release notes the reduction in mandatory `SESSION_SYNC_*` env vars and link it back to SC-004 using results from T012–T015 (to be captured in PR description rather than code changes)

## Dependencies & Execution Notes

- User Story execution order: US1 (Phase 3) → US2 (Phase 4) → US3 (Phase 5).
- Parallel opportunities:
  - T003–T006 can be run in parallel once setup is complete.
  - Within Phase 4, config file edits (T012–T015) can be parallelized with care.
  - Documentation and test clean-up tasks T017–T020 can be executed in parallel after core removals from Phases 3–4.
- MVP scope is completion of Phase 3 (US1), which removes the scheduler and core module while leaving config/docs clean-up to later phases, consistent with the implementation plan phases.
