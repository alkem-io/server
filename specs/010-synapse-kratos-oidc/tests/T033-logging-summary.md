# T033: Comprehensive Logging Implementation Summary

**Task**: Add comprehensive logging for OIDC authentication flow
**Status**: ✅ Complete
**Date**: 2025-01-31

---

## Overview

Implemented structured JSON logging for the OIDC authentication flow using Winston logger with `nest-winston` integration. All logs follow the project's established logging patterns and meet FR-012 (logging requirements) and NFR-003 (observability) specifications.

---

## Files Modified

### 1. `src/common/enums/logging.context.ts`
**Change**: Added new log context
```typescript
OIDC = 'oidc',
```
**Purpose**: Dedicated context for filtering OIDC-related logs in production log aggregation systems (Kibana/CloudWatch)

---

### 2. `src/services/api/oidc/oidc.controller.ts`
**Changes**:
- Replaced basic `Logger` with Winston `LoggerService` via `@Inject(WINSTON_MODULE_NEST_PROVIDER)`
- Added structured logging to all endpoints with required fields
- Implemented proper log levels (INFO, ERROR, DEBUG)

**Login Endpoint** (`/oidc/login`):
- **DEBUG**: Processing login challenge (includes challengeId, skip flag, timestamp)
- **DEBUG**: Checking Kratos session cookie (includes challengeId, sessionPresent, timestamp)
- **DEBUG**: Redirecting to Kratos login (includes challengeId, kratosLoginUrl, returnTo, timestamp)
- **DEBUG**: Fetching user info from Kratos session (includes challengeId, timestamp)
- **INFO**: Login accepted successfully (includes challengeId, userId, timestamp)
- **ERROR**: Error processing login challenge (includes challengeId, errorCode, status, timestamp, stack trace)

**Consent Endpoint** (`/oidc/consent`):
- **DEBUG**: Processing consent challenge (includes challengeId, skip, subject, requestedScope, timestamp)
- **DEBUG**: Extracted user info for consent (includes challengeId, userId, given_name, timestamp)
- **INFO**: Consent accepted successfully (includes challengeId, userId, scopes, timestamp)
- **ERROR**: Error processing consent challenge (includes challengeId, errorCode, status, timestamp, stack trace)

**getUserInfoFromKratosSession (Private Method)**:
- **WARN**: No Kratos session cookie provided
- **DEBUG**: Calling Kratos whoami (includes url)
- **WARN**: Kratos whoami failed (includes status)
- **WARN**: No identity data in Kratos session
- **DEBUG**: Extracted identity from Kratos session (includes email)
- **WARN**: Failed to fetch user info from Kratos session

---

### 3. `src/services/api/oidc/oidc.service.ts`
**Changes**:
- Replaced basic `Logger` with Winston `LoggerService` via `@Inject(WINSTON_MODULE_NEST_PROVIDER)`
- Added structured logging to all Hydra Admin API interactions

**getLoginChallenge**:
- **DEBUG**: Fetching login challenge from Hydra (includes challengeId)
- **ERROR**: Failed to fetch login challenge (includes challengeId, errorCode: `HYDRA_GET_LOGIN_CHALLENGE_FAILED`)

**acceptLoginRequest**:
- **DEBUG**: Accepting login request in Hydra (includes challengeId, subject)
- **ERROR**: Failed to accept login request (includes challengeId, errorCode: `HYDRA_ACCEPT_LOGIN_FAILED`)

**getConsentChallenge**:
- **DEBUG**: Fetching consent challenge from Hydra (includes challengeId)
- **ERROR**: Failed to fetch consent challenge (includes challengeId, errorCode: `HYDRA_GET_CONSENT_CHALLENGE_FAILED`)

**acceptConsentRequest**:
- **DEBUG**: Accepting consent request in Hydra (includes challengeId, grantedScopes)
- **ERROR**: Failed to accept consent request (includes challengeId, errorCode: `HYDRA_ACCEPT_CONSENT_FAILED`)

---

## Log Level Guidelines

### INFO (`.log` method)
**Usage**: Successful authentication events
**Examples**:
- Login accepted successfully
- Consent accepted successfully

**Fields**: challengeId, userId, timestamp, (scopes for consent)

---

### ERROR (`.error` method)
**Usage**: Authentication failures
**Examples**:
- Error processing login challenge
- Error processing consent challenge
- Failed to accept login request
- Failed to fetch consent challenge

**Fields**: challengeId, errorCode, status (HTTP status if available), timestamp, stack trace

**Error Codes**:
- `INVALID_CHALLENGE` - Challenge not found (404)
- `INVALID_CONSENT_REQUEST` - Bad consent request (400)
- `HYDRA_ERROR` - Generic Hydra communication error
- `HYDRA_GET_LOGIN_CHALLENGE_FAILED` - Failed to fetch login challenge
- `HYDRA_ACCEPT_LOGIN_FAILED` - Failed to accept login request
- `HYDRA_GET_CONSENT_CHALLENGE_FAILED` - Failed to fetch consent challenge
- `HYDRA_ACCEPT_CONSENT_FAILED` - Failed to accept consent request

---

### DEBUG (`.debug` method)
**Usage**: OAuth2 challenge details and flow progression
**Examples**:
- Processing login challenge
- Checking Kratos session cookie
- Redirecting to Kratos login
- Fetching user info from Kratos session
- Processing consent challenge
- Extracted user info for consent
- Fetching login/consent challenge from Hydra
- Accepting login/consent request in Hydra

