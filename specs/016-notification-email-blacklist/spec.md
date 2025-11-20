# Feature Specification: Notification Email Blacklist

**Feature Branch**: `015-notification-email-blacklist`
**Created**: 2025-11-19
**Status**: Draft
**Input**: User description: "create a configurable blacklist of notification receiver emails. The list should include only full emails - e.g. valentin@alkem.io, without wildcards, regex, or full organizations by domain. The structure should be exactly the same as the one of whitelistedURLs. You can check platform.resolver.mutations.ts for reference, with addIframeAllowedURL and removeIframeAllowedURL as reference for adding / removing those emails. The GQL path to list those queries is {\n platform {\n settings {\n integration {\n iframeAllowedUrls\n }\n }\n }\n}."

## Clarifications

### Session 2025-11-19

- Q: Does the platform enforce blacklist filtering directly? → A: No—this feature only maintains the blacklist configuration; downstream notification services consume it to filter recipients.
- Q: Should email entries be stored with canonical casing rules? → A: Canonicalize entries to lowercase on write and compare case-insensitively.
- Q: How large can the blacklist grow within platform settings? → A: Allow up to 250 stored entries to cover large deployments while remaining reviewable.

## User Scenarios & Testing _(mandatory)_

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Block targeted email addresses (Priority: P1)

A platform administrator wants to stop notifications from being sent to specific email recipients (e.g., opted-out stakeholders) by adding their full email address to a blacklist stored with platform integration settings.

**Why this priority**: Preventing unwanted notifications protects compliance commitments and must be available before any further visibility features.

**Independent Test**: Add a specific email to the blacklist and confirm it persists in settings while the GraphQL query reflects the updated list for downstream services.

**Acceptance Scenarios**:

1. **Given** a valid email address is not yet in the blacklist, **When** the admin submits it via the add mutation, **Then** the platform settings persist it and the GraphQL query returns the updated list including that address.
2. **Given** the blacklist already contains the email, **When** the admin attempts to add it again, **Then** the system refuses the duplicate and surfaces a clear validation message.

---

### User Story 2 - Remove obsolete blacklist entries (Priority: P2)

A platform administrator needs to remove an address from the blacklist when an email becomes eligible again (e.g., user consents to notifications).

**Why this priority**: Ensures the blacklist does not permanently block legitimate recipients and keeps notification reach accurate.

**Independent Test**: Add a known email, remove it, and verify both the mutation response and GraphQL query reflect the removal immediately.

**Acceptance Scenarios**:

1. **Given** an email exists in the blacklist, **When** the admin invokes the remove mutation, **Then** the entry disappears and the stored list reflects the removal immediately.

---

### User Story 3 - Audit blacklist via GraphQL (Priority: P3)

Support or compliance staff want to review the current blacklist over GraphQL alongside other integration settings to confirm that blocked emails reflect policy decisions.

**Why this priority**: Provides visibility for troubleshooting and audit but is less critical than the ability to modify the list.

**Independent Test**: Query the platform settings integration object and verify the blacklist list is returned consistently with iframeAllowedUrls.

**Acceptance Scenarios**:

1. **Given** the blacklist contains entries, **When** staff query the platform settings via the documented GraphQL path, **Then** the response contains the full blacklist array exactly as stored.
2. **Given** the blacklist is empty, **When** it is requested, **Then** an empty list is returned without errors.

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

- What happens when an email string is invalidly formatted (missing `@` or domain)?
- How does the system handle attempts to add domain-wide patterns or wildcard characters?
- What occurs when concurrent admins update the blacklist at the same time?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The platform MUST store a blacklist array of fully qualified email addresses within platform integration settings using the same structural conventions as `iframeAllowedUrls`.
- **FR-002**: The system MUST provide GraphQL mutations to add and remove blacklist entries, enforcing platform-level authorization (PLATFORM_ADMIN or stricter) before any change is accepted.
- **FR-003**: Adding an email MUST validate that it is a complete address (local part + domain), canonicalize it to lowercase for storage, and reject duplicates, partial domains, or wildcard characters with actionable feedback.
- **FR-004**: Removing an email MUST succeed only when the address exists in the blacklist and return the updated array for client confirmation; non-existent entries should produce a clear error.
- **FR-005**: The GraphQL `platform.settings.integration` query MUST return the blacklist array so downstream notification services can fetch the authoritative list without additional API hops.
- **FR-006**: The platform MUST enforce a maximum capacity of 250 blacklist entries and surface a clear validation error when the limit is reached.

### Key Entities _(include if feature involves data)_

- **Platform Integration Settings**: Configuration object containing `iframeAllowedUrls` and the new blacklist array; persists per platform and is exposed via GraphQL `platform.settings.integration`.
- **Notification Blacklist Entry**: Immutable record consisting of a validated email string; actor/timestamp details are captured via existing audit logging when mutations execute.

## Success Criteria _(mandatory)_

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: Platform administrators can add or remove a blacklist entry via GraphQL mutations and confirm the persisted state reflects the change.

## Assumptions

- Only platform-level administrators manage the blacklist; workspace or community admins do not need direct access.
- Downstream notification microservices pull the blacklist before filtering recipients; this feature does not implement the suppression itself.
- Downstream systems are responsible for deciding how to handle already-queued notifications when new blacklist entries appear.
