# Tasks: PWA Push Notifications

**Input**: Design documents from `/specs/038-pwa-push-notifications/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/push-notifications.graphql, quickstart.md

**Tests**: Unit tests are included as specified in the Technical Context (plan.md: "Vitest 4.x — unit tests for push service, adapter, throttling logic") and Constitution Check (Principle 6: PushSubscriptionService, PushDeliveryService, PushThrottleService, and adapter integration).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and add shared enum/config values needed by all subsequent phases.

- [x] T001 Install `web-push` dependency via `pnpm add web-push && pnpm add -D @types/web-push`
- [x] T002 [P] Add `notifications.push` config section (vapid, max_subscriptions_per_user, throttle, retry, cleanup) to alkemio.yml under existing `notifications:` block per data-model.md Configuration Schema
- [x] T003 [P] Add `PUSH_NOTIFICATION = 'push-notification'` value to LogContext enum in src/common/enums/logging.context.ts
- [x] T004 [P] Add `PUSH_NOTIFICATIONS = 'alkemio-push-notifications'` value to MessagingQueue enum in src/common/enums/messaging.queue.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the PushSubscription entity, extend shared interfaces/DTOs, generate migrations, update defaults, and wire RabbitMQ connectivity. All user story work depends on this phase.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 Create PushSubscription TypeORM entity extending BaseAlkemioEntity with columns: endpoint (LONG_TEXT_LENGTH), p256dh (MID_TEXT_LENGTH), auth (MID_TEXT_LENGTH), status (ENUM_LENGTH), userAgent (MID_TEXT_LENGTH, nullable), lastActiveDate (timestamp, nullable), userId (uuid FK to user.id ON DELETE CASCADE) in src/domain/push-subscription/push.subscription.entity.ts. Note: no default value on entity column — default 'active' is set in migration SQL only per coding standards.
- [x] T006 [P] Add `push: boolean` field with `@Field(() => Boolean, { nullable: false })` decorator to IUserSettingsNotificationChannels abstract class in src/domain/community/user-settings/user.settings.notification.channels.interface.ts
- [x] T006a [P] Add `push: true` to the hardcoded return object for `USER_SIGN_UP_WELCOME` and `push: false` to the hardcoded return object for `SPACE_COMMUNITY_INVITATION_USER_PLATFORM` in the `getChannelsSettingsForEvent()` switch statement in src/services/api/notification-recipients/notification.recipients.service.ts (lines ~282-290) to satisfy the extended IUserSettingsNotificationChannels interface
- [x] T007 [P] Add `pushRecipients: IUser[]` field with `@Field` decorator to NotificationRecipientResult in src/services/api/notification-recipients/dto/notification.recipients.dto.result.ts
- [x] T008 Generate TypeORM migration CreatePushSubscriptionTable: create `push_subscription` table with `status` column DEFAULT 'active' in SQL, composite index IDX_push_subscription_userId_status on (userId, status) and UNIQUE index IDX_push_subscription_endpoint on (endpoint) in src/migrations/
- [x] T009 Generate TypeORM migration AddPushFieldToNotificationSettings: use SQL `jsonb_set` to walk every leaf node in the notification JSONB column of user_settings and add `"push"` key mirroring the existing `"inApp"` value in src/migrations/
- [x] T010 Update private `getDefaultUserSettings()` method to include `push` field mirroring `inApp` value on every notification category leaf node (space, user, platform, organization, virtualContributor) in src/domain/community/user/user.service.ts (lines ~247-313)
- [x] T011 Add `connectMicroservice(app, amqpEndpoint, MessagingQueue.PUSH_NOTIFICATIONS)` alongside existing microservice connections in src/main.ts (line ~105)

**Checkpoint**: Foundation ready — PushSubscription entity exists, shared interfaces extended, migrations generated, RabbitMQ connected. User story implementation can now begin.

---

## Phase 3: User Story 1 — Opt-In to Push Notifications (Priority: P1) MVP

**Goal**: Users can subscribe/unsubscribe their device for push notifications via GraphQL mutations, query their subscriptions, and retrieve the VAPID public key. Max 10 subscriptions per user with oldest-replacement. Stale subscriptions cleaned daily.

**Independent Test**: Call `subscribeToPushNotifications` mutation with test subscription data, verify subscription stored. Call `myPushSubscriptions` query, verify subscription returned. Call `unsubscribeFromPushNotifications`, verify subscription removed. Call `vapidPublicKey` query, verify VAPID key returned.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T012 [P] [US1] Unit test for PushSubscriptionService: test subscribe (create new), subscribe (upsert existing endpoint), cap enforcement (replace oldest when >10 active), unsubscribe (delete by ID + userId), getActiveSubscriptions (returns only status='active'), markExpired (sets status='expired'), cleanupStale (removes subscriptions not active in N days) in src/domain/push-subscription/push.subscription.service.spec.ts

### Implementation for User Story 1

- [x] T013 [P] [US1] Create PushSubscription GraphQL ObjectType (id: UUID, createdDate: DateTime, status: PushSubscriptionStatus, userAgent: String nullable, lastActiveDate: DateTime nullable) and registerEnumType PushSubscriptionStatus {ACTIVE, EXPIRED} in src/domain/push-subscription/push.subscription.interface.ts
- [x] T014 [P] [US1] Create SubscribeToPushNotificationsInput DTO with class-validator decorators: endpoint (IsUrl, MaxLength LONG_TEXT_LENGTH), p256dh (IsString, IsNotEmpty), auth (IsString, IsNotEmpty), userAgent (IsOptional, IsString) in src/domain/push-subscription/dto/push.subscription.dto.subscribe.input.ts
- [x] T015 [P] [US1] Create UnsubscribeFromPushNotificationsInput DTO with field: subscriptionID (UUID) in src/domain/push-subscription/dto/push.subscription.dto.delete.ts
- [x] T016 [US1] Implement PushSubscriptionService using TypeORM repository + ConfigService + LoggerService: subscribe (upsert by endpoint, enforce max_subscriptions_per_user cap replacing oldest), unsubscribe (delete by id + userId ownership check), getActiveSubscriptions(userIds: string[]) returning subscriptions with status='active', markExpired(subscriptionId), cleanupStale(staleDays) in src/domain/push-subscription/push.subscription.service.ts
- [x] T017 [P] [US1] Implement mutation resolver: @Mutation subscribeToPushNotifications (requires CurrentUser auth guard, calls service.subscribe with agentInfo.userID), @Mutation unsubscribeFromPushNotifications (requires CurrentUser auth guard, calls service.unsubscribe with agentInfo.userID) in src/domain/push-subscription/push.subscription.resolver.mutations.ts
- [x] T018 [P] [US1] Implement query resolver: @Query vapidPublicKey (returns VAPID public key string from ConfigService, returns null if push notifications disabled), @Query myPushSubscriptions (requires CurrentUser auth guard, returns service.getActiveSubscriptions for current user) in src/domain/push-subscription/push.subscription.resolver.queries.ts
- [x] T019 [US1] Add @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT) method to PushSubscriptionService that calls cleanupStale with configured cleanup.stale_days threshold, logging cleanup count at verbose level in src/domain/push-subscription/push.subscription.service.ts
- [x] T020 [US1] Create PushSubscriptionModule: imports TypeOrmModule.forFeature([PushSubscription]); providers PushSubscriptionService + mutation resolver + query resolver; exports PushSubscriptionService in src/domain/push-subscription/push.subscription.module.ts
- [x] T021 [US1] Register PushSubscriptionModule in the domain module hierarchy by adding it to the imports array of the appropriate parent module

**Checkpoint**: Users can subscribe/unsubscribe devices, query subscriptions, and get VAPID key. Subscription cap enforced at 10. Stale cleanup runs daily.

---

## Phase 4: User Story 2 — Receive Push Notifications (Priority: P1)

**Goal**: Subscribed users receive push notifications on their device when any of the ~40 platform events fire. Per-user throttling enforced at 10/min via Redis. Transient delivery failures retried up to 5 times over ~14.5h via RabbitMQ DLX. Expired subscriptions auto-cleaned on 410 Gone response.

**Independent Test**: Trigger a platform event (e.g., post a comment) for a user with an active push subscription. Verify push notification is delivered. Rapidly trigger >10 events and confirm excess are dropped silently.

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T022 [P] [US2] Unit test for PushThrottleService: test isAllowed returns true when Redis counter < max_per_minute, returns false when counter >= max_per_minute, verify Redis INCR called with correct key pattern `push:throttle:{userId}`, verify EXPIRE(60) set on first increment in src/services/adapters/notification-push-adapter/push.throttle.service.spec.ts
- [x] T023 [P] [US2] Unit test for PushDeliveryService: test successful delivery (mock web-push.sendNotification resolves), 410 Gone handling (calls PushSubscriptionService.markExpired + logs), transient error handling (nack message for DLX requeue), retry count >= max_attempts abandonment (ack + log as dropped), lastActiveDate update on success in src/services/adapters/notification-push-adapter/push.delivery.service.spec.ts
- [x] T024 [P] [US2] Unit test for NotificationPushAdapter: test sendPushNotifications orchestration (check throttle per user → lookup active subscriptions → publish message per subscription to push queue), skip silently when push disabled in config, skip when pushRecipients array is empty, log throttled users at verbose level in src/services/adapters/notification-push-adapter/notification.push.adapter.spec.ts

### Implementation for User Story 2

- [x] T025 [P] [US2] Create PushThrottleService: isAllowed(userId: string) → boolean using Redis client INCR on key `push:throttle:{userId}` + EXPIRE 60s, threshold from ConfigService `notifications.push.throttle.max_per_minute`, log throttled users at verbose level with LogContext.PUSH_NOTIFICATION in src/services/adapters/notification-push-adapter/push.throttle.service.ts
- [x] T026 [P] [US2] Create PushDeliveryService: consume from push-notifications queue, call web-push.sendNotification(endpoint, payload, {vapidDetails}), on success update subscription.lastActiveDate + log, on 410 Gone call PushSubscriptionService.markExpired + log, on transient error nack(false) for DLX requeue + log, abandon and ack when retryCount >= max_attempts + log as dropped in src/services/adapters/notification-push-adapter/push.delivery.service.ts
- [x] T027 [US2] Create NotificationPushAdapter: sendPushNotifications(pushRecipients: IUser[], eventType: NotificationEvent, payload: {title, body, url}) — for each user check PushThrottleService.isAllowed, then PushSubscriptionService.getActiveSubscriptions, then publish PushNotificationMessage per subscription to push-notifications queue via AmqpConnection in src/services/adapters/notification-push-adapter/notification.push.adapter.ts
- [x] T028 [US2] Create NotificationPushAdapterModule: imports PushSubscriptionModule, RabbitMQModule (or AmqpModule), CacheModule (Redis); providers NotificationPushAdapter, PushDeliveryService, PushThrottleService; exports NotificationPushAdapter in src/services/adapters/notification-push-adapter/notification.push.adapter.module.ts
- [x] T029 [US2] Import NotificationPushAdapterModule in NotificationAdapterModule imports array and inject NotificationPushAdapter into all 5 domain adapter providers (Space, User, Platform, Org, VC) via constructor in src/services/adapters/notification-adapter/notification.adapter.module.ts
- [x] T030 [US2] Extend NotificationRecipientsService.getRecipients(): alongside existing emailRecipients/inAppRecipients filtering, add pushRecipients filtering — check each candidate user's `.push` channel setting for the event category via getChannelsSettingsForEvent(), populate pushRecipients in the returned NotificationRecipientResult in src/services/api/notification-recipients/notification.recipients.service.ts
- [x] T031 [US2] Add `this.notificationPushAdapter.sendPushNotifications(recipients.pushRecipients, event, payload)` call in every event handler that calls sendInAppNotifications() across all 5 domain notification adapters: NotificationSpaceAdapter (12 inApp handlers), NotificationUserAdapter (7 handlers), NotificationPlatformAdapter (6 handlers), NotificationOrganizationAdapter (3 handlers), NotificationVirtualContributorAdapter (1 handler) — total 29 call sites. Note: 2 handlers (in Space and Platform) that only call sendExternalNotifications without sendInAppNotifications are intentionally excluded — push mirrors inApp behavior per FR-002. For each call site, construct the push payload `{title, body, url}` using entity names and IDs already loaded in the handler. Title: short action summary (e.g., "New comment on {spaceName}"). Body: one-line preview, reusing email subject text pattern, truncated to 200 chars. URL: relative deep link path per T032. Files in src/services/adapters/notification-adapter/

**Checkpoint**: Push notifications delivered to subscribed users when platform events fire. Throttling limits to 10/min/user. Transient failures retry up to 5 times via DLX. Expired subscriptions auto-cleaned on 410.

---

## Phase 5: User Story 3 — Interact with Push Notifications (Priority: P2)

**Goal**: Tapping a push notification navigates the user to the relevant content via deep link URL included in the notification payload. The server generates correct deep link URLs for all event types.

**Independent Test**: Receive a push notification for each event category (comment, mention, invitation, etc.), tap it, verify the browser navigates to the correct content page within the Alkemio application.

- [x] T032 [US3] Verify and ensure push notification payload construction includes correct deep link URL for all 30 notification event types. The deep link URL should be derived from the same data already available in each domain adapter handler (space ID, callout ID, post ID, user ID, etc.) and constructed as a relative path (e.g., `/spaces/{spaceNameId}/collaboration/{calloutNameId}`). Review the existing UrlGeneratorService in src/services/infrastructure/url-generator/ for reusable URL construction methods. If no existing helper covers a specific event type, construct the URL inline using the entity IDs from the event payload. Verify by inspecting each of the 29 push call sites added in T031 and confirming the `url` field in the push payload resolves to meaningful content. File: src/services/adapters/notification-push-adapter/notification.push.adapter.ts

**Checkpoint**: Push notifications contain correct deep link URLs for all event types. Client-side click handling is documented in contracts/push-notifications.graphql.

---

## Phase 6: User Story 4 — Manage Notification Preferences (Priority: P2)

**Goal**: Users can toggle push notifications on/off per event category independently. Push defaults mirror inApp settings for new subscribers.

**Independent Test**: Query user notification settings via GraphQL, verify `push` field appears on all categories. Toggle push off for a specific category, trigger an event in that category, verify no push notification is sent for that user.

- [x] T033 [US4] Verify the existing updateUserSettings mutation correctly accepts and persists the `push` boolean field on all notification category leaf nodes — JSONB accepts the new field via the extended IUserSettingsNotificationChannels interface; test with GraphQL Playground against all category paths (space, user, platform, organization, virtualContributor)
- [x] T034 [US4] Verify getChannelsSettingsForEvent() switch statement in NotificationRecipientsService returns the `push` field from the JSONB structure for each event category, and that the push filtering logic added in T030 correctly excludes users who have push=false for the specific event category in src/services/api/notification-recipients/notification.recipients.service.ts

**Checkpoint**: Users can manage push notification preferences per category. Defaults mirror inApp settings. Preference changes take effect immediately.

---

## Phase 7: User Story 5 — Multi-Device Support (Priority: P3)

**Goal**: Users subscribed on multiple devices receive push notifications on all subscribed devices. Individual device subscriptions can be managed independently.

**Independent Test**: Subscribe from two different devices (two subscribeToPushNotifications calls with different endpoints). Trigger a platform event. Verify both subscriptions receive a push notification. Unsubscribe one device. Verify only the remaining device receives the next notification.

- [x] T035 [US5] Verify PushSubscriptionService.getActiveSubscriptions() returns all active subscriptions for a user (not just one) and NotificationPushAdapter publishes one PushNotificationMessage per subscription, ensuring fan-out delivery to all subscribed devices in src/domain/push-subscription/push.subscription.service.ts and src/services/adapters/notification-push-adapter/notification.push.adapter.ts

**Checkpoint**: Multi-device push notifications work. Per-device subscription management is functional. Cap enforcement works across devices.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Schema contract validation, full test suite, and end-to-end quickstart verification.

- [x] T036 [P] Regenerate and sort GraphQL schema: `pnpm run schema:print && pnpm run schema:sort` to include new types, inputs, queries, and mutations
- [x] T037 [P] Run schema diff against baseline: `pnpm run schema:diff` and review change-report.json — verify all changes are additive (no BREAKING entries), new types: PushSubscription, PushSubscriptionStatus, SubscribeToPushNotificationsInput, UnsubscribeFromPushNotificationsInput; new fields: push on UserSettingsNotificationChannels
- [ ] T038 Run quickstart.md end-to-end validation: verify vapidPublicKey query returns key, subscribeToPushNotifications creates subscription, myPushSubscriptions returns it, unsubscribeFromPushNotifications removes it, notification settings include push field, RabbitMQ queues exist (requires running services — manual verification)
- [x] T039 [P] Run full lint and test suite: `pnpm lint && pnpm test:ci` — verify no regressions, all new unit tests pass, no TypeScript errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational (Phase 2)
- **US2 (Phase 4)**: Depends on Foundational (Phase 2) AND US1 (Phase 3) — needs PushSubscriptionService for subscription lookup and markExpired
- **US3 (Phase 5)**: Depends on US2 (Phase 4) — verifies deep link URL in push payload
- **US4 (Phase 6)**: Depends on Foundational (Phase 2) AND US2 (Phase 4) — verifies push preference filtering in recipient resolution
- **US5 (Phase 7)**: Depends on US1 (Phase 3) AND US2 (Phase 4) — verifies multi-subscription fan-out delivery
- **Polish (Phase 8)**: Depends on all user story phases being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational — No dependencies on other stories
- **US2 (P1)**: Depends on US1 — requires PushSubscriptionService for subscription lookup and expiry marking
- **US3 (P2)**: Depends on US2 — verifies deep link URL construction in push adapter
- **US4 (P2)**: Depends on US2 — verifies push preference filtering in getRecipients()
- **US5 (P3)**: Depends on US1 + US2 — verifies fan-out to multiple subscriptions

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- DTOs and interfaces before services
- Services before resolvers
- Core implementation before module wiring
- Module wiring before registration in parent modules

### Parallel Opportunities

- Phase 1: T002, T003, T004 can all run in parallel after T001
- Phase 2: T006 and T007 can run in parallel with each other (different files, no dependency on T005)
- Phase 3 (US1): T012, T013, T014, T015 can all run in parallel (separate files). T017 and T018 can run in parallel after T016 completes (mutation + query resolvers in different files)
- Phase 4 (US2): T022, T023, T024 can all run in parallel (test files). T025 and T026 can run in parallel (throttle + delivery services in different files)
- Phase 8: T036, T037, T039 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch test + DTOs + interface in parallel (all different files):
Task: T012 "Unit test for PushSubscriptionService in src/domain/push-subscription/push.subscription.service.spec.ts"
Task: T013 "Create PushSubscription ObjectType in src/domain/push-subscription/push.subscription.interface.ts"
Task: T014 "Create SubscribeToPushNotificationsInput DTO in src/domain/push-subscription/dto/push.subscription.dto.subscribe.input.ts"
Task: T015 "Create UnsubscribeFromPushNotificationsInput DTO in src/domain/push-subscription/dto/push.subscription.dto.delete.ts"

# After service (T016) is complete, launch resolvers in parallel:
Task: T017 "Implement mutation resolver in src/domain/push-subscription/push.subscription.resolver.mutations.ts"
Task: T018 "Implement query resolver in src/domain/push-subscription/push.subscription.resolver.queries.ts"
```

