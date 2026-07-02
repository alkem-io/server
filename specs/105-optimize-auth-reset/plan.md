# Implementation Plan: Optimize Space Authorization Reset

**Branch**: `105-optimize-auth-reset` | **Date**: 2026-06-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/105-optimize-auth-reset/spec.md`

## Summary

The space authorization reset walks every entity in a space and recomputes its access policy. Today each `*.service.authorization.ts` loads a deep tree of related entities, but investigation shows **every child authorization service re-fetches its own entity by ID and ignores the pre-loaded relations the parent passes in**. The parent loads therefore hydrate large object graphs (all contributions, posts, documents, calendar events, template framing/whiteboards, comment rooms, profiles) only to extract `.id` and delegate — which is the root cause of the production out-of-memory/timeout failures on the largest spaces.

**Technical approach**: At each authorization service involved in the space reset, reduce the TypeORM load to only what the method body actually reads: the entity's own `authorization` (and `parentAuthorizationPolicy` where read), the relations whose *content* genuinely participates in policy computation (e.g. credential-deriving `community.roleSet` chains, `parentSpace` chain, `account.id`, `document.createdBy`/`tagset`, `innovationFlow.states`), and **id-only projections** (`select: { id: true }`, `loadEagerRelations: false`) for relations that are only iterated to obtain child IDs for delegation. Relations that are provably never read are dropped entirely. Because children already re-fetch their own data, computed policies are unchanged — this is a pure data-loading reduction. A permanent regression test pins policy-equivalence (FR-011).

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 22 LTS (Volta-pinned 22.21.1)

**Primary Dependencies**: NestJS 10, TypeORM 0.3 (custom fork `pkg.pr.new/antst/typeorm`), Apollo Server 4 / GraphQL 16, Winston, Elastic APM

**Storage**: PostgreSQL 17.5 — read-only against existing tables (space, collaboration, callout, callout_contribution, community, role_set, storage_aggregator/bucket/document, template*, timeline/calendar, room, authorization_policy). **No schema changes, no migrations.**

**Testing**: Vitest 4.x. Unit specs (`*.spec.ts`) alongside the authorization services; a policy-equivalence regression check that compares computed authorization policies against a captured baseline across all in-scope entity types.

**Target Platform**: Linux server (containerized; Kubernetes on Hetzner)

**Project Type**: Web service (single NestJS backend) — internal optimization only

**Performance Goals**: An authorization reset of the platform's largest space completes in **under 5 minutes** (SC-004). Peak memory stays within the production container limit — no OOM (SC-003). Data rows loaded reduced by an order of magnitude for content-heavy spaces.

**Constraints**: Resulting access policies MUST be byte-for-byte equivalent to the current process for the same input state (FR-004, SC-002). No public API/GraphQL schema change (FR-010). Resilience/failure semantics unchanged (FR-009). No feature flag / dual loading path — replace outright, rollback via redeploy/revert (per clarification).

**Scale/Scope**: ~15 authorization services touched (Space, Collaboration, CalloutsSet, Callout, Community, StorageAggregator, TemplatesManager/TemplatesSet/Template, Timeline/Calendar, InnovationFlow, and the redundant pass points in Contribution/Framing). Largest production spaces have deep subspace hierarchies × hundreds of callouts × thousands of contributions × thousands of documents × many templates.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| 1. Domain-Centric Design | ✅ Pass | Changes confined to existing domain `*.service.authorization.ts`; no logic moved into resolvers/controllers. |
| 2. Modular NestJS Boundaries | ✅ Pass | No new modules; no new cross-module dependencies. Each service trims its own load only. |
| 3. GraphQL Schema as Stable Contract | ✅ Pass | No schema change. `pnpm run schema:diff` must remain clean (verification step). |
| 4. Explicit Data & Event Flow | ✅ Pass | Write path (validation→authz→domain→event→persist) unchanged; only the *read* shape of authorization loads changes. |
| 5. Observability & Operational Readiness | ⚠️ Gate | Principle requires **an inline comment explaining the chosen optimization on performance-sensitive queries**. Every trimmed relation load MUST carry a short comment stating why the load is minimal/what is intentionally not loaded. Decision points already logged; no new orphaned metrics added. |
| 6. Code Quality with Pragmatic Testing | ✅ Pass | Risk-based: one high-signal equivalence regression test (FR-011) defends the security-critical invariant; no superficial per-service snapshot tests. |
| 7. API Consistency & Evolution | ✅ Pass | No API naming/shape change. |
| 8. Secure-by-Design Integration | ✅ Pass | Authorization rules unchanged; equivalence test guards against accidental privilege drift. |
| 9. Container & Deployment Determinism | ✅ Pass | No env/runtime toggle introduced (no feature flag, per clarification). |
| 10. Simplicity & Incremental Hardening | ✅ Pass | Simplest viable fix (trim loads). No new caching/CQRS/infra. Batched-loading re-architecture explicitly deferred (see research.md) as it would be speculative scale work. |

**Result**: PASS. One active gate (Principle 5): inline optimization comments on every trimmed load. No violations requiring Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/105-optimize-auth-reset/
├── plan.md              # This file (/speckit-plan output)
├── research.md          # Phase 0 — per-service load analysis, drop list, strategy decision
├── data-model.md        # Phase 1 — entity → minimal-required-relation matrix (no schema change)
├── quickstart.md        # Phase 1 — how to verify equivalence + performance
├── contracts/
│   └── authorization-load-contract.md  # Phase 1 — minimal-load contract per auth service
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

Existing files modified in place (no new directories). The authorization services involved in a space reset:

```text
src/domain/
├── space/space/space.service.authorization.ts                 # root load tree (trim collaboration/about/profile/storage/templatesManager/license to ids; keep roleSet/parentSpace/account chains)
├── collaboration/
│   ├── collaboration/collaboration.service.authorization.ts
│   ├── callouts-set/callouts.set.service.authorization.ts      # callouts: full → id-only
│   ├── callout/callout.service.authorization.ts               # DROP contributionDefaults; contributions/classification/framing → id-only; KEEP calloutsSet→…→roleSet chain
│   ├── callout-contribution/callout.contribution.service.authorization.ts  # already optimized; trim redundant post object pass
│   ├── callout-framing/callout.framing.service.authorization.ts
│   └── innovation-flow/innovation.flow.service.authorization.ts # profile → id-only; KEEP states
├── community/community/community.service.authorization.ts      # communication.updates/groups → id-only
├── storage/storage-aggregator/storage.aggregator.service.authorization.ts # DROP directStorage.documents.tagset; directStorage → id-only
├── template/{templates-manager,templates-set,template}/*.service.authorization.ts # TEMPLATE: drop callout.framing.*/whiteboard/contentSpace.authorization/communityGuidelines.profile
└── timeline/{timeline,calendar}/*.service.authorization.ts     # calendar → id-only

test/ (or alongside): policy-equivalence regression spec
```

**Structure Decision**: Single NestJS backend (Option “web-service”, single project). No structural change — this is an in-place reduction of the relation/select options inside existing `applyAuthorizationPolicy` methods plus one regression test.

## Complexity Tracking

*No constitution violations — section intentionally empty.*
