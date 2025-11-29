# Data Model – URL Resolver Parent Access

## Interface: UrlResolverResult
- **Purpose**: Shared descriptor implemented by both the primary resolver response and ancestor references. Keeps resource identity (type, nested nodes) centralized.
- **Fields**:
  - `type: UrlType!`
  - `space?: UrlResolverQueryResultSpace`
  - `organizationId?: UUID`
  - `userId?: UUID`
  - `virtualContributor?: UrlResolverQueryResultVirtualContributor`
  - `discussionId?: UUID`
  - `innovationHubId?: UUID`
  - `innovationPack?: UrlResolverQueryResultInnovationPack`
- **Validation Rules**:
  - Descriptor fields inherit existing visibility constraints (omit IDs when user lacks permission; slugs remain safe because they originate from URL paths).
  - Implementations MUST NOT add side-effecting resolvers—pure data containers only.

## Entity: UrlResolverQueryResults
- **Purpose**: Primary resolver payload returned to the client.
- **Extends**: `UrlResolverResult` interface.
- **Additional Fields**:
  - `state: UrlResolverResultState!` – summarized outcome for the requested resource.
  - `closestAncestor?: UrlResolverQueryClosestAncestor` – nullable pointer to the nearest accessible ancestor representation.
- **Validation Rules**:
  - When populating `closestAncestor`, ensure nested `closestAncestor` on the ancestor object is `null` to prevent recursion.
  - Leave `closestAncestor` unset when the target itself is `SUCCESS`.

## Entity: UrlResolverQueryClosestAncestor
- **Purpose**: Provide sanitized ancestor metadata along with a ready-to-use canonical URL for redirection.
- **Extends**: `UrlResolverResult` interface.
- **Additional Fields**:
  - `url: string` – fully-qualified path/slug the client should redirect toward.
- **Rules**:
  - Set only when the ancestor evaluates to `SUCCESS` for the current viewer.
  - Nested `closestAncestor` is always `null` to keep payload depth predictable.
  - Canonical `url` must reflect the ancestor, not the original target.

## Enum: UrlResolverResultState
- **Values**: `SUCCESS`, `NOT_AUTHORIZED`, `NOT_FOUND`.
- **Rules**:
  - `SUCCESS` implies no ancestor assistance required (`closestAncestor = null`).
  - `NOT_AUTHORIZED` covers both unauthenticated guests and authenticated users lacking privileges; resolver still supplies the best ancestor when available.
  - `NOT_FOUND` indicates the slug could not be resolved; `closestAncestor` is `null` unless a higher-level resource is accessible and should be suggested.

## Supporting Entity: AccessEvaluationContext
- **Purpose**: Internal helper struct for resolver logic; not exposed via GraphQL but necessary for implementation planning.
- **Fields**:
  - `agent: AgentInfo`
  - `authorization: Authorization`
  - `requiresAuthentication: boolean`
  - `membershipScopes: AuthorizationPrivilege[]`
- **Behavior**:
  - Provides method `evaluate(privilege: AuthorizationPrivilege): UrlResolverResultState` returning `SUCCESS`, `NOT_AUTHORIZED`, or `NOT_FOUND` without throwing; the result guides both logging and ancestor traversal.

## State Transitions
- **Success Path**: Entity resolved and viewer has access → `state = SUCCESS`, `closestAncestor = null`.
- **Not Authorized Path**: Entity resolved but viewer lacks privileges (including unauthenticated guests) → `state = NOT_AUTHORIZED`, continue traversing parents until an accessible ancestor is found and serialized as `closestAncestor`.
- **Not Found Path**: Entity missing or deleted → `state = NOT_FOUND`, optionally include `closestAncestor` only if a higher-level resource exists and is accessible; otherwise keep it `null`.