## Parallel Example: User Story 2

```bash
# Launch all test files in parallel:
Task: T022 "Unit test for PushThrottleService in push.throttle.service.spec.ts"
Task: T023 "Unit test for PushDeliveryService in push.delivery.service.spec.ts"
Task: T024 "Unit test for NotificationPushAdapter in notification.push.adapter.spec.ts"

# Launch independent services in parallel:
Task: T025 "Create PushThrottleService in push.throttle.service.ts"
Task: T026 "Create PushDeliveryService in push.delivery.service.ts"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: US1 — Opt-In to Push Notifications
4. **STOP and VALIDATE**: Test subscription CRUD, VAPID key query, cap enforcement
5. Complete Phase 4: US2 — Receive Push Notifications
6. **STOP and VALIDATE**: Test end-to-end push delivery, throttling, retry
7. Deploy/demo MVP (subscribe + receive is functional)

### Incremental Delivery

1. Setup + Foundational -> Foundation ready
2. US1 -> Test subscription management -> First increment
3. US2 -> Test push delivery pipeline -> MVP complete!
4. US3 -> Verify deep linking -> Enhanced UX
5. US4 -> Verify preference management -> User control
6. US5 -> Verify multi-device -> Power user support
7. Polish -> Schema contract, validation -> Release ready

### Suggested MVP Scope

**US1 + US2 only** — subscribe to push notifications and receive them. This delivers the core value proposition. US3-US5 are primarily verification tasks since most implementation is already covered by US1 + US2.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- ~600 LOC estimated across 20-25 new/modified files
- US3, US4, US5 are primarily verification tasks — most server-side implementation is covered by Foundational + US1 + US2
- Client-side implementation (service worker, UI prompts, preference screens) is out of scope — covered by a separate client-side feature effort consuming the integration contract in contracts/push-notifications.graphql
