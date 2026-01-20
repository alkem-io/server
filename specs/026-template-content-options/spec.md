# Feature Specification: Template Content Options

**Feature Branch**: `026-template-content-options`
**Created**: 2026-01-15
**Status**: Draft
**Input**: User description: "Extends the SubSpace innovation flow template selection dialog to provide three distinct options for handling existing content when changing templates: Replace All (delete existing posts and replace with template posts), Add Template Posts (keep existing posts and add template posts alongside them), Flow Only (replace only the innovation flow structure, keeping existing posts unchanged). Backend changes require altering the updateCollaborationFromSpaceTemplate mutation with a new deleteExistingCallouts parameter to support the Replace All option."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Replace All Posts When Applying Template (Priority: P1)

A space administrator wants to completely reset their SubSpace content to match a new template. They select a new innovation flow template and choose to replace all existing posts with the template's predefined posts. This is useful when pivoting a SubSpace to a completely different purpose or when starting fresh.

**Why this priority**: This is the primary new functionality being added. The "Replace All" option requires the new backend parameter and enables a common use case where administrators want a clean slate when changing templates.

**Independent Test**: Can be fully tested by selecting a template and choosing "Replace All" on a SubSpace with existing posts. The SubSpace should have all original posts removed and only template posts remaining.

**Acceptance Scenarios**:

1. **Given** a SubSpace with 5 existing posts and an innovation flow, **When** the administrator selects a new template and chooses "Replace All", **Then** all 5 existing posts are deleted and replaced with the template's posts, and the innovation flow states are updated.

2. **Given** a SubSpace with existing posts, **When** the administrator selects "Replace All" option, **Then** a confirmation dialog appears before executing the operation to prevent accidental data loss.

3. **Given** a SubSpace with no existing posts, **When** the administrator selects a template and chooses "Replace All", **Then** only the template posts are added (no deletion occurs).

---

### User Story 2 - Add Template Posts to Existing Content (Priority: P2)

A space administrator wants to enhance their SubSpace with additional posts from a template while preserving all existing work. They select a template and choose to add the template's posts alongside their current content. This allows incremental enhancement without losing existing contributions.

**Why this priority**: This is existing functionality (the current `addCallouts=true` behavior) but needs to be clearly presented as a distinct option in the template selection dialog.

**Independent Test**: Can be fully tested by selecting a template and choosing "Add Template Posts" on a SubSpace with existing posts. Both original and template posts should be present afterward.

**Acceptance Scenarios**:

1. **Given** a SubSpace with 3 existing posts, **When** the administrator selects a template with 4 posts and chooses "Add Template Posts", **Then** the SubSpace has 7 posts total (3 original + 4 from template) and the innovation flow states are updated.

2. **Given** a SubSpace with posts in specific flow states, **When** the administrator adds template posts, **Then** the new posts are assigned to appropriate flow states per the template configuration.

---

### User Story 3 - Update Flow Only (Priority: P3)

A space administrator wants to change only the innovation flow structure (states/phases) without affecting any existing posts. They select a template and choose "Flow Only" to update the workflow stages while preserving all current content exactly as it is.

**Why this priority**: This is existing functionality (the current `addCallouts=false` behavior) but provides a clear option for users who only want to restructure their workflow.

**Independent Test**: Can be fully tested by selecting a template and choosing "Flow Only" on a SubSpace with existing posts. All original posts should remain unchanged, only the flow states should update.

**Acceptance Scenarios**:

1. **Given** a SubSpace with 5 existing posts in various flow states, **When** the administrator selects a template and chooses "Flow Only", **Then** all 5 posts remain in the SubSpace, and only the innovation flow states are updated to match the template.

2. **Given** existing posts assigned to flow states that no longer exist after template application, **When** "Flow Only" is selected, **Then** those posts are reassigned to valid flow states according to system rules.

---

### Edge Cases

- What happens when the administrator cancels the confirmation dialog for "Replace All"? The operation should be aborted with no changes made.
- How does the system handle "Replace All" when the template has no posts? All existing posts are deleted, resulting in an empty callouts set with only the new flow states.
- What happens if the deletion of existing posts fails partway through during "Replace All"? The operation should be transactional - either all changes succeed or none are applied.
- How are posts with attachments or linked content handled during "Replace All" deletion? All associated content should be properly cleaned up.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST accept a new `deleteExistingCallouts` boolean parameter on the `updateCollaborationFromSpaceTemplate` mutation.
- **FR-002**: System MUST delete all existing callouts in the target collaboration's callouts set when `deleteExistingCallouts` is true.
- **FR-003**: System MUST preserve all existing callouts when `deleteExistingCallouts` is false or not provided (backward compatible behavior).
- **FR-004**: System MUST update the innovation flow states from the template regardless of which content option is selected.
- **FR-005**: System MUST ensure the deletion and recreation of callouts occurs within a single transaction to maintain data integrity.
- **FR-006**: System MUST properly cascade delete related entities (contributions, comments, attachments) when deleting callouts during "Replace All".
- **FR-007**: System MUST handle authorization checks for callout deletion when `deleteExistingCallouts` is true.
- **FR-008**: The `deleteExistingCallouts` parameter MUST be optional with a default value of `false` to maintain backward compatibility.
- **FR-009**: System MUST support the combination where both `deleteExistingCallouts=true` and `addCallouts=true` to achieve the "Replace All" behavior (delete existing, then add template callouts).
- **FR-010**: System MUST support deletion-only mode (`deleteExistingCallouts=true`, `addCallouts=false`) where existing callouts are deleted without adding template callouts, while still updating innovation flow states as required by FR-004. This mode follows the same execution order as "Replace All" but omits the callout addition step.

### Key Entities

- **Collaboration**: The container being updated, includes the innovation flow and callouts set.
- **CalloutsSet**: Collection of callouts (posts) within a collaboration that may be deleted or augmented.
- **Callout**: Individual post within a callouts set that may be deleted during "Replace All".
- **InnovationFlow**: The workflow structure with states that is always updated from the template.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Administrators can successfully apply templates with the "Replace All" option, resulting in complete content replacement within a single operation.
- **SC-002**: The mutation maintains full backward compatibility - existing integrations using the current parameters continue to work without modification.
- **SC-003**: The "Replace All" operation completes within the same performance bounds as existing template application operations.
- **SC-004**: No orphaned data remains after "Replace All" operations - all related content (attachments, comments) is properly cleaned up.
- **SC-005**: 100% of "Replace All" operations either fully succeed or fully roll back on failure - no partial states.

## Assumptions

- The frontend will handle presenting the three options to users and sending the appropriate parameter combinations.
- The confirmation dialog for "Replace All" is handled by the frontend before calling the mutation.
- Existing permissions model for collaboration updates applies to the delete operation as well.
- The callouts set deletion will use existing cascade delete mechanisms in the system.
