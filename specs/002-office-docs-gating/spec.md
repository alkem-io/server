# Feature Specification: Callout Introduction Gating for Collabora Document by License Entitlement

**Feature Branch**: `002-office-docs-gating`  
**Created**: 2026-04-23  
**Status**: Draft  
**Input**: User description: "I want to prevent the creation of CallOut with Collabora Document, if the license on the collaboration does not have the entitlement of the Space Flag Office Docs."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Blocked introduction when entitlement is absent (Priority: P1)

A space member attempts to **introduce** a Callout of type Collabora Document into a Collaboration that does **not** have the Office Docs entitlement enabled on its license. "Introduce" covers creation, clone/copy from a template or another callout, move-into the Collaboration, and import (including template-application paths). The system must reject the request immediately, before any data is persisted, and return a clear explanation of why the action was refused.

**Why this priority**: This is the core enforcement mechanism. Without it, the license boundary has no effect and Collabora Document callouts can be introduced regardless of the subscription plan.

**Independent Test**: Can be fully tested by attempting any introduction path (create, clone, move-into, template-apply) for a Collabora Document callout in a space without the Office Docs entitlement and verifying the operation is rejected with an informative error.

**Acceptance Scenarios**:

1. **Given** a Collaboration whose license does not include the Office Docs entitlement, **When** a user submits a request to create a Callout of type Collabora Document, **Then** the request is rejected and no callout is created.
2. **Given** the same Collaboration, **When** a user submits a request to create a Callout of any other type (e.g., Post, Whiteboard, Link Collection), **Then** the request succeeds and the callout is created normally.
3. **Given** a Collaboration that previously had the entitlement removed, **When** a user submits any Collabora Document callout introduction request, **Then** the request is rejected consistently.
4. **Given** an unentitled Collaboration, **When** a user attempts to move a Collabora Document contribution into a Callout in that Collaboration, **Then** the move is rejected and no relocation occurs.
5. **Given** an unentitled Collaboration, **When** a template-apply (`updateCollaborationFromSpaceTemplate`) introduces a set of callouts that includes at least one Collabora Document, **Then** the entire template apply is rejected atomically and no callouts from that template are introduced.
6. **Given** an unentitled Collaboration containing a Callout that allows Collabora Document contributions, **When** a user submits `createContribution` of type `COLLABORA_DOCUMENT` to that Callout, **Then** the request is rejected and no contribution is created.

---

### User Story 2 - Successful introduction when entitlement is present (Priority: P2)

A space member with appropriate permissions attempts to **introduce** a Callout of type Collabora Document (via create, clone/copy, move-into, or template-apply) into a Collaboration whose license **does** include the Office Docs entitlement. The request should succeed as normal.

**Why this priority**: The gate must not block legitimate, licensed usage. Without a passing path, the entire Collabora Document callout feature is unusable.

**Independent Test**: Can be fully tested by introducing a Collabora Document callout (via any supported path) in a space with the Office Docs entitlement active and confirming the callout appears.

**Acceptance Scenarios**:

1. **Given** a Collaboration whose license includes the Office Docs entitlement, **When** a user submits a request to create a Callout of type Collabora Document, **Then** the callout is created successfully.
2. **Given** the same licensed Collaboration, **When** a user creates multiple Collabora Document callouts in sequence, **Then** each creation succeeds.
3. **Given** an entitled target Collaboration, **When** a Collabora Document contribution is moved into a Callout in that Collaboration, **Then** the move succeeds regardless of the source Collaboration's entitlement status.
4. **Given** an entitled target Collaboration, **When** a template-apply introduces multiple callouts including at least one Collabora Document, **Then** all callouts from the template are introduced successfully.
5. **Given** an entitled Collaboration containing a Callout that allows Collabora Document contributions, **When** a user submits `createContribution` of type `COLLABORA_DOCUMENT` to that Callout, **Then** the contribution is created successfully.

---

### User Story 3 - Meaningful feedback to the requesting party (Priority: P3)

When an **introduction** attempt is blocked due to a missing entitlement, the requestor receives a response that clearly indicates why the operation was not permitted, so they can take an appropriate action (e.g., contact an administrator or upgrade the space plan).

