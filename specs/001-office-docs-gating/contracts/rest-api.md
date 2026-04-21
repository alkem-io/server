# REST API Contract: Office Document Integration Service

**Feature**: `001-office-docs-gating`  
**Service**: `OfficeDocumentIntegrationService`  
**Date**: 2026-04-21

This service provides a REST API consumed by the collaborative editor backend (ONLYOFFICE / similar), following the exact same pattern as `CollaborativeDocumentIntegrationService` (for memos) and `WhiteboardIntegrationService`.

---

## Endpoint: GET /rest/office-document/info

Returns the current access rights and configuration for a document editing session.

### Request

```
GET /rest/office-document/info?documentId=<uuid>&userId=<uuid>
Authorization: Bearer <token>
```

### Response: 200 OK

```json
{
  "read": true,
  "update": false,
  "isMultiUser": false,
  "maxCollaborators": 1
}
```

### Response fields

| Field | Type | Description |
|-------|------|-------------|
| `read` | boolean | User has READ privilege on the document |
| `update` | boolean | User has UPDATE_CONTENT privilege on the document |
| `isMultiUser` | boolean | Whether the Collaboration has SPACE_FLAG_OFFICE_DOCUMENTS enabled |
| `maxCollaborators` | number | Max concurrent collaborators: 0 (no read), 1 (unlicensed), N (licensed, default 20) |

### Scenarios

| Condition | `read` | `update` | `isMultiUser` | `maxCollaborators` |
|-----------|--------|----------|---------------|-------------------|
| No READ access | false | false | false | 0 |
| READ access, unlicensed | true | false | false | 1 |
| READ access, licensed, no UPDATE_CONTENT | true | false | true | 20 |
| READ access, licensed, with UPDATE_CONTENT | true | true | true | 20 |

---

## Endpoint: GET /rest/office-document/fetch

Fetches binary document content for the collaborative editor.

### Request

```
GET /rest/office-document/fetch?documentId=<uuid>
```

### Response: 200 OK

```json
{
  "content": "<base64-encoded-binary-or-null>"
}
```

---

## Endpoint: POST /rest/office-document/save

Saves updated binary document content from the collaborative editor.

### Request

```
POST /rest/office-document/save
Content-Type: application/json

{
  "documentId": "<uuid>",
  "binaryStateInBase64": "<base64-binary>"
}
```

### Response: 200 OK

```json
{}
```

---

## Endpoint: GET /rest/office-document/who

Resolves the actor ID from a JWT token.

### Request

```
GET /rest/office-document/who
Authorization: Bearer <token>
```

### Response: 200 OK

```json
{
  "actorId": "<uuid>"
}
```

---

## Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `LICENSE_ENTITLEMENT_NOT_AVAILABLE` | 403 | Write operation rejected; SPACE_FLAG_OFFICE_DOCUMENTS not enabled |
| `ENTITY_NOT_FOUND` | 404 | OfficeDocument with given ID not found |
| `NOT_AUTHENTICATED` | 401 | Missing or invalid auth token |
| `FORBIDDEN` | 403 | Insufficient privileges |
