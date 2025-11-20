# Data Model: Notification Email Blacklist

## PlatformIntegrationSettings (existing)

- **Fields impacted**:
  - `iframeAllowedUrls: string[]` (unchanged)
  - `notificationEmailBlacklist: string[]` _(new)_
- **Relationships**: Owned by `Platform` aggregate; persisted via `PlatformSettingsEntity` JSON blob.
- **Validation rules**:
  - `notificationEmailBlacklist` length ≤ 250 entries.
  - Each entry must exist only once (case-insensitive uniqueness enforced before persistence).
  - Stored array order reflects insertion order for audit readability.
- **State transitions**:
  - Add email → append sanitized value if not present.
  - Remove email → filter out matching value; no tombstones required.

## NotificationBlacklistEntry (conceptual)

- **Fields**:
  - `email: string` (lowercase canonical)
- - `createdBy: AgentId` (captured via existing audit log emitted by platform mutations)
- - `createdAt: Date` (audit log timestamp)
- **Lifecycle**:
  - Entries exist only within the array; metadata such as actor/timestamp resides in audit logs rather than in the JSON payload to match `iframeAllowedUrls` structure.
- **Validation rules**:
  - Email must pass `IsEmail` validator and contain neither whitespace nor wildcard characters.
  - Must not match existing entries when compared case-insensitively.

## Interactions

1. Platform admin invokes add/remove mutations → `PlatformSettingsService` mutates `notificationEmailBlacklist` with validation using domain helpers.
2. GraphQL `platform.settings.integration` query exposes the latest array for downstream notification services to fetch or cache.
3. Audit log entries reference `NotificationBlacklistEntry` conceptual data to trace actor/time when admins modify the list.
