# Research – URL Resolver Parent Access

## Decision 1: Soft-authorization pattern for resolver traversal
- **Task**: Research how to detect resource existence while still reporting unauthorized outcomes for NestJS + TypeORM services.
- **Decision**: Replace direct `authorizationService.grantAccessOrFail` calls with helper methods that (a) load the entity via lookup services, (b) evaluate privileges returning `Success | NotAuthorized | NotFound`, and (c) attach sanitized descriptors even when access is denied. Throw only for structural errors (malformed URL, missing relationships).
- **Rationale**: Preserves current domain ownership of authorization while letting the resolver continue execution to compute the closest ancestor candidate. Soft-evaluation keeps control flow linear and avoids catching large exception trees.
- **Alternatives Considered**:
  1. **Catch-and-continue** around existing `grantAccessOrFail` calls – rejected because thrown exceptions do not carry enough structured data to differentiate missing vs. unauthorized states and would complicate log noise.
  2. **Run a second query without authorization** – rejected for security risk (risk of leaking metadata) and double query overhead.

## Decision 2: GraphQL contract structure for access metadata
- **Task**: Define schema additions enabling the client to consume access outcomes without breaking existing consumers.
- **Decision**: Introduce an abstract descriptor (`UrlResolverResult`) implemented by both the root result and a dedicated `UrlResolverQueryClosestAncestor` type. The root `UrlResolverQueryResults` gains `state: UrlResolverResultState!` and a nullable `closestAncestor`, while the ancestor type reuses the descriptor fields and appends `url: String!`.
- **Rationale**: The descriptor interface keeps resource identity DRY, the ancestor type surfaces canonical redirect URLs, and the flattened state enum avoids extra nesting while staying backward compatible (new nullable field only).
- **Alternatives Considered**:
  1. **Reusing existing `UrlResolverQueryResultSpace` fields** – rejected to avoid mixing authorization state with resource identity (confusing for nested structures).
  2. **Representing ancestor references as scalar path strings only** – rejected because the client needs typed data (IDs, type) for analytics and UI decisions, in addition to the final `url`.

## Decision 3: Ancestor traversal + caching strategy
- **Task**: Determine how to enumerate ancestors efficiently across spaces, callouts, and contributions without N+1 lookups.
- **Decision**: Reuse existing lookup services to fetch each hierarchy level with requested relations, but cache intermediate space lookups within the resolver invocation (simple Map keyed by space ID) and pre-load contribution relationships via `relations` options. Traversal stops when the first accessible ancestor is found, at which point we serialize that node as `closestAncestor`.
- **Rationale**: Avoids introducing new repositories or ad-hoc SQL, keeps memory footprint bounded, and honors performance goal (<350 ms p95). Leveraging existing relation graphs ensures we have the metadata needed for sanitized descriptors without extra queries while short-circuiting once the redirect target is known.
- **Alternatives Considered**:
  1. **Eagerly loading entire ancestor chains via custom SQL** – rejected for complexity and higher coupling to schema details.
  2. **Lazy fetching each ancestor individually** – rejected due to worst-case triple roundtrips on deep links.

## Decision 4: Logging and telemetry approach
- **Task**: Ensure observability (Principle 5) without introducing unused metrics.
- **Decision**: Use existing Winston logger (`LogContext.URL_RESOLVER`) to emit `debug` entries for traversal decisions and `warn` entries for repeated unauthorized attempts, embedding sanitized context (`targetType`, `targetSlug`, `accessState`). Surface aggregated impacts through existing APM traces rather than new counters; rely on client telemetry for redirect success metrics.
- **Rationale**: Aligns with constitution guidance—instrument only signals we already consume and leverage central logging infrastructure. Keeps sensitive data out of logs while still enabling support to trace ancestor selection choices.
- **Alternatives Considered**:
  1. **Adding custom Prometheus metrics inside resolver** – rejected since the current stack does not scrape Nest metrics for this service and would violate “no orphaned observability.”
  2. **Silencing logs entirely** – rejected because support needs breadcrumbs when troubleshooting unexpected redirects.
