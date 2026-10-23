# Error Codes Reference

This document provides a complete reference for the 5-digit numeric error codes used in the Alkemio server.

## Overview

Every error returned by the Alkemio GraphQL API includes a 5-digit numeric code in the `numericCode` field of the error extensions. This code enables:

- **Quick reference** for users when contacting support
- **Fast triage** for support teams based on error category
- **Backward compatibility** - the existing string `code` field remains unchanged

## Error Code Format

```
[Category][Specific Code]
  2 digits   3 digits
```

- **First 2 digits**: Error category (10-99)
- **Last 3 digits**: Specific error within category (000-999)

## Categories

| Category      | First 2 Digits | Description                                        |
| ------------- | -------------- | -------------------------------------------------- |
| Not Found     | 10             | Entity, resource, or service not found             |
| Authorization | 11             | Authentication, authorization, license policy      |
| Validation    | 12             | Input validation, state transitions, format errors |
| Operations    | 13             | Business rule violations, operational constraints  |
| System        | 14             | Infrastructure, external services, storage         |
| Fallback      | 99             | Unmapped/unexpected errors                         |

## Quick Triage Guide

When you see an error code:

- **10xxx** → Check if the resource exists, verify URLs and IDs
- **11xxx** → Check login status, permissions, license entitlements
- **12xxx** → Check input data format, required fields, valid values
- **13xxx** → Check business rules, feature availability, session state
- **14xxx** → System issue - may require server-side investigation
- **99xxx** → Unexpected error - use the `errorId` to trace in logs

---

## Complete Error Code Reference

Each code is `category * 1000 + specificCode` as defined in `STATUS_METADATA` (`src/common/exceptions/error.status.metadata.ts`); the String Code column is the value emitted in the `code` extension. User messages and resolutions are indicative.

### 10xxx - Not Found Errors

| Code  | String Code                   | User Message                             | Resolution                                    |
| ----- | ----------------------------- | ---------------------------------------- | --------------------------------------------- |
| 10101 | ENTITY_NOT_FOUND              | Couldn't find what you were looking for. | Verify the ID exists and you have access      |
| 10102 | NOT_FOUND                     | Resource not found.                      | Check the URL or resource identifier          |
| 10103 | ACCOUNT_NOT_FOUND             | Account not found.                       | Verify the account exists                     |
| 10104 | LICENSE_NOT_FOUND             | License not found.                       | Contact support - license configuration issue |
| 10105 | STORAGE_BUCKET_NOT_FOUND      | Failed to upload reference or link.      | Contact support - storage configuration issue |
| 10106 | TAGSET_NOT_FOUND              | Tag set not found.                       | Verify the tagset exists on the entity        |
| 10107 | MIME_TYPE_NOT_FOUND           | File type not recognized.                | Use a supported file format                   |
| 10108 | MATRIX_ENTITY_NOT_FOUND_ERROR | You don't have the correct rights.       | Request access to the resource                |
| 10109 | USER_IDENTITY_NOT_FOUND       | User identity not found.                 | Contact support - identity provider issue     |
| 10110 | PAGINATION_NOT_FOUND          | Page not found.                          | Check pagination parameters                   |

### 11xxx - Authorization Errors

| Code  | String Code                         | User Message                            | Resolution                                        |
| ----- | ----------------------------------- | --------------------------------------- | ------------------------------------------------- |
| 11101 | UNAUTHENTICATED                     | You might not be logged in.             | Log in and try again                              |
| 11102 | UNAUTHORIZED                        | You are not authorized for this action. | Request appropriate permissions                   |
| 11103 | FORBIDDEN                           | Access denied.                          | Contact space admin for access                    |
| 11104 | FORBIDDEN_POLICY                    | You don't have the correct rights.      | Request elevated permissions                      |
| 11105 | FORBIDDEN_LICENSE_POLICY            | License does not permit this action.    | Upgrade license or contact support                |
| 11106 | AUTHORIZATION_INVALID_POLICY        | Invalid authorization policy.           | Contact support - configuration issue             |
| 11107 | AUTHORIZATION_RESET                 | Authorization has been reset.           | Re-authenticate and try again                     |
| 11108 | USER_NOT_VERIFIED                   | User account not verified.              | Complete email verification                       |
| 11109 | SUBSCRIPTION_USER_NOT_AUTHENTICATED | Subscription requires authentication.   | Log in to use subscriptions                       |
| 11110 | API_RESTRICTED_ACCESS               | API access restricted.                  | Check API access permissions                      |
| 11111 | INVALID_TOKEN                       | Invalid token.                          | Request a new token                               |
| 11112 | BEARER_TOKEN                        | Bearer token error.                     | Re-authenticate to get new token                  |
| 11113 | SESSION_EXPIRED                     | Your session has expired.               | Log in again                                      |
| 11114 | SESSION_EXTEND                      | Session extension failed.               | Log in again                                      |
| 11115 | LOGIN_FLOW                          | Login flow error.                       | Try again or contact support                      |
| 11116 | LOGIN_FLOW_INIT                     | Login flow initialization failed.       | Try again or clear browser cache                  |
| 11117 | SESSION_REFRESH_REQUIRED            | Please sign in again to continue.       | Re-authenticate, then retry the action            |
| 11118 | PLATFORM_SUPPORT_SELF_TARGET        | You can't do this to your own account.  | Ask another Platform Support user or an org admin |

