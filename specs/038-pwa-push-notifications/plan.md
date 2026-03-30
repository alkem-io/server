# Implementation Plan: PWA Push Notifications

**Branch**: `038-pwa-push-notifications` | **Date**: 2026-03-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/038-pwa-push-notifications/spec.md`

## Summary

Add server-side push notification infrastructure to the Alkemio platform using W3C Web Push Protocol with VAPID authentication via the `web-push` npm library. The implementation extends the existing multi-channel notification pipeline (email, in-app) with a third `push` channel, adds a new `PushSubscription` entity for device subscription management, and introduces a dedicated RabbitMQ consumer for independent push delivery with retry semantics. The GraphQL API is extended with subscription management mutations and a VAPID public key query. Throttling is enforced via Redis counters.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 22 LTS (Volta pins 22.21.1)
**Primary Dependencies**: NestJS 10, TypeORM 0.3, Apollo Server 4, GraphQL 16, `web-push` (new), `@golevelup/nestjs-rabbitmq` 6.1.0 (existing), `cache-manager-redis-store` 2.0.0 (existing)
**Storage**: PostgreSQL 17.5 (new `push_subscription` table), Redis (throttling counters), RabbitMQ (push delivery queue)
**Testing**: Vitest 4.x — unit tests for push service, adapter, throttling logic
**Target Platform**: Linux server (NestJS backend)
**Project Type**: Single NestJS monolith
**Performance Goals**: Deliver push notifications within 30 seconds of event trigger (SC-001); handle 10,000 concurrent subscriptions (SC-006)
**Constraints**: Max 10 subscriptions per user (FR-008); max 10 notifications/min/user throttle (FR-010); no automatic retry — failed deliveries are dropped (NFR-003)
**Scale/Scope**: 34 notification events (30 original + 4 poll events from develop merge), estimated ~600 LOC new code across 20–25 files

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| 1. Domain-Centric Design | PASS | Push subscription management lives in `src/domain/push-subscription/`. Business logic in domain service, not resolvers. |
| 2. Modular NestJS Boundaries | PASS | New `PushSubscriptionModule` (domain) + `NotificationPushAdapterModule` (adapter). No circular deps — adapter consumes domain service. |
| 3. GraphQL Schema as Stable Contract | PASS | Additive-only changes: new mutations (`subscribeToPushNotifications`, `unsubscribeFromPushNotifications`), new query (`vapidPublicKey`), new `push` field on `UserSettingsNotificationChannels`. No breaking changes. |
| 4. Explicit Data & Event Flow | PASS | Push delivery subscribes to existing notification events. Flow: event → NotificationRecipientsService filters push recipients → PushAdapter dispatches via `web-push`. No direct repository calls from resolvers. |
| 5. Observability & Operational Readiness | PASS | Structured Winston logs at key stages: subscription created/removed, delivery attempted/succeeded/failed, subscription expired. New `LogContext.PUSH_NOTIFICATION` value. No orphaned metrics. |
| 6. Code Quality with Pragmatic Testing | PASS | Unit tests for PushSubscriptionService (subscription cap enforcement, expiry cleanup), PushDeliveryService (throttling, retry logic), and adapter integration. Risk-based — no trivial pass-through tests. |
| 7. API Consistency & Evolution | PASS | Mutations use imperative naming, inputs end with `Input`. `push` field follows existing `email`/`inApp` pattern on `IUserSettingsNotificationChannels`. |
| 8. Secure-by-Design | PASS | VAPID keys stored as env secrets, loaded via ConfigService. Subscription endpoints validated. Only authenticated users can subscribe. No secrets logged. |
| 9. Container & Deployment Determinism | PASS | VAPID keys via environment variables. `web-push` pinned in package.json. No runtime env reads outside config bootstrap. |
| 10. Simplicity & Incremental Hardening | PASS | Simplest viable: extend existing notification pipeline with new channel. No CQRS, no separate microservice. RabbitMQ dead-letter for retries uses existing infra. |

**No violations to justify.**

## Project Structure

### Documentation (this feature)

```text
specs/038-pwa-push-notifications/
├── plan.md              # This file
├── research.md          # Phase 0: technology decisions
├── data-model.md        # Phase 1: entity & relationship design
├── quickstart.md        # Phase 1: setup & testing guide
├── contracts/           # Phase 1: GraphQL schema additions
│   └── push-notifications.graphql
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── domain/
│   └── push-subscription/                    # NEW: Push subscription aggregate
│       ├── push.subscription.entity.ts       # TypeORM entity
│       ├── push.subscription.interface.ts    # GraphQL ObjectType
│       ├── push.subscription.module.ts       # NestJS module
│       ├── push.subscription.service.ts      # Domain service (CRUD, cap enforcement, expiry)
│       ├── push.subscription.resolver.mutations.ts  # GraphQL mutations
│       ├── push.subscription.resolver.queries.ts    # GraphQL queries
│       └── dto/
│           ├── push.subscription.dto.create.ts
│           ├── push.subscription.dto.delete.ts
│           └── push.subscription.dto.subscribe.input.ts
│
├── services/
│   └── adapters/
│       └── notification-push-adapter/        # NEW: Push delivery adapter
│           ├── notification.push.adapter.ts
│           ├── notification.push.adapter.module.ts
│           ├── push.delivery.service.ts      # web-push send + retry handling
│           └── push.throttle.service.ts      # Redis-based per-user throttling
│
├── common/
│   └── enums/
│       └── logging.context.ts                # ADD: PUSH_NOTIFICATION context
│
├── config/
│   (alkemio.yml additions for VAPID config)
│
└── migrations/
    ├── 1772396107069-CreatePushSubscriptionTable.ts
    ├── 1772396107070-AddPushFieldToNotificationSettings.ts
    └── 1774254508094-AddPushFieldToPollNotificationSettings.ts
