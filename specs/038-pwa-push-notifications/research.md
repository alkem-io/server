# Research: PWA Push Notifications

**Feature**: 038-pwa-push-notifications | **Date**: 2026-03-01

## Decision 1: Push Notification Delivery Protocol

**Decision**: W3C Web Push Protocol with VAPID authentication via the `web-push` npm library.

**Rationale**:
- Standards-based protocol supported by all modern browsers (Chrome, Firefox, Safari, Edge)
- VAPID (Voluntary Application Server Identification) eliminates dependency on vendor-specific push services (FCM, APNs)
- The `web-push` library is the established Node.js implementation (~4M weekly npm downloads, actively maintained)
- No Firebase or third-party push service dependency required
- Direct server-to-push-service communication without intermediary SDKs

**Alternatives Considered**:
- **Firebase Cloud Messaging (FCM)**: Vendor lock-in to Google, requires Firebase project setup, adds external service dependency. Rejected per Constitution Principle 10 (simplicity).
- **OneSignal / Pusher**: Third-party SaaS dependency, cost at scale, data leaves platform. Rejected per Constitution Principle 8 (secure-by-design).
- **Server-Sent Events (SSE)**: Only works when browser tab is open, not a true push mechanism. Does not satisfy FR-002 (notifications when browser closed).

## Decision 2: Push Module Architecture

**Decision**: New NestJS module within the existing server monolith, co-located with notification adapters.

**Rationale**:
- Existing notification pipeline already follows adapter pattern (InApp, External). Push becomes a third adapter.
- Shared recipient resolution logic (`NotificationRecipientsService`) can be extended, not duplicated.
- Single deployment unit reduces operational complexity.
- Existing RabbitMQ and Redis infrastructure reused without additional services.

**Alternatives Considered**:
- **Separate microservice**: Unnecessary at current scale (10k subscriptions target). Adds deployment complexity, network latency, and service discovery overhead. Constitution Principle 10 requires written rationale for architectural escalation — current scale does not justify it.
- **Serverless/Lambda**: Alkemio is self-hosted, Lambda introduces cloud dependency.

## Decision 3: Device Subscription Storage

**Decision**: New `push_subscription` PostgreSQL table with dedicated TypeORM entity.

**Rationale**:
- Subscriptions need their own lifecycle (create, expire, cleanup) independent of user settings.
- Foreign key to user enables cascade delete (FR-014).
- Indexes on `userId` + `status` support efficient lookup during notification dispatch.
- Max 10 per user enforced at service layer (not DB constraint) to allow graceful oldest-replacement logic.
- Subscription data (endpoint, keys) is structured but fixed-schema — relational table preferred over JSONB.

**Alternatives Considered**:
- **JSONB array on user settings**: Would complicate subscription lifecycle management, make per-device operations awkward, and mix subscription state with preference state. Rejected.
- **Redis-only storage**: Subscriptions need persistence across restarts and are not ephemeral. Redis is appropriate for throttling counters, not subscription records.

## Decision 4: Notification Preference Extension

**Decision**: Add `push: boolean` field to `IUserSettingsNotificationChannels` interface, stored in existing JSONB `notification` column on `user_settings`.

**Rationale**:
- Follows exact existing pattern: `{email: boolean, inApp: boolean}` becomes `{email: boolean, inApp: boolean, push: boolean}`.
- JSONB column naturally accommodates the new field without schema migration (PostgreSQL treats missing keys as undefined).
- Data migration sets `push` = `inApp` for existing users (spec: mirror in-app settings).
- New users get `push` defaults mirroring `inApp` values in `getDefaultUserSettings()`.
- Existing `getChannelsSettingsForEvent()` switch statement returns `IUserSettingsNotificationChannels` — adding `.push` field is transparent.

**Alternatives Considered**:
- **Separate push preferences table**: Unnecessary duplication of the event-type-to-preference mapping. The existing JSONB structure is purpose-built for this.
- **Push-specific preference hierarchy**: Over-engineering. The spec says push mirrors the same categories as email/inApp.

## Decision 5: Error Handling (Fire-and-Forget)

**Decision**: Acknowledge and drop on failure. No automatic retry.

