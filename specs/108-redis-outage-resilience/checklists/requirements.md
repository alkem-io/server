# Specification Quality Checklist: Redis outage must degrade the platform, not kill it

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-03
**Feature**: [spec.md](../spec.md)

## Content Quality

- [X] No implementation details (languages, frameworks, APIs)
- [X] Focused on user value and business needs
- [X] Written for non-technical stakeholders
- [X] All mandatory sections completed

## Requirement Completeness

- [X] No [NEEDS CLARIFICATION] markers remain
- [X] Requirements are testable and unambiguous
- [X] Success criteria are measurable
- [X] Success criteria are technology-agnostic (no implementation details)
- [X] All acceptance scenarios are defined
- [X] Edge cases are identified
- [X] Scope is clearly bounded
- [X] Dependencies and assumptions identified

## Feature Readiness

- [X] All functional requirements have clear acceptance criteria
- [X] User scenarios cover primary flows
- [X] Feature meets measurable outcomes defined in Success Criteria
- [X] No implementation details leak into specification

## Validation Record

**Iteration 1** — 4 failures found:

1. *No implementation details* — FAILED. The first draft named the concrete
   libraries (`redis@3.1.2`, `ioredis`, `cache-manager-redis-store`) throughout
   the requirements. Fixed: requirements now speak of "the cache client", "the
   cache store" and "a cache construction site". Library names survive only in
   the **Input** line (quoting the story title verbatim) and in Out of Scope,
   where the deferral cannot be stated without naming what is being deferred.
2. *Success criteria are technology-agnostic* — FAILED. SC-001 originally read
   "Redis stopped"; SC-004 originally counted "Winston records". Fixed to
   "cache server stopped" and "cache-state log records".
3. *Scope is clearly bounded* — FAILED. The story's optional health-signal item
   was left implicit. Fixed: a dedicated **Out of Scope** section now records the
   deferral **with its reason** — a readiness surface already reports cache
   reachability, and flipping an instance to not-ready during a cache outage
   would remove it from rotation during precisely the incident this story exists
   to survive.
4. *Requirements are testable and unambiguous* — FAILED. "Logging must be
   throttled" was unmeasurable. Fixed: FR-015/FR-016/FR-017 now specify
   *exactly one* record per state **transition** and *zero* per attempt, which
   SC-004 turns into a count.

**Iteration 2** — 0 failures. All items pass.

**Re-validated after `/speckit-clarify`** (2 clarify passes, 5 questions resolved,
second pass clean): 16/16 → 16/16 items passing. No newly passing items, no
regressions, none still unchecked. The clarifications tightened FR-009, FR-012,
FR-013 and FR-022 and added FR-009a, FR-010a, FR-027, FR-028 and SC-009 — all of
which strengthen "testable and unambiguous" and "success criteria are measurable"
rather than changing any item's pass state.

## `/speckit-analyze` record

**Pass 1 — 8 findings, all remediated in place:**

| ID | Category | Severity | Finding | Remediation |
|---|---|---|---|---|
| I1 | Inconsistency | **HIGH** | Spec directory numbered `107`, but `specs/107-oidc-session-revocation` already exists on the unmerged `story/6315-…` branch — the very spec this feature cross-references. Two `107-`s, one referring to the other. | Renumbered to `108-redis-outage-resilience`; all internal references and `.specify/feature.json` updated. |
| I2 | Inconsistency | **HIGH** | The 6315 quickstart was cited as `../agents-hq/specs/107-oidc-session-revocation/quickstart.md`. That path does not exist — the spec lives in **this** repo. The story text itself is wrong. | Corrected in `spec.md` Dependencies and `quickstart.md` §6, noting the story's path is incorrect. |
| C1 | Coverage gap | MEDIUM | FR-023 (non-cache subsystems unchanged) had zero tasks. | Added **T018a**: verifies by diff inspection that OIDC, health, `main.server.ts` and the TypeORM blocks are untouched. |
| C2 | Coverage gap | MEDIUM | FR-004 ("disconnected is a normal state") mapped to no task. | Folded into **T018a** — asserts no code path treats disconnection as an error and no operation is gated on `isDown`. |
| I3 | Inconsistency | MEDIUM | SC-001 requires a **continuous 10-minute** observation window; `quickstart.md` §2 only sampled 20 requests. A process dying at minute 4 would have passed. | §2 now runs a 600-second poll loop; pass criteria updated. |
| I4 | Inconsistency | MEDIUM | `plan.md` claimed "edits to 5 existing files"; the real count is 7, and `src/services/task/task.service.spec.ts` (edited by T012) was missing from the structure tree entirely. | Both corrected; all 7 files enumerated explicitly. |
| A1 | Ambiguity | MEDIUM | The factory contract accepted a `timeout` parameter that guarantee G4 states is deliberately unused — an unused parameter inviting exactly the mistake research R6.2 warns about. | Signature narrowed to `{ host, port }`, with the reasoning recorded at the point of temptation. |
| U1 | Underspecification | LOW | T003 was conditional ("add `CACHE` … if one does not already exist"). | Verified: `LogContext` has 87 members, none `CACHE` or `REDIS`. Task made unconditional. |

**Pass 2 — 0 findings.** Every detection pass re-run against the amended artifacts:

- **Coverage**: all 30 FRs and all 9 SCs map to ≥1 task (FR-007/009/012/013/016/017/025/026 via the explicit ranges cited on T004, T006, T007, T008). Two citation-only gaps were found and closed during the pass — SC-001/SC-009 now cited on T009, FR-028 on T020.
- **Constitution**: no MUST conflicts. All ten principles PASS, re-verified post-design; §5 and §8 are advanced rather than merely satisfied.
- **Duplication**: none.
- **Ambiguity**: no unquantified adjectives; no `TODO`/`???`/placeholder markers anywhere in the artifact set.
- **Consistency**: terminology stable across all seven documents; all 12 source paths named in `tasks.md` resolve (8 existing, 4 to be created, matching the plan's structure tree exactly); every relative link between artifacts resolves.
- **Task ordering**: no contradictions. Phase 2 blocks all stories; the two P1 stories depend only on it; verification-only phases correctly depend on the wiring tasks.

**Metrics** — Requirements: 30 FR + 9 SC. Tasks: 21. Coverage: 100%.
Ambiguities: 0. Duplications: 0. Critical issues: 0.

**Loop terminated on a clean pass: 2 iterations.**

## Notes

- Zero `[NEEDS CLARIFICATION]` markers were emitted. The story is a well-specified
  defect report; every gap was a design-choice gap, not a requirements gap, and
  design choices belong in `plan.md`. `/speckit-clarify` still ran to completion
  to confirm this rather than assume it — see the **Clarifications** section of
  `spec.md`.
- The central open question — *which* remediation strategy to adopt — is
  deliberately absent from this spec. It is a HOW, not a WHAT, and is decided
  with rationale in `plan.md` (Decision D1) along with the rejected alternatives.
