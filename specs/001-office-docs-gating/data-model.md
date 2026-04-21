# Data Model: Office Documents Feature Gating

**Feature**: `001-office-docs-gating`  
**Phase**: 1 — Design  
**Date**: 2026-04-21

---

## Entity: OfficeDocument

A new entity representing a collaborative office document owned by a `CalloutContribution`.

### TypeORM Entity Fields

| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `id` | `uuid` | No | PK, inherited from `BaseAlkemioEntity` |
| `createdBy` | `uuid` | Yes | User ID of creator |
| `contentUpdatePolicy` | `ContentUpdatePolicy` enum | No | Same as Memo/Whiteboard |

**Inherits from**: `NameableEntity` (provides `profile`, `authorization`)

### Relations

| Relation | Target | Cardinality | Owner | Notes |
|----------|--------|-------------|-------|-------|
| `contribution` | `CalloutContribution` | OneToOne | No (inverse) | Back-reference to owning contribution; nullable (may also be in framing in future) |

### Storage

- Content is stored via the existing file-storage subsystem (external; not part of this feature).
- No `content` column on the entity — content references are managed externally.

### Table Name

`office_document` (TypeORM snake_case default)

---

## Entity Modification: CalloutContribution

The `CalloutContribution` entity must be extended with a new optional OneToOne relation to `OfficeDocument`:

```typescript
@OneToOne(() => OfficeDocument, {
  eager: false,
  cascade: true,
  onDelete: 'SET NULL',
})
@JoinColumn()
officeDocument?: OfficeDocument;
```

**Column added**: `officeDocumentId uuid NULL` (FK to `office_document.id`)

---

## Enum Extension: LicenseEntitlementType

Add to `src/common/enums/license.entitlement.type.ts`:

```typescript
SPACE_FLAG_OFFICE_DOCUMENTS = 'space-flag-office-documents',
```

**Position**: After `SPACE_FLAG_MEMO_MULTI_USER`

---

## License Seeding Extension: template.content.space.service.ts

The default space collaboration license seed in `template.content.space.service.ts` must include the new entitlement with `enabled: false` (default disabled):

```typescript
{
  type: LicenseEntitlementType.SPACE_FLAG_OFFICE_DOCUMENTS,
  dataType: LicenseEntitlementDataType.FLAG,
  limit: 0,
  enabled: false,
},
```

---

## New Methods: CommunityResolverService

Add the following traversal methods to `src/services/infrastructure/entity-resolver/community.resolver.service.ts`. Confirm each does not already exist before adding.

### `getCollaborationLicenseFromOfficeDocumentOrFail`

```typescript
public async getCollaborationLicenseFromOfficeDocumentOrFail(
  officeDocumentId: string
): Promise<ILicense>
```

**Used by**: `assertEntitlementOrFail` (UPDATE/DELETE paths), `isEntitlementEnabled` (field resolver)

**Traversal path**:
```typescript
Collaboration.calloutsSet.callouts.contributions.officeDocument.id = officeDocumentId
```

**Relations loaded**: `{ license: { entitlements: true } }`

**On not found**: Throws `EntityNotFoundException` with `LogContext.COLLABORATION`

---

### `getCollaborationLicenseFromCalloutOrFail`

```typescript
public async getCollaborationLicenseFromCalloutOrFail(
  calloutId: string
): Promise<ILicense>
```

**Used by**: `createOfficeDocument` (CREATE path — document does not yet exist at entitlement-check time)

**Traversal path**:
```typescript
Collaboration.calloutsSet.callouts.id = calloutId
```

**Relations loaded**: `{ license: { entitlements: true } }`

**On not found**: Throws `EntityNotFoundException` with `LogContext.COLLABORATION`

---

## New Service: OfficeDocumentService

Path: `src/domain/common/office-document/office.document.service.ts`

