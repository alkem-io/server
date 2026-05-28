# Quickstart — Verifying the Office Docs Gate Locally

This recipe walks through reproducing both the blocked and allowed paths in a local dev environment, and confirms the log-level and error-message contract.

## Prerequisites

```bash
pnpm install
pnpm run start:services        # Postgres, Kratos, Oathkeeper, RabbitMQ, Redis
pnpm run migration:run
pnpm start:dev
```

GraphQL Playground: <http://localhost:3000/graphiql>

You also need a registered user with appropriate privileges; if you don't have one, use the project's `register-user` skill or your usual test fixture.

## 1. Identify or prepare two Collaborations

You need:

- **Collab A**: a Collaboration whose License has `SPACE_FLAG_OFFICE_DOCUMENTS` entitlement `enabled = true`.
- **Collab B**: a Collaboration whose License has `SPACE_FLAG_OFFICE_DOCUMENTS` entitlement `enabled = false`.

Quickest way: query the Collaboration's License via GraphQL and use the existing platform-admin entitlement-update mutations (or directly toggle `license_entitlement.enabled` in PostgreSQL for a local-only smoke test — production would route through the licensing service).

```graphql
query CheckEntitlement($collaborationId: UUID!) {
  lookup {
    collaboration(ID: $collaborationId) {
      id
      license {
        id
        entitlements {
          type
          enabled
        }
      }
    }
  }
}
```

Look for the `space-flag-office-documents` entry in `entitlements`.

## 2. Verify blocked introduction (User Story 1)

### 2a. `createCalloutOnCalloutsSet` (framing form)

```graphql
mutation CreateCollaboraCallout($input: CreateCalloutOnCalloutsSetInput!) {
  createCalloutOnCalloutsSet(calloutData: $input) {
    id
    nameID
  }
}
```

Variables (target Collab B's `calloutsSet`):

```json
{
  "input": {
    "calloutsSetID": "<calloutsSetID for Collab B>",
    "framing": {
      "type": "COLLABORA_DOCUMENT",
      "profile": { "displayName": "Test gating", "description": "..." }
    },
    "settings": {
      "contribution": { "enabled": false, "allowedTypes": [] }
    }
  }
}
```

**Expected**: GraphQL error with code `LICENSE_ENTITLEMENT_NOT_AVAILABLE` and message `"Office Docs is not enabled for this Collaboration."`. No row inserted.

In server logs (Winston):

```text
[warn] LICENSE office-docs-entitlement-absent { collaborationId: "<id>" }
```

### 2b. `createContributionOnCallout` (contribution form)

In Collab B, find a Callout that allows Collabora Document contributions (you may need to create one first in Collab A and move it for testing — or set up the fixture differently). Then:

```graphql
mutation CreateContribution($input: CreateContributionOnCalloutInput!) {
  createContributionOnCallout(contributionData: $input) {
    id
  }
}
```

```json
{
  "input": {
    "calloutID": "<calloutID in Collab B>",
    "type": "COLLABORA_DOCUMENT",
    "collaboraDocument": { "profile": { "displayName": "test" } }
  }
}
```

**Expected**: same error contract.

### 2c. `moveContributionToCallout` (target governs)

Move a Collabora Document contribution from Collab A (entitled, source) into a Callout in Collab B (unentitled, target):

```graphql
mutation Move($input: MoveCalloutContributionInput!) {
  moveContributionToCallout(moveContributionData: $input) {
    id
  }
}
```

**Expected**: rejected. The source's entitled status does not exempt the move.

### 2d. `updateCollaborationFromSpaceTemplate` (atomic reject)

Apply a Space Template containing at least one Collabora Document callout into Collab B:

```graphql
mutation ApplyTemplate($input: UpdateCollaborationFromSpaceTemplateInput!) {
  updateCollaborationFromSpaceTemplate(updateData: $input) {
    id
  }
}
```

**Expected**: the entire apply fails with the same error. Verify in the database that **no** callouts from the template were inserted into Collab B.

## 3. Verify allowed introduction (User Story 2)

Repeat steps 2a–2d against Collab A (entitled). Each operation should succeed and persist.

## 4. Verify fail-closed behavior (FR-008)

In a controlled local environment, simulate an unloadable license (e.g., toggle the License row's `entitlements` to `NULL` directly — local test only):

**Expected**: GraphQL error code `LICENSE_ENTITLEMENT_UNEVALUABLE`, **same** user-facing message, and:

```text
[error] LICENSE office-docs-entitlement-unevaluable { collaborationId: "<id>" }
```

## 5. Verify the gate is silent on non-Collabora introductions (SC-003)

Create a `POST` callout, a `WHITEBOARD` callout, and a `LINK` callout in Collab B (unentitled). All should succeed normally. There should be no warn/error log entries from the office-docs gate.

## 6. Verify performance (SC-004)

The check is a single in-memory boolean read after license loading. APM traces from `@InstrumentResolver` should show the `createCalloutOnCalloutsSet` resolver completing well under 5 ms of entitlement-related overhead.

```bash
# In another terminal, watch APM-style logs
pnpm start:dev | grep -i "office-docs\|isEntitlementEnabled"
```

## Acceptance check matrix

| Acceptance scenario | Step |
| --- | --- |
| US1.1 blocked-create framing | 2a |
| US1.4 blocked-move into unentitled | 2c |
| US1.5 blocked atomic template-apply | 2d |
| US1.6 blocked-create contribution | 2b |
| US2.1 allowed-create framing | 3 (against Collab A) |
| US2.3 allowed-move into entitled | 3 |
| US2.4 allowed template-apply | 3 |
| US2.5 allowed-create contribution | 3 |
| FR-008 fail-closed | 4 |
| SC-003 non-Collabora unaffected | 5 |
