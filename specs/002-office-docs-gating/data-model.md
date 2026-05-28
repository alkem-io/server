# Phase 1 Data Model — Callout Introduction Gating for Collabora Document

## Schema impact

**None.** This feature is a behavior change; no DDL, no migration, no entity-shape changes. `pnpm run schema:diff` should report zero diff after implementation (no GraphQL schema additions either).

## Entities the gate traverses

The gate is a read path across existing entities. Field references below are descriptive — they point to the parts of each entity the gate consumes.

### `Collaboration` (`src/domain/collaboration/collaboration/collaboration.entity.ts`)

- Owns the `License` that the gate evaluates. Existing relation:
  - `license?: License` — `@OneToOne` to `License` (nullable; gate fail-closes if null per FR-008).
  - `calloutsSet?: CalloutsSet` — `@OneToOne` to `CalloutsSet`. Gate uses this in reverse (resolve Collaboration from a CalloutsSet ID).
- No fields added or modified.

### `License` (`src/domain/common/license/license.entity.ts`)

- `entitlements: LicenseEntitlement[]` — eagerly loaded by `CollaborationLicenseService.applyLicensePolicy` today; the gate loads them at runtime through the same path.
- No fields added or modified.

### `LicenseEntitlement`

- `type: LicenseEntitlementType` — must include `SPACE_FLAG_OFFICE_DOCUMENTS` (already present in the enum at `src/common/enums/license.entitlement.type.ts:17`).
- `enabled: boolean` — the value the gate reads.
- No fields added or modified.

### `Callout` (`src/domain/collaboration/callout/callout.entity.ts`)

- `framing.type: CalloutFramingType` — gated when value is `COLLABORA_DOCUMENT`.
- `settings.contribution.allowedTypes: CalloutContributionType[]` — gated when value includes `COLLABORA_DOCUMENT` (prevents a non-Collabora-framed callout from being created as a "shell" that allows Collabora contributions).
- `calloutsSet: CalloutsSet` — used for reverse Collaboration resolution.
- No fields added or modified.

### `CalloutContribution` (`src/domain/collaboration/callout-contribution/callout.contribution.entity.ts`)

- `type: CalloutContributionType` — gated when value is `COLLABORA_DOCUMENT`.
- `callout: Callout` — used for reverse Collaboration resolution on move.
- No fields added or modified.

### `CalloutsSet`

- `type: CalloutsSetType` — `COLLABORATION` indicates the set is owned by a Collaboration; gate is only meaningful for that case (templates and other contexts also use `CalloutsSet` but template content is gated separately at template-apply time).

### Enums (existing — no changes)

- `LicenseEntitlementType.SPACE_FLAG_OFFICE_DOCUMENTS` (`'space-flag-office-documents'`)
- `CalloutFramingType.COLLABORA_DOCUMENT` (`'collabora_document'`)
- `CalloutContributionType.COLLABORA_DOCUMENT` (`'collabora_document'`)

## State transitions

None. The gate is a read-only check at the entry of selected mutations; it does not introduce, modify, or delete any state.

## Relationships used by the gate

```text
mutation input
   │
   ├── createCalloutOnCalloutsSet:        calloutsSetID ──► CalloutsSet ──► Collaboration ──► License ──► entitlements
   │
   ├── createContributionOnCallout:       calloutID ──► Callout ──► CalloutsSet ──► Collaboration ──► License ──► entitlements
   │
   ├── moveContributionToCallout:         targetCalloutID ──► Callout ──► CalloutsSet ──► Collaboration ──► License ──► entitlements
   │                                                                       (target only — FR-006)
   │
   └── updateCollaborationFromSpaceTemplate:
                                          targetCollaborationID ──► Collaboration ──► License ──► entitlements
```

## Validation rules introduced by this feature

| Rule | Source |
| --- | --- |
| If `Collaboration.license` or `License.entitlements` cannot be loaded, raise `LicenseEntitlementUnevaluableException` (fail-closed). | FR-008 |
| If the `SPACE_FLAG_OFFICE_DOCUMENTS` entitlement is `enabled === false`, raise `LicenseEntitlementNotAvailableException` for any Collabora Document introduction. | FR-001, FR-002, FR-004 |
| For move operations, the target Collaboration's license is the sole governing license; source state is ignored. | FR-006 |
| For multi-callout introductions, atomic-fail before any persistence. | FR-005 |

No invariants are added to entities themselves; all checks live in the gate path.
