# T012b: Synapse Token Validation Test

**Test ID**: T012b
**Feature**: FR-004 (Token validation)
**Date**: 2025-10-21

## Test Objective

Validate that Synapse correctly rejects expired or invalid OIDC tokens and prompts re-authentication.

## Test Prerequisites

- Synapse is running with OIDC configuration enabled
- Hydra is operational and accessible
- Kratos is running with at least one test user
- Element client available for testing (Web or Desktop)

## Test Scenarios

### Scenario 1: Expired Access Token

**Given**: User has an active Matrix session with valid OIDC token
**When**: Token expires (wait for refresh_token_lifetime=300s or manipulate token)
**Then**:
- Next Matrix action triggers token refresh
- If refresh succeeds, session continues
- If refresh fails, user is prompted to re-authenticate

**Expected Behavior**:
- Token refresh attempted automatically
- On refresh failure: Error message displayed
- User redirected to OIDC login flow
- After successful re-authentication, user returns to Matrix

### Scenario 2: Invalid Token (Manipulated)

**Given**: User attempts to use a manipulated/invalid OIDC token
**When**: Matrix client makes authenticated request with invalid token
**Then**:
- Synapse validates token signature
- Validation fails
- Authentication denied
- User prompted to re-authenticate

**Expected Log Output**:
```
synapse.handlers.oidc - WARNING - Could not validate token: [error message]
synapse.rest.client - INFO - Authentication failed, redirecting to login
```

### Scenario 3: Token from Disabled Account

**Given**: User has active Matrix session
**When**:
- Admin disables user's Kratos account
- User attempts Matrix action
- Token refresh triggered
**Then**:
- Hydra queries Kratos for user validation
- Kratos returns "account disabled"
- Token refresh denied
- Matrix session terminated
- User redirected to login with error message

**Maximum Delay**: 300 seconds (refresh_token_lifetime setting)

## Test Execution

### Manual Test (Scenario 1)

1. **Setup**:
   ```bash
   # Login to Matrix via OIDC
   # Wait for token expiry (300s) or manipulate token expiry in database
   ```

2. **Trigger Action**:
   - Send a message in Matrix client
   - Or attempt to join a room
   - Or refresh the client

3. **Observe**:
   - Check Synapse logs for token refresh attempt
   - Verify automatic re-authentication flow
   - Confirm session continues seamlessly

### Manual Test (Scenario 3 - Account Disable)

1. **Setup**:
   ```bash
   # Login to Matrix via OIDC
   # Note: Account is redacted01@gmail.com
   ```

2. **Disable Account in Kratos**:
   ```bash
   # Option 1: Via Kratos Admin API
   curl -X PATCH http://localhost:4434/admin/identities/{identity_id} \
     -H "Content-Type: application/json" \
     -d '{"state": "inactive"}'

   # Option 2: Via Kratos Admin UI (if available)
   # Navigate to http://localhost:4434/admin/identities
   # Find user and set state to "inactive"
   ```

3. **Wait for Token Refresh**:
   ```bash
   # Wait up to 5 minutes (300s refresh interval)
   # Or force refresh by restarting Matrix client
   ```

4. **Attempt Matrix Action**:
   - Send a message
   - Join a room
   - Refresh client

5. **Expected Outcome**:
   - Token refresh fails
   - User session terminates
   - User redirected to login
   - Login attempt fails with "account disabled" error

### Automated Test (Integration Test)

```bash
# Run integration test for token validation
npm test -- src/services/api/oidc/oidc.integration.spec.ts -t "token validation"
```

## Test Results

### Test Execution Log

**Date**: 2025-10-21
**Tester**: [Name]
**Environment**: Docker Compose development

**Scenario 1: Expired Access Token**
- ✅ Status: [PASS/FAIL]
- Token refresh attempted: [YES/NO]
- Session continued: [YES/NO]
- Logs captured: [YES/NO]
- Notes: [Any observations]

**Scenario 2: Invalid Token**
- ⏸️ Status: [Pending - requires token manipulation]
- Authentication denied: [YES/NO]
- Error message displayed: [YES/NO]
- Re-authentication triggered: [YES/NO]

**Scenario 3: Disabled Account**
- ⏸️ Status: [Pending - requires Kratos account disable]
- Token refresh denied: [YES/NO]
- Session terminated within 5 minutes: [YES/NO]
- Error message appropriate: [YES/NO]

## Current Status

Based on Synapse logs analysis (2025-10-21):

✅ **OIDC Configuration Loaded**: Synapse successfully initialized with "oidc-hydra" provider
✅ **Token Exchange Working**: HTTP 200 responses for token endpoint
✅ **Userinfo Endpoint Working**: HTTP 200 responses for userinfo
✅ **User Mapping Working**: Found existing mapping for user
⚠️ **Token Authentication Issue** (historical): One instance of `invalid_client` error due to auth method mismatch - RESOLVED (client now uses `client_secret_basic`)

## Validation Criteria

For T012b to be marked complete, the following must be verified:

1. ✅ Synapse logs show token validation attempts
2. ⏸️ Expired tokens are rejected with appropriate error
3. ⏸️ Invalid tokens are rejected at signature validation
4. ⏸️ Disabled accounts trigger session termination within 5 minutes
5. ⏸️ User-friendly error messages displayed (FR-014)
6. ⏸️ Re-authentication flow works seamlessly

## Related Functional Requirements

- **FR-004**: OIDC token validation - Synapse must validate all OIDC tokens
- **FR-011**: Token refresh - Support for automatic token refresh
- **FR-014**: Error handling - User-friendly error messages
- **FR-015**: Account revocation - Terminate sessions when accounts disabled
- **NFR-002**: Token refresh interval - Maximum 300 seconds

## Notes

- Current `refresh_token_lifetime` is set to 300 seconds (5 minutes)
- Session lifetime is 48 hours (matches Kratos session lifespan)
- Token validation happens on every API request
- Token refresh is automatic and transparent to users
- Account disable propagation has maximum 5-minute delay

## Recommendations

1. **Automated Testing**: Create integration tests for token expiry scenarios
2. **Monitoring**: Add alerts for high token validation failure rates
3. **Documentation**: Document token lifecycle for operators
4. **Production Hardening**: Ensure token refresh errors have retry logic
