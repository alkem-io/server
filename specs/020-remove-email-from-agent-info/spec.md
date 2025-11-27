# Spec: Remove Email from AgentInfo

## Problem
The `AgentInfo` class currently includes the `email` field. This creates several issues:
1.  **Privacy/Security**: PII (Personally Identifiable Information) is carried around in the request context and cached, increasing the surface area for data leaks.
2.  **Coupling**: Core services (Caching, User Linking) rely on `email` as a primary key, whereas the system is moving towards `authenticationID` (Ory Subject) and `userID` as stable identifiers.
3.  **Technical Debt**: It encourages patterns where email is used for logic checks (e.g., `!agentInfo.email` to detect anonymous users) instead of explicit flags or IDs.

## Outcomes
1.  `AgentInfo` class no longer contains `email` or `emailVerified`.
2.  `AgentInfoCacheService` uses `authenticationID` (or `userID` if available) as the cache key.
3.  User registration and linking flows accept email explicitly from the authentication provider (Ory) rather than implicitly via `AgentInfo`.
4.  All downstream consumers (Search, Logging, Resolvers) use `authenticationID` or `userID` for identification and logic.

## Constraints
*   **Zero Downtime**: Login and Registration flows must continue to work without interruption.
*   **Backwards Compatibility**: Existing cached sessions might need to be invalidated or handled gracefully during deployment.
*   **Observability**: Logging must be updated to use IDs, ensuring we don't lose traceability while improving privacy.
