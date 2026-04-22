# File Service Go API Contract (Server Integration)

**Branch**: `085-file-service-migration` | **Date**: 2026-04-08

## Internal Endpoints Used by Server

These are the Go file-service-go endpoints that the server's FileServiceAdapter calls.

### POST /internal/file -- Create Document

**Content-Type**: `multipart/form-data`

**Form Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | binary | Yes | File content (max 32MB) |
| `displayName` | string | Yes | Original filename |
| `storageBucketId` | UUID | Yes | FK to storage_bucket (server provides) |
| `authorizationId` | UUID | Yes | FK to authorization_policy (server pre-creates) |
| `tagsetId` | UUID | No | FK to tagset (server pre-creates) |
| `createdBy` | UUID | No | Actor ID of uploader |
| `temporaryLocation` | string | No | "true" or "false" (default: "false") |
| `allowedMimeTypes` | string | No | Comma-separated MIME list from bucket config |
| `maxFileSize` | string | No | Max bytes from bucket config |

**Response (201)**:
```json
{
  "id": "UUID (v7)",
  "externalID": "SHA3-256 hash",
  "mimeType": "image/jpeg",
  "size": 12345
}
```

**Error Responses**: 400 (bad request), 413 (too large), 415 (MIME rejected), 500 (internal)

---

### GET /internal/file/{id}/meta -- Document Metadata

**Response (200)**:
```json
{
  "id": "UUID",
  "externalID": "hash",
  "mimeType": "image/jpeg",
  "size": 12345,
  "displayName": "photo.jpg",
  "createdBy": "UUID or null",
  "temporaryLocation": false,
  "storageBucketId": "UUID",
  "authorizationId": "UUID",
  "tagsetId": "UUID or null",
  "createdDate": "2026-04-08T...",
  "updatedDate": "2026-04-08T..."
}
```

**Error Responses**: 404 (not found), 500 (internal)

---

### GET /internal/file/{id}/content -- File Content

**Response (200)**: Binary file content with `Content-Type` header

**Error Responses**: 404 (not found), 500 (internal)

---

### PATCH /internal/file/{id} -- Update Document

**Content-Type**: `application/json`

**Request Body** (all fields optional):
```json
{
  "storageBucketId": "UUID",
  "temporaryLocation": false
}
```

**Response (200)**:
```json
{
  "id": "UUID",
  "storageBucketId": "UUID",
  "temporaryLocation": false
}
```

**Error Responses**: 400 (bad request), 404 (not found), 409 (version conflict), 500 (internal)

> **Note**: The Go service's PATCH endpoint is limited to `storageBucketId` and `temporaryLocation`. Other document metadata (`displayName`, `mimeType`, `size`, etc.) is immutable once the document is created. The server's `updateDocument` GraphQL mutation rejects `displayName` in its input with a `ValidationException` (see FR-014); the DTO field is retained as optional + deprecated for wire compatibility.

---

### DELETE /internal/file/{id} -- Delete Document

**Response (200)**:
```json
{
  "authorizationId": "UUID",
  "tagsetId": "UUID or null"
}
```

Server uses these IDs to clean up authorization_policy and tagset locally.

**Error Responses**: 404 (not found), 500 (internal)

---

## GraphQL Schema Changes

### No Breaking Changes

No GraphQL schema changes. All existing mutations retain their signatures:
- `uploadImageOnVisual` -- unchanged
- `uploadFileOnStorageBucket` -- unchanged
- `uploadFileOnLink` -- unchanged
- `uploadFileOnReference` -- unchanged
- `deleteDocument` -- unchanged
- `updateDocument` -- unchanged

## Configuration Changes

### alkemio.yml additions

```yaml
storage:
  file_service:
    url: ${FILE_SERVICE_URL:http://file-service:4003}
    timeout: ${FILE_SERVICE_TIMEOUT:30000}
    retries: ${FILE_SERVICE_RETRIES:2}
    enabled: ${FILE_SERVICE_ENABLED:true}
```
