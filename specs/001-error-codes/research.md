# Research: 5-Digit Numeric Error Code System

**Date**: 2026-01-22
**Feature**: 001-error-codes

## Research Questions

1. How should the 72 existing error codes be categorized into the 5-digit scheme?
2. What is the best pattern for implementing a compile-time error code registry in TypeScript?
3. How should the numeric code be added to GraphQL error extensions?

---

## Decision 1: Complete Error Code Categorization

**Decision**: Map all 72 `AlkemioErrorStatus` values to 5-digit codes using the following category scheme:

| Category      | First 2 Digits | Description                                        |
| ------------- | -------------- | -------------------------------------------------- |
| Not Found     | 10             | Entity, resource, or service not found             |
| Authorization | 20             | Authentication, authorization, license policy      |
| Validation    | 30             | Input validation, state transitions, format errors |
| Operations    | 40             | Business rule violations, operational constraints  |
| System        | 50             | Infrastructure, external services, storage         |
| Fallback      | 99             | Unmapped errors                                    |

**Rationale**: This categorization aligns with standard HTTP error code semantics (4xx client, 5xx server) while providing finer granularity. The first two digits enable instant triage by support teams, with 1000 codes available per category and room for 90 additional categories if needed.

**Complete Mapping**:

### 10xxx - Not Found (10 codes)

| Numeric | AlkemioErrorStatus         | User Message                             |
| ------- | -------------------------- | ---------------------------------------- |
| 10101   | ENTITY_NOT_FOUND           | Couldn't find what you were looking for. |
| 10102   | NOT_FOUND                  | Resource not found.                      |
| 10103   | ACCOUNT_NOT_FOUND          | Account not found.                       |
| 10104   | STORAGE_BUCKET_NOT_FOUND   | Failed to upload reference or link.      |
| 10105   | TAGSET_NOT_FOUND           | Tag set not found.                       |
| 10106   | MIME_TYPE_NOT_FOUND        | File type not recognized.                |
| 10107   | LICENSE_NOT_FOUND          | License not found.                       |
| 10108   | PAGINATION_NOT_FOUND       | Page not found.                          |
| 10109   | PAGINATION_PARAM_NOT_FOUND | Pagination parameter not found.          |
| 10110   | URL_RESOLVER_ERROR         | Couldn't find what you were looking for. |

### 20xxx - Authorization (15 codes)

| Numeric | AlkemioErrorStatus                  | User Message                            |
| ------- | ----------------------------------- | --------------------------------------- |
| 20101   | UNAUTHENTICATED                     | You might not be logged in.             |
| 20102   | UNAUTHORIZED                        | You are not authorized for this action. |
| 20103   | FORBIDDEN                           | Access denied.                          |
| 20104   | FORBIDDEN_POLICY                    | You don't have the correct rights.      |
| 20105   | FORBIDDEN_LICENSE_POLICY            | License does not permit this action.    |
| 20106   | AUTHORIZATION_INVALID_POLICY        | Invalid authorization policy.           |
| 20107   | AUTHORIZATION_RESET                 | Authorization has been reset.           |
| 20108   | API_RESTRICTED_ACCESS               | API access restricted.                  |
| 20109   | SUBSCRIPTION_USER_NOT_AUTHENTICATED | Subscription requires authentication.   |
| 20110   | USER_NOT_VERIFIED                   | User account not verified.              |
| 20111   | USER_NOT_REGISTERED                 | User not registered.                    |
| 20112   | USER_ALREADY_REGISTERED             | User already registered.                |
| 20113   | MATRIX_ENTITY_NOT_FOUND_ERROR       | You don't have the correct rights.      |
| 20114   | LICENSE_ENTITLEMENT_NOT_AVAILABLE   | License entitlement not available.      |
| 20115   | LICENSE_ENTITLEMENT_NOT_SUPPORTED   | License entitlement not supported.      |

### 30xxx - Validation (14 codes)

