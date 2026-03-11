# Implementation Plan: Callout Description Display Mode Setting

**Branch**: `043-callout-collapse` | **Date**: 2026-03-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/043-callout-collapse/spec.md`

## Summary

Add a new `layout` sub-object to `SpaceSettings` containing a `calloutDescriptionDisplayMode` enum field (`COLLAPSED` | `EXPANDED`). This follows the established sub-object pattern used by `privacy`, `membership`, and `collaboration`. A migration backfills existing spaces with `EXPANDED` (preserving current behavior); new spaces default to `COLLAPSED`. The setting is exposed via GraphQL both through the guarded `settings` resolver and as a public field resolver (no READ privilege required, matching `sortMode` pattern).

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 22 LTS (Volta pins 22.21.1)
**Primary Dependencies**: NestJS 10, TypeORM 0.3, Apollo Server 4, GraphQL 16
**Storage**: PostgreSQL 17.5 — existing `settings` JSONB column on `space` table
**Testing**: Vitest 4.x
**Target Platform**: Linux server (Docker containers)
**Project Type**: NestJS GraphQL server (monolith)
**Performance Goals**: N/A — single JSONB field addition, negligible impact
**Constraints**: Must not break existing space settings; migration must be reversible
**Scale/Scope**: ~8 files modified/created, ~150 LOC

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
| --- | --- | --- |
| 1. Domain-Centric Design First | PASS | Setting lives in `src/domain/space/space.settings/` domain module |
| 2. Modular NestJS Boundaries | PASS | Extends existing `SpaceSettingsModule`; no new module needed |
| 3. GraphQL Schema as Stable Contract | PASS | Additive change only (new type + field); no breaking changes |
| 4. Explicit Data & Event Flow | PASS | Uses existing `updateSettings` → persist flow; no new side effects |
| 5. Observability & Operational Readiness | PASS | No new module surface; existing logging contexts sufficient |
| 6. Code Quality with Pragmatic Testing | PASS | Unit test for settings merge; integration test for mutation round-trip |
| 7. API Consistency & Evolution | PASS | Follows naming conventions: enum `CalloutDescriptionDisplayMode`, sub-object `SpaceSettingsLayout` |
| 8. Secure-by-Design Integration | PASS | Reuses existing UPDATE privilege check on `updateSpaceSettings` |
| 9. Container & Deployment Determinism | PASS | No new env vars or runtime config changes |
| 10. Simplicity & Incremental Hardening | PASS | Minimal implementation following established pattern |

No violations. No complexity tracking needed.

## Implementation Phases

### Phase 0 — Research

**Objective**: Establish factual grounding before any design or code decisions are made. Identify existing patterns, risk surface, and open questions that must be resolved before Phase 1 begins.

**Deliverables**:

| Artefact | Path | Status |
|----------|------|--------|
| Research notes | `specs/043-callout-collapse/research.md` | ✅ Complete |

**Tasks**:
1. Survey existing `SpaceSettings` sub-objects (`privacy`, `membership`, `collaboration`, `sortMode`) to validate the pattern to follow.
2. Confirm the JSONB column can accept the new `layout` key without a schema migration on the column itself.
3. Identify all consumers of `SpaceSettings` (resolvers, services, tests) that will need updating.
4. Clarify open questions from `spec.md` (client-side toggle vs. server-persisted default; READ privilege pattern; migration default for existing vs. new spaces).

**Gate Criteria — must all be TRUE before Phase 1 starts**:
- [ ] Constitution Check table above has no `FAIL` entries.
- [ ] All `[NEEDS CLARIFICATION]` markers in `spec.md` are resolved and recorded in the Clarifications section.
- [ ] `research.md` documents the chosen sub-object pattern and confirms JSONB compatibility.
- [ ] No blocking external dependencies identified (no new NestJS modules, no schema column changes).

---

### Phase 1 — Design

**Objective**: Produce all design artefacts that implementation tasks depend on. No production code is written in this phase. All artefacts must be stable before coding begins.

**Deliverables** (sequencing: `spec.md` → `data-model.md` → `contracts/` → `quickstart.md` → `tasks.md`):

| Artefact | Path | Depends On | Status |
|----------|------|-----------|--------|
| Data model | `specs/043-callout-collapse/data-model.md` | `spec.md` | ✅ Complete |
| GraphQL contract additions | `specs/043-callout-collapse/contracts/schema-additions.graphql` | `data-model.md` | ✅ Complete |
| Quickstart / dev guide | `specs/043-callout-collapse/quickstart.md` | `contracts/` | ✅ Complete |
| Task breakdown | `specs/043-callout-collapse/tasks.md` | all above | ✅ Complete |

**Artefact handoff rules**:
- `data-model.md` must define `ISpaceSettingsLayout`, `CalloutDescriptionDisplayMode`, and the JSONB shape before `contracts/schema-additions.graphql` is written.
- `contracts/schema-additions.graphql` must list every new GraphQL type, enum, and input before `tasks.md` references them in task descriptions.
- `tasks.md` task IDs are stable once written; any in-flight code change that adds, removes, or reorders tasks must update `tasks.md` before merging.

**Gate Criteria — must all be TRUE before Phase 2 starts**:
- [ ] `data-model.md` approved (JSONB shape, default values, and TypeScript interfaces confirmed).
- [ ] `contracts/schema-additions.graphql` matches the final `schema.graphql` additions (verified by `pnpm run schema:diff`).
- [ ] `tasks.md` contains a concrete task for every deliverable in the Project Structure file tree, with explicit file paths.
- [ ] All Phase 0 gate criteria remain true (re-check Constitution Check after design decisions are made).
- [ ] Observability hooks confirmed: migration logging plan defined (see Migration Operational Details), resolver fallback default confirmed (`EXPANDED`), invalid-enum guard confirmed (Apollo enum validation).
- [ ] Resiliency hooks confirmed: rollback strategy documented (see Resiliency & Risk Analysis), JSONB dry-run procedure documented.

---

### Phase 2 — Implementation

**Objective**: Execute all tasks in `tasks.md` in dependency order. Every task must leave the codebase in a compilable, lint-clean state. Tasks marked `[P]` may run in parallel; all others must complete in the listed sequence.

**Task sequencing** (mirrors `tasks.md` phases):

```
Phase 1 (foundational types — ALL must complete before any Phase 2 work):
  T001 [P]  Create CalloutDescriptionDisplayMode enum
  T002 [P]  Create ISpaceSettingsLayout interface
  T003 [P]  Create CreateSpaceSettingsLayoutInput DTO
  T004 [P]  Create UpdateSpaceSettingsLayoutInput DTO
  T005      Add layout field to ISpaceSettings              ← depends on T002
  T006 [P]  Add layout to CreateSpaceSettingsInput          ← depends on T003, T005
  T007 [P]  Add layout to UpdateSpaceSettingsEntityInput    ← depends on T004, T005

