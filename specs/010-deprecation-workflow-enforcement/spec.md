# Feature Specification: Deprecation Workflow Enforcement & Lifecycle Tracking

**Feature Branch**: `010-deprecation-workflow-enforcement`
**Created**: 2025-10-07
**Status**: Draft
**Input**: User description: "Enforce consistent deprecation lifecycle for schema fields, enums, and APIs with automated tracking."

## User Scenarios & Testing

### Primary User Story

As a platform steward, I want a managed deprecation process so that consumers have predictable timelines and we can safely remove obsolete fields.

### Acceptance Scenarios

1. **Given** a field marked deprecated with future removal date, **When** date not reached, **Then** removal attempt fails CI.
2. **Given** a deprecated field passes removal date, **When** removed, **Then** CI passes and logs retirement entry.
3. **Given** a field deprecation without reason or removal date, **When** schema lint runs, **Then** it fails with actionable message.
4. **Given** an enum value deprecation, **When** tracked, **Then** its status appears in deprecation dashboard.
5. **Given** a reversal (undepr.) request, **When** attempted, **Then** it requires governance approval. [NEEDS CLARIFICATION: reversal policy]

### Edge Cases

- Multiple overlapping deprecations causing dependency chain.
- Extension of removal date (grace period) → audit log entry.

## Requirements

### Functional Requirements

- **FR-001**: Deprecation annotation MUST include `reason` and `removeAfter` date.
- **FR-002**: CI MUST fail if deprecated element removed before `removeAfter` date.
- **FR-003**: Deprecation registry MUST store: elementId, kind, deprecatedSince, removeAfter, reason, status.
- **FR-004**: Dashboard artifact (JSON/HTML) MUST list active, pending removal, removed in last 30 days.
- **FR-005**: Enum value deprecations MUST follow same lifecycle as fields.
- **FR-006**: Removal PR MUST reference registry entry id.
- **FR-007**: Missing registry sync (annotation w/o entry) MUST fail lint.
- **FR-008**: Extending `removeAfter` MUST require governance label. [NEEDS CLARIFICATION: label name]
- **FR-009**: Registry MUST be append-only except status transitions.
- **FR-010**: Non-schema API (REST) deprecations MUST follow analogous metadata. [NEEDS CLARIFICATION: rest annotation pattern]

### Key Entities

- **DeprecationRecord**: Lifecycle metadata.
- **DeprecationDashboard**: Aggregated view for stakeholders.

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
