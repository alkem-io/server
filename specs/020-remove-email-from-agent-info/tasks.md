# Tasks: Remove Email from AgentInfo

## Phase 1: Refactor Caching Strategy
- [x] Update `AgentInfoCacheService` to use `authenticationID` for cache keys <!-- id: 0 -->
- [x] Update `AuthenticationService` to use new cache keys <!-- id: 1 -->

## Phase 2: Decouple User Linking & Registration
- [x] Update `UserAuthenticationLinkService.resolveExistingUser` signature <!-- id: 2 -->
- [x] Update `UserService.createUserFromAgentInfo` signature <!-- id: 3 -->
- [x] Update `AuthenticationService` to pass email explicitly <!-- id: 4 -->

## Phase 3: Update Downstream Consumers
- [x] Update `SearchService` logic <!-- id: 5 -->
- [x] Update `MeResolverFields` logic <!-- id: 6 -->
- [x] Update Logging statements (grep for `agentInfo.email`) <!-- id: 7 -->
- [x] Update `TrustRegistry` and other adapters <!-- id: 8 -->

## Phase 4: Remove Field
- [x] Remove `email` from `AgentInfo` class <!-- id: 9 -->
- [x] Fix compilation errors <!-- id: 10 -->
- [x] Verify tests <!-- id: 11 -->
