# Feature Specification: Clarify Override Semantics & Classification Count Invariants

**Feature Branch**: `011-clarify-override-semantics`
**Created**: 2025-10-21
**Status**: Draft
**Input**: User description: "Clarify override semantics: ensure report-level overrideApplied only true when at least one entry override=true; add classification invariants for always-present baseline & deprecationGrace counts."

## Execution Flow (main)

```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors, actions, data, constraints
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines

- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements

- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation

When creating this spec from a user prompt:

1. **Mark all ambiguities**: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. **Don't guess**: If the prompt doesn't specify something (e.g., "login system" without auth method), mark it
3. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
4. **Common underspecified areas**:
   - User types and permissions
   - Data retention/deletion policies
   - Performance targets and scale
   - Error handling behaviors
   - Integration requirements
   - Security/compliance needs

---

## User Scenarios & Testing _(mandatory)_

### Primary User Story

As a platform maintainer reviewing schema diff reports, I need consistent and trustworthy override indicators and stable classification counts so that governance decisions (approve, request changes) are made confidently without misinterpreting report metadata.

### Acceptance Scenarios

1. **Given** a diff report with one BREAKING entry marked `override=true`, **When** the report aggregates override metadata, **Then** `overrideApplied=true` at report level.
2. **Given** a diff report with no BREAKING or PREMATURE_REMOVAL entries marked `override=true`, **When** governance evaluation runs, **Then** `overrideApplied=false` even if other classifications exist.
3. **Given** a diff report produced for a non-baseline snapshot with no grace-period deprecations, **When** inspecting `classifications`, **Then** keys `baseline` and `deprecationGrace` are present with integer value `0`.
4. **Given** the first baseline run, **When** inspecting `classifications`, **Then** `baseline=1` and all other taxonomy keys present with integer values (possibly 0).
5. **Given** a diff where a PREMATURE_REMOVAL entry is overridden, **When** override logic executes, **Then** that entry has `override=true` and `overrideApplied=true` at report level while unrelated entries remain unmodified.
6. **Given** a diff where one BREAKING entry is overridden and another PREMATURE_REMOVAL entry is not, **When** gate evaluation executes, **Then** gate fails (due to the non-overridden PREMATURE_REMOVAL) yet `overrideApplied=true` remains accurate.
7. **Given** artifact JSON Schema validation, **When** a report omits `deprecationGrace` key, **Then** validation fails with a descriptive error.
8. **Given** artifact JSON Schema validation, **When** a report omits `baseline` key, **Then** validation fails with a descriptive error.

### Edge Cases

- Report containing only INFO entries (e.g., retirement entries) → `overrideApplied=false`, all counts present, zeros except `info`.
- Multiple overridden entries (BREAKING + PREMATURE_REMOVAL) → single `overrideApplied=true` (no count of overrides required).
- Empty entries array (possible baseline with dedicated BASELINE entry stored separately) → counts still contain all keys; baseline either 1 (first run) or 0.
- Conflicting override signals (entry has `override=true` but classification not BREAKING/PREMATURE_REMOVAL) → [NEEDS CLARIFICATION: Should validation reject impossible override flag usage?]
- Classification added in future (taxonomy extension) → [NEEDS CLARIFICATION: How are invariant tests updated for new mandatory keys?]

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Change report MUST set `overrideApplied=true` if and only if at least one ChangeEntry with classification BREAKING or PREMATURE_REMOVAL has `override=true`.
- **FR-002**: Change report MUST set `overrideApplied=false` when no BREAKING or PREMATURE_REMOVAL entries have `override=true`.
- **FR-003**: Each taxonomy key (additive, deprecated, deprecationGrace, invalidDeprecation, breaking, prematureRemoval, info, baseline) MUST appear exactly once in `classifications` with integer value ≥0.
- **FR-004**: Baseline scenario MUST set `baseline=1`; non-baseline scenarios MUST set `baseline=0`.
- **FR-005**: JSON Schema validation MUST fail if any mandatory taxonomy key is missing (including `baseline` and `deprecationGrace`).
- **FR-006**: JSON Schema validation MUST fail if `overrideApplied=true` but no entry qualifies (BREAKING or PREMATURE_REMOVAL with `override=true`).
- **FR-007**: Governance gate MUST treat `overrideApplied=true` purely as informational; decision logic MUST rely on per-entry override flags for each blocking classification.
- **FR-008**: Mixed override scenario (both overridden and non-overridden blocking entries) MUST result in gate failure while preserving accurate `overrideApplied=true`.
- **FR-009**: Validation MUST reject entries where `override=true` but classification is neither BREAKING nor PREMATURE_REMOVAL. [NEEDS CLARIFICATION: Confirm rejection vs silent ignore]
- **FR-010**: Test harness MUST include an invariant test ensuring all classification keys present even when their counts are zero.
- **FR-011**: Documentation (quickstart + README) MUST describe invariant presence of `baseline` and `deprecationGrace` keys.
- **FR-012**: Coverage mapping MUST update to include new clarity requirements referencing existing FR-024 (original spec) refinement. [NEEDS CLARIFICATION: Link strategy to prior FR numbering?]

### Key Entities

- **ChangeReport (refined)**: Adds clarified invariant semantics for `overrideApplied` and mandatory classification keys presence.
- **ChangeEntry (refined)**: `override` flag allowed only for BREAKING or PREMATURE_REMOVAL classifications.
- **ClassificationCount (refined)**: Mandatory full taxonomy key set always present; `baseline` distinguishes initial snapshot.

---

## Review & Acceptance Checklist

_GATE: Automated checks run during main() execution_

### Content Quality

- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed

### Requirement Completeness

- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous
- [ ] Success criteria are measurable
- [ ] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

---

## Execution Status

_Updated by main() during processing_

- [ ] User description parsed
- [ ] Key concepts extracted
- [ ] Ambiguities marked
- [ ] User scenarios defined
- [ ] Requirements generated
- [ ] Entities identified
- [ ] Review checklist passed

---