Phase 2 (US1 — mutation + resolver):
  T008      Add layout merge to SpaceSettingsService        ← depends on T007
  T009      Add public layout field resolver on Space       ← depends on T002, T005
  T010      Update settings field resolver defaults         ← depends on T009

Phase 3 (US2 — new-space defaults):
  T011      Default layout on space creation                ← depends on T001, T005

Phase 4 (US3 — migration):
  T012      Create AddLayoutSettingsToSpace migration       ← depends on T001

Phase 5 (cross-cutting):
  T013      Regenerate + sort schema                        ← depends on all above
  T014      pnpm lint                                       ← depends on T013
  T015      pnpm build                                      ← depends on T014
```

**Completion criteria — feature is done when ALL of the following hold**:
- [ ] `pnpm build` exits 0 with no TypeScript errors.
- [ ] `pnpm lint` exits 0 with no ESLint/Biome violations.
- [ ] `pnpm run schema:print && pnpm run schema:sort && pnpm run schema:diff` produces no BREAKING entries.
- [ ] All unit tests pass: `pnpm run test:ci:no:coverage src/domain/space/space.settings/space.settings.service.spec.ts`.
- [ ] All layout resolver tests pass: `pnpm run test:ci:no:coverage src/domain/space/space/space.resolver.fields.layout.spec.ts`.
- [ ] All integration/migration tests pass: `pnpm run test:ci:no:coverage test/integration/callout-collapse/callout-collapse.spec.ts`.
- [ ] Observability verified: migration emits before-count, UPDATE-complete, and verification-passed log lines when run against a test database.
- [ ] Resiliency verified: re-running the migration on an already-migrated database emits `0 spaces require backfill` and exits cleanly (idempotency confirmed).
- [ ] `spec.md` acceptance scenarios 1–4 for User Story 1 can be demonstrated via GraphQL Playground on the dev environment.

## Project Structure

### Documentation (this feature)

```text
specs/043-callout-collapse/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── schema-additions.graphql
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (files to create or modify)

