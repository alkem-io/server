# Data Model: Office Documents Entitlement

**Feature**: 083-collab-entitlement

No new tables, columns, indexes, or constraints are introduced. This feature only adds values to existing enums and inserts/updates rows in existing tables. Below is the complete set of data-level changes.

## 1. Enum additions

### `LicenseEntitlementType` (in `src/common/enums/license.entitlement.type.ts`)

New member:

```ts
SPACE_FLAG_OFFICE_DOCUMENTS = 'space-flag-office-documents'
```

Placement: inserted after `SPACE_FLAG_MEMO_MULTI_USER` to keep feature-flag members grouped.

Scope: this enum is exposed in GraphQL (`registerEnumType`). The addition is an **additive** schema change — no deprecation or breaking note required.

### `LicensingCredentialBasedCredentialType` (in `src/common/enums/licensing.credential.based.credential.type.ts`)

New member:

```ts
SPACE_FEATURE_OFFICE_DOCUMENTS = 'space-feature-office-documents'
```

Placement: inserted after `SPACE_FEATURE_MEMO_MULTI_USER`. Also exposed in GraphQL via `registerEnumType` — additive.

## 2. New `CredentialRule` entry (in platform license policy)

Appended to `license_policy.credentialRules` (jsonb array column). The object shape matches the existing entries in the same column:

```ts
{
  id: '<uuid generated at migration time>',
  credentialType: 'space-feature-office-documents',
  grantedEntitlements: [
    { type: 'space-flag-office-documents', limit: 1 }
  ],
  name: 'Space Office Documents'
}
```

**Semantics**: When the licensing engine is asked `isEntitlementGranted(SPACE_FLAG_OFFICE_DOCUMENTS, agent)`, it scans `credentialRules`, finds this entry, checks whether the agent holds a credential of type `space-feature-office-documents`, and if so grants the entitlement with limit 1.

## 3. New `license_plan` row

Inserted into the existing `license_plan` table with these field values (mirroring `SPACE_FEATURE_MEMO_MULTI_USER`):

| Column | Value |
|--------|-------|
| `id` | generated UUID |
| `name` | `SPACE_FEATURE_OFFICE_DOCUMENTS` |
| `enabled` | `true` (stored as `'1'` in bootstrap JSON) |
| `sortOrder` | `100` |
| `pricePerMonth` | `0.00` |
| `isFree` | `true` |
| `trialEnabled` | `false` |
| `requiresPaymentMethod` | `false` |
| `requiresContactSupport` | `true` |
| `licenseCredential` | `'space-feature-office-documents'` |
| `assignToNewOrganizationAccounts` | `false` |
| `assignToNewUserAccounts` | `false` |
| `type` | `'space-feature-flag'` |
| `licensingFrameworkId` | the single existing licensing framework row's id (looked up in the migration) |

The bootstrap JSON entry uses the `"1"` / `"0"` string form to match the rest of the file.

## 4. Initialization values on license creation

These are in-memory values written when a Space or Collaboration is created; they are persisted via TypeORM cascade on the containing license's `entitlements` relation.

### Collaboration license init (`collaboration.service.ts`)

Added entry in the default entitlements array passed to `licenseService.createLicense`:

```ts
{
  type: LicenseEntitlementType.SPACE_FLAG_OFFICE_DOCUMENTS,
  dataType: LicenseEntitlementDataType.FLAG,
  limit: 0,
  enabled: false,
}
```

### Space license init (`space.service.ts`)

Added entry in the default entitlements array:

```ts
{
  type: LicenseEntitlementType.SPACE_FLAG_OFFICE_DOCUMENTS,
  dataType: LicenseEntitlementDataType.FLAG,
  limit: 0,
  enabled: true,
}
```

Note: `enabled: true` here matches the `SPACE_FLAG_MEMO_MULTI_USER` precedent at this call site. The gating decision is made by `limit > 0`, which starts at `0` and is raised to `1` only when the credential rule fires.

### Template content space init (`template.content.space.service.ts`)

Added entry, same shape as Space init (`enabled: true, limit: 0`).

## 5. State transitions

The entitlement moves through the following states on a single Space:

```text
(Space created)
   ↓
{ enabled: false/true (init default), limit: 0 }  ← disabled in practice
   ↓ admin assigns SPACE_FEATURE_OFFICE_DOCUMENTS plan via License Issuer
   ↓ (Space now holds the `space-feature-office-documents` credential)
   ↓ license policy applied
   ↓
{ enabled: true, limit: 1 }  ← enabled; credential rule has granted it
   ↓ admin revokes the plan
   ↓ license policy applied
   ↓
{ enabled: false/true (per reset default), limit: 0 }  ← disabled again
```

Cascade: the Collaboration's license entitlement mirrors the Space license entitlement (via `findAndCopyParentEntitlement`), and every descendant sub-space's Space + Collaboration licenses follow the same cascade driven by the **L0** agent (see FR-003a in the spec).

## 6. Uniqueness, invariants, data volume

- **Invariant**: Exactly one `CredentialRule` entry with `credentialType = 'space-feature-office-documents'` MUST exist in `license_policy.credentialRules` after migration. The migration's idempotency guard enforces this.
- **Invariant**: Exactly one `license_plan` row with `name = 'SPACE_FEATURE_OFFICE_DOCUMENTS'` MUST exist after migration.
- **Data volume**: trivial — one jsonb array element (~200 bytes) and one row (~200 bytes). No migration performance concern.
- **No foreign-key changes**, no new indexes, no new constraints.
