# Implementation Plan: Collabora Document Framing Import — Server Contract for Blank-or-Upload Creation

**Branch**: `095-collabora-import` | **Date**: 2026-05-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/095-collabora-import/spec.md`

## Summary

Extend the existing `createCalloutOnCalloutsSet` mutation so authors can frame a callout with a Collabora document either by picking a type (existing blank path) **or** by uploading an office file (new). The change is delivered by adding one optional `file: Upload` field to the existing nested `CreateCollaboraDocumentInput`. When `file` is present, the resolver buffers the stream, hands the bytes to `CollaboraDocumentService.importCollaboraDocument(...)` (which already exists for the contribution-import path and delegates MIME sniffing, format/size validation, and atomic temp→permanent file lifecycle to file-service-go), wires the resulting `ICollaboraDocument` into the `CalloutFraming`, and returns the populated `Callout`. No schema migration. No new domain events. Authorization is unchanged. The existing blank path is preserved verbatim — it only sees a new optional field on the input it ignores when absent. file-service-go transient failures fail fast as a structured "upstream unavailable" error per the spec's clarification.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 22 LTS (Volta 22.21.1)
**Primary Dependencies**: NestJS 10, Apollo Server 4, GraphQL 16, TypeORM 0.3 (custom fork `pkg.pr.new/antst/typeorm`), `graphql-upload` v15 (existing — used by every current `Upload` mutation), `class-validator`, `class-transformer`
**Storage**: PostgreSQL 17.5; framing Collabora document persisted via existing `collabora_document` table; bytes via existing storage subsystem and file-service-go (Go service exposing the upload/sniff/validate API used today by `importCollaboraDocument`)
**Testing**: Vitest 4.x — unit specs (`*.spec.ts`) co-located in `src/`; integration tests in `test/integration/`
**Target Platform**: Linux server (containerized; same Docker image used by existing collabora flows)
**Project Type**: Single project (`src/` layout per CLAUDE.md)
**Performance Goals**: SC-004 — upload-path p95 latency on a 10 MB DOCX MUST be ≤ existing `importCollaboraDocument` p95 + small tolerance for additional callout-creation work
**Constraints**: FR-006 atomicity — zero new rows / zero new storage objects on any failure path; FR-008 downstream parity — Callout response and emitted events MUST be byte-equivalent to a blank-framed callout of the same type modulo document content; FR-009 structured-error taxonomy MUST distinguish 8 rejection classes including "file-service-go upstream unavailable"
**Scale/Scope**: Single new `@Field(() => GraphQLUpload, { nullable: true })` on existing input class; resolver branch in `CalloutsSetResolverMutations.createCalloutOnCalloutsSet` (or upstream in `CalloutFramingService.createCalloutFraming`) selecting `import...` vs `create...` on the existing `CollaboraDocumentService`; one schema-contract diff entry (purely additive); zero migrations; expected ≤ ~150 net LOC of source change excluding tests

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Principle | Status | Notes |
| --- | --- | --- |
| 1. Domain-Centric Design First | PASS | Resolver delegates to `CollaboraDocumentService.importCollaboraDocument` (existing domain method) and `CalloutFramingService` orchestration; no business logic added in resolver layer. The existing import method already encapsulates the temp→permanent atomic flow. |
| 2. Modular NestJS Boundaries | PASS | Reuses existing `CollaboraDocumentModule`, `CalloutFramingModule`, `CalloutsSetModule`. No new module. No new providers. No new circular dependency. |
| 3. GraphQL Schema as Stable Contract | PASS | Single additive change: one optional field on `CreateCollaboraDocumentInput` (nullable). Schema-contract diff is additive-only; no deprecation; no `BREAKING-APPROVED` needed. SC-006 enforces this. |
| 4. Explicit Data & Event Flow | PASS | Existing pipeline: validation (resolver auth + class-validator on input + file-service-go format/size) → authorization (existing `CREATE_CALLOUT` privilege) → domain operation (`createCallout` → `createCalloutFraming` → `importCollaboraDocument` or `createCollaboraDocument`) → event emission (existing `calloutCreated` reporter call) → persistence (existing `calloutService.save`). No new event types. FR-011 enforces parity. |
| 5. Observability & Operational Readiness | PASS | Reuses existing `LogContext.COLLABORATION` and Winston conventions. The new branch logs upstream-unavailable decisions; instrumentation rides on existing `@InstrumentResolver()` decorator on `CalloutsSetResolverMutations`. No orphan metrics introduced. |
| 6. Code Quality with Pragmatic Testing | PASS | Risk-based coverage: (a) one unit-level resolver test asserting branch selection (file present → import; absent → blank); (b) re-use existing `CollaboraDocumentService.importCollaboraDocument` tests for the import semantics; (c) one integration test covering the happy path + format-reject + upstream-unavailable. No snapshot tests. |
| 7. API Consistency & Evolution Discipline | PASS | Mutation name unchanged (`createCalloutOnCalloutsSet`, imperative). Input naming unchanged (`CreateCollaboraDocumentInput`). Field naming follows existing `Upload` convention (`file`). No enum changes. |
| 8. Secure-by-Design Integration | PASS | Authorization unchanged (FR-007). file-service-go integration is an existing `FileServiceAdapter` / `StorageBucketService` integration with an established timeout (`storage.file.stream_timeout_ms`); no new external service, no new credentials, no new circuit breaker required. The fail-fast policy on transient failures (clarification Q6) is consistent with existing behavior. |
| 9. Container & Deployment Determinism | PASS | No new image, no new env var, no new config service entry. file-service-go endpoint reuses existing config. |
| 10. Simplicity & Incremental Hardening | PASS | One optional field. One resolver branch. Zero new abstractions. Zero migration. Spec explicitly chose option (a) over option (b) on the simplicity grounds covered in clarify Q1. |

**Result**: All 10 principles PASS. No deviations to record in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/095-collabora-import/
├── plan.md              # This file
├── research.md          # Phase 0 — nested-Upload feasibility, error taxonomy mapping
├── data-model.md        # Phase 1 — entity audit (no changes) + input-shape delta
├── contracts/
│   └── schema.delta.graphql  # Phase 1 — additive schema diff
├── quickstart.md        # Phase 1 — local-test instructions for blank + upload paths
├── checklists/
│   └── requirements.md  # From /speckit.specify + /speckit.clarify
└── tasks.md             # Phase 2 (NOT created here — emitted by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── domain/
│   └── collaboration/
│       ├── collabora-document/
│       │   ├── collabora.document.service.ts          # Reuse `importCollaboraDocument(file, displayNameOverride, storageAggregator, userID)` AS-IS — already does temp→permanent atomic flow, MIME sniff via file-service-go, displayName defaulting from filename
│       │   ├── dto/
│       │   │   └── collabora.document.dto.create.ts   # MODIFY — add optional `file: Upload` field; relax `displayName` to optional when `file` is present (validator runs at service layer); relax `documentType` to optional for the same reason
│       │   └── collabora.document.service.spec.ts     # ADD test cases for the (existing) import method's behavior under upstream-unavailable mapping (if not already covered)
│       ├── callout-framing/
│       │   └── callout.framing.service.ts             # MODIFY — branch on `calloutFramingData.collaboraDocument.file`: when present, call `collaboraDocumentService.importCollaboraDocument(file, displayName, storageAggregator, userID)`; when absent, call existing `createCollaboraDocument(input, ...)` unchanged. Validate "file XOR documentType" at this boundary (current ValidationException pattern).
│       └── callouts-set/
│           ├── callouts.set.resolver.mutations.ts     # MODIFY — extract the `Upload` from the nested input (or accept it as a parallel arg if Phase-0 research finds nesting unsupported), buffer with existing `streamToBuffer(createReadStream(), streamTimeoutMs)`, then pass `{ buffer, filename, mimetype }` through `calloutData` for downstream framing service to consume
│           └── callouts.set.resolver.mutations.spec.ts # ADD branch-selection unit test
└── common/
    └── exceptions/                                     # No new exception type expected — reuse existing `ValidationException`, `EntityNotInitializedException`, plus whatever `FileServiceAdapter` already throws on upstream-unavailable
test/
└── integration/
    └── collabora-document-framing-import.it-spec.ts   # ADD — happy path (DOCX upload) + format-reject + upstream-unavailable; assert FR-006 atomicity + FR-008 parity
```

