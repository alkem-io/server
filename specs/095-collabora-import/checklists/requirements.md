# Specification Quality Checklist: Collabora Document Framing Import — Server Contract for Blank-or-Upload Creation (P1 Collections)

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-05-04
**Last updated**: 2026-05-04 (post `/speckit.clarify`)
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details outside the legitimate server-contract scope
  - Note: GraphQL mutation and input names (`createCalloutOnCalloutsSet`, `CreateCalloutFramingInput`, `CreateCollaboraDocumentInput`, `importCollaboraDocument`) and the file-service-go boundary are retained intentionally because **this is a server-side spec governing a GraphQL contract**; the contract surface is the deliverable.
- [x] Focused on server behavior, server contract, validation, persistence, atomicity, and authorization — not on client UI
- [x] Written so backend stakeholders and codeowners can reason about it; references to the existing schema (`086-collabora-integration` / PR #9615) are anchored
- [x] All mandatory sections completed (User Scenarios & Testing, Requirements, Success Criteria, Clarifications)

## Requirement Completeness

- [x] [NEEDS CLARIFICATION] markers — **0 remaining** (all 4 original markers + 1 latent gap resolved in the 2026-05-04 clarify session)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable (parity-based for SC-004; concrete counts and additivity checks elsewhere)
- [x] Success criteria are server-side and outcome-focused
- [x] All acceptance scenarios are defined (US1–US4)
- [x] Edge cases are identified (10 server-side cases)
- [x] Scope is clearly bounded (in-scope: blank stability + new upload contract on the existing mutation; out-of-scope: `importCollaboraDocument` changes, contribution variant, FE work)
- [x] Dependencies and assumptions identified (file-service-go delegation, schema-contract workflow, no migration)

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary server flows: blank stability, upload happy path, validation/atomicity, downstream parity
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No client-side concerns leak into requirements

## Resolved Clarifications

### Session 1 (2026-05-04)

1. **Server-contract shape**: Option A — extend `CreateCollaboraDocumentInput` with optional `file: Upload` on the existing `createCalloutOnCalloutsSet` mutation. Single entry point.
2. **Type-vs-file precedence**: Imitate `importCollaboraDocument` — when `file` is present, the server delegates type derivation to file-service-go; any input `documentType` is ignored on the upload path. Blank-path behavior unchanged.
3. **Drawing (ODG) in P1**: Defer to file-service-go's supported list — supported iff file-service-go accepts ODG today; no parallel allowlist on the server.
4. **New columns on Collabora document entity**: None. Origin and original filename are not persisted. Zero migration.
5. **SC-004 latency budget**: Parity with `importCollaboraDocument` p95 latency on a 10 MB DOCX, plus a small tolerance for callout-creation work.

### Session 2 (2026-05-04, follow-up)

6. **file-service-go transient failures**: Fail fast — on timeout / 5xx / unreachable, the server returns a structured "upstream unavailable" error with no in-resolver retry. Caller retries. Atomicity preserved. Mirrors `importCollaboraDocument`. New FR-009 error class added.
7. **`displayName` defaulting on upload**: Mirror `importCollaboraDocument` — when `file` is present and `displayName` is absent/empty, the server defaults from the uploaded filename with extension stripped. Captured as new FR-012.
8. **Wording cleanup applied without question**: removed obsolete "format/extension mismatch" error class from FR-009 (extension is never consulted per Session-1 Q2); reworded US3 AS#1 to "sniffed MIME outside file-service-go's supported list."

## Planning Gate

- [x] **Process gate cleared**: `/speckit.plan` is no longer blocked. The contract shape is decided (Option A), validation/size delegation is settled (file-service-go), schema impact is bounded (one optional input field, no migration), and the latency budget is parity-anchored.

## Notes

- Items marked incomplete require spec updates before `/speckit.plan` — none remain.
- This spec is **server-POV throughout**. Mutation, input, and field names appear because the GraphQL contract is the deliverable.
- This spec wholly supersedes (a) any earlier `095-collabora-import` draft scoped to the contribution/response flow, and (b) the prior client-POV revision of this same branch.