### 12xxx - Validation Errors

| Code  | String Code                   | User Message                      | Resolution                                 |
| ----- | ----------------------------- | --------------------------------- | ------------------------------------------ |
| 12101 | BAD_USER_INPUT                | (varies by context)               | Check the error message for details        |
| 12102 | INPUT VALIDATION_ERROR        | Invalid input provided.           | Review input against requirements          |
| 12103 | INVALID_UUID                  | Invalid identifier format.        | Use valid UUID format                      |
| 12104 | FORMAT_NOT_SUPPORTED          | Format not supported.             | Use a supported format                     |
| 12105 | INVALID_STATE_TRANSITION      | This is not allowed as next step. | Follow the allowed workflow sequence       |
| 12106 | INVALID_TEMPLATE_TYPE         | Invalid template type.            | Use a supported template type              |
| 12107 | GROUP_NOT_INITIALIZED         | Group not properly initialized.   | Contact support - data integrity issue     |
| 12108 | ENTITY_NOT_INITIALIZED        | Entity not properly initialized.  | Contact support - data integrity issue     |
| 12109 | RELATION_NOT_LOADED           | Related data not available.       | Contact support - data loading issue       |
| 12110 | PAGINATION_INPUT_OUT_OF_BOUND | Pagination out of bounds.         | Adjust pagination parameters               |
| 12111 | PAGINATION_PARAM_NOT_FOUND    | Pagination parameter not found.   | Provide required pagination parameters     |
| 12113 | FORUM_DISCUSSION_CATEGORY     | Invalid discussion category.      | Use a valid discussion category            |
| 12114 | NOT_SUPPORTED                 | Not supported.                    | Check documentation for supported features |

### 13xxx - Operations Errors

| Code  | String Code                              | User Message                              | Resolution                                        |
| ----- | ---------------------------------------- | ----------------------------------------- | ------------------------------------------------- |
| 13101 | OPERATION_NOT_ALLOWED                    | Operation not allowed.                    | Check if operation is permitted in current state  |
| 13102 | NOT_ENABLED                              | Feature not enabled.                      | Contact admin to enable feature                   |
| 13103 | MESSAGING_NOT_ENABLED                    | Messaging not enabled.                    | Messaging feature is disabled                     |
| 13104 | ROLESET_ROLE                             | Role set error.                           | Check role configuration                          |
| 13105 | ROLESET_INVITATION                       | Invitation error.                         | Check invitation status and permissions           |
| 13106 | ROLESET_POLICY_ROLE_LIMITS_VIOLATED      | Role limits exceeded.                     | Remove existing members or request limit increase |
| 13107 | LICENSE_ENTITLEMENT_NOT_AVAILABLE        | License entitlement not available.        | Check license plan features                       |
| 13108 | LICENSE_ENTITLEMENT_NOT_SUPPORTED        | License entitlement not supported.        | Contact support for license options               |
| 13109 | CALLOUT_CLOSED                           | This callout is closed.                   | Callout no longer accepts contributions           |
| 13110 | USER_ALREADY_REGISTERED                  | User already registered.                  | Log in with existing account                      |
| 13111 | USER_NOT_REGISTERED                      | User not registered.                      | Complete registration process                     |
| 13112 | NO_AGENT_FOR_USER                        | No agent found for user.                  | Contact support - user configuration issue        |
| 13113 | USER_IDENTITY_DELETION_FAILED            | User identity deletion failed.            | Contact support                                   |
| 13114 | ROLESET_OPEN_APPLICATION_EXISTS          | An application is already pending.        | Wait for the existing application to be reviewed  |
| 13115 | ROLESET_OPEN_INVITATION_EXISTS           | An invitation is already pending.         | Accept or decline the existing invitation         |
| 13116 | ROLESET_ALREADY_MEMBER                   | You are already a member.                 | No action needed                                  |
| 13117 | ACCOUNT_DELETION_BLOCKED                 | This account can't be deleted yet.        | Resolve the listed blockers, then retry           |
| 13118 | FORUM_DISCUSSION_CATEGORY_NOT_EMPTY      | Discussion category still has posts.      | Move or remove the posts first                    |
| 13121 | LICENSE_ENTITLEMENT_UNEVALUABLE          | License entitlement could not be checked. | Try again or contact support                      |
| 13122 | ROLESET_APPLICATIONS_NOT_ACCEPTED        | Applications are not being accepted.      | Ask an admin for an invitation                    |
| 13123 | ROLESET_JOIN_NOT_ELIGIBLE                | You can't join directly.                  | Apply or ask an admin for an invitation           |
| 13124 | ROLESET_INVITATION_RESEND_THROTTLED      | Invitation was resent recently.           | Wait before resending the invitation              |
| 13125 | ROLESET_INVITATION_EMAIL_BUDGET_EXCEEDED | Too many invitation emails sent.          | Wait and try again later                          |

### 14xxx - System/Infrastructure Errors

