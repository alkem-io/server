# Implementation Plan: Opening a Collabora document waits ~8 s on analytics

**Branch**: `fix/110-collabora-editor-url-latency` | **Date**: 2026-08-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/110-collabora-editor-url-latency/spec.md`

## Summary

`collaboraEditorUrl` resolves the editor URL in ~47 ms and then makes the user wait a further ~7.95 s for an analytics record. The waiting is one defect (D1); the query behind it is another (D2). This plan removes both, at every site that copied the pattern.

**D1** — three user-facing paths stop awaiting their analytics. The work moves into a private method that owns its error handling and is invoked without `await`, so the response is sent the moment the real work is done. The RabbitMQ consumer deliberately keeps awaiting: nobody waits on it, and its message is acknowledged only when the handler returns.

**D2** — `getCommunityForCollaboraDocumentOrFail` (an OR of two five-level relation paths, joining the whole callout graph, 7,917 ms in the measured trace) is replaced by a leaf-first lookup that seeks the unique index on the document's foreign key and then reuses the existing `getLevelZeroSpaceIdForCalloutsSet`. All four sites adopt it; the old method is deleted.

## Technical Context

**Language/Version**: TypeScript 5.3 on Node.js 22 LTS (Volta-pinned 22.21.1)

**Primary Dependencies**: NestJS 10, TypeORM 0.3 (custom fork `pkg.pr.new/antst/typeorm`), Apollo Server 4, GraphQL 16, Winston, Elastic APM (`elastic-apm-node` 4.14, stock instrumentation — `pg` and outgoing `http` spans are what made the diagnosis possible). No new runtime dependency.

**Storage**: PostgreSQL 17.5, read-only for this work. No DDL, no migration. The lookup uses existing columns and their existing indexes: `callout_framing.collaboraDocumentId`, `callout_contribution.collaboraDocumentId` (both unique by virtue of `@OneToOne` + `@JoinColumn`), `callout.framingId`, `callout_contribution.calloutId`, `callout.calloutsSetId`, `collaboration.calloutsSetId`, `space.collaborationId`, `space.levelZeroSpaceID`.

**Testing**: Vitest 4.0.17 with `@golevelup/ts-vitest`. Unit tests only (`*.spec.ts` beside the code). No integration or e2e tier is needed — nothing crosses a process boundary that isn't already mocked in the existing specs.

**Target Platform**: Linux container, Kubernetes (Scaleway production)

**Project Type**: Web service (NestJS GraphQL API), single project

**Performance Goals**: None numeric, by explicit decision (spec SC-001). The target is the pre-26-June-2026 APM baseline for the `CollaboraEditorUrl` transaction — a recorded measurement, not an invented figure.

**Constraints**: No GraphQL schema change (so no schema-contract cycle). No database schema change. Analytics records must be produced with the same reporter method and the same arguments as today. No spec, feature, or issue identifiers in code comments.

**Scale/Scope**: Four call sites, one new service method, one deleted service method, one resolver signature simplification. Roughly 150–250 LOC changed across 6 source files and 5 spec files. Well inside the constitution's agentic-path envelope.

## Constitution Check

*GATE: evaluated before Phase 0, re-evaluated after Phase 1 design. Both passes below.*

| Principle | Verdict | Notes |
|---|---|---|
| 1. Domain-Centric Design First | **PASS** | No business logic is added to resolvers. The analytics block already lives in the resolver layer; this work extracts it into a private method and makes the space lookup a service call. Nothing that belongs in the domain moves into the API layer. |
| 2. Modular NestJS Boundaries | **PASS** | No new module. The new lookup joins `CommunityResolverService`, which already hosts `getLevelZeroSpaceIdForRoleSet`, `...ForCalloutsSet` and `...ForMediaGallery` — an established, single-purpose family. No new provider, no new dependency edge, no cycle. |
| 3. GraphQL Schema as Stable Contract | **PASS** | No schema change. `CollaboraEditorUrlResult` is untouched; no field added, removed, or deprecated. No schema regeneration or contract diff required. |
| 4. Explicit Data & Event Flow | **DEVIATION** | The constitution says side effects such as indexing and metrics should subscribe to domain events rather than sit inline with core logic. Analytics stays inline (detached, not event-subscribed). Justified in Complexity Tracking. |
| 5. Observability & Operational Readiness | **PASS** | No silent failures: every detached unit logs its own failure at `error` with the existing `LogContext.COLLABORATION` context (FR-003). The new lookup is a performance-sensitive query and carries the inline comment the constitution requires, explaining why it is leaf-first — worded without spec or issue identifiers. |
| 6. Code Quality with Pragmatic Testing | **PASS** | Risk-based. Tests defend the two invariants that matter — the response does not wait on analytics, and the reporter still receives identical arguments — plus the lookup's three real branches. No pass-through or snapshot padding. |
| 7. API Consistency & Evolution Discipline | **PASS** | The new method follows the existing `getLevelZeroSpaceIdFor<X>` naming already used three times in the same class. No enum or scalar change. |
| 8. Secure-by-Design Integration | **PASS** | Authorization is untouched and still runs before any work. The detached unit executes after `grantAccessOrFail` has already passed and carries the actor context it was given, so nothing is evaluated with weaker identity than today. No new external integration, so no timeout/retry/breaker rationale is owed. |
| 9. Container & Deployment Determinism | **PASS** | No image, config, or environment change. |
| 10. Simplicity & Incremental Hardening | **PASS** | The smallest change that removes the cost: delete an expensive query, reuse an existing cheap one, stop awaiting work nobody is waiting for. No caching layer, no new abstraction, no speculative machinery — the deliberate absence of a concurrency limiter is recorded in the spec's Assumptions with the signal that would justify revisiting. |

**Post-Phase-1 re-evaluation**: unchanged. The design introduces no new module, provider, entity, event, or external call. The single deviation is the one recorded below and is inherited from the existing code rather than created by this work.

## Project Structure

### Documentation (this feature)

```text
specs/110-collabora-editor-url-latency/
├── spec.md              # Feature specification (clarified, 5 questions)
├── plan.md              # This file
├── research.md          # Phase 0 — lookup shape, detachment mechanism, test approach
├── data-model.md        # Phase 1 — traversal path and the invariant it relies on
├── quickstart.md        # Phase 1 — how to verify, before and after deploy
├── contracts/
│   └── level-zero-space-lookup.md   # Phase 1 — the new service method contract
└── tasks.md             # Phase 2 — created by /speckit-tasks, not by this command
```

### Source Code (repository root)

```text
src/
├── services/
│   ├── infrastructure/entity-resolver/
│   │   ├── community.resolver.service.ts          # + getLevelZeroSpaceIdForCollaboraDocument
│   │   │                                          # − getCommunityForCollaboraDocumentOrFail
│   │   └── community.resolver.service.spec.ts     # + lookup branch coverage
│   └── collaborative-document-integration/
│       ├── collaborative-document-integration.service.ts       # site 4 — lookup only, still awaited
│       └── collaborative-document-integration.service.spec.ts
└── domain/collaboration/
    ├── collabora-document/
    │   ├── collabora.document.resolver.queries.ts         # site 1 — detach + single fetch
    │   ├── collabora.document.resolver.queries.spec.ts
    │   ├── collabora.document.resolver.mutations.ts       # site 2 — detach
    │   ├── collabora.document.resolver.mutations.spec.ts
    │   └── collabora.document.service.ts                  # getEditorUrl loses its redundant fetch
    └── callout/
        ├── callout.resolver.mutations.ts                  # site 3 — detach
        └── callout.resolver.mutations.spec.ts
