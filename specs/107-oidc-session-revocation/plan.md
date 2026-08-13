# Implementation Plan: Session Revocation Cascade on Account Deletion

**Branch**: `story/6315-oidc-session-revocation-cascade` | **Date**: 2026-07-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/107-oidc-session-revocation/spec.md`

**Anchor story**: [alkem-io/server#6315](https://github.com/alkem-io/server/issues/6315)

## Summary

Deleting a user today leaves their BFF/OIDC session in Redis untouched, so the
browser keeps authenticating for up to the 30-day absolute ceiling against an
account that no longer exists — an access-control failure, and an incomplete
erasure (the session payload caches display name and email).

The fix is one missing primitive behind the bug: there is **no `sub → [sid]`
index**, so a user's sessions cannot be enumerated, so they cannot be revoked.
This plan adds that index, adds an `OidcSessionRevocationService` that tombstones
every session for a subject (`markTerminated`, **not** `destroy` — the tombstone
is what produces the 401 that flips the client to signed-out, and it is what
discards the cached PII), wires it into `deleteUser` alongside the already-existing
but never-called `kratosService.invalidateAllIdentitySessions`, and relaxes the
`me` sub-resolvers so an orphaned session degrades to empty values instead of
erroring.

**Zero DDL. Zero migrations. Zero GraphQL schema change.** The audit trail rides
the existing structured OIDC audit stream rather than `platform_audit_entry`,
which deliberately avoids colliding with the in-flight `027-platform-role-redesign`
work that already owns the database-side audit row for user deletion (research R4).

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 22 LTS (Volta pins 22.21.1)

**Primary Dependencies**: NestJS 10; `ioredis` 5.10 (session store + new index);
`connect-redis` / `express-session` (session lifetime, untouched);
`openid-client` 5.7 (issuer discovery — read-only here); `@ory/kratos-client`
(existing `invalidateAllIdentitySessions`); Node global `fetch` +
`AbortSignal.timeout` for the RFC 7009 call (**no new dependency**)

**Storage**: Redis only. Two key families: the existing `alkemio:sid:<sid>`
session payloads, and the new `alkemio:sub:<sub>` per-subject index sets.
**PostgreSQL is not touched** — no entity change, no migration.

**Testing**: Vitest 4.0, `@golevelup/ts-vitest` `createMock`, co-located
`*.spec.ts`. An in-memory fake implementing the narrow `ioredis` surface the
index uses (no `ioredis-mock` dependency added)

**Target Platform**: Linux server (Docker `node:22-alpine`), behind Traefik
forward-auth; Redis and Ory Hydra/Kratos as sidecar services

**Project Type**: Single NestJS web service (`alkem-io/server`)

**Performance Goals**: Revocation is off every hot path (deletion is privileged
and rare, A-05). The **only** hot-path addition is the self-healing index write
in `CookieSessionStrategy.validate`, which is fire-and-forget and must add
**zero** awaited latency (SC-011b)

**Constraints**: Revocation MUST NOT fail the delete mutation (FR-027); MUST run
after commit and outside the transaction (FR-026); MUST NOT scan the keyspace
(FR-005); MUST NOT introduce a module cycle; RFC 7009 call bounded to 3 s with no
retry and no circuit breaker (FR-012a); no token material in any audit record or
log (FR-021)

**Scale/Scope**: ~10 files touched, ~6 new. Sessions per account are single
digits in practice; the index set is sized accordingly

## Constitution Check

*GATE: evaluated before Phase 0, re-evaluated after Phase 1 design.*

| # | Principle | Assessment | Verdict |
|---|---|---|---|
| 1 | Domain-Centric Design First | Revocation is an authentication-infrastructure concern, so it lives in `src/core/auth/oidc/`, not `src/domain`. `UserService.deleteUser` *orchestrates* it — it calls a service, it does not embed session-teardown rules. No business logic added to a controller or resolver | **PASS** |
| 2 | Modular NestJS Boundaries | New `OidcCoreModule` has a single purpose (the OIDC session foundation) and one import (`ConfigModule`). It is what makes `UserModule → OidcModule` — a genuine cycle — unnecessary. **No `forwardRef` is used anywhere** (research R8) | **PASS** |
| 3 | GraphQL Schema as Stable Contract | Zero schema change. The `me` fields keep their names, types and nullability; only the failure *behaviour* changes, from an error to the empty value the type already permits (FR-031). `pnpm schema:diff` must report **0 breaking changes** — an exit gate | **PASS** |
| 4 | Explicit Data & Event Flow | Deletion follows validation → authorization → domain operation → persistence, with revocation as an explicit post-commit side effect. The event bus was considered and rejected: it is async fire-and-forget, which contradicts FR-026a and destroys the audit trace (research R8) | **PASS** |
| 5 | Observability & Operational Readiness | Three additive audit event types on the existing OIDC audit stream; warn-level logs on every degraded `me` field; error-level logs on every revocation failure. **No new Prometheus metric** and **no new health indicator** — the principle explicitly forbids instrumenting what the stack does not ingest, and this module exposes no new external surface. Silent failure paths are prohibited by FR-022 and none exists. Exception messages stay static; context goes in `details` | **PASS** |
| 6 | Code Quality with Pragmatic Testing | Risk-based: the security-critical paths (tombstone-not-destroy, unconditional wiring, deletion-survives-failure, idempotency, no-token-leakage, the cross-service subject contract) get explicit specs. Trivial pass-throughs do not. No placeholder tests | **PASS** |
| 7 | API Consistency & Evolution Discipline | No new mutation, query or input type. The internal `SessionRevocationReason` union follows the codebase's own precedent of shipping the full vocabulary upfront (research R5) | **PASS** |
| 8 | Secure-by-Design Integration | One new external integration (RFC 7009 revocation). Timeout **3 s**, retries **none**, circuit breaker **none** — each with a written rationale in FR-012a and research R3, which is exactly what this principle demands. No secret involved (public client). No credential logged | **PASS** |
| 9 | Container & Deployment Determinism | No new image, base tag or build step. No `process.env` read outside config bootstrap — the Redis connection and client id come from `ConfigService` | **PASS** |
| 10 | Simplicity & Incremental Hardening | A Redis set plus one service. Sorted-set garbage collection, a boot-time backfill scan, a dedicated revocation HTTP client and a new audit category were each considered and rejected as unearned (research R2, R3, R4, R7) | **PASS** |

**Architecture standard 2** (deterministic schema, committed when changed): no
schema change, so nothing to regenerate. `schema:diff` is run as an exit gate to
*prove* that, not assume it.

**Architecture standard 3** (migrations idempotent and tested): not applicable —
no migration.

**Result: no violations. The Complexity Tracking table would be empty, so it is
omitted per the template's own instruction.**

### Post-Phase-1 re-evaluation

Re-checked after the design in `data-model.md` and `contracts/` was fixed. Two
points needed a second look:

- **Principle 2** — hoisting `OidcService` and `SESSION_STORE_HANDLE` out of
  `OidcModule` into `OidcCoreModule` changes an existing module's shape. Verified
  `OidcService` has no consumer outside `src/core/auth/oidc/`, and
  `SESSION_STORE_HANDLE` has exactly three (controller, cookie-session strategy,
  forward-auth resolver), all inside that same directory. `OidcModule` re-exports
  `OidcCoreModule`, so its public surface is unchanged. Still **PASS**.
- **Principle 5** — the self-healing index write is fire-and-forget, which risks
  becoming a *silent* failure path, which the principle forbids outright.
  Resolved by requiring an explicit `.catch()` that logs at warn level with the
  sid and sub. It is unawaited, not unobserved. Still **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/107-oidc-session-revocation/
├── plan.md              # This file
├── spec.md              # Feature specification (with Clarifications)
├── research.md          # Phase 0 output — R0..R13
├── data-model.md        # Phase 1 output — Redis key model + type contracts
├── quickstart.md        # Phase 1 output — how to exercise it locally
├── checklists/
│   └── requirements.md  # Spec quality checklist
├── contracts/
│   ├── session-revocation-service.md   # The WS1 primitive's interface contract
│   ├── redis-keyspace.md               # Key families, TTL rules, invariants
│   ├── audit-events.md                 # The three new audit event types
│   └── graphql-me-degradation.md       # Behavioural contract for the me fields
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── core/
│   └── auth/
│       └── oidc/
│           ├── oidc-core.module.ts                    # NEW — dependency-light foundation
│           ├── session-index.redis.ts                 # NEW — alkemio:sub:<sub> primitives
│           ├── session-index.redis.spec.ts            # NEW
│           ├── revocation/
│           │   ├── session-revocation.types.ts        # NEW — reason/outcome/report unions
│           │   ├── oidc-session-revocation.service.ts # NEW — revokeAllForSub
│           │   ├── oidc-session-revocation.service.spec.ts   # NEW
│           │   ├── revocation-ends-access.spec.ts     # NEW — proves access ENDED, not that a method ran
│           │   └── subject-contract.spec.ts           # NEW — trap 7 pin
│           ├── audit.ts                    # EDIT — +3 AuditEventType values, +reason field
│           ├── oidc.module.ts              # EDIT — import OidcCoreModule; drop hoisted providers
│           ├── oidc.controller.ts          # EDIT — index on callback; prune on logout/teardown
│           ├── oidc.controller.spec.ts     # NEW — controller-side index lifecycle
│           └── strategies/
│               ├── cookie-session.strategy.ts        # EDIT — self-healing index write (FR-002a)
│               └── cookie-session.strategy.index.spec.ts  # NEW — self-heal + I5 + not-awaited
├── domain/
│   └── community/
│       └── user/
│           ├── user.module.ts              # EDIT — import OidcCoreModule
│           ├── user.service.ts             # EDIT — the deletion cascade (WS2)
│           └── user.service.delete.spec.ts # NEW — deletion cascade specs
└── services/
    └── api/
        └── me/
            ├── me.resolver.fields.ts               # EDIT — 6 guards degrade (WS3)
            ├── me.resolver.fields.spec.ts          # NEW
            └── me.conversations.resolver.fields.ts # EDIT — the 7th guard
```

