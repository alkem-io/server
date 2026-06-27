# Quickstart: Verifying the Space Authorization Reset Optimization

This guide describes how to validate that the optimization (a) preserves access policies exactly and (b) resolves the production failure / hits the performance bar.

## Prerequisites

```bash
pnpm install
pnpm build
pnpm run start:services   # PostgreSQL 17.5, RabbitMQ, Redis, Ory
pnpm run migration:run
```

## 1. Prove access policies are unchanged (correctness — SC-002, FR-004/FR-011)

The core safety check. Capture a baseline of computed policies **before** the change, then assert equality **after**.

1. Seed (or restore) a space fixture that exercises every in-scope entity type: collaboration with multiple callouts, contributions (post/whiteboard/link/memo/collabora), community + role set + groups, storage with documents+tagsets, templates (L0), timeline/calendar with events, and at least one nested subspace.
2. Run the authorization reset and serialize the resulting policies per entity (credential rules + privilege rules), keyed by entity id. Store as the baseline.
3. Apply the load trimming.
4. Re-run the reset on the same input state and diff against the baseline.

**Pass criteria**: zero differences across all entity types.

```bash
# The permanent regression test that encodes the above:
pnpm test -- <path-to>/space.authorization.equivalence.spec.ts
```

## 2. Confirm no public API / schema drift (FR-010)

```bash
pnpm run schema:print && pnpm run schema:sort
pnpm run schema:diff      # MUST report no schema change
```

## 3. Measure the data-loading reduction (SC-003)

For a content-heavy space, compare rows hydrated / peak memory before vs after.

- Enable TypeORM query logging (or APM transaction spans) around `applyAuthorizationPolicy`.
- Trigger a reset (e.g. `updateSpacePlatformSettings`, or the account-level `authorizationPolicyResetOnAccount`).
- Compare the count of rows loaded and peak heap.

**Pass criteria**: order-of-magnitude fewer rows loaded for content-heavy spaces; peak memory within the production container limit (no OOM).

## 4. Measure end-to-end completion on a large space (SC-001, SC-004)

Against a production-scale fixture (deep subspace hierarchy × hundreds of callouts × thousands of contributions × thousands of documents × many templates):

- Trigger a full reset and time it.

**Pass criteria**: completes successfully (no OOM/timeout) in **under 5 minutes**.

> If correctness passes but the 5-minute target is missed, the deferred follow-up (batched child loading to remove the N+1 re-fetch — see research.md) is the next lever. The memory/OOM fix does not depend on it.

## 5. Regression safety

```bash
pnpm lint
pnpm test:ci:no:coverage
```

Existing resilience/cascade tests MUST stay green (FR-009 — failure-handling semantics unchanged).

---

## Runbook: equivalence + data-load test (as executed)

A standalone tool runs the **real** space authorization reset against a connected
database — booting a NestJS application context, so it bypasses HTTP/Oathkeeper
auth and exercises every trimmed TypeORM load/guard directly. Use it to prove
(a) the reset still completes, (b) the computed policies are unchanged, and
(c) how much less data is loaded.

> Why not the GraphQL mutation? `authorizationPolicyResetOnAccount` requires
> admin actor resolution via Oathkeeper. On a fresh/small DB the admin identity
> may resolve as anonymous (`me.user: null`), so the app-context tool is the
> reliable path. (`authorizationPolicyResetAll` is also async via RabbitMQ —
> harder to observe.)

### Tool

`src/tools/auth-reset/run-space-auth-reset.ts`

```bash
# <spaceId> required. Flags: --save persists child policies; --measure counts DB load.
# AUTH_RESET_DUMP=<path> writes a stable JSON serialization of the computed policies.
npx ts-node -r tsconfig-paths/register \
  src/tools/auth-reset/run-space-auth-reset.ts <spaceId> [--save] [--measure]
```

### Prerequisites

1. Dependencies running: `pnpm run start:services` (PostgreSQL etc.) + migrations applied.
2. A space id — query it (any logged-in or anonymous session):
   `echo 'query { spaces { id level about { profile { displayName } } } }' > /tmp/.gql-query && .scripts/gql-request-interactive.sh`
   (Admin login, if needed elsewhere: put `PIPELINE_USER`/`PIPELINE_PASSWORD` in
   `.claude/pipeline/.env` and run `.scripts/interactive-login.sh`.)

### A. Smoke test — does the reset still run?

```bash
npx ts-node -r tsconfig-paths/register \
  src/tools/auth-reset/run-space-auth-reset.ts <spaceId>
# Expect: "OK: reset completed, N authorization policies computed in <ms>"
# A broken trim throws RelationshipNotFoundException / EntityNotInitializedException.
```

### B. Equivalence — are policies unchanged? (FR-004 / SC-002)

Run with the trimmed code, then with the pre-optimization code, and diff.

```bash
SPACE=<spaceId>
# Pre-optimization base commit (parent of the optimization commit):
BASE=126c4becf
# The trimmed files:
TRIMMED="src/domain/space/space/space.service.authorization.ts \
src/domain/collaboration/callout/callout.service.authorization.ts \
src/domain/template/template/template.service.authorization.ts \
src/domain/template/templates-manager/templates.manager.service.authorization.ts \
src/domain/template/templates-set/templates.set.service.authorization.ts"

# 1) trimmed (current working tree)
AUTH_RESET_DUMP=/tmp/p_trimmed.json npx ts-node -r tsconfig-paths/register \
  src/tools/auth-reset/run-space-auth-reset.ts $SPACE

# 2) revert just those files to the original, run again
git checkout $BASE -- $TRIMMED            # NOTE: in zsh, list files explicitly (no $VAR splitting)
AUTH_RESET_DUMP=/tmp/p_original.json npx ts-node -r tsconfig-paths/register \
  src/tools/auth-reset/run-space-auth-reset.ts $SPACE

# 3) restore the trimmed versions
git checkout HEAD -- $TRIMMED             # if the trims are UNCOMMITTED, use `git stash` instead — `checkout HEAD` clobbers them

# 4) compare — empty diff == byte-identical policies
diff /tmp/p_original.json /tmp/p_trimmed.json && echo "ZERO DIFF — policies identical"
```

Gotchas learned the hard way:
- **zsh does not word-split unquoted `$TRIMMED`** — list the 5 paths explicitly in each `git` command.
- **`git checkout HEAD -- …` overwrites uncommitted working-tree edits.** If your
  trims aren't committed, `git stash push -- <files>` / `git stash pop` instead.
- The serializer normalizes/sorts credential + privilege rules, so ordering noise
  doesn't cause false diffs. A real diff (e.g. a missing `type` field) is signal —
  that's how the TemplatesSet `select` was found to drop the authorization `type`
  column (fixed by selecting `type` explicitly).

### C. Data-load measurement — how much less is loaded?

`--measure` wraps the query runner to count queries, SELECTs, rows hydrated, and
field-cells (rows × columns).

```bash
npx ts-node -r tsconfig-paths/register \
  src/tools/auth-reset/run-space-auth-reset.ts <spaceId> --measure
# Prints: MEASURE queries=.. selects=.. rows=.. cells=..
```

Run it for both the trimmed and the original code (steps B1/B2 with `--measure`)
and compare `cells` for the % reduction.

> **Use a content-rich space.** The reduction scales with callouts, contributions,
> documents, and templates. On a near-empty space the figure is a floor (e.g. the
> Default Space measured ~4% fewer cells, same query/row count, because it has no
> such content). Quote the number from a large/populated space — that is the
> figure for the optimization summary (task **T029**).
