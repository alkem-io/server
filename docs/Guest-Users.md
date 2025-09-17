# Guest User Implementation

## Overview

This implementation provides ephemeral guest users - anonymous users with a client-provided name. No database storage or authentication tokens are required.

## How It Works

### User Types:

1. **Anonymous**: No authentication, no name header → `GLOBAL_ANONYMOUS` credential
2. **Guest**: No authentication, with name header → `GLOBAL_GUEST` credential
3. **Registered**: Authenticated users → `GLOBAL_REGISTERED` credential

### Guest Name Header

Clients can provide a guest name using the `x-guest-name` header:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-guest-name: John Visitor" \
  -d '{"query": "{ whoAmI }"}' \
  http://localhost:3000/graphql
```

### Implementation Details

1. **AgentInfo Extension**: Added `guestName` field to store client-provided name
2. **Authentication Flow**: Modified `GraphqlGuard` to check for `x-guest-name` header when authentication fails
3. **Authorization**: Guest users get `GLOBAL_GUEST` credential with configurable privileges
4. **Space Access**: Guests can have different access levels than anonymous users (e.g., read user lists in public spaces)

### Code Changes

#### Core Components:

- `AgentInfo`: Added `guestName` field
- `AgentInfoService.createGuestAgentInfo()`: Creates guest agent info with name
- `GraphqlGuard`: Checks for guest name header when auth fails
- `RoleName.GUEST` & `AuthorizationCredential.GLOBAL_GUEST`: New role/credential types

#### Authorization:

- Guests get `READ_USERS` privilege in public spaces (unlike anonymous users)
- Can be extended to allow guest contributions to callouts
- Configurable per-space guest access policies

### Usage in Callouts

For callout contributions, you can check if the user is a guest:

```typescript
@Mutation(() => Post)
async createPost(
  @Args('postData') postData: CreatePostInput,
  @CurrentUser() agentInfo: AgentInfo
): Promise<Post> {
  const creatorName = agentInfo.guestName
    ? `Guest: ${agentInfo.guestName}`
    : agentInfo.firstName
    ? `${agentInfo.firstName} ${agentInfo.lastName}`
    : 'Anonymous';

  // Create post with guest name as creator identifier
  return await this.postService.createPost(postData, creatorName);
}
```

### Testing

Test the functionality:

```graphql
# Anonymous user (no header)
query {
  whoAmI
}
# Returns: "Hello, Anonymous User"

# Guest user (with header: x-guest-name: John Visitor)
query {
  whoAmI
}
# Returns: "Hello, Guest: John Visitor"

# Authenticated user
query {
  whoAmI
}
# Returns: "Hello, John Doe"
```

### Extending Guest Privileges

To allow guests to contribute to callouts, update the authorization policies in:

- `CalloutAuthorizationService`
- `PostAuthorizationService`
- Space-level authorization policies

Add rules like:

```typescript
const guestContributeRule =
  this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
    [AuthorizationPrivilege.CREATE_POST],
    [AuthorizationCredential.GLOBAL_GUEST],
    'guest-contribute'
  );
```

This approach is lightweight, stateless, and doesn't require database changes while providing named anonymous users for better UX in callout contributions.