```

**Structure Decision**: Follows existing layered architecture. Push subscription is a new domain aggregate under `src/domain/push-subscription/`. Push delivery adapter mirrors the existing `notification-in-app-adapter/` pattern under `src/services/adapters/`. Throttling is co-located with the push adapter since it's push-specific.

## Architecture Overview

### Notification Flow (Extended)

```
Platform Event
    │
    ▼
Domain Notification Adapter (existing: Space/User/Platform/Org/VC)
    │
    ▼
NotificationRecipientsService.getRecipients()
    ├── emailRecipients (existing)
    ├── inAppRecipients (existing)
    └── pushRecipients  (NEW: filters by .push setting)
         │
         ▼
    NotificationPushAdapter.sendPushNotifications()
         │
         ├── PushThrottleService.isAllowed(userId) → Redis INCR + 60s TTL
         │     └── if throttled → drop silently, log
         │
         ├── PushSubscriptionService.getActiveSubscriptions(userIds)
         │
         └── Publish to alkemio-push-notifications queue
               │
               ▼
         PushDeliveryService (@RabbitSubscribe consumer)
               ├── web-push.sendNotification()
               ├── on success → mark subscription active, log delivery
               ├── on 410 Gone → mark subscription expired
               ├── on 4xx error → mark subscription expired
               └── on transient error → log and drop (no retry)
```

### Push Notification Content Strategy

Push notifications use a simple `{title, body, url}` payload. Content is constructed per event type in the domain notification adapters (T031 — 30 call sites across 5 adapters):

- **title**: Short, action-oriented summary (e.g., "New comment on {spaceName}", "You were mentioned"). Derived from the event type and entity names already loaded in each handler.
- **body**: One-line preview text. Reuse the same summary text that external notification adapters construct for email subjects, truncated to 200 characters.
- **url**: Deep link relative path (see T032).

Content is English-only for P1 (per spec assumptions). No separate template engine — content is constructed inline in each adapter handler using string interpolation with entity names.

### iOS PWA Compatibility Note

The `web-push` library sends standard W3C Web Push Protocol messages. iOS Safari (16.4+) supports Web Push for installed PWAs using the same protocol — no server-side differences from Android/desktop delivery. The push payload JSON schema is identical across all platforms. iOS-specific behavior (Home Screen installation requirement, notification grouping) is handled entirely client-side. No additional server-side task is needed for iOS compatibility.

### Error Handling (Simplified — No DLX Retry)

The original plan specified DLX-based retry queues with escalating TTL intervals. During implementation, a simpler fire-and-forget approach was chosen to avoid the operational complexity of dead-letter exchanges and TTL queue management:

```
alkemio-push-notifications queue
    │ (consume via @RabbitSubscribe)
    ▼
PushDeliveryService.handlePushMessage()
    │
    ├── webpush.sendNotification() succeeds → mark subscription active, ack
    │
    ├── 410 Gone → mark subscription expired, ack (no retry)
    │
    ├── 4xx client error → mark subscription expired, ack (no retry)
    │
    └── transient error → log failure, ack and drop message
                          (next platform event will reattempt naturally)
```

**Trade-off**: Individual transient failures may cause a missed notification, but the next platform event will trigger a new push attempt. This is acceptable because push notifications are best-effort and the user also receives in-app/email notifications through parallel channels.

### Key Integration Points

| Integration Point | Existing Code | Change Required |
|-------------------|---------------|-----------------|
| `IUserSettingsNotificationChannels` | `email`, `inApp` fields | Add `push: boolean` field |
| `NotificationRecipientsService.getRecipients()` | Returns `emailRecipients`, `inAppRecipients` | Add `pushRecipients` filtering |
| `NotificationRecipientsService.getChannelsSettingsForEvent()` | Reads `.email`, `.inApp` | Read `.push` for push recipients |
| `NotificationRecipientResult` | `emailRecipients`, `inAppRecipients` | Add `pushRecipients` |
| `NotificationAdapterModule` | Imports InApp + External adapter modules | Import `NotificationPushAdapterModule` |
| Domain notification adapters (Space, User, Platform, Org, VC) | Call `sendInAppNotifications()` + `sendExternalNotifications()` | Add `sendPushNotifications()` calls — 30 total call sites (13 Space incl. polls, 7 User, 6 Platform, 3 Org, 1 VC) |
| `UserService.getDefaultUserSettings()` | Sets `{email, inApp}` per category | Add `push` mirroring `inApp` value |
| `alkemio.yml` | `notifications:` section | Add `notifications.push:` with VAPID config |
| `LogContext` enum | Existing contexts | Add `PUSH_NOTIFICATION` |
| `MessagingQueue` enum | Existing queues | Add `PUSH_NOTIFICATIONS` queue |
| `UserService.deleteUser()` | Cascade deletes settings | Push subscriptions cascade-deleted via FK |
| `getChannelsSettingsForEvent()` hardcoded returns | `{email, inApp}` literals for `USER_SIGN_UP_WELCOME` and `SPACE_COMMUNITY_INVITATION_USER_PLATFORM` | Add `push` field to both literal objects |
| `main.ts` (line ~106-112) | RMQ microservice connections | **No** `connectMicroservice` for push — uses `@RabbitSubscribe` in `PushDeliveryService` instead. A NestJS Transport.RMQ consumer would compete with the golevelup handler and silently drop messages. Documented with comment in main.ts. |

## Complexity Tracking

> No constitution violations to justify. All design choices use the simplest viable approach within existing architecture patterns.
