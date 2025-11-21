# Feature Specification: Guest Contributions Policy for Spaces

**Feature Branch**: `server-8727`
**Created**: 2025-10-31
**Status**: Draft
**Input**: User description: "add a policy setting in the space settings that allows admins to enable or disable guest contributions"

## Clarifications

### Session 2025-10-31

- Q: What is the precise definition of a "guest" user for this policy? → A: Definition of guest not important now. This should be only about the scope: New setting added to space's collaboration settings to allow admins to toggle ON/OFF allowGuestContributions.
- Q: What validation rules should apply when an admin changes the allowGuestContributions setting? → A: No validation rules
- Q: How should existing spaces be migrated when introducing this new setting? → A: Set all existing spaces to false (disabled) - maintains secure posture
- Q: What happens to existing guest interactions when the policy is disabled on a space? → A: Guests have no rights to interact with the whiteboards in the space anymore.
- Q: Who has permission to modify the allowGuestContributions setting? → A: admins of the space. same as it is right now for all other collaboration settings. no change

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Space admins control guest access (Priority: P1)

When a space admin manages their space settings, they need to configure whether external users (guests) can participate in space activities, allowing them to maintain control over their space's community engagement.

**Why this priority**: Space admins need granular control over who can contribute to their space to maintain community quality and alignment with their space's goals.

**Independent Test**: A space admin can access space settings, toggle the guest contributions policy, and verify that guest users are appropriately allowed or blocked from contributing based on the policy setting.

**Acceptance Scenarios**:

1. **Given** a space admin accesses space settings, **When** they view the guest contributions policy setting, **Then** they can see the current state (enabled/disabled) and modify it.
2. **Given** guest contributions are enabled for a space, **When** a guest user attempts to contribute, **Then** they are allowed to participate according to the space's rules.
3. **Given** guest contributions are disabled for a space, **When** a guest user attempts to contribute, **Then** they are blocked from participating.

---

### User Story 2 - Default security posture (Priority: P1)

When a new space is created, the guest contributions policy should default to disabled to ensure security-first approach and require explicit admin action to enable guest access.

**Why this priority**: Security best practices dictate that access should be explicitly granted rather than implicitly allowed, protecting spaces from unwanted external contributions.

**Independent Test**: Create a new space and verify that guest contributions are disabled by default, requiring admin action to enable.

**Acceptance Scenarios**:

1. **Given** a new space is created, **When** the space settings are initialized, **Then** guest contributions are disabled by default.
2. **Given** a space template is applied, **When** the space is created from template, **Then** guest contributions respect the template's setting or default to disabled if not specified.

---

### User Story 3 - Policy enforcement consistency (Priority: P2)

The guest contributions policy must be consistently enforced across all space activity types including discussions, callouts, whiteboards, and other collaborative features.

**Why this priority**: Inconsistent enforcement would create confusion and security gaps where guests might access some features but not others.

**Independent Test**: With guest contributions disabled, verify that guest users cannot access any space contribution features; with it enabled, verify they can access all allowed features.

**Acceptance Scenarios**:

1. **Given** guest contributions are disabled, **When** a guest user attempts any contribution activity, **Then** all activities are consistently blocked.
2. **Given** guest contributions are enabled, **When** a guest user attempts contribution activities, **Then** they are allowed based on the space's normal authorization rules.

---

### User Story 4 - Migration and backward compatibility (Priority: P3)

All existing spaces should have the guest contributions policy set to disabled when the feature is introduced, maintaining a consistent secure posture across the platform.

**Why this priority**: Setting all existing spaces to disabled maintains security consistency and ensures the new policy starts from a known secure baseline.

**Independent Test**: Verify that after migration, all existing spaces have guest contributions disabled, and new spaces follow the same default.

**Acceptance Scenarios**:

1. **Given** the policy is introduced, **When** the migration runs, **Then** all existing spaces are set to allowGuestContributions = false.
2. **Given** a migrated space, **When** an admin views the settings, **Then** they can see the guest contributions are disabled and can enable if desired.

---

## Edge Cases

- **Policy Change Impact**: When guest contributions are disabled on a space, guests immediately lose rights to interact with whiteboards and other collaborative features in the space.
- **Immediate Enforcement**: Policy changes take effect immediately without requiring guest users to re-authenticate or refresh their sessions.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST add allowGuestContributions boolean field to SpaceSettingsCollaboration
- **FR-002**: System MUST default allowGuestContributions to false for all new spaces
- **FR-003**: Space admins MUST be able to toggle the allowGuestContributions setting (same authorization as other collaboration settings)
- **FR-004**: System MUST enforce guest contribution restrictions immediately when policy is disabled
- **FR-005**: System MUST prevent guest users from interacting with whiteboards when allowGuestContributions is false

## Domain Model Changes

### Space Settings Structure

The guest contributions policy will be added to the space settings structure `SpaceSettingsCollaboration`.

### Default Values

- **New spaces**: `allowGuestContributions = false` (secure default)
- **Migrated spaces**: `allowGuestContributions = false` (maintain current behavior)
- **Template inheritance**: Templates can specify space settings, defaulting to false if not specified

## Technical Implementation

### Database Changes

- Add guest contributions policy to space settings JSON column
- Create migration to initialize policy for existing spaces and templates
- Update space defaults and templates to include guest settings

### GraphQL Schema

- Add space setting `allowGuestContributions` to `SpaceSettingsCollaboration` type
- Update `UpdateSpaceSettingsCollaborationInput` and `CreateSpaceSettingsCollaborationInput`
- Ensure schema contract compliance

### Service Layer

- Update `SpaceSettingsService` to handle guest policy updates
- Add policy enforcement logic
- No additional validation rules required for the setting change

## Migration Plan

1. **Phase 1**: Add domain model and database structure
2. **Phase 2**: Implement GraphQL schema changes
3. **Phase 3**: Add service layer logic
4. **Phase 4**: Create database migration for existing spaces
5. **Phase 5**: Update templates and defaults
