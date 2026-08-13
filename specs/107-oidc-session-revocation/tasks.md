---
description: "Task list for 107-oidc-session-revocation"
---

# Tasks: Session Revocation Cascade on Account Deletion

**Input**: Design documents from `/specs/107-oidc-session-revocation/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: **REQUIRED, not optional.** Spec §Success Criteria and the design
input's §5.2 make tests the *audit evidence* for ISO 27001 A.5.18 / SOC 2 CC6.2 —
"we call the method" is not proof that access ended. Test tasks are therefore
first-class here and several are written before their implementation.

**Organization**: Grouped by user story so each ships independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: `[US1]` / `[US2]` / `[US3]` — maps to the user stories in spec.md
- Every task names its exact file path, except the Phase 6 investigation and
  reporting tasks (T028–T030, T038, T039) whose deliverable is a section of the
  **PR body** rather than a source file. Each names that deliverable explicitly.

> **Numbering note**: T035–T039 were added by the `/speckit-analyze` passes to
> close coverage gaps and are appended by ID rather than renumbered into
> position, so IDs no longer read strictly in execution order. Renumbering would
> invalidate every cross-reference in this file, in `plan.md`'s phase list and in
> the dependency graph, to buy nothing. **Execution order is the order tasks
> appear on the page**, not the numeric order of their IDs.

## Path Conventions

Single NestJS service, repository root `/`. Source under `src/`, specs
co-located as `*.spec.ts` beside their subject (repo convention — there is no
separate `tests/` tree for unit tests).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Nothing to scaffold — this feature adds files to an existing,
fully-configured project. No new dependency, no new tool, no new config.

- [X] T001 Verify the worktree builds clean before any change: run `pnpm install` then `pnpm lint && pnpm build` at the repository root and record the baseline. A pre-existing failure must be known before it can be blamed on this feature.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The type vocabulary, the Redis primitives, the audit vocabulary and
the DI foundation. **Nothing in Phase 3+ compiles until this phase is done.**

- [X] T002 [P] Create `src/core/auth/oidc/revocation/session-revocation.types.ts` — export `SessionRevocationReason` (all five members: `account_deleted`, `password_changed`, `email_changed`, `admin_revoked`, `user_revoked`), `SessionRevocationOutcome`, `TokenRevocationOutcome`, `SessionRevocationEntry`, `SessionRevocationReport`, `RevokeAllForSubOptions`. Shapes are specified verbatim in `data-model.md` §3. Comment why all five reasons ship now (research R5) so a reviewer does not delete the four unused ones.
- [X] T003 [P] Extend `src/core/auth/oidc/audit.ts` — add `'session.revocation.initiated' | 'session.revoked' | 'session.revocation.completed'` to the `AuditEventType` union and an optional `reason?: SessionRevocationReason | null` field to `AuditEvent`. Purely additive; do not touch existing members. Note in a comment why `session.ended` is NOT reused (it means voluntary sign-out — `contracts/audit-events.md`).
- [X] T004 Create `src/core/auth/oidc/session-index.redis.ts` — `SUB_INDEX_KEY_PREFIX = 'alkemio:sub:'`, `subIndexKey(sub)`, `addSessionToSubIndex(redis, sub, sid, absoluteExpiresAt)`, `removeSessionFromSubIndex(redis, sub, sid)`, `listSessionsForSub(redis, sub)`, `dropSubIndex(redis, sub)`. `addSessionToSubIndex` MUST `SADD` **and** roll the TTL forward per the `max(current, candidate, 1)` rule in `contracts/redis-keyspace.md` — a `SADD` without an `EXPIRE` is a permanent key leak (invariant I1, trap 9). No function may issue `KEYS` or `SCAN` (invariant I4).
- [X] T005 Create `src/core/auth/oidc/session-index.redis.spec.ts` — assert: `SADD` is always paired with an `EXPIRE` (I1); the TTL is rolled forward and **never** shortened when a later-expiring session joins (I2); `listSessionsForSub` on a missing key returns `[]` (I6); the issued command list contains no `KEYS`/`SCAN`/wildcard (I4); the computed TTL floors at 1s. Use a hand-rolled in-memory fake over the narrow `ioredis` surface — **do not** add an `ioredis-mock` dependency (research R12).
- [X] T006 Create `src/core/auth/oidc/oidc-core.module.ts` — provide and export `OIDC_REDIS_CLIENT` (a single `ioredis` client from `ConfigService.get('storage.redis')`), `SESSION_STORE_HANDLE` (built over that same client — **moved** from `oidc.module.ts:49-59`, not duplicated), `OidcService` (**moved** from `oidc.module.ts`), and the two new services. Only import is `ConfigModule`. Document why this module exists: `UserModule` cannot import `OidcModule` without a cycle (research R8, constitution principle 2) and `forwardRef` is not an acceptable answer.
- [X] T007 Edit `src/core/auth/oidc/oidc.module.ts` — import `OidcCoreModule`, delete the inline `SESSION_STORE_HANDLE` provider and the `OidcService` provider, and re-export `OidcCoreModule` so the module's public surface is unchanged. Verify with `pnpm build` that DI still resolves for `OidcController`, `CookieSessionStrategy` and `ForwardAuthResolverService`, the three consumers of `SESSION_STORE_HANDLE`.

**Checkpoint**: `pnpm build` green. The foundation exists; no behaviour has changed yet.

---

## Phase 3: User Story 1 — Deleting an account ends that account's access immediately (Priority: P1) 🎯 MVP

**Goal**: A deleted account's sessions stop authenticating, on every device,
within a second, and the deletion cannot be broken by the attempt.

**Independent test**: Sign in, capture the session, delete the account, replay a
request with that session — it is refused as unauthenticated. Delivers the entire
security value of the feature on its own.

### Tests for User Story 1 (write first — these ARE the audit evidence)

> **Note on `[P]` in this phase**: T008–T010 and T035 all write to
> `oidc-session-revocation.service.spec.ts`, so they are **not** parallel with
> each other — `[P]` is reserved for genuinely different files. They are
> parallel with T011/T012/T036, which target other files.

- [X] T008 [US1] Create `src/core/auth/oidc/revocation/oidc-session-revocation.service.spec.ts` with the **contract-critical** cases from `contracts/session-revocation-service.md`: C3 asserts `markTerminated` is called and `destroy` is **never** called (trap 1 — this is the single most important assertion in the feature); C1 null/empty `sub` is a no-op success touching Redis zero times; C2 exactly one `SMEMBERS` against one key and no `KEYS`/`SCAN`; C4 full per-session teardown order (index `SREM`; the refresh lock is deliberately NOT deleted); C5 the three payload states → `revoked` / `already_terminated` / `already_absent`, with **no** tombstone written for `already_absent`.
- [X] T009 [US1] Add to the same spec file the failure-mode cases: C6 remote revocation timeout/non-2xx/missing-metadata → `tokenRevocation: 'failed'` while the **local tombstone still stands** (FR-013); C8 partial failure resolves with a mixed report rather than rejecting; C9 the *only* rejection is a failing index read; idempotency — running `revokeAllForSub` twice yields the same successful report and issues no second `markTerminated`.
- [X] T010 [US1] Add to the same spec file the leak-proof test for C10/SC-006: drive a forced-failure run with recognisable fixture token values, capture everything written to the audit stream **and** the logger, serialise it, and assert none of the fixture values appears anywhere. This is FR-021 turned into a check rather than a promise.
- [X] T035 [US1] Add to the same spec file the **audit-emission** cases (FR-019, FR-020, FR-022, SC-005) — *closes analyze finding E1*: assert `session.revocation.initiated` is emitted exactly once and **before** the first `markTerminated` call (FR-018, ordering asserted, not just presence); one `session.revoked` per session with `outcome` mapped per `contracts/audit-events.md` (`success` for revoked/already_terminated/already_absent/skipped_excepted, `failure` for failed); a locally-successful but remotely-failed session still emits `outcome: 'failure'` with `error_code: 'token_revocation_failed'`; exactly one `session.revocation.completed` whose `outcome` is `failure` iff `complete === false`; and that every emitted record carries `reason`, `sub` and `correlation_id`. Without this, the audit trail — which *is* the ISO 27001 A.8.15 / SOC 2 CC7.2 evidence — is asserted by nothing.
- [X] T011 [P] [US1] Create `src/domain/community/user/user.service.delete.spec.ts` — assert `deleteUser` calls `revokeAllForSub(user.authenticationID, 'account_deleted')` **and** `kratosService.invalidateAllIdentitySessions`; that **both** run when `deleteData.deleteIdentity` is `false` (FR-025, trap 2 — the single most likely mis-implementation); that both run **after** the transaction callback resolved (FR-026); and that when **both** throw, `deleteUser` still resolves with the deleted user (FR-027, SC-004 — user deletion has broken against Kratos four times before).
- [X] T012 [P] [US1] Add to `user.service.delete.spec.ts`: a user with `authenticationID === null` is deleted with **no** revocation attempted and **no** error raised (FR-017/FR-028, trap 8).
- [X] T036 [P] [US1] Create `src/core/auth/oidc/strategies/cookie-session.strategy.index.spec.ts` — *closes analyze finding E2*, covering FR-002a, SC-011a and SC-011b: a live session **absent** from the index (i.e. established before this build) is added to it on `validate` and is then revocable (SC-011a — the deploy-day story, otherwise every session alive at release is permanently unrevocable); `validate` **resolves before the index write settles**, proving it is not awaited (SC-011b); a rejecting index write neither fails nor delays `validate` but **does** emit a warn log (FR-006, and constitution principle 5's ban on silent failure paths); and — invariant I5 — a **tombstoned** payload and an **absolute-TTL-breached** payload are *never* re-indexed, because re-indexing a dead sid on every request from a stale tab would corrupt the `already_absent` accounting.
- [X] T037 [P] [US1] Extend `src/core/auth/oidc/oidc.controller.spec.ts` (create if absent) — *closes analyze finding E3*, covering FR-002/FR-003/FR-006 at the controller: the callback adds the new sid to `alkemio:sub:<sub>`; both logout branches and the refresh-failure teardown `SREM` it, reading `sub` **before** `session.destroy` (after it, the payload is gone and the prune silently targets `undefined`); and a rejecting index call fails **neither** login nor logout, logging at warn instead.

### Implementation for User Story 1

- [X] T013 [US1] Implement `src/core/auth/oidc/revocation/oidc-session-revocation.service.ts` — `revokeAllForSub(sub, reason, opts?)` per `contracts/session-revocation-service.md` C1–C11. Order per C4: `get(sid)` capturing `client_id` + `refresh_token` **before** mutating, then `markTerminated`, then index `SREM`, then the remote revoke (the refresh lock is deliberately left alone — see the contract). Emit `session.revocation.initiated` **before** the first teardown (FR-018, trap 5).
- [X] T014 [US1] In the same service, implement the RFC 7009 leg: resolve `revocation_endpoint` from `OidcService.getIssuer().metadata` (the same discovery metadata the logout leg reads at `oidc.controller.ts:634`), `POST` form-encoded `token`/`token_type_hint=refresh_token`/`client_id` with `AbortSignal.timeout(3000)`. **No retry, no circuit breaker** — FR-012a, and record the rationale inline because constitution principle 8 requires all three to be stated. Wrap `getIssuer()` in a try/catch: discovery may not have completed and that must degrade to `tokenRevocation: 'failed'`, never throw.
- [X] T015 [US1] Edit `src/core/auth/oidc/oidc.controller.ts` `callback` — after `req.session.save` resolves, add the session to `alkemio:sub:<sub>` (FR-002). Best-effort: a failure logs at warn and **must not** fail the login (FR-006). `sub` and `absolute_expires_at` are already in scope at `:246`/`:263`.
- [X] T016 [US1] Edit `src/core/auth/oidc/oidc.controller.ts` teardown paths — prune the index on the refresh-failure teardown (`tearDownSession`, `:476`) and on both logout branches (the stale-cookie destroy at `:555` and the normal destroy at `:610`, whose `sub` is read at `:603`), capturing `sub` **before** `req.session.destroy` since the payload is gone afterwards (FR-003). Same best-effort rule.
- [X] T017 [US1] Edit `src/core/auth/oidc/strategies/cookie-session.strategy.ts` — after the tombstone branch (`:89`) and the absolute-TTL branch (`:105`), and only for a live payload, fire the self-healing index write (FR-002a). **Not awaited**; `void`ed with an explicit `.catch()` that logs at warn with sid + sub — unawaited, not unobserved (constitution principle 5 forbids silent failure paths). Placement after both branches is load-bearing: re-indexing a tombstone would resurrect a dead sid on every request from a stale tab (invariant I5).
- [X] T018 [US1] Edit `src/domain/community/user/user.module.ts` — import `OidcCoreModule`.
- [X] T019 [US1] Edit `src/domain/community/user/user.service.ts` `deleteUser` — inject `OidcSessionRevocationService`; in the post-commit block (after the transaction closes at `:563`, **before** the existing `if (user.authenticationID)` Kratos block at `:565`) add the two new legs, each individually `try/catch`ed with an error log, matching the shape of the existing calls at `:570`/`:586`. **Unconditional** — not inside and not gated by `deleteData.deleteIdentity`. Awaited in-line, not dispatched (FR-026a).
- [X] T020 [US1] Create an integration-style spec `src/core/auth/oidc/revocation/revocation-ends-access.spec.ts` — wire the **real** `OidcSessionRevocationService` to an in-memory Redis fake and the **real** `CookieSessionStrategy`, then: seed two live sessions for one sub → `revokeAllForSub` → assert `strategy.validate` now **throws `CookieSessionInvalidError`** for both (not `null`, which would be the anonymous fall-through). Also assert `request_context_cache` is `null` afterwards. This is the "proof the next request was rejected" link of the audit trace (SC-001, SC-003) and the only test that proves access actually ended rather than that a method was called.

**Checkpoint**: US1 is independently shippable. The anchor bug is closed.

---

## Phase 4: User Story 2 — A stale session degrades instead of breaking the app (Priority: P2)

**Goal**: An orphaned session renders an empty, harmless UI instead of a wall of
errors.

**Independent test**: Issue the `me` query with a session carrying no resolved
account — every field resolves to its empty value and there is no `errors` key.

**Note**: shares **no file** with Phase 3 and depends only on Phase 1. Can be
implemented fully in parallel with US1 by a separate worker.

### Tests for User Story 2

- [X] T021 [P] [US2] Create `src/services/api/me/me.resolver.fields.spec.ts` — for each of the six guards in that file, assert an empty-`actorID` context returns the empty value (`0`, `[]`, the empty page of FR-029a, `{}`) and throws nothing; assert one warn log per degraded field (FR-030); and assert the authenticated path still delegates to the same service method with the same arguments (FR-031).
- [X] T022 [P] [US2] Extend `src/services/api/me/me.conversations.resolver.fields.spec.ts` — the seventh guard returns `[]` on an empty `actorID` and still delegates normally otherwise.

### Implementation for User Story 2

- [X] T023 [US2] Edit `src/services/api/me/me.resolver.fields.ts` — relax six guards per `contracts/graphql-me-degradation.md`: `notifications` `:37` (**`ForbiddenException`**, not `ValidationException` — the design input's line list misses this one) → the FR-029a empty page; `notificationsUnreadCount` `:59` → `0`; `communityInvitationsCount` `:108` → `0`; `communityInvitations` `:133` → `[]`; `communityApplications` `:159` → `[]`; `conversations` `:221` → `{}`. Each emits one warn line first. **Do not** touch `id` `:75` or `user` `:87` (clarification pass 1; `user` is already correct).
- [X] T024 [US2] Edit `src/services/api/me/me.conversations.resolver.fields.ts:23` → return `[]` with a warn line. **This is the guard that actually matters**: T023's `:221` change only builds the empty container, so without this one `me { conversations { conversations } }` still errors — a cosmetic fix that passes a shallow test and fails the real client query (research R9).

**Checkpoint**: US2 independently shippable.

---

## Phase 5: User Story 3 — The revocation capability is reusable (Priority: P3)

**Goal**: Prove — not assert — that server#6073, client-web#10070 and the admin
email-change defect consume this primitive without changing it (trap 10).

**Independent test**: revoke with one session named as the exception; the named
session still authenticates, the other does not.

- [X] T025 [US3] Add C7 coverage to `src/core/auth/oidc/revocation/oidc-session-revocation.service.spec.ts` — with `opts.exceptSid` set, the excepted sid is reported `skipped_excepted`, is **not** tombstoned, and is **left in the index** (a future `scope=others` call must still see it); the other sid is `revoked`. This is ASVS V3.3.2, which both downstream consumers need.
- [X] T026 [US3] Add to `src/core/auth/oidc/revocation/oidc-session-revocation.service.spec.ts` a consumer-compatibility case asserting each of the five `SessionRevocationReason` values is accepted and lands verbatim in the tombstone's `terminated_reason` **and** in the audit `reason` field — the evidence for the matrix in `contracts/session-revocation-service.md`. *(Same file as T025 and T008–T010, so neither is `[P]`.)*

**Checkpoint**: the primitive is demonstrably reusable, not merely claimed to be.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T027 [P] Create `src/core/auth/oidc/revocation/subject-contract.spec.ts` — assert `session.sub === user.authenticationID` by constructing both and comparing, with a comment stating plainly that a failure here means *the OIDC subject source changed and revocation is now silently a no-op* (research R10, trap 7). Guards against the worst failure mode this design has: a security control failing open and silent.
- [X] T028 [P] While in `oidc.controller.ts` for T015/T016, check the hardcoded `prompt: 'login'` at `:169` against the alkemio#1989 SSO lead (design input §4.4, marked UNVERIFIED). **Record the finding in the PR body only — change nothing.** Explicitly out of scope.
- [X] T029 [P] Assess the `authenticationID` backfill migration described in the issue's root-cause section: confirm whether US1–US3 close #6315 without it, and write a recommendation for the PR body. **Do not implement it** — it needs a Kratos email→identity lookup inside a migration, a pattern this repo does not have.
- [X] T030 Re-read the design input's §9 traps 1–10 against the actual diff, one by one, and record the pass in the PR body. The document says to do this before opening the PR; doing it after writing the code is when it actually catches something. **Also run the four diff-shape checks from `data-model.md` §6** — *closes analyze finding U3*: no `src/migrations/**` file appears; no `*.entity.ts` appears; the only new Redis key family is `alkemio:sub:*`; every `SADD` in the diff has an `EXPIRE` on the same path. Each is a one-command `git diff` check and each catches a different way this change could quietly grow beyond its stated footprint.
- [X] T039 Enumerate — **do not file** — the follow-ups in a `## Follow-ups to file` section of the PR body, *closing analyze finding E4* and satisfying the spec's Out of Scope commitment. All five from the design input §6/WS5: (1) **the unreported production defect** — the shipped admin email-change flow revokes only the Kratos session and leaves BFF/API access alive (`user.email.change.service.ts:519`), the same defect class as this one, silently live today and the most important of the five; (2) ask the epic owner (alkemio#1868) to promote the account-event cascade out of *"What this unlocks"* into must-have scope, since two open bugs now sit in a deliberately-deferred bucket; (3) record OIDC Back-Channel Logout as the target architecture, otherwise every new relying party recreates this bug; (4) the `prompt: 'login'` finding from T028; (5) whether deleting a user kills their Matrix/Synapse access tokens and any assistant delegation tokens — UNVERIFIED. Plus (6) the `authenticationID` backfill recommendation from T029.
- [X] T038 [P] Record the two requirements satisfied **by construction** rather than by new code, so a reviewer can tell "already true" from "forgotten" — *closes analyze findings U1 and U2*. **FR-009a** (the refusal is time-bounded, then degrades to anonymous): already delivered by the pre-existing `SESSION_TOMBSTONE_TTL_S = 300` in `session-store.redis.ts:12`; add a one-line comment at the `markTerminated` call site in the revocation service pointing at it. **SC-002** (sub-second effect): inherent — the teardown is awaited in-line and is a fixed handful of O(1) Redis commands per session with no unbounded loop; note it in `plan.md`'s risk table rather than writing a timing test, which would be flaky and prove nothing.
### Exit gates (strictly last, strictly sequential)

- [X] T031 Exit gate 1 — `pnpm lint` (tsc --noEmit + biome check) clean.
- [X] T032 Exit gate 2 — `pnpm build` clean.
- [X] T033 Exit gate 3 — `pnpm test:ci:no:coverage` clean, whole suite.
- [X] T034 Exit gate 4 — `pnpm run schema:print && pnpm run schema:sort && pnpm run schema:diff` reports **zero** breaking changes, proving the "no schema change" claim in plan.md rather than assuming it (constitution principle 3, SC-010).

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Phase 1 (T001)
   └─► Phase 2 (T002…T007) ── BLOCKING
          ├─► Phase 3 / US1 (T008…T020, T035…T037)  ──┐
          └─► Phase 4 / US2 (T021…T024)              ─┤  (parallel — no shared file)
                                                       │
                 Phase 5 / US3 (T025, T026) ───────────┘  (needs T013)
                        └─► Phase 6 (T027…T030, T038, T039 → gates T031…T034)
```

### Task-level dependencies

- T002, T003 are parallel; T004 needs neither but T005 needs T004.
- T006 needs T002 + T004 (it registers the services those define).
- T007 needs T006.
- T013 needs T002, T004, T006. T014 needs T013.
- T015–T017 need T004 (the index primitives) only.
- T019 needs T013 + T018.
- T020 needs T013 + T017.
- T025, T026, T035 need T013.
- T036 needs T017. T037 needs T015 + T016.
- **File-sharing constraint**: T008, T009, T010, T025, T026 and T035 all write
  `oidc-session-revocation.service.spec.ts`. They must be sequenced, never run
  concurrently, and none of them carries `[P]`.
- T031–T034 are strictly last and strictly sequential: a failure at any gate
  means fix and **restart from T031**.

### User Story Dependencies

| Story | Depends on | Blocks |
|---|---|---|
| US1 (P1) | Phase 2 | US3 |
| US2 (P2) | Phase 2 | nothing |
| US3 (P3) | T013 (US1's service) | nothing |

US2 is fully independent of US1 — different directories, no shared file. That is
deliberate: the degradation is worth shipping even if the cascade were to slip.

### Parallel Opportunities

- **Phase 2**: T002 ∥ T003 (different files).
- **Phase 3 tests**: three independent files, so three streams —
  {T008 → T009 → T010 → T035} ∥ {T011 → T012} ∥ {T036} ∥ {T037}.
- **Phase 3 impl**: T017 ∥ {T015 → T016} after T004 (strategy and controller are
  separate files; T015/T016 share the controller so those two are sequenced).
- **Phase 3 ∥ Phase 4**: entirely parallel, zero shared files.
- **Phase 6**: T027 ∥ T028 ∥ T029 ∥ T038 (investigation, a standalone spec, and
  two documentation notes).

## Parallel Example: User Story 1

```text
# after Phase 2 checkpoint, fan out (each worker owns its files exclusively):
Worker A: T008 → T009 → T010 → T035   (revocation service specs — one file, sequential)
Worker B: T011 → T012                 (deletion specs — one file, sequential)
Worker C: T015 → T016 → T037          (controller index wiring + its spec)
Worker D: T017 → T036                 (strategy self-heal + its spec)
# then converge (single worker):
T013 → T014 → T018 → T019 → T020
```

## Implementation Strategy

### MVP (User Story 1 only)

Phases 1 + 2 + 3, then gates. That is the whole of #6315's security fix: an
access-control failure closed, PII erased from the session store, and both legs
of the cascade wired. Shippable on its own.

### Incremental delivery

1. **MVP** — US1. Anchor bug closed.
2. **+ US2** — orphaned sessions degrade rather than break. Also incidentally
   fixes `me` erroring for plain anonymous callers, which is live today.
3. **+ US3** — the reusability proof that stops this from being rewritten for
   server#6073 in three months.

All three fit in one PR; the phasing exists so a gate failure in one does not
hold the others hostage.

## Notes

- **`markTerminated`, never `destroy`.** Every session teardown this feature adds
  writes a tombstone. `destroy` reproduces the reported bug wearing a different
  hat. If exactly one assertion survives review, make it T008's.
- **Revocation may never fail the delete mutation** (T011). Deletion has broken
  against Kratos in #5350, #5678, #4762 and #2137. This one adds two more
  external calls to that path; both are best-effort by construction.
- **No migration, no entity change, no schema change.** If `src/migrations/**` or
  any `*.entity.ts` shows up in the diff, something has gone wrong — see research
  R4 for why the audit trail deliberately stays off `platform_audit_entry`.
- Commit in logical slices: Phase 2, then US1, then US2, then US3, then polish.
