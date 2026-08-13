# Implementation Plan: Opening a Collabora document waits ~8 s on analytics

**Branch**: `fix/110-collabora-editor-url-latency` | **Date**: 2026-08-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/110-collabora-editor-url-latency/spec.md`

## Summary

`collaboraEditorUrl` resolves the editor URL in ~47 ms and then makes the user wait a further ~7.95 s for an analytics record. The waiting is one defect (D1); the query behind it is another (D2). This plan removes both, at every site that copied the pattern.

**Hotfix reconciliation** — PR #6354 has already merged to `release/71` and temporarily suppresses all four analytics paths by commenting their bodies, returning early at site 4, and disabling affected assertions. This plan supersedes that mitigation: it restores every analytics contract through the proper implementation and removes all hotfix residue. If Release 71 reaches the branch before implementation, the commented code is replaced, not uncommented.

**D1** — three user-facing paths stop performing analytics attribution inline. They delegate typed lifecycle publication to a Collabora domain event publisher backed by the application's existing in-process event emitter. A singleton subscriber owns lookup, reporter dispatch, and error handling, so the response is sent when the real user operation finishes. The RabbitMQ-backed site 4 remains a direct background flow and adopts only the cheaper lookup; its controller already acknowledges before invoking the service, so this plan does not claim to change acknowledgement or redelivery semantics.

**D2** — `getCommunityForCollaboraDocumentOrFail` (an OR of two five-level relation paths, joining the whole callout graph, 7,917 ms in the measured trace) is replaced by a leaf-first lookup that seeks the unique index on the document's foreign key and then reuses the existing `getLevelZeroSpaceIdForCalloutsSet`. The subscriber serving sites 1–3 and the direct site-4 consumer adopt it; the old method is deleted.

## Technical Context

**Language/Version**: TypeScript 5.3 on Node.js 22 LTS (Volta-pinned 22.21.1)

**Primary Dependencies**: NestJS 10, `@nestjs/event-emitter` 3 with EventEmitter2, TypeORM 0.3 (custom fork `pkg.pr.new/antst/typeorm`), Apollo Server 4, GraphQL 16, Winston, Node's built-in `perf_hooks`, and Elastic APM (`elastic-apm-node` 4.14). No new runtime dependency.

**Storage**: PostgreSQL 17.5, read-only for this work. No DDL or migration. The lookup anchors each owner probe on `callout_framing.collaboraDocumentId` or `callout_contribution.collaboraDocumentId`, both uniquely indexed through `@OneToOne` + `@JoinColumn`, reads the matched callout's `calloutsSetId`, and reuses `getLevelZeroSpaceIdForCalloutsSet`. The design does not assume every referencing foreign key is automatically indexed.

**Testing**: Vitest 4.0.17 with `@golevelup/ts-vitest`. Unit tests only (`*.spec.ts` beside the code). No integration or e2e tier is needed — nothing crosses a process boundary that isn't already mocked in the existing specs.

**Target Platform**: Linux container, Kubernetes (Scaleway production)

**Project Type**: Web service (NestJS GraphQL API), single project

**Performance Goals**: In the defined post-deploy observation window, success-only `CollaboraEditorUrl` p95 is below one second, using the explicit Elastic APM predicate `event.outcome: success`, while a separate all-outcomes query finds no unexplained transaction above five seconds. Zero successful transaction samples leave SC-001 unverified. Every lifecycle-handler ownership lookup emits a structured timing record; the first 20 samples (or all 1–19 available within seven days) remain below 100 ms, and zero samples leave SC-003 unverified. These thresholds operationalize the pre-26-June-2026 baseline.

**Constraints**: No GraphQL schema change (so no schema-contract cycle). No database schema change. Analytics records must be restored with the same reporter method and effective attribution as before the temporary suppression. Each lifecycle event retains only a fresh, frozen `{ actorID, isAnonymous, guestName }` attribution snapshot—never credentials, session metadata, or the original `ActorContext`. No spec, feature, or issue identifiers in code comments. No skipped analytics contract test, commented analytics block, temporary early return, or hotfix explanation remains.

**Scale/Scope**: Two providers (one domain event publisher and one analytics subscriber) in an existing module, three typed event payloads used by three user-facing operations, one direct background consumer, one new lookup method, one deleted lookup method, one structured operational signal, and one service-signature simplification. Roughly 250–400 LOC across existing modules and adjacent tests; no new runtime dependency or deployment component.

## Constitution Check

*GATE: evaluated before Phase 0, re-evaluated after Phase 1 design, and re-evaluated against Constitution v3.0.0 after remediation. All passes below.*

| Principle | Verdict | Notes |
|---|---|---|
| 1. Domain-Centric Design First | **PASS** | User-facing orchestrators delegate typed lifecycle publication to a Collabora domain event publisher after authorization and primary work. The subscriber owns the analytics side effect; the lookup remains in the established infrastructure resolver service. |
| 2. Modular NestJS Boundaries | **PASS** | No new module. Typed events, their publisher, and their subscriber belong to `CollaboraDocumentModule`; only the publisher is exported. The new lookup joins the established `CommunityResolverService` lookup family. `CalloutModule` already imports `CollaboraDocumentModule`, and EventEmitter2 is global, so no new dependency cycle is introduced. |
| 3. GraphQL Schema as Stable Contract | **PASS** | No schema change. `CollaboraEditorUrlResult` is untouched; no field added, removed, or deprecated. No schema regeneration or contract diff required. |
| 4. Explicit Data, Persistence & Event Flow | **PASS** | User-facing analytics subscribes to typed outcome events instead of remaining inline. Open publishes after URL resolution; replace and upload publish only after their required persistence succeeds, so the subscriber can resolve committed ownership state. Delivery is explicitly best-effort, possible loss is accepted, and handler failure cannot be mistaken for failure of an already-committed operation. Site 4 is already an external-event consumer and keeps its distinct aggregate flow. |
| 5. Observability & Operational Readiness | **PASS** | The subscriber catches and logs failures at `error` with `LogContext.COLLABORATION` and emits exactly one INFO-level structured timing record per lookup attempt, on success or failure, with stable `message`, `eventName`, `collaboraDocumentId`, `outcome`, and `durationMs` fields. This signal is independent of request-transaction lifetime and already flows through Winston into the production logging stack. The performance-sensitive lookup carries an inline leaf-first rationale, and zero timing samples leave SC-003 unverified. |
| 6. Code Quality with Pragmatic Testing | **PASS** | Tests defend the event boundary, all event-to-reporter mappings, contained failures, query shape and statement count, static exception behavior, the site-4 aggregate contract, the single document fetch, and removal of all disabled-test residue from the temporary mitigation. |
| 7. API Consistency & Evolution Discipline | **PASS** | The new method follows the existing `getLevelZeroSpaceIdFor<X>` naming already used three times in the same class. No enum or scalar change. |
| 8. Secure-by-Design Integration | **PASS** | Authorization is untouched and runs before event publication. The publisher projects the live request context into a fresh, frozen attribution value containing only `actorID`, `isAnonymous`, and `guestName`; credentials and session/delegation metadata never cross the event boundary. The event mechanism is internal and introduces no external integration. |
| 9. Container & Deployment Determinism | **PASS** | No image, config, or environment change. |
| 10. Simplicity & Incremental Hardening | **PASS** | Reuses the globally configured in-process event emitter and existing lookup/reporting services. It adds no queue, outbox, retry layer, cache, or concurrency limiter. |

**Post-Phase-1 / Constitution v3.0.0 re-evaluation**: all gates pass. The design adds typed transient events, two providers, and one structured timing signal inside an existing module, with no persisted entity, external event, deployment component, or public contract change. The leaf-first query and its query-shape tests satisfy Architecture Standard 6.

## Project Structure

### Documentation (this feature)

```text
specs/110-collabora-editor-url-latency/
├── spec.md              # Feature specification (clarified, 9 questions)
├── plan.md              # This file
├── research.md          # Phase 0 — lookup shape, event mechanism, test approach
├── data-model.md        # Phase 1 — traversal path and the invariant it relies on
├── quickstart.md        # Phase 1 — how to verify, before and after deploy
├── evidence/
│   ├── sc-001-production.md  # post-deploy APM result + WOPI issue closure
│   └── sc-003-production.md  # post-deploy handler-lookup timing result
├── contracts/
│   ├── collabora-document-analytics-events.md  # Phase 1 — internal event contract
│   └── level-zero-space-lookup.md               # Phase 1 — lookup contract
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
    │   ├── events/
    │   │   ├── collabora.document.analytics.events.ts     # typed lifecycle events + names
    │   │   ├── collabora.document.events.service.ts       # domain publisher
    │   │   ├── collabora.document.events.service.spec.ts
    │   │   ├── collabora.document.analytics.event.handler.ts  # lookup, reporting + timing signal
    │   │   └── collabora.document.analytics.event.handler.spec.ts
    │   ├── collabora.document.module.ts                   # register publisher + subscriber
    │   ├── collabora.document.resolver.queries.ts         # site 1 — publish + single fetch
    │   ├── collabora.document.resolver.queries.spec.ts
    │   ├── collabora.document.resolver.mutations.ts       # site 2 — publish
    │   ├── collabora.document.resolver.mutations.spec.ts
    │   └── collabora.document.service.ts                  # getEditorUrl loses its redundant fetch
    └── callout/
        ├── callout.resolver.mutations.ts                  # site 3 — publish
        └── callout.resolver.mutations.spec.ts
