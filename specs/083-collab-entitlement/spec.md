# Feature Specification: Collaboration-Level "Office Documents" Entitlement (License-Gated Feature Flag)

**Feature Branch**: `083-collab-entitlement`
**Created**: 2026-04-08
**Status**: Draft
**Input**: User description: "I want to add an entitlement at the collaboration level, similar to what is there for Memos / whiteboards, so that we can assign that via a license. There should be a migration to add the definition of the license that assigns this entitlement, again similar to what is there for multi-user memos + whiteboards."

## Overview

**Ultimate goal**: To be able to control the usage of the **OfficeDocuments** capability on a **per-Space basis** through the existing credential-based licensing setup. This feature delivers the licensing plumbing that makes that control possible; a subsequent feature will wire the capability's runtime behavior to the entitlement.

Introduce a new collaboration-level entitlement, `SPACE_FLAG_OFFICE_DOCUMENTS`, that represents the ability to view and edit **office documents** (e.g., word-processing, spreadsheet, presentation files) inside a Space's Collaboration. It is granted to a Space through the existing credential-based licensing / license-plan mechanism, following the exact same pattern used today for the "multi-user memo" and "multi-user whiteboard" entitlements. Once this feature is complete, the platform will be able to enable or disable the OfficeDocuments capability for any given Space (and its contained Collaborations, including all descendant sub-spaces) purely by assigning or revoking a license plan — no code changes, no feature flags, no deploys.

**Scope of this feature (plumbing only)**: This feature delivers the end-to-end plumbing for assigning the entitlement:

- A new licensing credential type `space-feature-office-documents`.
- A new license plan `SPACE_FEATURE_OFFICE_DOCUMENTS` (seeded via migration) that the **License Issuer** in the platform admin area can assign to a Space, causing the credential to be issued to that Space.
- A new credential rule in the platform's license policy that maps `space-feature-office-documents` → `SPACE_FLAG_OFFICE_DOCUMENTS`.
- Propagation of `SPACE_FLAG_OFFICE_DOCUMENTS` from the root (L0) Space license down through every sub-space license and into every Collaboration license in the hierarchy.

**The observable end result**: A platform admin opens the License Issuer in the admin area, assigns the `SPACE_FEATURE_OFFICE_DOCUMENTS` plan to a Space, and immediately afterwards (after the license policy is applied) querying that Space's entitlements AND the entitlements on its contained Collaboration (and every descendant Space / Collaboration) returns `SPACE_FLAG_OFFICE_DOCUMENTS` as present / enabled. Revoking the plan returns it to not-present / disabled.

**Explicitly out of scope**: The logic that actually *uses* the entitlement to gate office-document viewing/editing behavior (UI, mutations, authorization checks on the document feature itself) is **not** part of this feature and will be added separately once the plumbing is in place.

**Terminology note**: "Documents" in this feature refers to *office documents* that users view and edit inside a Collaboration. It does **not** refer to the `Document` entity in the Alkemio domain model (the generic file / storage entity). The entitlement does not gate, restrict, or otherwise affect `Document` entities or the existing file-storage subsystem.

## Desired Outcome (Definition of Done)

The feature is done when, and only when, the following two-phase end-to-end verification passes for a target Space `S` on a freshly-migrated environment:

**Phase 1 — Plan NOT assigned → entitlement NOT present as enabled**

1. **Given** `S` has not been assigned the `SPACE_FEATURE_OFFICE_DOCUMENTS` license plan (and therefore does not hold the `space-feature-office-documents` credential),
2. **When** the license entitlements are queried on **both** `S`'s Space license **and** the Collaboration contained in `S`,
3. **Then** `SPACE_FLAG_OFFICE_DOCUMENTS` MUST report as **disabled** (`enabled = false`, `limit = 0`) on both. It is acceptable (and expected) for the entitlement entry to be present in the entitlement set in its disabled default state — what is NOT acceptable is for it to report as enabled.

**Phase 2 — Plan assigned → entitlement present and enabled**

4. **Given** a platform administrator assigns the `SPACE_FEATURE_OFFICE_DOCUMENTS` license plan to `S` via the License Issuer in the platform admin area,
5. **When** the license policy is applied and the license entitlements are queried on **both** `S`'s Space license **and** the Collaboration contained in `S` (plus every descendant sub-space / Collaboration, if any),
6. **Then** `SPACE_FLAG_OFFICE_DOCUMENTS` MUST report as **enabled** (`enabled = true`, `limit ≥ 1`) on all of them.