| Code  | String Code                           | User Message                             | Resolution                                |
| ----- | ------------------------------------- | ---------------------------------------- | ----------------------------------------- |
| 14101 | BOOTSTRAP_FAILED                      | System initialization failed.            | Contact support - server issue            |
| 14102 | NOTIFICATION_PAYLOAD_BUILDER_ERROR    | Notification error.                      | Retry the action                          |
| 14103 | GEO_LOCATION_ERROR                    | Location error.                          | Location services temporarily unavailable |
| 14104 | GEO_SERVICE_NOT_AVAILABLE             | Location service unavailable.            | Try again later                           |
| 14105 | GEO_SERVICE_ERROR                     | Location service error.                  | Try again later                           |
| 14106 | GEO_SERVICE_REQUEST_LIMIT_EXCEEDED    | Location service limit exceeded.         | Wait and try again                        |
| 14107 | STORAGE_DISABLED                      | Storage is disabled.                     | Storage feature not available             |
| 14108 | STORAGE_UPLOAD_FAILED                 | Upload failed.                           | Try again or use smaller file             |
| 14109 | LOCAL_STORAGE_SAVE_FAILED             | Failed to save locally.                  | Server storage issue - contact support    |
| 14110 | LOCAL_STORAGE_READ_FAILED             | Failed to read from local storage.       | Server storage issue - contact support    |
| 14111 | LOCAL_STORAGE_DELETE_FAILED           | Failed to delete from local storage.     | Server storage issue - contact support    |
| 14112 | DOCUMENT_SAVE_FAILED                  | Failed to save document.                 | Try again or contact support              |
| 14113 | DOCUMENT_READ_FAILED                  | Failed to read document.                 | Try again or contact support              |
| 14114 | DOCUMENT_DELETE_FAILED                | Failed to delete document.               | Try again or contact support              |
| 14115 | URL_RESOLVER_ERROR                    | Couldn't find what you were looking for. | Verify the URL is correct                 |
| 14116 | EXCALIDRAW_AMQP_RESULT_ERROR          | Whiteboard sync error.                   | Refresh and try again                     |
| 14117 | EXCALIDRAW_REDIS_INIT                 | Whiteboard initialization error.         | Refresh and try again                     |
| 14118 | EXCALIDRAW_SERVER_INIT                | Whiteboard server error.                 | Contact support                           |
| 14119 | SESSION_STORE_UNAVAILABLE             | Session service unavailable.             | Try again later                           |
| 14120 | STORAGE_SERVICE_UNAVAILABLE           | Storage service unavailable.             | Try again later                           |
| 14121 | PLATFORM_ROLE_ASSIGNMENT_AUDIT_FAILED | Role change could not be recorded.       | Retry - the role change was not applied   |
| 14122 | MEMO_PDF_UNAVAILABLE                  | PDF export temporarily unavailable.      | Try again later                           |

### 99xxx - Fallback Errors

| Code  | String Code | User Message                                       | Resolution                              |
| ----- | ----------- | -------------------------------------------------- | --------------------------------------- |
| 99999 | UNSPECIFIED | An unexpected error occurred. Reference: (errorId) | Use the errorId when contacting support |

**Fallback Behavior**: When an error status is not mapped in the registry, the system returns the fallback code `99999` and logs a warning to help developers identify unmapped errors. This ensures:

- No error goes unreported to users
- Developers are alerted to add missing mappings
- The `errorId` can still be used to trace the specific error in logs

---

## API Response Format

### GraphQL Error Response

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

### REST Error Response

```json
{
  "statusCode": 404,
  "code": "ENTITY_NOT_FOUND",
  "numericCode": 10101,
  "timestamp": "2026-01-22T10:30:00.000Z",
  "message": "Entity not found",
  "errorId": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Frontend Usage Examples

### JavaScript/TypeScript

```typescript
try {
  const result = await graphqlClient.query({ query: MY_QUERY });
} catch (error) {
  const numericCode = error.graphQLErrors?.[0]?.extensions?.numericCode;

  // Quick category check
  if (numericCode && Math.floor(numericCode / 1000) === 11) {
    // Authorization error - redirect to login or show permission message
    redirectToLogin();
  } else if (numericCode && Math.floor(numericCode / 1000) === 10) {
    // Not found - show 404 message
    showNotFoundMessage();
  }

  // Include numeric code in error reporting
  reportError({
    code: numericCode,
    errorId: error.graphQLErrors?.[0]?.extensions?.errorId,
    message: error.message,
  });
}
```

### Backward Compatibility

Existing code checking the string `code` field continues to work unchanged:

```typescript
// This still works!
if (error.extensions?.code === 'ENTITY_NOT_FOUND') {
  // Handle not found
}

// New code can also use numeric codes:
if (error.extensions?.numericCode === 10101) {
  // Handle not found
}
```

---

## Support Workflow

When a user reports an error:

1. **Get the numeric code** (e.g., 11104)
2. **Identify category** from first two digits (11 = Authorization)
3. **Route to appropriate team** based on category
4. **Look up specific code** in this document for resolution steps
5. **Use errorId** to find detailed logs if needed