**Structure Decision**: Single project per CLAUDE.md. The change is entirely contained within the existing `src/domain/collaboration/{collabora-document, callout-framing, callouts-set}` boundary plus one integration test. No new module, no new directory.

## Complexity Tracking

> Empty — all Constitution Check rows pass.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| (none) | (none) | (none) |

## Phase 0 / Phase 1 Completion

### Artifacts produced

- `research.md` — 5 research items resolved (R1 nested-Upload feasibility, R2 error taxonomy mapping, R3 displayName defaulting boundary, R4 authorization re-check, R5 stream timeout reuse)
- `data-model.md` — entity audit; zero schema changes confirmed
- `contracts/schema.delta.graphql` — additive schema diff; no breaking changes
- `quickstart.md` — local-test instructions for blank, upload, rejection, and parity flows
- `CLAUDE.md` — agent context updated by `update-agent-context.sh claude` (auto)

### Plan-level deviation from literal spec text — flagged

Spec clarification Q1 reads "extend `CreateCollaboraDocumentInput` with an optional `file: Upload` field." Phase 0 R1 implements this at the **contract level** (one mutation, no new top-level mutation, no new convention) by adding `file: Upload` as a **top-level optional arg on `createCalloutOnCalloutsSet`** rather than as a literal `@Field()` inside the nested input class. Rationale and alternatives are documented in `research.md` § R1. The user's durable preference (memory: "mirror existing patterns without asking") drove this — every existing `Upload` in the codebase is a top-level arg parallel to a data input (`importCollaboraDocument`, `uploadFileOnReference`, `uploadFileOnStorageBucket`, `uploadVisual`); R1 mirrors that exactly. Schema-diff size is identical either way (one additive line).

If the literal nested-Upload placement is required (e.g., for FE convenience), R1 should be revisited in `/speckit.tasks` review. As designed today, R1 is the implementation that lands.

### Post-design Constitution re-check

All 10 principles still PASS after Phase 1 design. Two notes:

- **Principle 7 (API Consistency)**: CLAUDE.md says "Mutations take a single Input object (unique per mutation)." `createCalloutOnCalloutsSet` will gain a second arg (`file: Upload`), but this matches the established Upload pattern across the codebase (`importCollaboraDocument`, `uploadFileOnReference`, etc.). The "single Input" rule is implicitly relaxed for `Upload` scalars in this codebase, and R1 follows that convention rather than introducing a new one. Not a deviation; a recognized exception.
- **Principle 3 (GraphQL Schema as Stable Contract)**: confirmed by `contracts/schema.delta.graphql` — three additive changes, zero breaking. No `BREAKING-APPROVED` required. SC-006 enforces this in CI via `pnpm run schema:diff`.

### Ready for Phase 2

`/speckit.tasks` is the suggested next command. The task generator should consume this plan + `research.md` + `data-model.md` + `contracts/schema.delta.graphql` to produce a dependency-ordered `tasks.md`.