```text
src/
├── common/enums/
│   └── callout.description.display.mode.ts          # NEW: enum definition
├── domain/space/space.settings/
│   ├── space.settings.interface.ts                   # MODIFY: add layout field
│   ├── space.settings.layout.interface.ts            # NEW: ISpaceSettingsLayout
│   ├── dto/
│   │   ├── space.settings.dto.create.ts              # MODIFY: add layout input
│   │   ├── space.settings.dto.update.ts              # MODIFY: add layout input
│   │   ├── space.settings.layout.dto.create.ts       # NEW: CreateSpaceSettingsLayoutInput
│   │   └── space.settings.layout.dto.update.ts       # NEW: UpdateSpaceSettingsLayoutInput
│   └── space.settings.service.ts                     # MODIFY: merge layout in updateSettings()
├── domain/space/space/
│   ├── space.service.ts                              # MODIFY: default layout on creation
│   └── space.resolver.fields.ts                      # MODIFY: add layout field resolver + defaults in settings
└── migrations/
    └── <timestamp>-AddLayoutSettingsToSpace.ts        # NEW: backfill migration
```

**Structure Decision**: All changes fit within the existing `src/domain/space/space.settings/` module. No new NestJS modules required. The `layout` sub-object follows the identical directory and naming pattern as `privacy`, `membership`, and `collaboration`.

## Migration Operational Details

### Scope & Duration Estimate

- **Target table**: `space` (JSONB `settings` column)
- **Expected dataset size**: Alkemio production instances typically have hundreds to low-thousands of Space rows. The backfill is a single-pass PostgreSQL `UPDATE … WHERE …` with a JSONB predicate — expected runtime is **< 1 second** for up to 10 000 rows, **< 5 seconds** for up to 100 000 rows. No downtime window required.
- **Scope guard**: `WHERE "settings" ->> 'layout' IS NULL` ensures only rows that have never been backfilled are touched. Re-running the migration after a partial failure is safe and correct (idempotent).

### Progress Logging & Row-Count Metrics

The migration follows the pattern established by `StripContributorTypeFromPayloads1771000011000`:

| Step | Log statement | Level |
|------|--------------|-------|
| Before UPDATE | `[Migration] AddLayoutSettingsToSpace: N spaces require backfill` | `console.log` |
| After UPDATE | `[Migration] AddLayoutSettingsToSpace: backfill complete` | `console.log` |
| Verification (zero remaining) | `[Migration] AddLayoutSettingsToSpace: verification passed — 0 spaces missing layout` | `console.log` |
| Verification (non-zero remaining) | `[Migration] WARNING: N spaces still missing layout after backfill` | `console.warn` |

All output goes to stdout/stderr and is captured by the container log driver and forwarded to the existing ELK stack / Elastic APM pipeline.

### Transaction Behaviour

TypeORM wraps each migration in a single DDL/DML transaction by default. Because the entire backfill is one idempotent `UPDATE` statement on a table that is never expected to exceed O(10 k) rows, a single-transaction approach is correct and proportionate. Per-batch chunking would add complexity without benefit at this scale; the plan will be revisited if dataset growth requires it.

### Verification Step

Immediately after the `UPDATE`, the `up()` method re-queries:

```sql
SELECT COUNT(*) FROM "space" WHERE "settings" ->> 'layout' IS NULL
```