### Key Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `isEntitlementEnabled` | `(officeDocumentId: string): Promise<boolean>` | Returns true if Collaboration license has `SPACE_FLAG_OFFICE_DOCUMENTS` enabled |
| `assertEntitlementOrFail` | `(officeDocumentId: string): Promise<void>` | **UPDATE / DELETE path only** (document already exists). Throws `LicenseEntitlementNotAvailableException` + emits `warn` log on rejection; emits `debug` log on success. |
| `getOfficeDocumentOrFail` | `(id: string, options?): Promise<IOfficeDocument>` | Standard entity fetch |
| `createOfficeDocument` | `(input: CreateOfficeDocumentInput): Promise<IOfficeDocument>` | **CREATE path**: resolves Collaboration license via `getCollaborationLicenseFromCalloutOrFail(input.calloutID)` (document does not yet exist at check time); same log/throw pattern as `assertEntitlementOrFail` |
| `updateOfficeDocument` | `(id: string, input: UpdateOfficeDocumentInput): Promise<IOfficeDocument>` | Enforces entitlement before update |
| `deleteOfficeDocument` | `(id: string): Promise<IOfficeDocument>` | Enforces entitlement before deletion |

### Entitlement Check Flow

**CREATE path** (`createOfficeDocument` — document does not yet exist):

```
1. Resolve Collaboration license via CommunityResolverService.getCollaborationLicenseFromCalloutOrFail(input.calloutID)
2. Call LicenseService.isEntitlementEnabled(license, SPACE_FLAG_OFFICE_DOCUMENTS)
3. If false:
   a. Log warn: { message: 'Office document write rejected: entitlement not available', collaborationId } at LogContext.LICENSE
   b. Throw LicenseEntitlementNotAvailableException with details: { collaborationId }
4. If true:
   a. Log debug: { message: 'Entitlement check passed', collaborationId } at LogContext.LICENSE
5. Proceed with creation
```

**UPDATE / DELETE path** (`assertEntitlementOrFail` — document already exists):

```
1. Resolve Collaboration license via CommunityResolverService.getCollaborationLicenseFromOfficeDocumentOrFail(officeDocumentId)
2. Call LicenseService.isEntitlementEnabled(license, SPACE_FLAG_OFFICE_DOCUMENTS)
3. If false:
   a. Log warn: { message: 'Office document write rejected: entitlement not available', collaborationId } at LogContext.LICENSE
   b. Throw LicenseEntitlementNotAvailableException with details: { collaborationId }
4. If true:
   a. Log debug: { message: 'Entitlement check passed', collaborationId } at LogContext.LICENSE
5. Proceed with operation
```

**READ / FIELD RESOLVER path** (`isEntitlementEnabled` — returns boolean, no exception):

```
1. Resolve Collaboration license via CommunityResolverService.getCollaborationLicenseFromOfficeDocumentOrFail(officeDocumentId)
2. Call LicenseService.isEntitlementEnabled(license, SPACE_FLAG_OFFICE_DOCUMENTS)
3. Log debug: { message: 'Entitlement check (read)', collaborationId, result } at LogContext.LICENSE
4. Return boolean result
```

---

## New Service: OfficeDocumentIntegrationService

Path: `src/services/office-document-integration/office.document.integration.service.ts`

### Key Method: `info`

```typescript
public async info({ userId, documentId }: InfoInputData): Promise<InfoOutputData>
```

**Returns**:
- If no READ access: `{ read: false, update: false, isMultiUser: false, maxCollaborators: 0 }`
- If READ access + no entitlement: `{ read: true, update: false, isMultiUser: false, maxCollaborators: 1 }`
- If READ access + entitlement enabled: `{ read: true, update: <auth result>, isMultiUser: true, maxCollaborators: N }`

**Config key**: `collaboration.office_documents.max_collaborators_in_room` (default: 20)

---

## GraphQL Schema Changes

### New Type: OfficeDocument

```graphql
type OfficeDocument implements Nameable & Authorizable {
  id: UUID!
  nameID: NameID!
  authorization: Authorization
  profile: Profile!
  createdBy: UUID
  isEntitlementEnabled: Boolean!
}
```

