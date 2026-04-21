# Quickstart: Office Documents Feature Gating Implementation

**Feature**: `001-office-docs-gating`  
**Branch**: `001-office-docs-gating`  
**Date**: 2026-04-21

This guide helps implementors get the local dev environment ready to work on and test this feature.

---

## Prerequisites

- Node.js 22 LTS (Volta-pinned at 22.21.1)
- pnpm 10.17.1 (`corepack enable && corepack prepare pnpm@10.17.1 --activate`)
- Docker + Docker Compose
- PostgreSQL 17.5 (via Docker)

---

## 1. Clone & Install

```bash
git checkout 001-office-docs-gating
pnpm install
```

---

## 2. Start Dependencies

```bash
pnpm run start:services
```

This starts PostgreSQL, RabbitMQ, Redis, and the Ory Kratos/Oathkeeper auth stack via Docker Compose.

---

## 3. Run Migrations

After adding the new `OfficeDocument` entity and modifying `CalloutContribution`, generate and run the migration:

```bash
# Generate migration (requires .env with DB connection variables)
pnpm run migration:generate -n AddOfficeDocumentEntity

# Apply migration
pnpm run migration:run
```

---

## 4. Start the Server

```bash
pnpm start:dev
```

GraphiQL available at: `http://localhost:3000/graphiql`

---

## 5. Seed a Test Entitlement

To test the licensed path, update a Collaboration's license entitlement directly in the database:

```sql
-- Find the collaboration license entitlement for the test space
SELECT le.id, le.type, le.enabled
FROM license_entitlement le
JOIN license l ON le.licenseId = l.id
WHERE le.type = 'space-flag-office-documents';

-- Enable the entitlement for a specific license
UPDATE license_entitlement
SET enabled = true
WHERE type = 'space-flag-office-documents'
AND licenseId = '<your-license-id>';
```

---

## 6. Test Key Scenarios

### Unlicensed Read (US1)

```graphql
query {
  collaboration(ID: "<collaboration-id>") {
    calloutsSet {
      callouts {
        contributions {
          officeDocument {
            id
            isEntitlementEnabled
          }
        }
      }
    }
  }
}
```

Expected: `isEntitlementEnabled: false`, documents returned without error.

### Create (Licensed — US2)

```graphql
mutation {
  createOfficeDocument(officeDocumentData: {
    calloutID: "<callout-id>"
    profileData: { displayName: "Q1 Report" }
  }) {
    id
    isEntitlementEnabled
  }
}
```

Expected (licensed): document created.  
Expected (unlicensed): `LICENSE_ENTITLEMENT_NOT_AVAILABLE` error.

### Create (Unlicensed — US3)

Same mutation on a Collaboration with `enabled = false`:  
Expected: `LICENSE_ENTITLEMENT_NOT_AVAILABLE` error returned, no document persisted.

### Info Endpoint (Integration Service)

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/rest/office-document/info?documentId=<uuid>&userId=<uuid>"
```

Expected (licensed): `{ "read": true, "update": true, "isMultiUser": true, "maxCollaborators": 20 }`  
Expected (unlicensed): `{ "read": true, "update": false, "isMultiUser": false, "maxCollaborators": 1 }`

---

## 7. Run Tests

```bash
# All unit/CI tests (no services needed)
pnpm test:ci:no:coverage

# Specific domain tests
pnpm test -- office-document

# With coverage
pnpm test:ci
```

---

## 8. Lint & Type-Check

```bash
pnpm lint
```

Ensure no TypeScript errors before opening a PR.

---

## 9. Schema Diff

After adding GraphQL types and resolvers:

```bash
pnpm run schema:print
pnpm run schema:sort
# Compare to baseline (fetch develop's schema-baseline.graphql first):
cp schema-baseline.graphql tmp/prev.schema.graphql
pnpm run schema:diff
cat change-report.json
```

Expected: additive changes only (`OfficeDocument` type, new mutations, `isEntitlementEnabled` field, `officeDocument` on `CalloutContribution`). No breaking changes.

---

## Key File Locations

| File | Purpose |
|------|---------|
| `src/common/enums/license.entitlement.type.ts` | Add `SPACE_FLAG_OFFICE_DOCUMENTS` enum value |
| `src/domain/common/office-document/` | New OfficeDocument domain module |
| `src/services/office-document-integration/` | New REST integration service |
| `src/services/infrastructure/entity-resolver/community.resolver.service.ts` | Add `getCollaborationLicenseFromOfficeDocumentOrFail` |
| `src/domain/template/template-content-space/template.content.space.service.ts` | Add entitlement seed entry |
| `src/domain/collaboration/callout-contribution/callout.contribution.entity.ts` | Add `officeDocument` relation |
| `alkemio.yml` | Add `collaboration.office_documents.max_collaborators_in_room` |
| `src/types/alkemio.config.ts` (or equivalent) | Add config type for new key |
| `src/migrations/` | New migration files |

---

## Stopping Services

```bash
docker compose -f quickstart-services.yml down
```
