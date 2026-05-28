# Data Model: Collabora Document Integration

**Branch**: `086-collabora-integration` | **Date**: 2026-04-14

## New Entity: CollaboraDocument

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID (PK) | NOT NULL | Primary key |
| documentType | enum | NOT NULL | SPREADSHEET, PRESENTATION, WORDPROCESSING |
| createdDate | timestamp | NOT NULL | Creation timestamp |
| updatedDate | timestamp | NOT NULL | Last update timestamp |

### Relations

| Relation | Type | Target | Cascade | Description |
|----------|------|--------|---------|-------------|
| profile | OneToOne | Profile | cascade | Title, description (existing pattern for named entities) |
| document | ManyToOne | Document | - | Reference to file in file-service-go (read-only from server) |
| authorization | OneToOne | AuthorizationPolicy | cascade | Access control |

## Extended Entity: CalloutContribution

| New Column/Relation | Type | Description |
|---------------------|------|-------------|
| collaboraDocument | OneToOne (optional) | Reference to CollaboraDocument. Populated when contribution type is COLLABORA_DOCUMENT. |

## New Enum Value: CalloutContributionType

Add `COLLABORA_DOCUMENT = 'collabora_document'` to existing enum.

## Entity Hierarchy

```text
Space
  └── Collaboration
        └── CalloutsSet
              └── Callout (any type that allows COLLABORA_DOCUMENT contributions)
                    └── CalloutContribution (type: COLLABORA_DOCUMENT)
                          └── CollaboraDocument
                                ├── Profile (title, description)
                                └── Document (file in file-service-go)
```

## Document Type Enum

| Value | MIME Type | Template File |
|-------|-----------|---------------|
| SPREADSHEET | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | empty.xlsx |
| PRESENTATION | application/vnd.openxmlformats-officedocument.presentationml.presentation | empty.pptx |
| WORDPROCESSING | application/vnd.openxmlformats-officedocument.wordprocessingml.document | empty.docx |
| DRAWING | application/vnd.oasis.opendocument.graphics | empty.odg |

## Migration Required

- Create `collabora_document` table with columns above
- Add `collaboraDocumentId` FK column to `callout_contribution` table
- Add `COLLABORA_DOCUMENT` to `callout_contribution_type_enum` (if using DB enum)