**Phase 3 — Plan revoked → entitlement returns to disabled**

7. **Given** the plan is then revoked from `S`,
8. **When** the license policy is re-applied and entitlements are queried again,
9. **Then** `SPACE_FLAG_OFFICE_DOCUMENTS` MUST report as **disabled** on `S`'s Space license and on every Collaboration in `S`'s hierarchy, with no residual enabled state.

Any deviation from this three-phase outcome — including the entitlement being enabled when the plan is not assigned, or disabled when the plan is assigned, or inconsistent between a Space and its Collaboration, or inconsistent between L0 and descendants — means the feature is NOT done.

## Clarifications

### Session 2026-04-08

- Q: After the migration runs, how should existing Spaces end up relative to the new entitlement? → A: **No** existing Space should have the `SPACE_FEATURE_OFFICE_DOCUMENTS` plan / `space-feature-office-documents` credential assigned post-migration. The migration updates **only** (1) the platform's license-plan definitions (to add `SPACE_FEATURE_OFFICE_DOCUMENTS`) and (2) the single platform-wide license policy's `credentialRules` (to add the new rule). No Space-level data is modified, no policy reapplication is triggered by the migration, and no Space holds the credential until an admin explicitly assigns the plan via the License Issuer.
- Q: What is the canonical name for the new entitlement / credential / plan? → A: Entitlement flag = `SPACE_FLAG_OFFICE_DOCUMENTS` (enum value `space-flag-office-documents`); credential type = `space-feature-office-documents`; license plan = `SPACE_FEATURE_OFFICE_DOCUMENTS`. All three identifiers share the `office-documents` suffix, matching the existing `*_MEMO_MULTI_USER` / `*_WHITEBOARD_MULTI_USER` naming symmetry.
- Q: Must the bootstrap license-plan JSON be updated alongside the migration? → A: **Yes, required.** The same change set MUST update both the migration and `src/core/bootstrap/platform-template-definitions/license-plan/license-plans.json` so that fresh-bootstrap environments and migrated environments end up with identical license-plan state. No drift between the two paths is permitted.
- Q: Can the `SPACE_FEATURE_OFFICE_DOCUMENTS` plan be assigned to sub-spaces via the License Issuer, or only to L0 Spaces? → A: **L0 Spaces only**, matching the existing behavior for the other space feature-flag plans (`SPACE_FEATURE_MEMO_MULTI_USER`, `SPACE_FEATURE_WHITEBOARD_MULTI_USER`, etc.). The License Issuer already restricts these assignments to root Spaces; the new plan inherits that behavior automatically and requires no new validation logic. No behavior change to the admin area is introduced by this feature.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Platform admin assigns the plan via the License Issuer and sees the entitlement on Space + Collaboration (Priority: P1)

A platform administrator opens the License Issuer in the platform admin area, selects a Space, and assigns the `SPACE_FEATURE_OFFICE_DOCUMENTS` license plan to it — exactly the same flow they use today for the "Multi-user Memo" and "Multi-user Whiteboard" feature-flag plans. They then verify, via the Space's and its Collaboration's entitlements, that `SPACE_FLAG_OFFICE_DOCUMENTS` is now present / enabled. Revoking the plan returns it to not-present / disabled.

**Why this priority**: This is the entire observable value of the feature. Without this end-to-end path working — admin action → credential issued → license policy recalculated → entitlement visible on both Space and Collaboration — there is nothing to hand off to the team that will later implement the office-document capability itself.

**Independent Test**: In the platform admin area, use the License Issuer to assign `SPACE_FEATURE_OFFICE_DOCUMENTS` to a target Space. Query the Space's license entitlements and the contained Collaboration's license entitlements through the standard API. Confirm `SPACE_FLAG_OFFICE_DOCUMENTS` is present and enabled on both. Revoke the plan and confirm it is absent / disabled on both.

**Acceptance Scenarios**:

1. **Given** a Space that has not been assigned the `SPACE_FEATURE_OFFICE_DOCUMENTS` plan, **When** its license entitlements and the entitlements on its contained Collaboration are inspected, **Then** `SPACE_FLAG_OFFICE_DOCUMENTS` is present in the entitlement set but disabled (limit 0).
2. **Given** a platform administrator in the platform admin area, **When** they use the License Issuer to assign the `SPACE_FEATURE_OFFICE_DOCUMENTS` plan to a Space, **Then** the Space immediately holds the `space-feature-office-documents` credential, the license policy is (re)applied, and the Space's license entitlements AND the contained Collaboration's license entitlements report `SPACE_FLAG_OFFICE_DOCUMENTS` as enabled.
3. **Given** a Space that currently has the plan assigned, **When** the administrator revokes it via the License Issuer, **Then** after the next license policy application the Space's and Collaboration's `SPACE_FLAG_OFFICE_DOCUMENTS` entitlement is disabled again.
4. **Given** the plan is assigned to an L0 Space with nested sub-spaces, **When** entitlements are inspected on any sub-space Collaboration, **Then** `SPACE_FLAG_OFFICE_DOCUMENTS` is also enabled there (see FR-003a for cascade rules).

---

### User Story 2 - Seeded license plan available out of the box after migration (Priority: P1)

After upgrading a running environment, the new license plan that carries the new entitlement must exist in the database without any manual data entry, matching how `SPACE_FEATURE_MEMO_MULTI_USER` and `SPACE_FEATURE_WHITEBOARD_MULTI_USER` are seeded today.

**Why this priority**: The feature is unusable if operators have to hand-craft rows in production; a migration is explicitly called out in the user description.

**Independent Test**: Start from a database at the prior schema, run migrations, and confirm the new license plan row exists with the expected name, sort order, credential, and feature-flag type; confirm the new entitlement type is known to the licensing framework.

**Acceptance Scenarios**:

1. **Given** a database at the version immediately prior to this feature, **When** migrations are run, **Then** a new license plan row exists for the new collaboration entitlement, with fields populated consistently with the existing multi-user memo / whiteboard plans.
2. **Given** migrations have been run, **When** a new Space is created, **Then** its Collaboration has the new entitlement listed in its license entitlements (disabled by default, unless the account already holds the credential).
3. **Given** a Space that existed before the migration, **When** the license policy is reapplied to it post-migration, **Then** its Collaboration's entitlement set includes the new entitlement without losing any existing entitlements.

---

### User Story 3 - New entitlement is visible to API consumers and downstream UI (Priority: P2)

Clients (web, admin tooling) that read a Collaboration's license entitlements must be able to discover the new entitlement type and its enabled/disabled state so they can show or hide the gated capability.

**Why this priority**: Enables the front-end to react to the new entitlement; without it the gate exists on the server but nothing changes for users. It is a dependency of the capability actually becoming visible, but the backend gate itself is still the MVP.

**Independent Test**: Query a Collaboration's license entitlements through the public GraphQL surface and confirm the new entitlement type appears in the enum and in the returned entitlement list with the expected value.

**Acceptance Scenarios**:

1. **Given** any Space the caller is authorized to read, **When** its Collaboration's license entitlements are queried, **Then** the new entitlement type is one of the returned items.
2. **Given** the new entitlement is enabled for a given Space, **When** the Collaboration license is queried, **Then** the returned entitlement reports as enabled; otherwise it reports as disabled.

---

### Edge Cases