### Modified Type: CalloutContribution

```graphql
type CalloutContribution {
  # ... existing fields ...
  officeDocument: OfficeDocument
}
```

### New Mutations

```graphql
type Mutation {
  createOfficeDocument(officeDocumentData: CreateOfficeDocumentOnContributionInput!): OfficeDocument!
  updateOfficeDocument(officeDocumentData: UpdateOfficeDocumentInput!): OfficeDocument!
  deleteOfficeDocument(officeDocumentData: DeleteOfficeDocumentInput!): OfficeDocument!
}
```

---

## Migration Plan

### Migration 1: Create `office_document` table

```sql
CREATE TABLE office_document (
  id          VARCHAR(36)   NOT NULL PRIMARY KEY,
  createdBy   VARCHAR(36)   NULL,
  nameID      VARCHAR(255)  NOT NULL,
  contentUpdatePolicy VARCHAR(128) NOT NULL DEFAULT 'author',
  -- authorization FK from NameableEntity
  authorizationId VARCHAR(36) NULL
);
```

### Migration 2: Add FK to `callout_contribution`

```sql
ALTER TABLE callout_contribution
  ADD COLUMN officeDocumentId VARCHAR(36) NULL,
  ADD CONSTRAINT FK_callout_contribution_office_document
    FOREIGN KEY (officeDocumentId) REFERENCES office_document(id)
    ON DELETE SET NULL;
```

### Migration 3: Licensing seed handling

No database migration should be added to seed `SPACE_FLAG_OFFICE_DOCUMENTS`.
Entitlement seeding for `space-flag-office-documents` is handled by the existing TypeScript/template seed logic used for Collaboration licenses, with `enabled = false` and `limit = 0`.
This plan only covers the schema changes above and should not introduce SQL insert migration steps for licensing data.

---

## Module Structure

```text
src/domain/common/office-document/
├── dto/
│   ├── office.document.dto.create.ts
│   ├── office.document.dto.delete.ts
│   └── office.document.dto.update.ts
├── office.document.entity.ts
├── office.document.interface.ts
├── office.document.module.ts
├── office.document.resolver.fields.ts      # isEntitlementEnabled field resolver
├── office.document.resolver.mutations.ts   # create, update, delete
├── office.document.resolver.ts             # base resolver (ObjectType registration)
├── office.document.service.authorization.ts
└── office.document.service.ts

src/services/office-document-integration/
├── inputs/
│   └── (reuse InfoInputData, FetchInputData pattern)
├── outputs/
│   └── (reuse InfoOutputData pattern)
├── office.document.integration.controller.ts
├── office.document.integration.module.ts
├── office.document.integration.service.ts
└── index.ts
```

---

## State Transitions

| State | Condition | Read | Update | maxCollaborators |
|-------|-----------|------|--------|-----------------|
| No READ access | Auth denied | false | false | 0 |
| READ only (unlicensed) | Entitlement disabled | true | false | 1 |
| Full access (licensed, no UPDATE_CONTENT) | Entitlement enabled, auth read-only | true | false | N (20) |
| Full access (licensed, with UPDATE_CONTENT) | Entitlement enabled, auth write | true | true | N (20) |

---

## Invariants

1. An OfficeDocument cannot be created in a Collaboration without `SPACE_FLAG_OFFICE_DOCUMENTS` enabled.
2. An OfficeDocument's metadata cannot be updated in a Collaboration without the entitlement.
3. An OfficeDocument cannot be deleted from a Collaboration without the entitlement.
4. Read queries always succeed regardless of entitlement state.
5. `isEntitlementEnabled` reflects the Collaboration-level entitlement, not a role-based bypass.
6. Admin roles receive no special bypass from the entitlement gate.
7. If the traversal path from OfficeDocument to Collaboration is broken (orphaned data), an `EntityNotFoundException` is raised rather than defaulting to false.