**Why this priority**: Good error communication reduces support burden and helps space administrators resolve the situation without guessing.

**Independent Test**: Can be fully tested by inspecting the error response returned when introducing a Collabora Document callout (via any supported path) in an unlicensed space and verifying it contains a meaningful, actionable message.

**Acceptance Scenarios**:

1. **Given** a blocked introduction attempt, **When** the requester receives the error response, **Then** the message identifies the missing entitlement as the reason without exposing internal system details.
2. **Given** the same blocked attempt, **When** a space administrator reviews the response, **Then** the message indicates that the Office Docs feature is not enabled for this space.

---

### Edge Cases

- What happens when the entitlement is toggled off **after** existing Collabora Document callouts have already been introduced? (Assumption: existing callouts remain; only new introduction is blocked.)
- What happens when the license check itself cannot be evaluated (e.g., the license data is unavailable)? The system must fail closed and block the introduction.
- What happens when a Callout introduction request does not specify a type? Existing type validation handles this; the entitlement check applies only when the type is Collabora Document.
- What happens when the entitlement is present but the user's role does not permit Callout introduction? Role-based authorization applies first; the entitlement check is an additional layer.
- What happens when a bulk operation (template apply, future bulk import) introduces multiple callouts and one of them is a Collabora Document while the target Collaboration is unentitled? The whole operation is rejected atomically (FR-005); no callouts from that operation are introduced.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST prevent the **introduction** (any path enumerated in FR-004) of a Collabora Document — in either Callout-framing form (`CalloutFramingType.COLLABORA_DOCUMENT`) or Contribution form (`CalloutContributionType.COLLABORA_DOCUMENT`) — when the owning Collaboration's license does not include the Office Docs entitlement.
- **FR-002**: The system MUST allow the introduction of a Collabora Document (in either framing or contribution form) when the owning Collaboration's license includes the Office Docs entitlement.
- **FR-003**: The system MUST allow the introduction of Callouts and Contributions of all other types regardless of the Office Docs entitlement.
- **FR-004**: The entitlement gate MUST apply to every operation that **introduces** a Collabora Document into a Collaboration in **either form** — (a) a Callout whose framing type is `COLLABORA_DOCUMENT` (`CalloutFramingType.COLLABORA_DOCUMENT`), or (b) a Callout Contribution whose type is `COLLABORA_DOCUMENT` (`CalloutContributionType.COLLABORA_DOCUMENT`). Gated paths include: `createCallout` (framing form), `createContribution` (contribution form), `moveContributionToCallout`, `updateCollaborationFromSpaceTemplate`, and any future clone/copy/import path that introduces either form. Updates to an already-existing Collabora Document framing or contribution in place are not gated.
- **FR-005**: When a single mutation introduces **multiple callouts** at once (e.g., template apply, future bulk import) and at least one of them is a Collabora Document while the target Collaboration lacks the Office Docs entitlement, the gate MUST fail **atomically**: the entire operation is rejected and **no** callouts are introduced. Partial success (applying the non-Collabora callouts and skipping the Collabora ones) is NOT permitted.
- **FR-006**: For move operations involving a Collabora Document contribution (e.g., `moveContributionToCallout`), the entitlement gate MUST be evaluated against the **target** (destination) Collaboration's license only. The source Collaboration's entitlement state MUST NOT affect the decision. If the target Collaboration has the Office Docs entitlement, the move proceeds; otherwise it is rejected.
- **FR-007**: When introduction of a Collabora Document callout is blocked, the system MUST return a **single unified user-facing message** with the exact text `"Office Docs is not enabled for this Collaboration."` (no IDs, no role information, no license details). The message MUST be the same for both the "entitlement absent" and "entitlement unevaluable" (FR-008) cases, so external callers cannot distinguish license-system state from license configuration. Internally, the two causes MUST be raised as **distinct exception types** so logs and metrics can separate them.
- **FR-008**: The system MUST fail closed: if the Office Docs entitlement status of a Collaboration cannot be determined, the introduction of a Collabora Document callout MUST be rejected.
- **FR-009**: The entitlement check MUST be enforced at **GraphQL mutation entry points** that introduce a Collabora Document callout into a Collaboration, regardless of the requesting user's role (including administrators and platform admins). Non-mutation code paths (RabbitMQ message handlers, scheduled jobs, migrations, seed scripts, platform bootstrap) are not subject to this gate. This matches existing entitlement enforcement practice in the codebase, which is hand-rolled per mutation call site rather than via a global guard.
- **FR-010**: The entitlement gate MUST log every decision point with the Collaboration identifier as structured context (not in the message body) and no user-identifying data in the log message (constitution principle 5: feature-flag and license-check decision points). Log levels:
  - **debug** when the entitlement is enabled and the introduction is allowed.
  - **warn** when the introduction is blocked because the entitlement is absent (an expected denial).
  - **error** when the introduction is blocked because FR-008 fail-closed triggered (the entitlement status could not be determined — abnormal).
  Log messages are static identifiers (e.g., `office-docs-entitlement-allowed`, `office-docs-entitlement-absent`, `office-docs-entitlement-unevaluable`); dynamic data lives in `details`.