**Structure Decision**: single NestJS service, existing layout. The new code sits
in `src/core/auth/oidc/` because it is cross-cutting authentication
infrastructure — constitution architecture standard 1 reserves `src/core/*` for
exactly that ("core, cross-cutting abstractions (auth, …)"). The only
`src/domain` change is the orchestration call inside `UserService.deleteUser`.
`src/services/api/me/` gets the resolver-level degradation.

## Implementation phases

### Phase A — Foundation (blocking; nothing else compiles without it)

1. `session-revocation.types.ts` — the reason/outcome/report vocabulary.
2. `session-index.redis.ts` — `subIndexKey`, `addSessionToSubIndex`,
   `removeSessionFromSubIndex`, `listSessionsForSub`, `dropSubIndex`.
3. `audit.ts` — three additive event types plus an optional `reason` field.
4. `oidc-core.module.ts` — hoist `OidcService` + `SESSION_STORE_HANDLE`, add
   `OIDC_REDIS_CLIENT`, register the index and revocation services.
5. `oidc.module.ts` — import and re-export `OidcCoreModule`; delete the hoisted
   providers.

### Phase B — User Story 1 (P1): the revocation cascade

6. `OidcSessionRevocationService.revokeAllForSub` — the primitive.
7. Index population at callback; pruning at logout and at refresh-failure
   teardown.
