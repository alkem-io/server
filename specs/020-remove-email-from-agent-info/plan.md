# Plan: Remove Email from AgentInfo

## Phases

### Phase 1: Refactor Caching Strategy
*   **Goal**: Stop using email as the cache key for `AgentInfo`.
*   **Changes**:
    *   Update `AgentInfoCacheService` to use `authenticationID` as the primary cache key.
    *   Update `AuthenticationService` to look up cache by `authenticationID`.
*   **Risks**: Cache misses during deployment (acceptable, will just re-fetch).

### Phase 2: Decouple User Linking & Registration
*   **Goal**: Pass email explicitly to services that need it for lookup/creation, instead of reading it from `AgentInfo`.
*   **Changes**:
    *   Update `UserAuthenticationLinkService.resolveExistingUser` to accept `email` as a separate argument.
    *   Update `UserService.createUserFromAgentInfo` to accept `email` as a separate argument.
    *   Update `AuthenticationService` to extract email from `OrySession` and pass it to the above services.

### Phase 3: Update Downstream Consumers
*   **Goal**: Remove reliance on `agentInfo.email` in business logic and logging.
*   **Changes**:
    *   **SearchService**: Replace `!agentInfo.email` check with `agentInfo.isAnonymous`.
    *   **MeResolver**: Use `agentInfo.userID` or `agentInfo.authenticationID` for checks.
    *   **Logging**: Replace email logging with `userID` or `authenticationID`.
    *   **Trust Registry/Claims**: Ensure claims are built from the user entity or passed explicitly if needed.

### Phase 4: Remove Field
*   **Goal**: Physically remove the field from the class.
*   **Changes**:
    *   Delete `email` and `emailVerified` from `AgentInfo` class.
    *   Fix any remaining compilation errors.

## Risks & Mitigations
*   **Risk**: Registration flow breaks because email is missing.
    *   **Mitigation**: Phase 2 ensures email is passed explicitly from the source (Ory Session) before the field is removed.
*   **Risk**: "Me" queries fail for authenticated-but-not-registered users.
    *   **Mitigation**: Ensure `authenticationID` is populated and used for these checks.

## Exit Criteria
*   `AgentInfo` has no `email` field.
*   `pnpm test:ci` passes.
*   Manual verification of Login and Registration flows.
