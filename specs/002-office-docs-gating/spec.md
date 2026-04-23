# Feature Specification: Callout Creation Gating for Collabora Document by License Entitlement

**Feature Branch**: `002-office-docs-gating`  
**Created**: 2026-04-23  
**Status**: Draft  
**Input**: User description: "I want to prevent the creation of CallOut with Collabora Document, if the license on the collaboration does not have the entitlement of the Space Flag Office Docs."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Blocked creation when entitlement is absent (Priority: P1)

A space member attempts to create a new Callout of type Collabora Document in a Collaboration that does **not** have the Office Docs entitlement enabled on its license. The system must reject the request immediately, before any data is persisted, and return a clear explanation of why the action was refused.

**Why this priority**: This is the core enforcement mechanism. Without it, the license boundary has no effect and Collabora Document callouts can be created regardless of the subscription plan.

**Independent Test**: Can be fully tested by attempting to create a Collabora Document callout in a space without the Office Docs entitlement and verifying the operation is rejected with an informative error.

**Acceptance Scenarios**:

1. **Given** a Collaboration whose license does not include the Office Docs entitlement, **When** a user submits a request to create a Callout of type Collabora Document, **Then** the request is rejected and no callout is created.
2. **Given** the same Collaboration, **When** a user submits a request to create a Callout of any other type (e.g., Post, Whiteboard, Link Collection), **Then** the request succeeds and the callout is created normally.
3. **Given** a Collaboration that previously had the entitlement removed, **When** a user submits a Collabora Document callout creation request, **Then** the request is rejected consistently.

---

### User Story 2 - Successful creation when entitlement is present (Priority: P2)

A space member with appropriate permissions attempts to create a new Callout of type Collabora Document in a Collaboration whose license **does** include the Office Docs entitlement. The request should succeed as normal.

**Why this priority**: The gate must not block legitimate, licensed usage. Without a passing path, the entire Collabora Document callout feature is unusable.

**Independent Test**: Can be fully tested by creating a Collabora Document callout in a space with the Office Docs entitlement active and confirming the callout appears.

**Acceptance Scenarios**:

1. **Given** a Collaboration whose license includes the Office Docs entitlement, **When** a user submits a request to create a Callout of type Collabora Document, **Then** the callout is created successfully.
2. **Given** the same licensed Collaboration, **When** a user creates multiple Collabora Document callouts in sequence, **Then** each creation succeeds.

---

### User Story 3 - Meaningful feedback to the requesting party (Priority: P3)

When a creation attempt is blocked due to a missing entitlement, the requestor receives a response that clearly indicates why the operation was not permitted, so they can take an appropriate action (e.g., contact an administrator or upgrade the space plan).

**Why this priority**: Good error communication reduces support burden and helps space administrators resolve the situation without guessing.

**Independent Test**: Can be fully tested by inspecting the error response returned when creating a Collabora Document callout in an unlicensed space and verifying it contains a meaningful, actionable message.

**Acceptance Scenarios**:

1. **Given** a blocked creation attempt, **When** the requester receives the error response, **Then** the message identifies the missing entitlement as the reason without exposing internal system details.
2. **Given** the same blocked attempt, **When** a space administrator reviews the response, **Then** the message indicates that the Office Docs feature is not enabled for this space.

---

### Edge Cases