A count > 0 is emitted as `console.warn` so it surfaces in deployment logs and any log-based alert that filters on `WARNING`. Operators can then re-run the migration or investigate the specific rows.

### Rollback / `down()` Behaviour

The `down()` migration is intentionally a no-op (matching the precedent in `AddPinnedAndSortModeToSpace`). Removing the `layout` key from all spaces would cause the GraphQL resolver to fall back to `EXPANDED`, which is the desired backward-compatible behaviour anyway. If reverting the entire feature deployment, the resolver fallback handles null safely without needing a data rollback. A log note is emitted so operations teams know the revert is deliberate.

### Alerts & Monitoring Hooks

- **Success signal**: the post-migration verification log line `verification passed — 0 spaces missing layout` can be used as a log-based alert trigger in Kibana / CloudWatch / Grafana Loki.
- **Failure signal**: the `WARNING: N spaces still missing layout` pattern triggers an existing `[Migration] WARNING` log-level alert if one is configured.
- **Duration**: TypeORM logs migration start/end timestamps; these are sufficient for a duration histogram given the sub-second expected runtime. No additional instrumentation required.
- **Deployment gate**: CI runs `pnpm run migration:run` in the staging pipeline; the migration exit code (non-zero = failure) gates the deployment.

## Resiliency & Risk Analysis

### Rollback Strategy

**Pre-migration backup (recommended):** Before deploying to production, take a logical backup of the `space` table's `settings` column using `pg_dump --table=space --column-inserts` or the platform's standard snapshot procedure. Store the backup artefact in the deployment pipeline alongside the release tag.

**Reverting via `down()` migration:** The `down()` migration is intentionally a no-op today because removing the `layout` key returns the resolver to its safe `EXPANDED` fallback — no user-visible regression occurs. If a hard data-level revert is ever needed (e.g., debugging a corrupt JSONB merge), the commented-out SQL in `down()` can be re-enabled:

```sql
UPDATE "space"
SET "settings" = "settings" - 'layout'
WHERE "settings" ->> 'layout' IS NOT NULL
```

This removes the `layout` key from all rows, after which the resolver synthesises `EXPANDED` as the default. Re-enabling this block requires a code change, a review, and a re-deploy — this is the intended gate to prevent accidental data loss.

**Revert sequencing:**
1. Redeploy the previous server image (removes the GraphQL field and resolver).
2. Optionally run `migration:revert` to execute `down()` (safe, as described above).
3. Verify no GraphQL queries reference `layout` or `calloutDescriptionDisplayMode`.

### Failure Handling for Mid-Run Failures

**Current scale (O(10 k) rows):** A single atomic `UPDATE … WHERE …` wrapped in TypeORM's default migration transaction is the correct approach. If the transaction fails mid-flight (e.g., DB connection drop), PostgreSQL rolls it back entirely. Re-running `migration:run` is safe because the idempotent `WHERE "settings" ->> 'layout' IS NULL` guard skips already-backfilled rows.

**If future scale exceeds O(100 k) rows:** Switch to per-batch processing with the following pattern:
- Fetch a batch of `LIMIT 1000` row IDs where `"settings" ->> 'layout' IS NULL`.
- Wrap each batch in an explicit `BEGIN … COMMIT` (or use `queryRunner.startTransaction()` / `commitTransaction()`).
- On batch failure: log the error and failing batch boundaries, then retry with exponential back-off (initial delay 500 ms, max 3 retries). After exhausting retries, log `console.warn` with the row range and continue to the next batch so a partial failure does not block the entire migration.
- After all batches: run the post-migration verification count query. A non-zero result indicates rows that failed all retries; surface via `console.warn` and alert.

Per-batch chunking is not implemented today because the platform dataset does not warrant it. This note ensures the escalation path is defined.

### JSONB Update Validation

**Schema check (structural):** After the `UPDATE`, the verification `SELECT COUNT(*) … WHERE "settings" ->> 'layout' IS NULL` confirms no rows are left unpatched. A complementary check can validate the written value:

```sql
SELECT COUNT(*) FROM "space"
WHERE "settings" -> 'layout' ->> 'calloutDescriptionDisplayMode' NOT IN ('collapsed', 'expanded')
  AND "settings" ? 'layout';
```

