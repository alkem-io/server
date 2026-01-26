# Research: Notification Email Blacklist

## Decision 1: Where to persist blacklist data

- **Decision**: Store the blacklist inside the existing `platform.settings.integration` structure alongside `iframeAllowedUrls`, persisted through `PlatformSettingsService` + TypeORM JSON column.
- **Rationale**: Reuses current serialization, avoids schema drift, and keeps admin configuration co-located for transactional updates.
- **Alternatives considered**:
  - Separate table/entity just for blacklisted emails (adds migration and join overhead for a single array).
  - External config service (introduces new dependency surface without added value).

## Decision 2: Email validation and canonicalization

- **Decision**: Use class-validator `IsEmail` plus a domain-level sanitizer to lowercase addresses and reject wildcard characters before persistence.
- **Rationale**: Ensures deterministic comparisons, prevents duplicate variants, and leverages existing validation tooling already wired into GraphQL DTOs.
- **Alternatives considered**:
  - Regex-only validation (higher maintenance, misses edge cases covered by class-validator).
  - Case-sensitive storage (would allow duplicate entries differing only by casing).

## Decision 3: Distribution to downstream services

- **Decision**: Expose the blacklist exclusively through the existing GraphQL `platform.settings.integration` payload so downstream notification microservices can poll or subscribe for updates.
- **Rationale**: Keeps this feature focused on configuration management while letting specialized services enforce filtering according to their own lifecycles.
- **Alternatives considered**:
  - Adding suppression logic inside the platform API (duplicates behavior already owned by notification service).
  - Creating a dedicated sync API (increases surface area without tangible benefit over existing GraphQL path).

## Decision 4: Handling existing queued notifications

- **Decision**: Leave queued-notification handling to downstream services; the platform simply updates the blacklist atomically and exposes the result for consumers.
- **Rationale**: Avoids cross-service coupling and respects the separation of responsibilities noted during clarification.
- **Alternatives considered**:
  - Forcing cancellations from the platform (not feasible without deep access to the notification queue).
  - Tracking queued jobs inside platform settings (introduces inconsistent state and persistence overhead).

## Decision 5: Capacity bound and admin workflow

- **Decision**: Cap the blacklist at 250 entries with clear validation errors, and surface the current list via GraphQL for periodic audit.
- **Rationale**: Keeps payloads manageable (<10 KB), supports larger organizations, and prevents unbounded growth that could degrade settings payloads.
- **Alternatives considered**:
  - 100-entry cap (may be insufficient for multi-tenant deployments).
  - Unlimited entries (risks bloating integration settings document and slower reads).
