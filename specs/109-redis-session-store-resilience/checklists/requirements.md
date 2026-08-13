# Requirements Quality Checklist: Redis outage must degrade authentication, not reject all traffic

**Purpose**: Validate that `spec.md` for feature 109 is complete, unambiguous, internally consistent and testable *before* planning begins. This checklist audits the **specification**, not the implementation.
**Created**: 2026-08-03
**Feature**: [spec.md](../spec.md) · [server#6332](https://github.com/alkem-io/server/issues/6332)

## Requirement Completeness

- [x] CHK001 Every defect named in the source issue (D1 anonymous lookup, D2 untuned clients, D3 401-instead-of-503) has at least one FR that would fail if the defect were left in place. — D1 → FR-001…FR-006; D2 → FR-007…FR-015; D3 → FR-016…FR-022.
- [x] CHK002 Each of the three regression coverages the issue explicitly demands is stated as its own requirement rather than implied by the fix requirements. — FR-028, FR-029, FR-030.
- [x] CHK003 The spec states the falsifiability condition for its own regression tests. — FR-031 requires each to fail against `develop` @ `caa1a0d33`.
- [x] CHK004 The observability consequence of adding an `error` listener where none existed is captured, not left as an implementation side-effect. — FR-023…FR-027, US3.
- [x] CHK005 Every user story has an explicit independent-test statement that does not depend on another story shipping. — US1…US4 each carry one.
- [x] CHK006 Boot-time behaviour (store unreachable at process start) is specified, not only steady-state outage. — FR-013 plus the first-request Edge Case.
- [x] CHK007 Recovery is specified, not only failure. — FR-012, FR-024, SC-005, US2 scenario 5.

## Requirement Clarity

- [x] CHK008 No requirement contains a `[NEEDS CLARIFICATION]` marker. — verified by search; zero occurrences.
- [x] CHK009 "Fast" is quantified wherever it is load-bearing. — FR-009 "well under one second"; SC-002 "< 1 s"; SC-001 "≤ 250 ms".
- [x] CHK010 "Bounded" is quantified or delegated to a named contract rather than left adjectival. — FR-010 "small bounded number"; the exact value is a plan-level decision recorded in the client-factory contract, which is the correct altitude.
- [x] CHK011 The distinction the whole feature rests on — "cannot tell whether this session is valid" vs "this session is not valid" — is defined once, explicitly, in Key Entities.
- [x] CHK012 Requirements are written against observable behaviour, not against the specific library or option names that deliver it. — FR-008…FR-011 describe queueing, ceilings, retries and connect timeouts without naming `ioredis` options.

## Requirement Consistency

- [x] CHK013 No requirement contradicts `107-oidc-session-revocation` FR-022b. — FR-019/FR-020 restate and preserve it; FR-006 pins the rest of 107's session-resolution semantics as unchanged.
- [x] CHK014 No requirement contradicts `108-redis-outage-resilience`. — 108 FR-023 explicitly disclaims the `ioredis` clients; this feature picks up exactly that disclaimed scope.
- [x] CHK015 FR-004 (never use a client-supplied value as a lookup key) does not conflict with FR-001/FR-002 (cookie presence gates the lookup). — presence is read from the client, the *key* is read from the middleware; the Edge Cases spell out why conflating them is a forgery vector.
- [x] CHK016 The two transports' answers are required to be identical in substance and are required to share one definition. — FR-017/FR-019 + FR-021.

## Acceptance Criteria Quality

- [x] CHK017 Every success criterion is measurable without reading the implementation. — SC-001…SC-011 are all status codes, wall-clock times, record counts or file-level counts.
- [x] CHK018 Success criteria that reverse a measured "before" state cite that measurement. — SC-002 and SC-003 quote the 2.29/32.55/42.04 s and 401/11101 observations.
- [x] CHK019 At least one success criterion closes the criterion that this feature exists to un-fail. — SC-011 → 108 SC-009.
- [x] CHK020 A criterion exists for the "no regression to the neighbouring spec" obligation. — SC-008.
- [x] CHK021 Acceptance scenarios are in Given/When/Then form throughout. — verified across US1…US4.

## Scenario Coverage

- [x] CHK022 Both the healthy-store and unreachable-store paths are covered for the cookie-less case. — US1 scenarios 1 and 2.
- [x] CHK023 The authenticated happy path is asserted as unchanged, so the fix cannot be "make everything anonymous". — US1 scenario 3, FR-006.
- [x] CHK024 The tampered/unaccepted cookie case is covered. — US1 scenario 4, FR-005, Edge Cases.
- [x] CHK025 The non-GraphQL transport is covered so the fix cannot regress the shipped REST behaviour. — US2 scenario 4, FR-019.
- [x] CHK026 The "store reachable but unresponsive" case is distinguished from "store refusing connections". — Edge Cases + FR-009 vs FR-008.
- [x] CHK027 The log-flood ceiling is scenario-covered, not only requirement-covered. — US3 scenarios 1–3, SC-006.

## Scope & Boundary

- [x] CHK028 What is explicitly *not* changed is stated. — Assumptions: connections stay separate, no new config, no schema change, no DB change; FR-006 pins 107's behaviour.
- [x] CHK029 The health probe's inclusion is justified rather than incidental. — Assumptions paragraph 2 + FR-014 (the factory must accommodate its lazy-connect need rather than flatten it).
- [x] CHK030 The feature does not silently expand into merging the cache and session connections. — Assumptions paragraph 1 rules it out explicitly.
- [x] CHK031 No requirement demands new deployment surface. — FR-015 forbids it; SC-009 and the Assumptions reinforce it.

## Traceability

- [x] CHK032 Every FR is reachable from at least one user story. — D1 block → US1; D2 block → US2/US4; D3 block → US2; observability block → US3; regression block → US1/US2.
- [x] CHK033 Every success criterion traces to at least one FR. — SC-001→FR-001; SC-002→FR-008/009/010; SC-003→FR-016/017; SC-004→FR-020; SC-005→FR-012; SC-006→FR-023/024/025; SC-007→FR-013/027; SC-008→FR-006; SC-009→FR-007; SC-010→FR-028/029/030/031; SC-011→the feature as a whole.
- [x] CHK034 The upstream artefacts this spec depends on are cited by path, not by memory. — `specs/107-oidc-session-revocation/`, `specs/108-redis-outage-resilience/`, PR #6331 comment permalink.

## Notes

- All items pass as of the clarification pass recorded in `spec.md` § Clarifications. No item was waived.
- CHK010 deliberately allows the exact retry count to be fixed at plan time: it is an implementation constant of the client-factory contract, and pinning it in the spec would put a library detail in a technology-agnostic document.