8. Self-healing index write in `CookieSessionStrategy` (FR-002a).
9. `UserService.deleteUser` — both legs, unconditional, post-commit, best-effort.

### Phase C — User Story 2 (P2): `me` degradation

10. Six guards in `me.resolver.fields.ts`; the seventh in
    `me.conversations.resolver.fields.ts`.

### Phase D — User Story 3 (P3): reusability proof

11. `exceptSid` and partial-failure specs — the evidence that server#6073 and
    client-web#10070 consume this unchanged.

### Phase E — Polish and exit gates

12. Cross-service subject-contract pin (research R10 / trap 7).
13. `pnpm lint` → `pnpm build` → `pnpm test:ci:no:coverage` → `pnpm schema:diff`.

Phases A→B→D are strictly ordered by dependency. **Phase C shares no file with
Phase B** and can run in parallel with it.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Using `destroy` instead of `markTerminated` reproduces the bug in a new costume | An explicit spec asserts the payload carries `terminated_at` after revocation, and a second asserts `CookieSessionStrategy` **throws** rather than returning `null` |
| Revocation failure breaks user deletion — a historically fragile flow (#5350, #5678, #4762, #2137) | Every leg individually `try/catch`ed; a spec forces **both** legs to throw and asserts the deletion still returns the user |
| Hoisting providers out of `OidcModule` breaks DI at boot | `pnpm build` plus the existing OIDC specs. The hoisted tokens keep their identity (same symbol, same defining file), so no consumer's import path changes |
| The index write on the request path adds latency | Never awaited; a spec asserts `validate` resolves without the index promise having settled |
| Merge conflict with `027-platform-role-redesign` in `user.service.ts` | 027's `deleteUser` change is an authorization re-gate plus a `platform_audit_entry` row; this one appends to the post-commit block. Different regions, no shared enum, no shared migration (research R4) |
| A future change repoints the OIDC subject, silently making revocation a no-op | The R10 contract pin fails loudly instead of failing open |
| The `me` degradation masks a real authorization bug behind an empty response | The warn log (FR-030) is mandatory on every degraded field precisely so the condition stays visible in logs rather than becoming invisible |
| SC-002 (sub-second effect) is not directly tested | Satisfied by construction, not by omission: the teardown is awaited in-line and is a fixed handful of O(1) Redis commands per session with no unbounded loop. A wall-clock assertion would be flaky and would prove nothing about the property that matters (recorded by T038) |
| Sessions alive at deploy time are absent from the index and unrevocable | The self-healing write (FR-002a) indexes them on their holder's next authenticated request; T036 verifies precisely that, since it is the deploy-day story and the population that actually has the bug |
