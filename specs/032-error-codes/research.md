# Research: 5-Digit Numeric Error Code System

**Date**: 2026-01-22
**Feature**: 032-error-codes

## Research Questions

1. How should the 71 existing error codes be categorized into the 5-digit scheme?
2. What is the best pattern for implementing a compile-time error code registry in TypeScript?
3. How should the numeric code be added to GraphQL error extensions?

---

## Decision 1: Complete Error Code Categorization

**Decision**: Map all 71 `AlkemioErrorStatus` values to 5-digit codes using the following category scheme:

| Category      | First 2 Digits | Description                                        |
| ------------- | -------------- | -------------------------------------------------- |
| Not Found     | 10             | Entity, resource, or service not found             |
| Authorization | 11             | Authentication, authorization, license policy      |
| Validation    | 12             | Input validation, state transitions, format errors |
| Operations    | 13             | Business rule violations, operational constraints  |
| System        | 14             | Infrastructure, external services, storage         |
| Fallback      | 99             | Unmapped errors                                    |

**Rationale**: This categorization uses sequential two-digit prefixes (10-14, 99) for easy identification. The first two digits enable instant triage by support teams, with 1000 codes available per category and room for additional categories if needed.

**Complete Mapping**:

### 10xxx - Not Found (10 codes)

| Numeric | AlkemioErrorStatus           | User Message                             |
| ------- | ---------------------------- | ---------------------------------------- |
| 10101   | ENTITY_NOT_FOUND             | Couldn't find what you were looking for. |
| 10102   | NOT_FOUND                    | Resource not found.                      |
| 10103   | ACCOUNT_NOT_FOUND            | Account not found.                       |
| 10104   | LICENSE_NOT_FOUND            | License not found.                       |
| 10105   | STORAGE_BUCKET_NOT_FOUND     | Failed to upload reference or link.      |
| 10106   | TAGSET_NOT_FOUND             | Tag set not found.                       |
| 10107   | MIME_TYPE_NOT_FOUND          | File type not recognized.                |
| 10108   | MATRIX_ENTITY_NOT_FOUND_ERROR| Matrix entity not found.                 |
| 10109   | USER_IDENTITY_NOT_FOUND      | User identity not found.                 |
| 10110   | PAGINATION_NOT_FOUND         | Page not found.                          |

### 11xxx - Authorization (16 codes)

| Numeric | AlkemioErrorStatus                  | User Message                            |
| ------- | ----------------------------------- | --------------------------------------- |
| 11101   | UNAUTHENTICATED                     | You might not be logged in.             |
| 11102   | UNAUTHORIZED                        | You are not authorized for this action. |
| 11103   | FORBIDDEN                           | Access denied.                          |
| 11104   | FORBIDDEN_POLICY                    | You don't have the correct rights.      |
| 11105   | FORBIDDEN_LICENSE_POLICY            | License does not permit this action.    |
| 11106   | AUTHORIZATION_INVALID_POLICY        | Invalid authorization policy.           |
| 11107   | AUTHORIZATION_RESET                 | Authorization has been reset.           |
| 11108   | USER_NOT_VERIFIED                   | User account not verified.              |
| 11109   | SUBSCRIPTION_USER_NOT_AUTHENTICATED | Subscription requires authentication.   |
| 11110   | API_RESTRICTED_ACCESS               | API access restricted.                  |
| 11111   | INVALID_TOKEN                       | Invalid token.                          |
| 11112   | BEARER_TOKEN                        | Bearer token error.                     |
| 11113   | SESSION_EXPIRED                     | Your session has expired.               |
| 11114   | SESSION_EXTEND                      | Session extension failed.               |
| 11115   | LOGIN_FLOW                          | Login flow error.                       |
| 11116   | LOGIN_FLOW_INIT                     | Login flow initialization failed.       |

### 12xxx - Validation (13 codes)

| Numeric | AlkemioErrorStatus            | User Message                      |
| ------- | ----------------------------- | --------------------------------- |
| 12101   | BAD_USER_INPUT                | {{message}}                       |
| 12102   | INPUT_VALIDATION_ERROR        | Invalid input provided.           |
| 12103   | INVALID_UUID                  | Invalid identifier format.        |
| 12104   | FORMAT_NOT_SUPPORTED          | Format not supported.             |
| 12105   | INVALID_STATE_TRANSITION      | This is not allowed as next step. |
| 12106   | INVALID_TEMPLATE_TYPE         | Invalid template type.            |
| 12107   | GROUP_NOT_INITIALIZED         | Group not properly initialized.   |
| 12108   | ENTITY_NOT_INITIALIZED        | Entity not properly initialized.  |
| 12109   | RELATION_NOT_LOADED           | Related data not available.       |
| 12110   | PAGINATION_INPUT_OUT_OF_BOUND | Pagination out of bounds.         |
| 12111   | PAGINATION_PARAM_NOT_FOUND    | Pagination parameter not found.   |
| 12113   | FORUM_DISCUSSION_CATEGORY     | Invalid discussion category.      |
| 12114   | NOT_SUPPORTED                 | Not supported: {{message}}        |

### 13xxx - Operations (13 codes)

