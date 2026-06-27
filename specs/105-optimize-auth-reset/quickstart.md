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