- What happens when the entitlement is toggled off **after** existing Collabora Document callouts have already been created? (Assumption: existing callouts remain; only new creation is blocked.)
- What happens when the license check itself cannot be evaluated (e.g., the license data is unavailable)? The system must fail closed and block the creation.
- What happens when a Callout creation request does not specify a type? Existing type validation handles this; the entitlement check applies only when the type is Collabora Document.
- What happens when the entitlement is present but the user's role does not permit Callout creation? Role-based authorization applies first; the entitlement check is an additional layer.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST prevent the creation of a Callout of type Collabora Document when the owning Collaboration's license does not include the Office Docs entitlement.
- **FR-002**: The system MUST allow the creation of a Callout of type Collabora Document when the owning Collaboration's license includes the Office Docs entitlement.
- **FR-003**: The system MUST allow the creation of Callouts of all other types regardless of the Office Docs entitlement.
- **FR-005**: When a creation is blocked due to the missing entitlement, the system MUST return a response that identifies the reason as a missing license entitlement rather than a generic failure.
- **FR-006**: The system MUST fail closed: if the Office Docs entitlement status of a Collaboration cannot be determined, the creation of a Collabora Document callout MUST be rejected.
- **FR-007**: The entitlement check MUST be enforced for all **external API requests** regardless of the requesting user's role (including administrators and platform admins). Internal system operations (migrations, seed scripts, platform bootstrap) are exempt from this gate.
- **FR-008**: When a Collabora Document callout creation is blocked due to a missing entitlement, the system MUST log the event at **error level**, including the Collaboration identifier as structured context (not in the message body), with no user-identifying data in the log message.

### Out of Scope

- Client-side suppression or disabling of the Collabora Document callout type in the UI based on entitlement status is **not in scope** for this feature. Enforcement is server-side only at the point of creation. UI-level gating may be addressed as a follow-on feature.

### Key Entities

- **Callout**: A contribution item within a Collaboration. Has a type attribute that determines its content model. The type "Collabora Document" is the subject of this gate.
- **Collaboration**: The container that owns a set of Callouts. Has an associated license that specifies which feature entitlements are active.
- **License / Entitlement**: A record held **directly on the Collaboration** that indicates which optional capabilities are enabled. The relevant flag is "Space Flag Office Docs."

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of Collabora Document callout creation attempts in spaces without the Office Docs entitlement are rejected — no exceptions under any calling pattern.
- **SC-002**: 100% of Collabora Document callout creation attempts in spaces with the Office Docs entitlement succeed (subject to the user's existing permissions).
- **SC-003**: Callout creation for all other types is unaffected — no increase in failure rate for non-Collabora-Document callout types.
- **SC-004**: The entitlement check adds no perceptible delay to the callout creation flow for end users in licensed spaces.
- **SC-005**: Zero support tickets are raised due to ambiguous error messages when Collabora Document creation is blocked.

## Assumptions

- The "Space Flag Office Docs" entitlement already exists as a defined flag in the license model (established by spec `001-office-docs-gating`).
- The license entitlement is carried **on the Collaboration entity itself** and is accessible at the time of callout creation without requiring additional external calls or traversal to the parent Space.
- Existing Collabora Document callouts created before this gate is introduced are not retroactively removed or disabled; the gate applies only to new creation requests.
- Role-based authorization (who may create callouts in a space) remains handled by the existing authorization layer and is independent of this entitlement check.
- Internal system operations (migrations, seed scripts, platform bootstrap) are not subject to the entitlement gate; it applies to externally initiated API requests only.
- License caching and refresh is managed by the existing license infrastructure; this feature does not impose constraints on how or when the entitlement value is resolved.

## Clarifications

### Session 2026-04-23

- Q: Where does the Office Docs entitlement live — on the Space, on the Collaboration, or inherited? → A: The entitlement is on the **Collaboration** — the system checks the license directly on the Collaboration entity.
- Q: Should the server also expose entitlement status to clients for UI suppression, or is enforcement at creation only? → A: **Server-side enforcement only** — client-side hiding/disabling is out of scope; server enforces at the point of creation.
- Q: Should blocked entitlement attempts be logged or silently rejected? → A: **Log at error level**, with Collaboration identifier as structured context and no user-identifying data in the message body.
- Q: Does the entitlement gate apply to internal/system operations (migrations, seeds) or external API requests only? → A: **External API requests only** — internal system operations bypass the gate.
- Q: Should FR-004 (no caching) be kept as a functional requirement? → A: **Removed** — license infrastructure manages caching and refresh; not a functional constraint for this feature.
