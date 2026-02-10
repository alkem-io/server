# Feature Specification: 5-Digit Numeric Error Code System

**Feature Branch**: `001-error-codes`
**Created**: 2026-01-22
**Status**: Draft
**Input**: Implement a 5-digit numeric error code system for the Alkemio server with hierarchical categorization and backward compatibility.
**GitHub Issue**: [#5714](https://github.com/alkem-io/server/issues/5714)

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Error Code Reference for Support (Priority: P1)

As an end user encountering an error, I want to see a numeric error code that I can reference when contacting support, so that support staff can quickly identify and resolve my issue.

**Why this priority**: This is the primary user-facing value - enabling clear communication between users and support. Without a reference code, users struggle to accurately describe errors they encounter.

**Independent Test**: Can be fully tested by triggering any error condition and verifying the response includes a 5-digit numeric code alongside the existing string code. Delivers immediate value for support ticket clarity.

**Acceptance Scenarios**:

1. **Given** a user performs an action that triggers an authorization error, **When** the error response is returned, **Then** the response includes a 5-digit numeric code starting with "11" (e.g., 11104) in the error extensions.
2. **Given** a user attempts to access a non-existent resource, **When** the error response is returned, **Then** the response includes a 5-digit numeric code starting with "10" (e.g., 10101) along with a user-friendly message.
3. **Given** any error occurs in the system, **When** the user sees the error, **Then** they can copy or reference a numeric code for support purposes.

---

### User Story 2 - Error Category Identification (Priority: P1)

As a support team member, I want to quickly identify the error category from the first two digits of the error code, so that I can route issues to the appropriate team without reading the full error details.

**Why this priority**: Critical for support efficiency - enables triage at a glance. The first two digits tell support whether this is a "not found" (10), "authorization" (11), "validation" (12), "operations" (13), or "system" (14) issue.

**Independent Test**: Can be tested by examining any error code and confirming the first two digits correctly correspond to the error category based on the defined grouping strategy.

**Acceptance Scenarios**:

1. **Given** an error with code 10101, **When** a support agent sees this code, **Then** they know immediately it belongs to the "Not Found" category (10xxx).
2. **Given** an error with code 11104, **When** a support agent sees this code, **Then** they know immediately it belongs to the "Authorization" category (11xxx).
3. **Given** the error code documentation, **When** support references a code, **Then** they can find the full error description and suggested resolution steps.

---

### User Story 3 - Backward Compatible API Response (Priority: P2)

As an API consumer (frontend or external integration), I want error responses to include both the new numeric code and the existing string code, so that my existing error handling continues to work while I can optionally adopt the new numeric codes.

**Why this priority**: Essential for non-breaking migration. External integrators and the existing frontend must not break when this change is deployed.

**Independent Test**: Can be tested by verifying all error responses contain both `code` (string) and `numericCode` (number) in the extensions.

**Acceptance Scenarios**:

1. **Given** an error occurs that maps to `ENTITY_NOT_FOUND`, **When** the GraphQL error response is returned, **Then** both `code: "ENTITY_NOT_FOUND"` and `numericCode: 10101` are present in extensions.
2. **Given** existing frontend code that checks for `code === "FORBIDDEN_POLICY"`, **When** this error occurs after the update, **Then** the existing check continues to work (string code unchanged).
3. **Given** a new integration that wants to use numeric codes, **When** parsing the error response, **Then** they can read `numericCode` from extensions.

---

### User Story 4 - Fallback for Unmapped Errors (Priority: P3)

As a system administrator, I want unmapped or unexpected errors to return a generic error code with the unique error ID, so that no error goes unreported and all errors remain traceable.

**Why this priority**: Safety net for edge cases. Less frequent than mapped errors but critical for system observability and debugging production issues.

**Independent Test**: Can be tested by triggering an error that has no explicit mapping and verifying a generic code is returned with the error ID.

**Acceptance Scenarios**:

1. **Given** an unexpected error occurs that has no explicit numeric code mapping, **When** the error response is returned, **Then** a generic fallback code (e.g., 99999) is assigned along with the unique errorId.
2. **Given** a fallback error is returned to a user, **When** they report the error, **Then** support can trace it using the errorId even though the numeric code is generic.

---

### Edge Cases

- What happens when a new error type is added to the codebase without a numeric code assignment? System should assign the fallback code and log a warning for developers.
- How does the system handle errors thrown by third-party libraries that don't follow the Alkemio exception pattern? These should be caught and wrapped with appropriate generic codes.
- What happens if the numeric code exceeds 5 digits due to misconfiguration? Validation should prevent codes outside 10000-99999 range.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST assign a 5-digit numeric code (10000-99999) to every error returned via GraphQL API.
- **FR-002**: System MUST follow the hierarchical categorization where the first two digits indicate category:
  - 10xxx = Not Found errors
  - 11xxx = Authorization errors
  - 12xxx = Validation errors
  - 13xxx = Operations errors
  - 14xxx = System/Infrastructure errors
  - 99xxx = Fallback/Unmapped errors
- **FR-003**: System MUST include both the existing string code (`code`) and the new numeric code (`numericCode`) in GraphQL error extensions for backward compatibility.
- **FR-004**: System MUST map all existing 71 `AlkemioErrorStatus` enum values to specific 5-digit numeric codes.
- **FR-005**: System MUST return a fallback code (99999) for any error that does not have an explicit numeric code mapping.
- **FR-006**: System MUST log a warning when a fallback code is used, indicating the unmapped error type.
- **FR-007**: System MUST maintain the existing `errorId` (UUID) in all error responses for traceability.
- **FR-008**: System MUST document all numeric codes with their descriptions and suggested user-facing messages.

### Numeric Code Mapping (Preliminary)

Based on the provided preliminary mapping, the following structure is proposed:

#### 10xxx - Not Found Errors

| Code  | String Code                  | User Message                             |
| ----- | ---------------------------- | ---------------------------------------- |
| 10101 | ENTITY_NOT_FOUND             | Couldn't find what you were looking for. |
| 10102 | NOT_FOUND                    | Resource not found.                      |
| 10103 | ACCOUNT_NOT_FOUND            | Account not found.                       |
| 10104 | LICENSE_NOT_FOUND            | License not found.                       |
| 10105 | STORAGE_BUCKET_NOT_FOUND     | Failed to upload reference or link.      |
| 10106 | TAGSET_NOT_FOUND             | Tag set not found.                       |
| 10107 | MIME_TYPE_NOT_FOUND          | File type not recognized.                |
| 10108 | MATRIX_ENTITY_NOT_FOUND_ERROR| Matrix entity not found.                 |
| 10109 | USER_IDENTITY_NOT_FOUND      | User identity not found.                 |
| 10110 | PAGINATION_NOT_FOUND         | Page not found.                          |

#### 11xxx - Authorization Errors

| Code  | String Code                         | User Message                            |
| ----- | ----------------------------------- | --------------------------------------- |
| 11101 | UNAUTHENTICATED                     | You might not be logged in.             |
| 11102 | UNAUTHORIZED                        | You are not authorized for this action. |
| 11103 | FORBIDDEN                           | Access denied.                          |
| 11104 | FORBIDDEN_POLICY                    | You don't have the correct rights.      |
| 11105 | FORBIDDEN_LICENSE_POLICY            | License does not permit this action.    |
| 11106 | AUTHORIZATION_INVALID_POLICY        | Invalid authorization policy.           |
| 11107 | AUTHORIZATION_RESET                 | Authorization has been reset.           |
| 11108 | USER_NOT_VERIFIED                   | User account not verified.              |
| 11109 | SUBSCRIPTION_USER_NOT_AUTHENTICATED | Subscription requires authentication.   |
| 11110 | API_RESTRICTED_ACCESS               | API access restricted.                  |
| 11111 | INVALID_TOKEN                       | Invalid token.                          |
| 11112 | BEARER_TOKEN                        | Bearer token error.                     |
| 11113 | SESSION_EXPIRED                     | Your session has expired.               |
| 11114 | SESSION_EXTEND                      | Session extension failed.               |
| 11115 | LOGIN_FLOW                          | Login flow error.                       |
| 11116 | LOGIN_FLOW_INIT                     | Login flow initialization failed.       |

#### 12xxx - Validation Errors

| Code  | String Code               | User Message                      |
| ----- | ------------------------- | --------------------------------- |
| 12101 | BAD_USER_INPUT            | {{message}}                       |
| 12102 | INPUT_VALIDATION_ERROR    | Invalid input provided.           |
| 12103 | INVALID_UUID              | Invalid identifier format.        |
| 12104 | FORMAT_NOT_SUPPORTED      | Format not supported.             |
| 12105 | INVALID_STATE_TRANSITION  | This is not allowed as next step. |
| 12106 | INVALID_TEMPLATE_TYPE     | Invalid template type.            |
| 12107 | GROUP_NOT_INITIALIZED     | Group not properly initialized.   |
| 12108 | ENTITY_NOT_INITIALIZED    | Entity not properly initialized.  |
| 12109 | RELATION_NOT_LOADED       | Related data not available.       |
| 12110 | PAGINATION_INPUT_OUT_OF_BOUND | Pagination out of bounds.     |
| 12111 | PAGINATION_PARAM_NOT_FOUND | Pagination parameter not found.  |
| 12113 | FORUM_DISCUSSION_CATEGORY | Invalid discussion category.      |
| 12114 | NOT_SUPPORTED             | Not supported.                    |

#### 13xxx - Operations Errors

| Code  | String Code                          | User Message                       |
| ----- | ------------------------------------ | ---------------------------------- |
| 13101 | OPERATION_NOT_ALLOWED                | Operation not allowed.             |
| 13102 | NOT_ENABLED                          | Feature not enabled.               |
| 13103 | MESSAGING_NOT_ENABLED                | Messaging not enabled.             |
| 13104 | ROLE_SET_ROLE                        | Role set error.                    |
| 13105 | ROLE_SET_INVITATION                  | Invitation error.                  |
| 13106 | ROLE_SET_POLICY_ROLE_LIMITS_VIOLATED | Role limits exceeded.              |
| 13107 | LICENSE_ENTITLEMENT_NOT_AVAILABLE    | License entitlement not available. |
| 13108 | LICENSE_ENTITLEMENT_NOT_SUPPORTED    | License entitlement not supported. |
| 13109 | CALLOUT_CLOSED                       | This callout is closed.            |
| 13110 | USER_ALREADY_REGISTERED              | User already registered.           |
| 13111 | USER_NOT_REGISTERED                  | User not registered.               |
| 13112 | NO_AGENT_FOR_USER                    | No agent found for user.           |
| 13113 | USER_IDENTITY_DELETION_FAILED        | User identity deletion failed.     |

#### 14xxx - System/Infrastructure Errors

| Code  | String Code                        | User Message                         |
| ----- | ---------------------------------- | ------------------------------------ |
| 14101 | BOOTSTRAP_FAILED                   | System initialization failed.        |
| 14102 | NOTIFICATION_PAYLOAD_BUILDER_ERROR | Notification error.                  |
| 14103 | GEO_LOCATION_ERROR                 | Location error.                      |
| 14104 | GEO_SERVICE_NOT_AVAILABLE          | Location service unavailable.        |
| 14105 | GEO_SERVICE_ERROR                  | Location service error.              |
| 14106 | GEO_SERVICE_REQUEST_LIMIT_EXCEEDED | Location service limit exceeded.     |
| 14107 | STORAGE_DISABLED                   | Storage is disabled.                 |
| 14108 | STORAGE_UPLOAD_FAILED              | Upload failed.                       |
| 14109 | LOCAL_STORAGE_SAVE_FAILED          | Failed to save locally.              |
| 14110 | LOCAL_STORAGE_READ_FAILED          | Failed to read from local storage.   |
| 14111 | LOCAL_STORAGE_DELETE_FAILED        | Failed to delete from local storage. |
| 14112 | DOCUMENT_SAVE_FAILED               | Failed to save document.             |
| 14113 | DOCUMENT_READ_FAILED               | Failed to read document.             |
| 14114 | DOCUMENT_DELETE_FAILED             | Failed to delete document.           |
| 14115 | URL_RESOLVER_ERROR                 | URL resolution error.                |
| 14116 | EXCALIDRAW_AMQP_RESULT_ERROR       | Whiteboard sync error.               |
| 14117 | EXCALIDRAW_REDIS_ADAPTER_INIT      | Whiteboard initialization error.     |
| 14118 | EXCALIDRAW_SERVER_INIT             | Whiteboard server error.             |

#### 99xxx - Fallback

| Code  | String Code | User Message                                         |
| ----- | ----------- | ---------------------------------------------------- |
| 99999 | UNSPECIFIED | An unexpected error occurred. Reference: {{errorId}} |

### Key Entities

- **NumericErrorCode**: Represents a 5-digit error code with its category, string code mapping, and user message template.
- **ErrorCodeRegistry**: Central registry mapping string codes to numeric codes with metadata.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of GraphQL error responses include a valid 5-digit numeric code in the range 10000-99999.
- **SC-002**: All 71 existing `AlkemioErrorStatus` values are mapped to specific numeric codes (no unmapped codes use fallback in normal operation).
- **SC-003**: Support teams can identify error category within 2 seconds by examining the first two digits of any reported error code.
- **SC-004**: Zero breaking changes to existing API consumers - all existing error handling code continues to function.
- **SC-005**: Error code documentation is complete and accessible, covering all mapped codes with descriptions and suggested resolutions.
- **SC-006**: Fallback handling correctly captures 100% of unmapped errors with logging for developer awareness.

## Assumptions

- The existing `AlkemioErrorStatus` enum will remain as the source of truth for error types; numeric codes are an additional layer.
- The 5-digit format provides sufficient capacity (1,000 unique codes per category, with up to 99 categories available) for foreseeable growth.
- The preliminary code mappings provided are a starting point and may be refined during implementation.
- User-facing messages will eventually be localized, but initial implementation uses English messages.
- UX treatment (how errors are displayed) is determined by the frontend based on context, not pre-classified in the backend.
