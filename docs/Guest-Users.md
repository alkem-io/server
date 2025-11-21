# Guest User Implementation

## Overview

This implementation provides ephemeral guest users - anonymous users with a client-provided name. No database storage or authentication tokens are required. The implementation uses header-based guest detection during the authentication flow for seamless integration.

## How It Works

### User Types & Authentication Status:

1. **Anonymous**: No authentication, no name header → `GLOBAL_ANONYMOUS` credential → `UserAuthenticationStatus.ANONYMOUS`
2. **Guest**: No authentication, with name header → `GLOBAL_GUEST` credential → `UserAuthenticationStatus.GUEST`
3. **Authenticated**: Valid JWT session → `GLOBAL_REGISTERED` credential → `UserAuthenticationStatus.AUTHENTICATED`

### Guest Name Header

Clients can provide a guest name using the `x-guest-name` header (defined as `X_GUEST_NAME_HEADER` constant in `src/core/authentication/constants.ts`):

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-guest-name: John Visitor" \
  -d '{"query": "{ whoAmI { displayName authenticationStatus guestName credentials { type resourceID description } } }"}' \
  http://localhost:4000/graphql
```

### Implementation Details

#### Core Architecture:

1. **AgentInfo Extension**: Added `guestName` field to store client-provided name
2. **Authentication Flow**: Modified `OryStrategy` to check for `x-guest-name` header when no valid JWT session exists
3. **Authorization**: Guest users get `GLOBAL_GUEST` credential with configurable privileges
4. **Testing Interface**: Enhanced `whoAmI` query with structured response including credentials details

#### Authentication Flow:

The guest detection happens in `OryStrategy.validate()`:

1. Check if valid JWT session exists
2. If no session, check for `X_GUEST_NAME_HEADER` (`x-guest-name`) header
3. If guest name present, create guest `AgentInfo` with `GLOBAL_GUEST` credential
4. Otherwise, fallback to anonymous `AgentInfo`

### Code Changes

#### Core Components:

- **AgentInfo**: Added `guestName` field for ephemeral guest identification
- **AgentInfoService.createGuestAgentInfo()**: Creates guest agent info with name and credentials
- **OryStrategy**: Primary authentication strategy now handles guest header detection
- **X_GUEST_NAME_HEADER**: Constant defining the guest name header (`x-guest-name`)
- **UserAuthenticationStatus**: New enum with `ANONYMOUS`, `GUEST`, `AUTHENTICATED` states
- **RoleName.GUEST** & **AuthorizationCredential.GLOBAL_GUEST**: New role/credential types

#### Test Interface:

- **WhoAmIDto**: Structured response with authentication status, credentials, and user details
- **CredentialInfoDto**: Detailed credential mapping with type, resourceID, and human-readable descriptions
- **GuestTestResolver**: Enhanced resolver with comprehensive credential descriptions

#### Authorization:

- Guests get `GLOBAL_GUEST` credential instead of `GLOBAL_ANONYMOUS`
- Can be extended to allow different privileges than anonymous users
- Configurable per-space guest access policies

### Enhanced Testing & Debugging

The improved `whoAmI` query provides detailed information:

```graphql
query {
  whoAmI {
    displayName
    authenticationStatus # ANONYMOUS | GUEST | AUTHENTICATED
    userID
    guestName
    credentials {
      type # e.g., "global-guest"
      resourceID # e.g., "(global)" or specific resource ID
      description # e.g., "Global guest access (ephemeral user)"
    }
  }
}
```

**Response Examples:**

Anonymous user:

```json
{
  "displayName": "Anonymous User",
  "authenticationStatus": "ANONYMOUS",
  "credentials": [
    {
      "type": "global-anonymous",
      "resourceID": "(global)",
      "description": "Global anonymous access"
    }
  ]
}
```

Guest user (with `x-guest-name: John Visitor`):

```json
{
  "displayName": "John Visitor",
  "authenticationStatus": "GUEST",
  "guestName": "John Visitor",
  "credentials": [
    {
      "type": "global-guest",
      "resourceID": "(global)",
      "description": "Global guest access (ephemeral user)"
    }
  ]
}
```

Authenticated user:

```json
{
  "displayName": "John Doe",
  "authenticationStatus": "AUTHENTICATED",
  "userID": "user-123",
  "credentials": [
    {
      "type": "global-registered",
      "resourceID": "(global)",
      "description": "Global registered user access"
    },
    {
      "type": "space-member",
      "resourceID": "space-456",
      "description": "Space member for resource space-456"
    }
  ]
}
```

### Extending Guest Privileges

To allow guests to contribute to callouts, update the authorization policies:

```typescript
// In CalloutAuthorizationService or similar
const guestContributeRule =
  this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
    [AuthorizationPrivilege.CREATE_POST],
    [AuthorizationCredential.GLOBAL_GUEST],
    'guest-contribute'
  );

authorizationPolicy.credentialRules.push(guestContributeRule);
```

### Benefits

- **Lightweight**: No database storage, purely header-based
- **Stateless**: No session management for guests
- **Flexible**: Easy to extend guest privileges
- **Debuggable**: Comprehensive credential and status information
- **Type-safe**: Strong typing with enums and DTOs
- **Standards-compliant**: Integrates with existing authentication flow

This approach provides named anonymous users for better UX in callout contributions while maintaining the platform's security and authorization model.