```

**Structure Decision**: Single project, existing layout, no new directories. The work is confined to one infrastructure service and three resolver/service files in `src/domain/collaboration`, each with its existing adjacent spec. The lookup belongs in `src/services/infrastructure/entity-resolver` because that is where the method it replaces lives and where its three sibling lookups already are; moving it elsewhere would split a coherent family and churn four call sites' imports for no benefit.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| **Principle 4** — analytics remains inline (detached in-process) instead of subscribing to a domain event | The defect is that users wait ~8 s. Detaching removes that today, in a change small enough to reason about and revert. The event route would add a domain event, a publisher, a consumer, and queue wiring to fix a latency bug — a rewrite of the analytics path bolted onto a hotfix, expanding both the diff and the blast radius while users keep waiting. The three user-facing sites already treat these records as best-effort and already discard them on error, so in-process detachment loses nothing the current design guarantees. | Emitting a domain event and consuming it out of process is the constitutionally-preferred shape and remains the right destination if this analytics path grows. It was considered and deliberately deferred: it changes delivery semantics (a queued event is retried, an inline one is not), needs its own failure and idempotency story, and would leave the 7,917 ms query in place for however long that work takes. Recorded here rather than silently skipped, so the next person to touch this path knows the intended direction. |

*No other deviations. Nothing else in this plan requires justification against the constitution.*
