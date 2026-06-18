# Requirements Quality Checklist: Collaboration Persistence (server slice)

**Purpose**: Validate that `spec.md` is complete, unambiguous, testable, and ready
to drive implementation **once the blocking gates clear** (OPEN-1/3 + the collab
Wave-2 contract freeze).
**Created**: 2026-06-18
**Feature**: [spec.md](../spec.md) · Workspace epic: `../../agents-hq/specs/003-unify-collab-yjs/`

## Content Quality

- [x] CHK001 No premature implementation detail leaks into FRs — FRs state *what*
  server must do; *how* (which module, which migration, emit vs CQRS) lives in
  plan.md/research.md.
- [x] CHK002 Each user story is independently testable and maps to a concrete test
  or test-to-be (US1→save/fetch round-trip; US2→delete-emit spy; US3→authZ parity;
  US4→migration completeness).
- [x] CHK003 Written for the server boundary, not re-specifying the collab-service
  internals, the CRDT core, or the client bindings — scope boundary explicit in the
  header note and Assumptions.
- [x] CHK004 Conforms to the SpecKit spec-template shape (User Scenarios,
  Requirements, Success Criteria, Assumptions, Clarifications/OPEN).
- [x] CHK005 Terminology consistent with the epic + server's domain (`Memo`,
  `Whiteboard`, `AuthorizationPolicy`, `content_pointer`/`blob_store`,
  `update-content`).

## Requirement Completeness

- [x] CHK006 Every epic server task (T001–T006) maps to ≥1 server FR + task — traced
  in tasks.md (T001/T002→FR-001..004; T003→FR-006/007; T004→FR-005/008; T005→FR-009;
  T006→FR-010).
- [x] CHK007 Every server FR carries a **phase tag** so "blocked vs forward" is
  unambiguous; the blocking gates are called out (spec ⚠️ + each OPEN).
- [x] CHK008 Every Success Criterion is measurable and testable in this repo (Vitest
  + integration harness) or jointly with the collab/auth-eval services (SC-005/SC-006
  flagged as cross-service).
- [x] CHK009 Edge cases enumerated + tied to behavior: absent-id fetch/save,
  delete-during-session, dangling pointer, NULL memo content, whiteboard decompression
  failure, concurrent edit during migration.
- [x] CHK010 Out-of-scope is explicit: collab internals, CRDT v2 decoder (WS-A),
  client bindings (WS-B/D), cutover orchestration (WS-E ops), blob offload to
  file-service (collab BlobStore).
- [x] CHK011 Key entities listed with their owning layer (Memo/Whiteboard columns;
  AuthorizationPolicy referenced; the index as a projection, not a new table in v1).

## Requirement Clarity & Consistency

- [x] CHK012 No conflicting requirements between spec.md, plan.md, data-model.md,
  tasks.md (cross-checked in the self-analyze pass; see the agent report).
- [x] CHK013 Each FR is singular and verifiable.
- [x] CHK014 The "server is the responder, not the caller" correction (CS-1) is
  consistently reflected across spec (Clarifications), plan (Architecture), research
  (CS-1/DEC-3), and tasks (Notes) — no doc still implies server "repoints a client".
- [x] CHK015 The coverage tension (epic ≥95% vs server constitution §6 risk-based)
  is surfaced as a decision (DEC-7) and a flagged Assumption, not silently resolved.

## Ambiguities & Open Decisions

- [x] CHK016 Genuinely unknown integration details are surfaced as **OPEN-1..4**,
  each grounded by reading server's actual code (constitution §… No Assumptions),
  each with a recommendation.
- [x] CHK017 Each OPEN names the task it blocks (OPEN-1→T004/authZ + the policy-id in
  T002; OPEN-2→T002 blob; OPEN-3→T001/T002 contract; OPEN-4→T005 migration) and which
  are **blocking** (OPEN-1, OPEN-3) vs refinement (OPEN-2, OPEN-4).
- [x] CHK018 No `[NEEDS CLARIFICATION]` placeholders remain in the FRs; the four
  OPENs are isolated cross-service integration details, not undecided server FRs.
- [x] CHK019 OPEN-1's answer (the `authorizationPolicyId` mapping + `read`/
  `update-content`) is stated as a **confirmation** of the in-flight collab adapter,
  with the one residual (entity-own vs parent policy) called out for antst.

## Feature Readiness

- [x] CHK020 Constitution Check table in plan.md passes server's §1–§10 + Architecture
  Standards with notes; the coverage tension is the only watch item.
- [x] CHK021 The phase map in spec.md and the phase structure in tasks.md agree
  (Phase 1 = T001/T002; Phase 2 = T003/T004; Phase 3 = T005/T006).
- [x] CHK022 The two **blocking gates** (clarify answers + collab Wave-2 contract
  freeze) are stated prominently (spec ⚠️) and repeated in Assumptions + tasks.
- [x] CHK023 The migration round-trip (SC-006/epic SC-003) is captured as a
  **joint** deliverable with the collab service + the v2 decoder dependency (WS-A),
  not assumed server-only.
- [x] CHK024 The sqlc-vs-TypeORM mismatch in the epic task text is flagged (tasks
  Notes) so the implementer uses `migration:generate`, not a non-existent sqlc setup.

## Notes

- This is a **spec/design-only** sub-spec: implementation is gated on (a) OPEN-1/3
  answers and (b) the collaboration-service Wave-2 `rabbitmq` adapter freezing the
  unified wire contract. The checklist validates the *spec's* readiness, not a
  shipped implementation.
- The single most valuable output is **OPEN-1's confirmation**: the collab
  `authzeval` adapter's `read`/`update-content` + policy-id-from-metadata assumption
  is **correct** against server's real authZ model — pin it and proceed. The only
  residual is entity-own vs parent policy id (for antst).
- Re-run `/speckit-analyze` and refresh this checklist if the unified contract shape
  changes during the collab freeze.