**Rationale**:
- The original plan specified DLX-based retry queues with escalating TTL intervals. During implementation, a simpler fire-and-forget approach was chosen to avoid the operational complexity of dead-letter exchanges and TTL queue management.
- On successful delivery: mark subscription active, ack message.
- On 410 Gone: mark subscription expired, ack message.
- On 4xx client error: mark subscription expired, ack message.
- On transient error: log failure, ack and drop message. The next platform event will reattempt delivery naturally.
- Push notifications are best-effort — the user also receives in-app and email notifications through parallel channels.

**Alternatives Considered**:
- **RabbitMQ DLX with TTL-based delayed requeue**: Originally planned but rejected during implementation. Without a DLX configured on the queue, `Nack` causes immediate redelivery which saturates the CPU. The complexity of setting up tiered retry queues was not justified by the benefit.
- **Database-backed job queue (e.g., Bull/BullMQ via Redis)**: Adds new dependency. Rejected per Principle 10.
- **In-process setTimeout retries**: Not durable across server restarts.

## Decision 6: Throttling Mechanism

**Decision**: Redis `INCR` + 60-second TTL per-user key.

**Rationale**:
- Existing Redis instance (`cache-manager-redis-store`) is already configured.
- Simple atomic operation: `INCR user:push:throttle:{userId}` → if count > 10, drop. Set `EXPIRE` on first increment.
- Minimal latency (~1ms for Redis INCR).
- Per spec: "excess notifications within the window are dropped silently."
- No persistence needed — counters naturally expire.

**Alternatives Considered**:
- **Token bucket algorithm**: More complex, not needed for simple 10/min rate limit. The sliding window approximation from TTL-based counter is sufficient per spec.
- **In-memory Map**: Not shared across server instances in clustered deployment. Redis ensures consistency.

## Decision 7: VAPID Key Management

**Decision**: Environment variables (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) loaded via `alkemio.yml` + `ConfigService`.

**Rationale**:
- Follows existing pattern: all secrets in the codebase use `${ENV_VAR}:default` syntax in `alkemio.yml`.
- Keys generated once offline via `web-push generate-vapid-keys` and deployed as K8s secrets / `.env` values.
- Public key exposed via GraphQL query for client integration (clients need it for `PushManager.subscribe()`).

**Alternatives Considered**:
- **Database-stored keys**: Unnecessary complexity. VAPID keys are static per deployment, not per-user.
- **Auto-generation on first boot**: Would change keys on every fresh deployment, invalidating all existing subscriptions. Must be pre-generated and stable.

## Decision 8: Push Notification Content Format

**Decision**: Simple title + body + deep link URL. English only for P1.

**Rationale**:
- Per spec: "notification content will be a summary (title + short body) with a link; full content is viewed in-app."
- Deep link URL generated using existing `UrlGeneratorService`.
- Payload format follows Web Push API standards (JSON with `title`, `body`, `url` fields).
- The service worker on the client side receives this payload and calls `self.registration.showNotification()`.

**Payload schema**:
```json
{
  "title": "New comment on Innovation Space",
  "body": "John Doe commented on your post",
  "url": "/spaces/innovation-space/collaboration/callout/post-123",
  "eventType": "SPACE_COLLABORATION_CALLOUT_POST_CONTRIBUTION_COMMENT",
  "timestamp": "2026-03-01T12:00:00Z"
}
```

## Decision 9: Subscription Cleanup Strategy

**Decision**: Detect on delivery failure (410 Gone response) + scheduled cleanup job for stale subscriptions.

**Rationale**:
- W3C Web Push spec: push services return HTTP 410 when a subscription has expired or been revoked.
- On 410 response, immediately mark subscription as expired and remove from active list (real-time cleanup).
- Scheduled job (NestJS `@Cron`) runs daily to clean subscriptions not active in 30 days (background hygiene).
- SC-007: "Invalid subscriptions detected and cleaned up within 24 hours" — achieved by combination of real-time + daily cron.

**Alternatives Considered**:
- **Only real-time cleanup**: Misses subscriptions where browser data is cleared but no notification is attempted.
- **Only scheduled cleanup**: Slower detection, wastes delivery attempts to dead subscriptions.