| Numeric | AlkemioErrorStatus            | User Message                      |
| ------- | ----------------------------- | --------------------------------- |
| 30101   | BAD_USER_INPUT                | {{message}}                       |
| 30102   | INPUT_VALIDATION_ERROR        | Invalid input provided.           |
| 30103   | INVALID_STATE_TRANSITION      | This is not allowed as next step. |
| 30104   | INVALID_TOKEN                 | Invalid token.                    |
| 30105   | INVALID_UUID                  | Invalid identifier format.        |
| 30106   | INVALID_TEMPLATE_TYPE         | Invalid template type.            |
| 30107   | FORMAT_NOT_SUPPORTED          | Format not supported.             |
| 30108   | ENTITY_NOT_INITIALIZED        | Entity not properly initialized.  |
| 30109   | GROUP_NOT_INITIALIZED         | Group not properly initialized.   |
| 30110   | RELATION_NOT_LOADED           | Related data not available.       |
| 30111   | PAGINATION_INPUT_OUT_OF_BOUND | Pagination out of bounds.         |
| 30112   | FORUM_DISCUSSION_CATEGORY     | Invalid discussion category.      |
| 30113   | NO_AGENT_FOR_USER             | No agent found for user.          |
| 30114   | NOT_SUPPORTED                 | Not supported: {{message}}        |

### 40xxx - Operations (12 codes)

| Numeric | AlkemioErrorStatus                   | User Message                      |
| ------- | ------------------------------------ | --------------------------------- |
| 40101   | OPERATION_NOT_ALLOWED                | Operation not allowed.            |
| 40102   | CALLOUT_CLOSED                       | This callout is closed.           |
| 40103   | ROLE_SET_POLICY_ROLE_LIMITS_VIOLATED | Role limits exceeded.             |
| 40104   | ROLE_SET_ROLE                        | Role set error.                   |
| 40105   | ROLE_SET_INVITATION                  | Invitation error.                 |
| 40106   | NOT_ENABLED                          | Feature not enabled.              |
| 40107   | MESSAGING_NOT_ENABLED                | Messaging not enabled.            |
| 40108   | LOGIN_FLOW_INIT                      | Login flow initialization failed. |
| 40109   | LOGIN_FLOW                           | Login flow error.                 |
| 40110   | SESSION_EXTEND                       | Session extension failed.         |
| 40111   | SESSION_EXPIRED                      | Your session has expired.         |
| 40112   | BEARER_TOKEN                         | Bearer token error.               |

### 50xxx - System/Infrastructure (21 codes)

| Numeric | AlkemioErrorStatus                 | User Message                         |
| ------- | ---------------------------------- | ------------------------------------ |
| 50101   | BOOTSTRAP_FAILED                   | System initialization failed.        |
| 50102   | NOTIFICATION_PAYLOAD_BUILDER_ERROR | Notification error.                  |
| 50103   | GEO_LOCATION_ERROR                 | Location error.                      |
| 50104   | GEO_SERVICE_NOT_AVAILABLE          | Location service unavailable.        |
| 50105   | GEO_SERVICE_ERROR                  | Location service error.              |
| 50106   | GEO_SERVICE_REQUEST_LIMIT_EXCEEDED | Location service limit exceeded.     |
| 50107   | USER_IDENTITY_NOT_FOUND            | User identity not found.             |
| 50108   | USER_IDENTITY_DELETION_FAILED      | User identity deletion failed.       |
| 50109   | STORAGE_DISABLED                   | Storage is disabled.                 |
| 50110   | STORAGE_UPLOAD_FAILED              | Upload failed.                       |
| 50111   | LOCAL_STORAGE_SAVE_FAILED          | Failed to save locally.              |
| 50112   | LOCAL_STORAGE_READ_FAILED          | Failed to read from local storage.   |
| 50113   | LOCAL_STORAGE_DELETE_FAILED        | Failed to delete from local storage. |
| 50114   | DOCUMENT_SAVE_FAILED               | Failed to save document.             |
| 50115   | DOCUMENT_READ_FAILED               | Failed to read document.             |
| 50116   | DOCUMENT_DELETE_FAILED             | Failed to delete document.           |
| 50117   | EXCALIDRAW_AMQP_RESULT_ERROR       | Whiteboard sync error.               |
| 50118   | EXCALIDRAW_REDIS_ADAPTER_INIT      | Whiteboard initialization error.     |
| 50119   | EXCALIDRAW_SERVER_INIT             | Whiteboard server error.             |