A non-zero result would indicate a corrupted write and should be treated as a blocking deployment failure.

**Sample diffing (manual, pre-deploy):** Before running the migration in production, execute the following in a read-only transaction on a production replica to preview the change without applying it:

```sql
BEGIN;
UPDATE "space"
  SET "settings" = jsonb_set("settings", '{layout}', '{"calloutDescriptionDisplayMode": "expanded"}')
  WHERE "settings" ->> 'layout' IS NULL;

-- Inspect a sample of affected rows
SELECT id, "settings" -> 'layout' AS layout_after
FROM "space"
WHERE "settings" ? 'layout'
LIMIT 20;

ROLLBACK; -- Never commit; this is a dry-run
```

**Dry-run mode:** The above `ROLLBACK`-wrapped pattern acts as the dry-run. Capture the `SELECT` output and verify that every sampled row has `{ "calloutDescriptionDisplayMode": "expanded" }` before proceeding.

### Runtime Error Handling for Invalid `calloutDescriptionDisplayMode` Values

**GraphQL input validation (FR-012):** The `calloutDescriptionDisplayMode` field is typed as the `CalloutDescriptionDisplayMode` GraphQL enum. Apollo Server rejects any mutation that supplies an out-of-enum value at the protocol layer before any resolver executes — no application-level guard is needed for inbound mutations.

**Resolver fallback (FR-007):** The `layout` field resolver in `space.resolver.fields.ts` already contains a defensive default:

```typescript
return loaded.settings?.layout ?? {
  calloutDescriptionDisplayMode: CalloutDescriptionDisplayMode.EXPANDED,
};
```

This guard fires for legacy rows whose JSONB has no `layout` key. It also covers the edge case where `layout` exists but `calloutDescriptionDisplayMode` is absent (e.g., a partial write).

**Telemetry for unexpected values:** If a JSONB row contains an unrecognised string value (possible only via direct DB write, not via the API), the resolver returns it as-is — GraphQL will serialize it and the client enum parser will treat it as an unknown value. To surface this:
- Add a guard in the field resolver that logs `console.warn('[SpaceResolver] unknown calloutDescriptionDisplayMode value: …')` when the stored value is not in the known enum set. This follows the existing `LogContext` logging pattern and requires a one-line code addition if telemetry on corrupt values becomes necessary. Not implemented today; the risk is negligible given the locked-down mutation contract.

### Post-Migration Verification & Monitoring

**Automated checks (CI/CD):** After `pnpm run migration:run` completes in the staging pipeline, the existing integration test suite (`pnpm test:ci`) exercises the `layout` resolver and the migration SQL assertions (see `test/integration/callout-collapse/callout-collapse.spec.ts`). These tests act as the automated post-migration verification gate.

**Row-count assertion:** The migration's own verification query (emitting `console.log` or `console.warn`) provides the primary count check. Operators can independently run:

```sql
SELECT
  COUNT(*) FILTER (WHERE "settings" ? 'layout') AS backfilled,
  COUNT(*) FILTER (WHERE NOT ("settings" ? 'layout')) AS missing
FROM "space";
```

Expected post-migration result: `missing = 0`.

**Canary rollout plan:**
1. Deploy the new server image to the **development** environment. Run `migration:run`. Verify via GraphQL Playground that `space.layout.calloutDescriptionDisplayMode` returns `EXPANDED` for existing spaces and `COLLAPSED` for newly created spaces.
2. Promote to **staging**. Re-run the migration (idempotent; no rows will be updated). Run the integration test suite. Check deployment logs for the `verification passed` line.
3. Promote to **production**. Monitor the following for 30 minutes post-deploy:
   - Container logs for any `[Migration] WARNING` pattern.
   - GraphQL error rate on the `layout` resolver field (Elastic APM or existing metrics dashboard).
   - No increase in `null` field errors or `INTERNAL_SERVER_ERROR` responses related to `SpaceSettings`.
4. If any alert fires: roll back the server image to the previous tag. The resolver fallback ensures no null-bubbling occurs on the GraphQL type even before `down()` is executed.
