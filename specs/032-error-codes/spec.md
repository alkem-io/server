# Feature Specification: 5-Digit Numeric Error Code System

**Feature Branch**: `001-error-codes`
**Created**: 2026-01-22
**Status**: Draft
**Input**: Implement a 5-digit numeric error code system for the Alkemio server with hierarchical categorization and backward compatibility.
**GitHub Issue**: https://github.com/alkem-io/server/issues/5714

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Error Code Reference for Support (Priority: P1)

As an end user encountering an error, I want to see a numeric error code that I can reference when contacting support, so that support staff can quickly identify and resolve my issue.

**Why this priority**: This is the primary user-facing value - enabling clear communication between users and support. Without a reference code, users struggle to accurately describe errors they encounter.

**Independent Test**: Can be fully tested by triggering any error condition and verifying the response includes a 5-digit numeric code alongside the existing string code. Delivers immediate value for support ticket clarity.

**Acceptance Scenarios**:

1. **Given** a user performs an action that triggers an authorization error, **When** the error response is returned, **Then** the response includes a 5-digit numeric code starting with "2" (e.g., 20001) in the error extensions.
2. **Given** a user attempts to access a non-existent resource, **When** the error response is returned, **Then** the response includes a 5-digit numeric code starting with "1" (e.g., 10101) along with a user-friendly message.
3. **Given** any error occurs in the system, **When** the user sees the error, **Then** they can copy or reference a numeric code for support purposes.

---

### User Story 2 - Error Category Identification (Priority: P1)

As a support team member, I want to quickly identify the error category from the first two digits of the error code, so that I can route issues to the appropriate team without reading the full error details.

**Why this priority**: Critical for support efficiency - enables triage at a glance. The first two digits tell support whether this is a "not found" (10), "authorization" (20), "validation" (30), "operations" (40), or "system" (50) issue.

**Independent Test**: Can be tested by examining any error code and confirming the first two digits correctly correspond to the error category based on the defined grouping strategy.

**Acceptance Scenarios**:

1. **Given** an error with code 10101, **When** a support agent sees this code, **Then** they know immediately it belongs to the "Not Found" category (10xxx).
2. **Given** an error with code 20201, **When** a support agent sees this code, **Then** they know immediately it belongs to the "Authorization" category (20xxx).
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
  - 20xxx = Authorization errors
  - 30xxx = Validation errors
  - 40xxx = Operations errors
  - 50xxx = System/Infrastructure errors
  - 99xxx = Fallback/Unmapped errors
- **FR-003**: System MUST include both the existing string code (`code`) and the new numeric code (`numericCode`) in GraphQL error extensions for backward compatibility.
- **FR-004**: System MUST map all existing 73 `AlkemioErrorStatus` enum values to specific 5-digit numeric codes.
- **FR-005**: System MUST return a fallback code (99999) for any error that does not have an explicit numeric code mapping.
- **FR-006**: System MUST log a warning when a fallback code is used, indicating the unmapped error type.
- **FR-007**: System MUST maintain the existing `errorId` (UUID) in all error responses for traceability.
- **FR-008**: System MUST document all numeric codes with their descriptions and suggested user-facing messages.

### Numeric Code Mapping (Preliminary)

Based on the provided preliminary mapping, the following structure is proposed:

**1xxxx - Not Found Errors**

| Code  | String Code              | User Message                             |
| ----- | ------------------------ | ---------------------------------------- |
| 10101 | ENTITY_NOT_FOUND         | Couldn't find what you were looking for. |
| 10102 | STORAGE_BUCKET_NOT_FOUND | Failed to upload reference or link.      |
| 10103 | URL_RESOLVER_ERROR       | Couldn't find what you were looking for. |
| 10104 | TAGSET_NOT_FOUND         | (bug - needs investigation)              |
| 10105 | NOT_FOUND                | Resource not found.                      |
| 10106 | ACCOUNT_NOT_FOUND        | Account not found.                       |

**2xxxx - Authorization Errors**

| Code  | String Code                   | User Message                            |
| ----- | ----------------------------- | --------------------------------------- |
| 20101 | FORBIDDEN_POLICY              | You don't have the correct rights.      |
| 20102 | UNAUTHENTICATED               | You might not be logged in.             |
| 20103 | MATRIX_ENTITY_NOT_FOUND_ERROR | You don't have the correct rights.      |
| 20104 | FORBIDDEN                     | Access denied.                          |
| 20105 | UNAUTHORIZED                  | You are not authorized for this action. |
| 20106 | FORBIDDEN_LICENSE_POLICY      | License does not permit this action.    |
| 20107 | API_RESTRICTED_ACCESS         | API access restricted.                  |

**3xxxx - Validation Errors**

| Code  | String Code              | User Message                        |
| ----- | ------------------------ | ----------------------------------- |
| 30101 | BAD_USER_INPUT           | {{message}}                         |
| 30102 | OPERATION_NOT_ALLOWED    | Cannot delete Space with Subspaces. |
| 30103 | INVALID_STATE_TRANSITION | This is not allowed as next step.   |
| 30104 | ROLESET_ROLE             | An open application already exists. |
| 30105 | INPUT_VALIDATION_ERROR   | Invalid input provided.             |
| 30106 | INVALID_UUID             | Invalid identifier format.          |
| 30107 | INVALID_TOKEN            | Invalid token.                      |
| 30108 | INVALID_TEMPLATE_TYPE    | Invalid template type.              |
| 30109 | FORMAT_NOT_SUPPORTED     | Format not supported.               |

**4xxxx - Operations Errors**

| Code  | String Code                           | User Message              |
| ----- | ------------------------------------- | ------------------------- |
| 40101 | CALLOUT_CLOSED                        | This callout is closed.   |
| 40102 | COMMUNITY_POLICY_ROLE_LIMITS_VIOLATED | Role limits exceeded.     |
| 40103 | COMMUNITY_MEMBERSHIP                  | Membership error.         |
| 40104 | COMMUNITY_INVITATION                  | Invitation error.         |
| 40105 | ROLESET_INVITATION                    | Invitation error.         |
| 40106 | PAGINATION_INPUT_OUT_OF_BOUND         | Pagination out of bounds. |

**5xxxx - System/Infrastructure Errors**

| Code  | String Code               | User Message                  |
| ----- | ------------------------- | ----------------------------- |
| 50101 | BOOTSTRAP_FAILED          | System initialization failed. |
| 50102 | GEO_SERVICE_NOT_AVAILABLE | Location service unavailable. |
| 50103 | GEO_SERVICE_ERROR         | Location service error.       |
| 50104 | STORAGE_UPLOAD_FAILED     | Upload failed.                |
| 50105 | DOCUMENT_SAVE_FAILED      | Failed to save document.      |
| 50106 | SESSION_EXPIRED           | Your session has expired.     |

**9xxxx - Fallback**

| Code  | String Code | User Message                                         |
| ----- | ----------- | ---------------------------------------------------- |
| 99999 | UNSPECIFIED | An unexpected error occurred. Reference: {{errorId}} |

### Key Entities

- **NumericErrorCode**: Represents a 5-digit error code with its category, string code mapping, and user message template.
- **ErrorCodeRegistry**: Central registry mapping string codes to numeric codes with metadata.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of GraphQL error responses include a valid 5-digit numeric code in the range 10000-99999.
- **SC-002**: All 73 existing `AlkemioErrorStatus` values are mapped to specific numeric codes (no unmapped codes use fallback in normal operation).
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