### 99xxx - Fallback (1 code)

| Numeric | AlkemioErrorStatus | User Message                                         |
| ------- | ------------------ | ---------------------------------------------------- |
| 99999   | UNSPECIFIED        | An unexpected error occurred. Reference: {{errorId}} |

**Total**: 72 codes mapped + 1 fallback = 73 numeric codes

**Alternatives Considered**:

- 4-digit codes: Rejected - insufficient capacity for future growth
- HTTP-style 3-digit codes: Rejected - too limiting for domain-specific categorization
- Alphanumeric codes: Rejected - numeric codes are easier for users to communicate verbally

---

## Decision 2: Registry Implementation Pattern

**Decision**: Implement the error code registry as a TypeScript `Map<AlkemioErrorStatus, ErrorCodeEntry>` initialized at module load time.

**Rationale**:

- Map provides O(1) lookup performance
- TypeScript's type system ensures compile-time safety
- No runtime dependencies or NestJS injection required
- Easy to test in isolation

**Implementation Pattern**:

```typescript
// error.code.registry.ts
export interface ErrorCodeEntry {
  numericCode: number;
  category: ErrorCategory;
  userMessage: string;
}

export const ERROR_CODE_REGISTRY: ReadonlyMap<
  AlkemioErrorStatus,
  ErrorCodeEntry
> = new Map([
  [
    AlkemioErrorStatus.ENTITY_NOT_FOUND,
    {
      numericCode: 10101,
      category: ErrorCategory.NOT_FOUND,
      userMessage: "Couldn't find what you were looking for.",
    },
  ],
  // ... all 72 mappings
]);

export function getNumericCode(status: AlkemioErrorStatus): number {
  const entry = ERROR_CODE_REGISTRY.get(status);
  if (!entry) {
    // Log warning per FR-006
    return 99999; // Fallback
  }
  return entry.numericCode;
}
```

**Alternatives Considered**:

- JSON configuration file: Rejected - loses TypeScript type safety
- Database lookup: Rejected - unnecessary overhead for static data
- Decorator-based: Rejected - adds complexity without benefit

---

## Decision 3: GraphQL Extension Integration

**Decision**: Add `numericCode` as a new field in the existing `extensions` object, alongside the existing `code` field.

**Rationale**:

- Backward compatible - existing `code` field unchanged
- Follows GraphQL error extensions convention
- No schema changes required (extensions are untyped)
- Consistent with existing `errorId` pattern

**Implementation in BaseException**:

```typescript
// base.exception.ts
constructor(
  public message: string,
  public context: LogContext,
  public code: AlkemioErrorStatus,
  public details?: ExceptionDetails,
  public errorId: string = randomUUID()
) {
  const numericCode = getNumericCode(code);
  super(message, {
    extensions: {
      code: String(code),
      numericCode,  // NEW
      errorId,
      details,
    },
  });
}
```

**GraphQL Error Response Example**:

```json
{
  "errors": [
    {
      "message": "Entity not found",
      "extensions": {
        "code": "ENTITY_NOT_FOUND",
        "numericCode": 10101,
        "errorId": "550e8400-e29b-41d4-a716-446655440000"
      }
    }
  ]
}
```

**Alternatives Considered**:

- Replace `code` with numeric: Rejected - breaking change
- Separate `numericExtensions` object: Rejected - unnecessary nesting
- Schema-defined type for extensions: Rejected - adds schema surface area for internal detail

---

## Open Questions Resolved

| Question                                          | Resolution                                                    |
| ------------------------------------------------- | ------------------------------------------------------------- |
| Should UX treatment be part of error code system? | No - frontend decides based on context                        |
| What happens with new error codes?                | Fallback to 99999 with warning log                            |
| Should user messages be in response?              | No - frontend handles display, messages are for documentation |

---

## Next Steps

1. Create `data-model.md` with TypeScript interfaces
2. Create `contracts/error-extensions.graphql` showing the extension structure
3. Create `quickstart.md` with implementation guide