- A Space that already exists at migration time must not lose any previously granted entitlements; the new entitlement is added alongside the existing ones, defaulted to disabled.
- A Collaboration whose license entitlements have not yet been initialized (legacy or partially-migrated rows) must be handled gracefully by the license policy reset, not crash.
- An account that holds the new credential but whose Space license has not yet been refreshed: behavior must be consistent with how multi-user memo / whiteboard handle this lag today (i.e., takes effect on next license policy application).
- Revoking the credential from an account with many Spaces must disable the entitlement on every affected Collaboration on the next reapplication.
- A Space hierarchy (L0 -> L1 -> L2): child Collaborations must inherit the entitlement from the root (L0) Space's credential evaluation, cascading through each sub-space's Space license and then into each sub-space's Collaboration license, in the same way multi-user memo / whiteboard currently inherit it. Applying the license policy once at the L0 Space MUST update every descendant Collaboration.
- Revoking the credential at the L0 Space's account MUST disable the entitlement on every descendant Collaboration on the next policy application, not just on the L0 Collaboration.
- Templates that produce new Spaces / Collaborations must continue to work without requiring manual updates to also carry the new entitlement, matching the pattern used for the existing multi-user flags.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST define a new entitlement type `SPACE_FLAG_OFFICE_DOCUMENTS` in the Collaboration-scoped entitlement type set, named and typed consistently with the existing `SPACE_FLAG_WHITEBOARD_MULTI_USER` and `SPACE_FLAG_MEMO_MULTI_USER` entitlements.
- **FR-002**: The system MUST define a new **credential-based licensing credential type** `space-feature-office-documents` (added alongside the existing `space-feature-memo-multi-user`, `space-feature-whiteboard-multi-user`, etc.). This credential is what gets assigned to a Space (root / L0 Space's credential holdings) when the entitlement is granted.
- **FR-002a**: The licensing framework MUST include a new **credential rule** that maps the `space-feature-office-documents` credential to the `SPACE_FLAG_OFFICE_DOCUMENTS` entitlement with limit `1`, in the same `licenseCredentialRules` structure that today maps `space-feature-memo-multi-user` → `SPACE_FLAG_MEMO_MULTI_USER`. When the licensing engine is asked whether a given agent (a Space) has the entitlement, it MUST return true iff the agent holds the `space-feature-office-documents` credential.
- **FR-002b**: The new credential rule MUST be installed into the platform's license policy `credentialRules` set via the database migration (not via code-only registration), so that running environments pick it up after migration without requiring a fresh bootstrap.
- **FR-003**: The license policy for a Collaboration MUST recognize the new entitlement type and copy its value from the parent (Space) license when the policy is applied, mirroring how the multi-user memo / whiteboard entitlements are propagated today.
- **FR-003a**: The entitlement MUST cascade top-down, exactly as `SPACE_FLAG_MEMO_MULTI_USER` does today:
    1. The Level-0 (root) Space's credential holdings are evaluated against the licensing engine to set the entitlement on the **root Space license**.
    2. The root Space license is then used as the parent license when applying policy to the root Space's Collaboration, which copies the entitlement value into the Collaboration's license.
    3. For every **sub-space** (L1, L2, ...), the license policy MUST be re-applied using the **Level-0 Space as the agent** (not the sub-space itself), so that the sub-space's Space license, and then its Collaboration's license, receive the entitlement value determined at the L0 level.
    4. As a result, if the root Space's account holds the `space-feature-office-documents` credential, every Collaboration in the entire Space hierarchy (L0 + all descendants) MUST report the entitlement as enabled after a single license-policy application at the root.
- **FR-003b**: The cascade MUST NOT be interrupted by intermediate sub-space credentials: sub-space-level credentials are intentionally ignored for this entitlement, matching the current behavior of `SPACE_FLAG_MEMO_MULTI_USER` where the L0 agent is the sole determinant.
- **FR-004**: The license policy application MUST NOT raise an "unknown entitlement type" error for the new entitlement; all existing entitlement handling paths MUST continue to work unchanged for the other entitlements.
- **FR-005**: A database migration MUST perform exactly the following **platform-scoped** seed operations so that the licensing framework knows about the new entitlement on any environment after running migrations. The migration MUST NOT touch Space-level data, MUST NOT assign any credentials to any Space, and MUST NOT trigger any license-policy reapplication:
    1. **License plan**: Insert a new `license_plan` row named `SPACE_FEATURE_OFFICE_DOCUMENTS`, type `space-feature-flag`, `licenseCredential = 'space-feature-office-documents'`, with the same economic fields (price 0, not auto-assigned to new user / organization accounts, `requiresContactSupport` enabled, trial disabled, enabled = 1) as the existing `SPACE_FEATURE_MEMO_MULTI_USER` plan, and a sort order placing it adjacent to the other feature-flag plans.
    2. **Credential rule in the single platform-wide license policy**: Append a new `CredentialRule` to the platform license policy's `credentialRules` JSONB column, mapping `credentialType = 'space-feature-office-documents'` to `grantedEntitlements = [{ type: 'space-flag-office-documents', limit: 1 }]` with a human-readable name (e.g., `'Space Office Documents'`). This is the single platform-wide rule the licensing engine consults when evaluating `isEntitlementGranted(SPACE_FLAG_OFFICE_DOCUMENTS, agent)`.
    3. **Bootstrap JSON sync (required)**: The bootstrap license-plan JSON definitions consumed at application startup (e.g., `src/core/bootstrap/platform-template-definitions/license-plan/license-plans.json`) MUST be updated in the same change set as the migration to include `SPACE_FEATURE_OFFICE_DOCUMENTS`, so that fresh-bootstrap environments and migrated environments end up with identical license-plan state. No drift between the two paths is permitted.
- **FR-005a**: The migration's enum definitions (the local copies of `LicensingCredentialBasedCredentialType` and `LicenseEntitlementType` embedded in the migration file, following the pattern of the existing seed migration) MUST include the new `SPACE_FEATURE_OFFICE_DOCUMENTS` credential type and `SPACE_FLAG_OFFICE_DOCUMENTS` entitlement type so the migration is self-contained and does not depend on future code changes to the source enums.
- **FR-006**: The migration MUST be idempotent and reversible: the up migration MUST NOT duplicate the license plan or the credential rule if re-run, and the down migration MUST cleanly remove the seeded license plan row and the credential rule entry from `credentialRules` without disturbing the other rules or plans.
- **FR-007**: Newly created Spaces / Collaborations MUST automatically include the new entitlement in their entitlement set, defaulted to disabled, without any manual intervention by operators.
- **FR-008**: Existing Spaces / Collaborations gain the new entitlement (defaulted to disabled) lazily the next time the license policy is applied to them (e.g., on a normal license-policy recalculation, not triggered by this feature). No backfill is performed by the migration; no Space holds the new credential immediately after the migration runs.
- **FR-009**: The new entitlement type MUST be exposed on the public API surface so that clients can read its state on a Collaboration's license.
- **FR-010**: Platform administrators MUST be able to assign and revoke the new license plan on an account via the same administrative flow used today for the multi-user memo / whiteboard plans; no new admin UI concepts are required.
- **FR-011**: The new entitlement MUST gate the Collaboration-level ability to view and edit office documents (word-processing, spreadsheet, presentation, etc.). It MUST be identified as `SPACE_FLAG_OFFICE_DOCUMENTS` in the entitlement type enum, with a matching credential `space-feature-office-documents` and a license plan named `SPACE_FEATURE_OFFICE_DOCUMENTS`, following the same naming convention as the existing multi-user memo / whiteboard flags. The entitlement MUST NOT affect the `Document` domain entity or the existing file-storage subsystem; the name "Documents" here refers to office documents only, not to `Document` entities in the Alkemio domain model.
- **FR-012**: The feature MUST NOT change the behavior, values, or defaults of any existing entitlement (`SPACE_FLAG_SAVE_AS_TEMPLATE`, `SPACE_FLAG_WHITEBOARD_MULTI_USER`, `SPACE_FLAG_MEMO_MULTI_USER`, or any space-level entitlement).
- **FR-013**: This feature MUST NOT implement any gating, UI, authorization, or behavioral change for the OfficeDocuments capability itself. The presence of the `SPACE_FLAG_OFFICE_DOCUMENTS` entitlement is purely observational in this feature — the consumers that read this entitlement and change behavior accordingly will be delivered in a separate, follow-up feature.
- **FR-015**: The design MUST enable per-Space control of the OfficeDocuments capability as its ultimate purpose: once this feature is merged and a follow-up feature wires the capability to the entitlement, it MUST be possible to enable OfficeDocuments on one Space and leave it disabled on another Space in the same environment, with no code or configuration changes — solely through License Issuer actions.
- **FR-014**: The assignment and revocation of the `SPACE_FEATURE_OFFICE_DOCUMENTS` plan MUST be possible through the existing License Issuer flow in the platform admin area, with no new admin UI, form, or endpoint introduced by this feature. If the License Issuer already reads the license plan list dynamically, the new plan MUST appear automatically after the migration runs. The plan MUST only be assignable to L0 (root) Spaces, inheriting the existing License Issuer restriction that applies to the other space feature-flag plans (`SPACE_FEATURE_MEMO_MULTI_USER`, `SPACE_FEATURE_WHITEBOARD_MULTI_USER`, etc.) — no new validation logic is required.

### Key Entities

- **License Entitlement Type (Collaboration-scoped)**: The enum of flags that can appear on a Collaboration's license. A new member `SPACE_FLAG_OFFICE_DOCUMENTS` is added.
- **Licensing Credential Type**: The enum of credential identifiers that can be held by a Space (or account) in the credential-based licensing framework. A new member `space-feature-office-documents` is added.
- **Credential Rule** (on the platform License Policy): A JSON object of the form `{ credentialType, grantedEntitlements: [{ type, limit }], name }` stored in `license_policy.credentialRules` (JSONB). A new rule mapping `space-feature-office-documents` → `[{ type: SPACE_FLAG_OFFICE_DOCUMENTS, limit: 1 }]` is added; this is the rule the licensing engine evaluates against a Space's credential holdings.
- **License Plan**: A row in the platform `license_plan` table that, when assigned administratively, causes the corresponding credential to be granted to the target. A new feature-flag plan named `SPACE_FEATURE_OFFICE_DOCUMENTS` is seeded, pointing at the `space-feature-office-documents` credential.
- **Collaboration**: The existing aggregate under a Space whose license gains the new entitlement; unchanged apart from now recognizing one additional entitlement type.
- **Space License**: The parent license from which Collaboration license entitlements inherit; the new entitlement is added to the set of entitlements it can carry. The value for `SPACE_FLAG_OFFICE_DOCUMENTS` on this license is determined by the licensing engine evaluating the new credential rule against the L0 Space's credentials.

## Assumptions

- The new entitlement follows exactly the same shape as `SPACE_FLAG_MEMO_MULTI_USER` and `SPACE_FLAG_WHITEBOARD_MULTI_USER`: boolean / count-style flag, propagated from parent license to Collaboration license, seeded via a license plan row, surfaced on the public API as an additional enum value.
- Pricing, trial-enabled, and "assign to new accounts" fields for the new license plan mirror the existing multi-user feature-flag plans unless the product owner states otherwise (priced at 0, not auto-assigned to new user / organization accounts, `requiresContactSupport` enabled).
- No changes are required to authorization, role, or credential-type machinery beyond adding the new identifier; the existing licensing framework already handles registration and assignment of such credentials generically.
- No changes to space-level entitlements (`SPACE_FREE` / `SPACE_PLUS` / `SPACE_PREMIUM`) or to account-level entitlements are in scope.
- The downstream code that will actually consume the new entitlement to gate a capability (e.g., hiding a UI control, rejecting a mutation) is out of scope for this feature; this feature delivers the plumbing (type, propagation, seed, API exposure). Enforcement in the gated capability will be a follow-up owned by whichever team owns that capability.
- The migration is seed-only; no existing rows are rewritten or destroyed, matching the approach used for the memo multi-user seed.
- "Documents" throughout this spec means *office documents* (word-processing, spreadsheet, presentation, etc.) that users view and edit inside a Collaboration. It is NOT the `Document` entity in the Alkemio domain model; that entity is unaffected by this feature.

## Dependencies

- Existing license / license-plan framework, including the seed mechanism used by the memo / whiteboard multi-user feature flags.
- Existing Collaboration license propagation path that copies parent entitlements into Collaboration entitlements during license policy application.
- Schema contract process: the new entitlement type will appear in the generated GraphQL schema and must pass the schema-contract review (additive change; not expected to be breaking).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: After running the migration on a pre-migration database snapshot, 100% of the expected rows for the new license plan exist, with field values matching the reference (memo multi-user) plan except for name, credential, and sort order.
- **SC-002**: For any Space whose account is assigned the new license plan, querying the Collaboration's license entitlements returns the new entitlement in the enabled state within a single license-policy application cycle (no manual reseeding or restart required).
- **SC-003**: Revoking the credential from an account causes the new entitlement to report as disabled on every affected Collaboration on the next license-policy application, with no residual "enabled" state.
- **SC-004**: Zero regressions: all existing license-related test suites (Collaboration license service, Space license service, License service) continue to pass, and the existing multi-user memo / whiteboard entitlements still propagate correctly end-to-end.
- **SC-005**: Adding a new Space to an account that holds the credential results in the Collaboration's new entitlement being enabled without any additional operator action.
- **SC-007**: For a Space hierarchy of arbitrary depth (L0 with N descendant sub-spaces), a single license-policy application at the L0 Space results in 100% of descendant Collaborations reporting the entitlement consistently with the L0 account's credential holdings (all enabled if the credential is held, all disabled if not).
- **SC-006**: A platform administrator can assign or revoke the new license plan in the same number of steps as assigning the existing multi-user memo / whiteboard plans (no extra admin workflow introduced).
- **SC-008** (Definition-of-Done check): The three-phase Desired Outcome verification (plan NOT assigned → disabled; plan assigned → enabled on Space + Collaboration + descendants; plan revoked → disabled again) passes end-to-end on a freshly-migrated environment, executed against the real License Issuer admin flow and the real entitlement-query API — not via unit test mocks only.