```

**Structure Decision**: Single project, existing modules. Typed Collabora lifecycle events, their domain publisher, and their subscriber live under the Collabora document domain; the existing `CollaboraDocumentModule` registers both and exports only the publisher. The publisher owns the minimal actor projection, while the subscriber owns lookup, structured timing, reporting, and failure containment. The lookup remains in `src/services/infrastructure/entity-resolver`, beside the method it replaces and its sibling level-zero-space lookups. No generic analytics or instrumentation framework is introduced.

## Complexity Tracking

No constitution deviations remain. The selected event mechanism is in-process rather than queued, so it creates the required outcome-event boundary without changing the analytics delivery guarantee. Replace and upload publish only after required persistence, because the subscriber reads committed ownership state; possible event loss is explicitly accepted and analytics failure cannot fail the completed primary operation. Durable delivery, retries, and idempotency remain out of scope. The structured Winston timing record is chosen over a new APM transaction because it is reliable without a live request transaction and uses an operational sink already consumed today. The merged Release 71 mitigation is treated as an input state to replace, never as part of the target architecture. This PR also proposes Constitution v3.0.0: a MAJOR amendment redefining Principle 4's write-path order and adding Architecture Standard 6 from this incident's leaf-first-query learning; the PR description must state the impacted rules, rationale, and bump classification. Close server#6356 when the proper fix merges; close wopi-service#29 only after SC-001 passes with at least one successful sample. SC-003 remains independently required for feature acceptance.