**Fields**: challengeId, userId (when available), timestamp, additional context (skip, sessionPresent, url, subject, requestedScope, grantedScopes)

---

### WARN (`.warn` method)
**Usage**: Non-critical issues (recoverable failures)
**Examples**:
- No Kratos session cookie provided
- Kratos whoami failed
- No identity data in Kratos session
- Failed to fetch user info from Kratos session

**Fields**: Descriptive message, status (when applicable)

---

## JSON Structure Example

```json
{
  "level": "info",
  "message": "Login accepted successfully",
  "timestamp": "2025-01-31T14:23:45.123Z",
  "context": "oidc",
  "challengeId": "a1b2c3d4e5f6g7h8",
  "userId": "user@example.com"
}
```

```json
{
  "level": "error",
  "message": "Error processing login challenge: Request failed with status code 404",
  "timestamp": "2025-01-31T14:25:10.456Z",
  "context": "oidc",
  "challengeId": "x9y8z7w6v5u4t3s2",
  "errorCode": "INVALID_CHALLENGE",
  "status": 404,
  "stack": "Error: Request failed with status code 404\n    at..."
}
```

---

## Compliance Validation

### FR-012: Logging of Key Events
✅ **PASS** - All authentication events logged:
- Login challenge processing
- Consent challenge processing
- User info retrieval from Kratos
- Hydra Admin API interactions
- Authentication failures with error details

### NFR-003: Observability
✅ **PASS** - JSON-structured logging with required fields:
- `level`: INFO/ERROR/DEBUG/WARN
- `timestamp`: ISO 8601 format
- `challengeId`: OAuth2 challenge identifier
- `userId`: User email (where applicable)
- `errorCode`: Standardized error codes
- `context`: `oidc` for filtering

---

## Verification

### Log Output Example (Development)
```
[Nest] 12345  - 01/31/2025, 2:23:45 PM   DEBUG [oidc] Processing login challenge
{
  "challengeId": "a1b2c3d4e5f6g7h8",
  "skip": false,
  "timestamp": "2025-01-31T14:23:45.123Z"
}
```

### Log Output Example (Production - JSON)
```json
{"level":"debug","message":"Processing login challenge","timestamp":"2025-01-31T14:23:45.123Z","context":"oidc","challengeId":"a1b2c3d4e5f6g7h8","skip":false}
```

---

## Next Steps

1. **T033a**: Test Kratos failure scenarios to validate ERROR logging
2. **T033d**: Validate log severity levels by grepping log output
3. **T033c**: Document error handling scenarios in quickstart.md

---

## Testing Recommendations

### Manual Testing
1. **Normal Flow**: Perform Matrix login, verify INFO logs for "Login accepted successfully" and "Consent accepted successfully"
2. **Missing Challenge**: Call `/oidc/login` without query param, verify ERROR log with errorCode
3. **Kratos Unavailable**: Stop Kratos, attempt login, verify ERROR logs for Kratos session fetch
4. **Invalid Challenge**: Use expired/invalid challenge ID, verify ERROR log with errorCode: `INVALID_CHALLENGE`

### Log Grep Commands
```bash
# Filter by context
docker logs alkemio_dev_server 2>&1 | grep '"context":"oidc"'

# Filter INFO level (successful auth)
docker logs alkemio_dev_server 2>&1 | grep '"context":"oidc"' | grep '"level":"info"'

# Filter ERROR level (failures)
docker logs alkemio_dev_server 2>&1 | grep '"context":"oidc"' | grep '"level":"error"'

# Filter by challengeId
docker logs alkemio_dev_server 2>&1 | grep '"context":"oidc"' | grep '"challengeId":"a1b2c3d4"'

# Count error codes
docker logs alkemio_dev_server 2>&1 | grep '"errorCode"' | grep '"context":"oidc"' | wc -l
```

---

## Implementation Notes

1. **Optional Chaining**: All logger calls use optional chaining (`this.logger.log?.()`) to handle cases where logger might be undefined (following project patterns)
2. **LogContext Enum**: Used `LogContext.OIDC` for consistency with existing logging infrastructure
3. **Winston Integration**: Injected via `WINSTON_MODULE_NEST_PROVIDER` to leverage global Winston configuration (JSON format in production, nestLike format in dev)
4. **Timestamp Format**: ISO 8601 format for consistency with existing logs
5. **Error Stack Traces**: Included in ERROR logs for debugging (4th parameter to `logger.error()`)

---

## Lessons Learned

1. **Winston LoggerService**: Methods are optional (can be undefined), requiring optional chaining
2. **Consistent Context**: Using enum `LogContext.OIDC` ensures consistent filtering across all log aggregation tools
3. **Structured Data**: Passing objects as second parameter to logger methods enables JSON-structured logging in production
4. **Error Codes**: Standardized error codes improve alerting and monitoring dashboard creation

---

## Related Documentation

- **Logging Architecture**: `src/config/winston.config.ts`
- **Log Context Enum**: `src/common/enums/logging.context.ts`
- **Winston Configuration**: `alkemio.yml` (monitoring.logging section)
- **Example Services**: `src/services/external/elasticsearch/contribution-reporter/contribution.reporter.service.ts`

---

**Status**: ✅ Ready for validation (T033d) and failure scenario testing (T033a)
