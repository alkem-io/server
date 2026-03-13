# Data Model: Unit Tests for src/core

## No Data Model Changes
This spec covers test-only changes. No database schema, entity, or migration changes are required.

## Key Domain Types Used in Tests

### ActorContext
- `actorID: string` - Actor identifier
- `credentials: ICredentialDefinition[]` - Authorization credentials
- `isAnonymous: boolean` - Anonymous flag
- `authenticationID?: string` - Kratos identity ID
- `guestName?: string` - Guest user name
- `expiry?: number` - Session expiry timestamp

### IAuthorizationPolicy
- `id: string` - Policy ID
- `type: string` - Policy type
- `credentialRules: IAuthorizationPolicyRuleCredential[]` - Credential-based rules
- `privilegeRules: IAuthorizationPolicyRulePrivilege[]` - Privilege escalation rules

### ICredentialDefinition
- `type: AuthorizationCredential` - Credential type enum
- `resourceID: string` - Resource identifier

### PaginationArgs
- `first?: number` - Forward pagination count
- `after?: string` - Forward cursor
- `last?: number` - Backward pagination count
- `before?: string` - Backward cursor