### Out of Scope

- Client-side suppression or disabling of the Collabora Document callout type in the UI based on entitlement status is **not in scope** for this feature. Enforcement is server-side only, applied at every introduction path (create, clone/copy, move-into, import, template-apply). UI-level gating may be addressed as a follow-on feature.

### Key Entities

- **Callout**: An item within a Collaboration with a **framing type** (`CalloutFramingType`) that determines its main content model, and an optional set of **contributions** of various **contribution types** (`CalloutContributionType`). Both `CalloutFramingType.COLLABORA_DOCUMENT` and `CalloutContributionType.COLLABORA_DOCUMENT` exist; both are subject to this gate.
- **Callout Contribution**: An item attached to a Callout, typed by `CalloutContributionType`. A contribution of type `COLLABORA_DOCUMENT` is one of the gated forms.
- **Collaboration**: The container that owns a set of Callouts. Has an associated license that specifies which feature entitlements are active.
- **License / Entitlement**: A record held **directly on the Collaboration** that indicates which optional capabilities are enabled. The relevant flag is "Space Flag Office Docs."

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of Collabora Document callout **introduction attempts** (create, clone/copy, move-into, import, template-apply) in spaces without the Office Docs entitlement are rejected — no exceptions under any calling pattern.
- **SC-002**: 100% of Collabora Document callout introduction attempts in spaces with the Office Docs entitlement succeed (subject to the user's existing permissions).
- **SC-003**: Introduction of callouts of all other types is unaffected — no increase in failure rate for non-Collabora-Document callout types across any introduction path.
- **SC-004**: The entitlement check itself completes in **< 5 ms p95** per gated mutation, measured against an already-loaded license object (the existing license-loading cost is unchanged by this feature).
- **SC-005**: Zero support tickets are raised due to ambiguous error messages when Collabora Document introduction is blocked.
- **SC-006**: Bulk introduction operations (template apply) that include at least one Collabora Document callout are rejected atomically when the target Collaboration is unentitled — no partial state is observed afterwards.

## Assumptions

- The "Space Flag Office Docs" entitlement already exists as a defined flag in the license model (established by spec `001-office-docs-gating`).
- The license entitlement is carried **on the Collaboration entity itself** and is accessible at the time of callout introduction without requiring additional external calls or traversal to the parent Space.
- Existing Collabora Document callouts created before this gate is introduced are not retroactively removed or disabled; the gate applies only to new introduction requests.
- Role-based authorization (who may create callouts in a space) remains handled by the existing authorization layer and is independent of this entitlement check.
- Enforcement is at GraphQL mutation entry points only (matching existing entitlement enforcement practice in the codebase). RabbitMQ message handlers, scheduled jobs, migrations, seed scripts, and platform bootstrap are not gated.
- License caching and refresh is managed by the existing license infrastructure; this feature does not impose constraints on how or when the entitlement value is resolved.

## Clarifications

### Session 2026-04-30 (continued 3 — analyze-driven remediation)

- Q: Should the exact user-facing error message text be pinned in FR-007 (rather than left to implementation)? → A: **Yes, pinned** — the exact string is `"Office Docs is not enabled for this Collaboration."` so tests can assert it precisely.
- Q: Should FR-010 cover the allowed-path log level (per constitution principle 5: license-check decision points must log at debug)? → A: **Yes** — added a debug-level allowed bullet to FR-010 for full decision-point coverage.

### Session 2026-04-30 (continued 2)

- Q: Does the gate cover Collabora Document **framing**, **contribution**, or both? → A: Option A — **both forms**. `CalloutFramingType.COLLABORA_DOCUMENT` and `CalloutContributionType.COLLABORA_DOCUMENT` are equally gated. Gated mutations include `createCallout` (framing), `createContribution`, `moveContributionToCallout`, and `updateCollaborationFromSpaceTemplate`.
- Q: Should acceptance scenarios for the contribution-form path be added explicitly to US1 and US2? → A: Option A — **one scenario per story**. US1 gets a blocked `createContribution` scenario; US2 gets an allowed `createContribution` scenario.

### Session 2026-04-30 (continued)

- Q: When a single mutation introduces multiple callouts at once (e.g. `updateCollaborationFromSpaceTemplate`) and at least one is a Collabora Document while the target Collaboration is unentitled, what happens? → A: Option A — **atomic reject**. The entire operation fails and no callouts from that operation are introduced. Partial success is not permitted.
- Q: For move operations of a Collabora Document contribution between Collaborations, which Collaboration's entitlement governs the decision? → A: Option A — **target only**. The destination's entitlement is checked; the source's status is irrelevant.
- Q: Should the User Stories, Success Criteria, and title be widened to match FR-004/005/006's broader scope? → A: Option A — **widen uniformly**. Title becomes "Callout Introduction Gating"; User Stories 1–3 and SC-001–006 cover all introduction paths (create, clone/copy, move-into, import, template-apply).

### Session 2026-04-30

- Q: Does the gate apply only to creation, or also to other operations that introduce a Collabora Document callout into a Collaboration (clone, copy, move-into, import)? → A: Option B (extended) — the gate applies to **every operation that introduces a Collabora Document callout into a Collaboration**: creation, clone/copy, move-into, **and import**. Updates of an existing in-place callout are not gated.
- Q: What counts as an "internal system operation" that bypasses the gate (RabbitMQ handlers, scheduled jobs, system-principal GraphQL, etc.)? → A: Option C — the gate applies at **GraphQL mutation entry points only**, matching the existing entitlement enforcement pattern in the codebase. RabbitMQ handlers, scheduled jobs, and bootstrap paths are not gated.
- Q: Should platform admins bypass the Collabora Document entitlement gate, as they do in `account.resolver.mutations.ts`? → A: Option A — **no bypass**. Platform admins and space admins are gated like everyone else; admins must grant the entitlement, not circumvent it.
- Q: At what log level should blocked attempts be recorded? → A: Option B — **warn** when the entitlement is absent (expected denial); **error** when the license cannot be evaluated (FR-008 fail-closed, abnormal).
- Q: Should the API response distinguish "entitlement absent" from "entitlement unevaluable"? → A: Option B — **unified user-facing message** for both causes; **distinct internal exception types** so logs/metrics can separate them.

### Session 2026-04-23

- Q: Where does the Office Docs entitlement live — on the Space, on the Collaboration, or inherited? → A: The entitlement is on the **Collaboration** — the system checks the license directly on the Collaboration entity.
- Q: Should the server also expose entitlement status to clients for UI suppression, or is enforcement at creation only? → A: **Server-side enforcement only** — client-side hiding/disabling is out of scope; server enforces at the point of creation.
- Q: Should blocked entitlement attempts be logged or silently rejected? → A: **Log at error level**, with Collaboration identifier as structured context and no user-identifying data in the message body.
- Q: Does the entitlement gate apply to internal/system operations (migrations, seeds) or external API requests only? → A: **External API requests only** — internal system operations bypass the gate.
- Q: Should the original FR-004 ("no caching", earlier numbering) be kept as a functional requirement? → A: **Removed** — license infrastructure manages caching and refresh; not a functional constraint for this feature. (The FR-004 slot was later reused by sequential renumbering on 2026-04-30.)