| Numeric | AlkemioErrorStatus                   | User Message                       |
| ------- | ------------------------------------ | ---------------------------------- |
| 13101   | OPERATION_NOT_ALLOWED                | Operation not allowed.             |
| 13102   | NOT_ENABLED                          | Feature not enabled.               |
| 13103   | MESSAGING_NOT_ENABLED                | Messaging not enabled.             |
| 13104   | ROLE_SET_ROLE                        | Role set error.                    |
| 13105   | ROLE_SET_INVITATION                  | Invitation error.                  |
| 13106   | ROLE_SET_POLICY_ROLE_LIMITS_VIOLATED | Role limits exceeded.              |
| 13107   | LICENSE_ENTITLEMENT_NOT_AVAILABLE    | License entitlement not available. |
| 13108   | LICENSE_ENTITLEMENT_NOT_SUPPORTED    | License entitlement not supported. |
| 13109   | CALLOUT_CLOSED                       | This callout is closed.            |
| 13110   | USER_ALREADY_REGISTERED              | User already registered.           |
| 13111   | USER_NOT_REGISTERED                  | User not registered.               |
| 13112   | NO_AGENT_FOR_USER                    | No agent found for user.           |
| 13113   | USER_IDENTITY_DELETION_FAILED        | User identity deletion failed.     |

### 14xxx - System/Infrastructure (18 codes)

| Numeric | AlkemioErrorStatus                 | User Message                         |
| ------- | ---------------------------------- | ------------------------------------ |
| 14101   | BOOTSTRAP_FAILED                   | System initialization failed.        |
| 14102   | NOTIFICATION_PAYLOAD_BUILDER_ERROR | Notification error.                  |
| 14103   | GEO_LOCATION_ERROR                 | Location error.                      |
| 14104   | GEO_SERVICE_NOT_AVAILABLE          | Location service unavailable.        |
| 14105   | GEO_SERVICE_ERROR                  | Location service error.              |
| 14106   | GEO_SERVICE_REQUEST_LIMIT_EXCEEDED | Location service limit exceeded.     |
| 14107   | STORAGE_DISABLED                   | Storage is disabled.                 |
| 14108   | STORAGE_UPLOAD_FAILED              | Upload failed.                       |
| 14109   | LOCAL_STORAGE_SAVE_FAILED          | Failed to save locally.              |
| 14110   | LOCAL_STORAGE_READ_FAILED          | Failed to read from local storage.   |
| 14111   | LOCAL_STORAGE_DELETE_FAILED        | Failed to delete from local storage. |
| 14112   | DOCUMENT_SAVE_FAILED               | Failed to save document.             |
| 14113   | DOCUMENT_READ_FAILED               | Failed to read document.             |
| 14114   | DOCUMENT_DELETE_FAILED             | Failed to delete document.           |
| 14115   | URL_RESOLVER_ERROR                 | URL resolution error.                |
| 14116   | EXCALIDRAW_AMQP_RESULT_ERROR       | Whiteboard sync error.               |
| 14117   | EXCALIDRAW_REDIS_ADAPTER_INIT      | Whiteboard initialization error.     |
| 14118   | EXCALIDRAW_SERVER_INIT             | Whiteboard server error.             |

### 99xxx - Fallback (1 code)

| Numeric | AlkemioErrorStatus | User Message                                         |
| ------- | ------------------ | ---------------------------------------------------- |
| 99999   | UNSPECIFIED        | An unexpected error occurred. Reference: {{errorId}} |

**Total**: 71 AlkemioErrorStatus values mapped to 71 unique numeric codes (including UNSPECIFIED → 99999)

**Alternatives Considered**:

- 4-digit codes: Rejected - insufficient capacity for future growth
- HTTP-style 3-digit codes: Rejected - too limiting for domain-specific categorization
- Alphanumeric codes: Rejected - numeric codes are easier for users to communicate verbally

---

## Decision 2: Registry Implementation Pattern

**Decision**: Implement the error status metadata as a TypeScript `Record<AlkemioErrorStatus, ErrorMetadata>` initialized at module load time.

**Rationale**:

- Record provides O(1) lookup performance
- TypeScript's type system ensures compile-time safety
- No runtime dependencies or NestJS injection required
- Easy to test in isolation
- Separates category and specificCode for cleaner code management

**Implementation Pattern**:

```typescript
// error.status.metadata.ts
export interface ErrorMetadata {
  /** Category prefix (10 - 99) */
  category: ErrorCategory;
  /** Specific code within category (100 - 999) */
  specificCode: number;
  /** i18n translation key for user-friendly message */
  userMessage: string;
}

export function computeNumericCode(metadata: ErrorMetadata): number {
  return metadata.category * 1000 + metadata.specificCode;
}

const STATUS_METADATA: Record<AlkemioErrorStatus, ErrorMetadata> = {
  [AlkemioErrorStatus.ENTITY_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    specificCode: 101,
    userMessage: 'userMessages.notFound.entity',
  },
  // ... all 71 mappings
};

export function getMetadataForStatus(
  status: AlkemioErrorStatus
): ErrorMetadata {
  return STATUS_METADATA[status] ?? FALLBACK_METADATA;
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
  const metadata = getMetadataForStatus(code);
  const numericCode = computeNumericCode(metadata);
  super(message, {
    extensions: {
      code: String(code),
      numericCode,  // NEW
      userMessage: metadata.userMessage,  // NEW - i18n key
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
        "userMessage": "userMessages.notFound.entity",
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
