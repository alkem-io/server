# Feature Specification: Testing Foundation Restoration

**Feature Branch**: `004-testing-foundation-restoration`  
**Created**: 2025-10-07  
**Status**: Draft  
**Input**: User description: "Re-establish minimal pragmatic test coverage aligned with constitution principle 6 (unit invariants + integration)."

## Execution Flow (main)

```
1. Parse description
2. Identify: coverage goals, test taxonomy, gating
3. Mark ambiguities
4. User scenarios
5. Requirements
6. Entities (TestSuiteMeta, CoverageProfile)
7. Checklist
```

## User Scenarios & Testing

### Primary User Story

As a maintainer, I want a lean but effective test baseline so that critical domain invariants and integrations are guarded without requiring exhaustive 100% coverage.

### Acceptance Scenarios

1. **Given** a PR adding new domain logic, **When** tests run, **Then** at least one unit test fails if invariants are broken.
2. **Given** a change to persistence mappings, **When** integration tests run, **Then** failures surface if entity relations break.
3. **Given** no tests accompany complex new logic, **When** CI quality gate runs, **Then** it fails with a missing test justification warning.
4. **Given** unchanged code, **When** test suite runs, **Then** total runtime remains within target budget (e.g., < 4 min). [NEEDS CLARIFICATION: test runtime budget]
5. **Given** flaky test detection, **When** a test is nondeterministic, **Then** it is quarantined and reported.

### Edge Cases

- Transient external dependency failures → must use mocks or test containers.
- Time-sensitive logic → stable clock abstraction required.

## Requirements

### Functional Requirements

- **FR-001**: Define a test taxonomy: unit, integration, contract, smoke.
- **FR-002**: A PR MUST fail if it alters domain services without adding or justifying tests.
- **FR-003**: Minimum baseline: ≥1 unit test per new invariant; ≥1 integration test per new aggregate persistence mapping.
- **FR-004**: Coverage delta report MUST be produced per PR (focus on changed files only).
- **FR-005**: Flaky test detector MUST re-run suspect tests up to N retries before marking flaky. [NEEDS CLARIFICATION: N value]
- **FR-006**: Quarantined tests list MUST be published as artifact.
- **FR-007**: Test runtime budget MUST be enforced with warning threshold then failure threshold. [NEEDS CLARIFICATION: exact thresholds]
- **FR-008**: Contract tests MUST validate GraphQL schema against snapshot.
- **FR-009**: Integration tests MUST execute with ephemeral database state reset per suite.
- **FR-010**: Unit tests MUST NOT depend on network or filesystem side effects.

### Key Entities

- **TestSuiteMeta**: Classification + runtime metrics.
- **CoverageProfile**: Changed-file coverage metrics.
- **FlakyRegistry**: Set of flaky tests pending remediation.

## Review & Acceptance Checklist

(Template items)

## Execution Status

- [ ] User description parsed
- [ ] Key concepts extracted
- [ ] Ambiguities marked
- [ ] User scenarios defined
- [ ] Requirements generated
- [ ] Entities identified
- [ ] Review checklist passed
