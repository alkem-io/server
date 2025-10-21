# Feature Specification: Governance Pull Request Template & Constitution Gate

**Feature Branch**: `005-governance-pr-template`
**Created**: 2025-10-07
**Status**: Draft
**Input**: User description: "Introduce a PR template enforcing constitution disclosure (domain impact, schema changes, migrations, deprecations, deviations)."

## Execution Flow (main)

```
1. Parse description
2. Identify: template sections, gating signals
3. Mark ambiguities
4. User scenarios
5. Requirements
6. Entities (PRTemplateSection)
7. Checklist
```

## User Scenarios & Testing

### Primary User Story

As a reviewer, I want each PR to clearly declare its domain, schema, migration, and governance impact so that I can review faster and enforce standards consistently.

### Acceptance Scenarios

1. **Given** a new PR, **When** it is opened, **Then** a default template appears with required sections.
2. **Given** a PR missing mandatory filled sections, **When** CI governance check runs, **Then** it fails with actionable feedback.
3. **Given** a PR declaring “No schema changes”, **When** schema diff tool finds changes, **Then** CI fails with mismatch error.
4. **Given** intentional constitution deviation, **When** documented with justification, **Then** governance label requirement triggers. [NEEDS CLARIFICATION: label naming]
5. **Given** no migration is included but entity schema changed, **When** migration validation runs, **Then** CI fails.

### Edge Cases

- Draft PRs may allow incomplete sections (warning not failure). [NEEDS CLARIFICATION: draft behavior]
- Automated dependency bumps bypass domain section (exemption list).

## Requirements

### Functional Requirements

- **FR-001**: PR template MUST include sections: Domain Impact, Schema Changes, Migrations, Deprecations, Testing Additions, Constitution Deviations.
- **FR-002**: Governance CI MUST parse template and verify non-empty required answers unless PR is draft.
- **FR-003**: Schema Changes declaration MUST be cross-validated with schema diff artifact.
- **FR-004**: Migration declaration MUST compare entity metadata vs existing migrations.
- **FR-005**: Deviations section MUST require justification length ≥ 15 chars if non-empty.
- **FR-006**: Missing sections MUST cause failure message linking constitution.
- **FR-007**: Exemption list MUST allow automated tooling PRs (renovate, security patches) via author or label match.
- **FR-008**: CI feedback MUST post a comment summarizing compliance status.
- **FR-009**: Template MUST point to `/memory/constitution.md` canonical version.
- **FR-010**: Governance override label MUST be required to merge when deviations exist. [NEEDS CLARIFICATION: label exact key]

### Key Entities

- **PRTemplateSection**: Name, required?, validation rule.
- **GovernanceReport**: Aggregated validation results.

## Review & Acceptance Checklist

(Template)

## Execution Status

- [ ] User description parsed
- [ ] Key concepts extracted
- [ ] Ambiguities marked
- [ ] User scenarios defined
- [ ] Requirements generated
- [ ] Entities identified
- [ ] Review checklist passed
