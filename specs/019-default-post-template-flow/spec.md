# Feature Specification: Default Post Template for Flow Steps

**Feature ID**: 019
**Created**: 2026-01-08
**Status**: Planning

## Overview

Configure a default post template for innovation flow steps so that every new post created in that flow step starts from a consistent structure chosen by the admin.

## User Story

As a Space admin, I want to set a default post template for specific flow steps, so that when members add posts to that flow step, they automatically start with the chosen template structure, ensuring consistency across all posts in that flow.

## Functional Requirements

### 1. Admin Configuration Interface

**Location**: Layout Settings → Three-dot menu in the Layout section

**Behavior**:

- Add a new option in the three-dot menu: "Set Default Post Template" (or similar)
- When clicked, open the existing "Template Library: Collaboration Tool Template" dialog
- The dialog displays all available CALLOUT templates from the template library

### 2. Template Selection Dialog Enhancements

**Additional Functionality** (only available in this context):

- If a default template is already set for this flow step, display it prominently in the dialog (e.g., "Currently Selected Template" section)
- Allow admin to:
  - **View** the currently selected template
  - **Add** a new template (if none selected)
  - **Change** the selected template (replace current with new choice)
  - **Remove** the selected template (clear the default)

### 3. Template Selection Rules

**Duplicate Prevention**:

- If admin selects the same template that is already set, **no action occurs**:
  - Dialog does NOT close
  - No API requests are made
  - Optionally show a subtle indicator that this template is already selected

**Different from existing behavior**: In all other existing template selection cases, selecting a template adds it even if duplicate. This feature introduces unique selection logic.

### 4. Post Creation with Default Template

**When a member clicks "Add Post" in a flow step with a default template**:

- The "Add Post" dialog automatically loads the selected template content
- Template content includes:
  - Pre-filled post description (from `template.postDefaultDescription`)
  - Any other template properties that apply to posts
- Members can modify the template content before creating the post

**When no default template is set**:

- "Add Post" dialog works as it currently does (empty or with callout defaults)

### 5. Persistence

**Backend Storage**:

- Store the default template reference on the InnovationFlowState entity
- The relationship should be optional (nullable) - flow steps can exist without a default template
- When a flow step is deleted, the template reference is removed (but the template itself remains in the library)
- **When a template that is in use as a default template is deleted**, the flow state's defaultTemplate becomes null
  - This ensures referential integrity without blocking template deletion
  - Flow steps automatically revert to the "no default template" behavior

**Space Template Creation**:

- When creating a template from a space that has defaultTemplate set for innovation flow states, the resulting space template **does not preserve** those defaultTemplate references
- Space templates always hold null for defaultTemplateId of innovation flow states
- This means defaultTemplate configuration is instance-specific and not part of the template structure

### 6. Scope

**Flow Step Level**:

- Each flow step can have its own default post template
- Different flow steps can use different templates
- Different flow steps can share the same template

**Template Type**:

- Only CALLOUT type templates can be selected
- POST, WHITEBOARD, and other template types are not applicable

## Non-Functional Requirements

1. **Performance**: Template loading should not add noticeable delay to the "Add Post" dialog
2. **Permissions**: Only admins can set/change default templates for flow steps
3. **Backward Compatibility**: Existing flow steps without default templates continue to work unchanged
4. **GraphQL Schema**: Changes must follow schema contract conventions (deprecation if needed)

## User Flow

### Admin Setting Template

1. Admin navigates to Space → Layout Settings
2. Clicks three-dot menu on a flow step in the Layout section
3. Selects "Set Default Post Template"
4. Dialog opens showing:
   - "Currently Selected Template" section (if one exists)
   - Template library with available CALLOUT templates
5. Admin selects a template
6. If template is different from current, API saves the selection and dialog closes
7. If template is same as current, nothing happens (dialog stays open)

### Member Creating Post with Template

1. Member navigates to a flow step that has a default template configured
2. Clicks "Add Post"
3. Dialog opens with template content pre-filled
4. Member edits content as needed
5. Clicks "Create Post"
6. Post is created with the content (not linked to template, just initialized from it)

## Success Criteria

- [ ] Admins can set default post templates for flow steps via Layout Settings
- [ ] The template selection dialog shows currently selected template
- [ ] Duplicate selection is prevented (no-op behavior)
- [ ] Members see template content pre-filled when adding posts
- [ ] No default template = current behavior (empty post)
- [ ] Backend persists template reference on InnovationFlowState
- [ ] GraphQL schema changes follow contract conventions
- [ ] All authorization checks are in place (admin-only configuration)

## Out of Scope

- Setting default templates for other contribution types (whiteboards, links, memos)
- Template versioning or template content changes affecting already-created posts
- Template library management (that's a separate feature)
- Bulk setting templates for multiple flow steps at once
- Template inheritance between parent/child spaces
