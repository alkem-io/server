# Feature Specification: PWA Push Notifications

**Feature Branch**: `038-pwa-push-notifications`
**Created**: 2026-03-01
**Status**: Implemented
**Input**: User description: "Add push notifications infrastructure for PWA based on React 19 on the web-client. It should work with both iOS and Android."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Opt-In to Push Notifications (Priority: P1)

A user visits the Alkemio web application on their mobile or desktop browser. They are prompted to enable push notifications. The user grants permission, and the system registers their device to receive future notifications. The user can later revoke this permission from their notification preferences.

**Why this priority**: Without opt-in, no push notifications can be delivered. This is the foundational capability that all other stories depend on.

**Independent Test**: Can be tested by opening the web app, accepting the notification permission prompt, and verifying the device subscription is stored. Delivers immediate value by establishing the notification channel.

**Acceptance Scenarios**:

1. **Given** a logged-in user on a supported browser who has not opted in, **When** they are shown the notification prompt and accept, **Then** their device is registered for push notifications and they see a confirmation message.
2. **Given** a logged-in user who has already opted in, **When** they visit their notification preferences, **Then** they see their subscription status as active and can disable it.
3. **Given** a logged-in user on an unsupported browser, **When** they access the application, **Then** no notification prompt is shown and the preference option indicates push notifications are unavailable for their browser.

---

### User Story 2 - Receive Push Notifications (Priority: P1)

A subscribed user receives a push notification on their device when a relevant platform event occurs (e.g., a new comment on a space they follow, an invitation, or a mention). The notification appears as a system-level notification on their device, even if the browser is closed or the tab is in the background.

**Why this priority**: Delivering notifications is the core value proposition of this feature. Combined with opt-in (Story 1), this forms the minimum viable product.

**Independent Test**: Can be tested by triggering a platform event (e.g., posting a comment) and verifying the subscribed user receives a push notification on their device within a reasonable timeframe.

**Acceptance Scenarios**:

1. **Given** a subscribed user with the browser closed, **When** a relevant platform event occurs, **Then** a push notification appears on their device within 30 seconds.
2. **Given** a subscribed user with the app open in a background tab, **When** a relevant platform event occurs, **Then** a push notification appears as a system notification.
3. **Given** a subscribed user on an iOS device, **When** a relevant event occurs, **Then** the push notification is delivered following iOS notification conventions (including the "Add to Home Screen" PWA requirement if applicable).
4. **Given** a subscribed user on an Android device, **When** a relevant event occurs, **Then** the push notification is delivered following Android notification conventions.

---

### User Story 3 - Interact with Push Notifications (Priority: P2)

A user taps/clicks on a received push notification and is navigated directly to the relevant content within the Alkemio application (deep linking). If the app is not open, tapping the notification opens the app and navigates to the correct page.

**Why this priority**: Deep linking from notifications significantly improves engagement and user experience, but the notification system is functional without it.

**Independent Test**: Can be tested by receiving a notification and tapping it, verifying that the browser opens the correct page within the Alkemio application.

**Acceptance Scenarios**:

1. **Given** a user receives a push notification about a comment, **When** they tap the notification, **Then** the Alkemio app opens (or focuses) and navigates to the relevant comment/discussion.
2. **Given** a user receives a notification while the app is already open, **When** they tap the notification, **Then** the app navigates to the relevant content without reloading the entire page.
3. **Given** a user receives a notification but the linked content has been deleted, **When** they tap the notification, **Then** they see a friendly message indicating the content is no longer available.

---

### User Story 4 - Manage Notification Preferences (Priority: P2)

A user accesses their notification settings and configures which types of platform events generate push notifications. They can enable or disable categories of notifications (e.g., mentions, comments, invitations, updates) independently.

**Why this priority**: Granular control prevents notification fatigue and increases long-term user retention, but the system is usable with all-or-nothing defaults initially.

**Independent Test**: Can be tested by toggling notification categories on and off and verifying that only enabled categories trigger push notifications.

**Acceptance Scenarios**:

1. **Given** a subscribed user in their notification settings, **When** they disable "comment" notifications, **Then** new comments no longer trigger push notifications for that user while other notification types remain active.
2. **Given** a subscribed user, **When** they view their notification preferences, **Then** they see all available notification categories with their current on/off status.
3. **Given** a user who has customized preferences, **When** they subscribe from a new device, **Then** their existing preferences are applied to the new subscription.
4. **Given** a user who subscribes to push for the first time and has never configured push preferences, **When** their push preferences are initialized, **Then** each category's push setting mirrors their current in-app notification setting.

---

### User Story 5 - Multi-Device Support (Priority: P3)

A user who accesses Alkemio from multiple devices (e.g., phone and laptop) receives push notifications on all subscribed devices. They can manage subscriptions per device.

**Why this priority**: Multi-device support enhances user experience for power users but is not required for the core notification flow.

**Independent Test**: Can be tested by subscribing on two different devices and verifying that a single event generates notifications on both.

**Acceptance Scenarios**:

1. **Given** a user subscribed on two devices, **When** a relevant event occurs, **Then** both devices receive the push notification.
2. **Given** a user subscribed on two devices, **When** they unsubscribe from one device, **Then** only the remaining device receives notifications.

---

### Edge Cases

- What happens when a user's subscription expires or becomes invalid (e.g., browser clears data)? The system detects failed delivery and marks the subscription as expired, removing it from the active list.
- How does the system handle notification delivery when the push notification service is temporarily unavailable? The delivery attempt is logged and the message is dropped. If the failure is a 4xx client error, the subscription is marked as expired. No automatic retry is implemented — the next platform event will trigger a new push to the same subscription if it is still active.
- What happens when a user revokes browser-level notification permission outside of the app? The next delivery attempt fails, and the system marks the subscription as inactive.
- How does the system behave when a user is logged in on multiple devices and interacts with the notification on one device? The notification remains visible on other devices; no cross-device dismissal is provided in this phase.
- What happens when the platform generates a high volume of events in a short time for a single user? Notifications are throttled to a maximum of 10 per minute per user via Redis counters; excess notifications are dropped silently.
- How does iOS handle push notifications for a PWA that has not been added to the Home Screen? Push notifications require the PWA to be installed (added to Home Screen) on iOS; users are informed of this requirement.
- What happens to push subscriptions when a user account is deleted? All subscriptions are cascade-deleted immediately with the account; no orphaned subscription data remains.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow users to subscribe to push notifications from a supported browser on both mobile and desktop devices.
- **FR-002**: System MUST deliver push notifications to subscribed users when any of the existing platform event types occur (full parity with in-app notifications), even when the browser is closed or the tab is in the background.
- **FR-003**: System MUST support push notification delivery on both iOS and Android mobile devices through the PWA.
- **FR-004**: System MUST store each user's device subscriptions and associate them with their account.
- **FR-005**: System MUST allow users to unsubscribe from push notifications at any time.
- **FR-006**: System MUST navigate the user to the relevant content when a push notification is tapped (deep linking).
- **FR-007**: System MUST allow users to configure which categories of events generate push notifications.
- **FR-008**: System MUST support multiple device subscriptions per user account, up to a maximum of 10 active subscriptions. When the limit is exceeded, the oldest subscription is automatically replaced.
- **FR-009**: System MUST gracefully handle expired or invalid subscriptions by removing them from the active subscription list.
- **FR-010**: System MUST throttle notifications to prevent overwhelming users during high-activity periods (maximum of 10 notifications per minute per user). Throttling is enforced via Redis counters (`INCR` + 60s TTL per user key) using the existing Redis instance; excess notifications within the window are dropped silently.
- **FR-011**: System MUST display a notification permission prompt that clearly explains what notifications the user will receive.
- **FR-012**: System MUST indicate to users on unsupported browsers that push notifications are not available.
- **FR-013**: System MUST inform iOS users that the PWA needs to be installed (added to Home Screen) for push notifications to work.
- **FR-014**: System MUST cascade-delete all push subscriptions immediately when a user account is deleted, leaving no orphaned subscription data.

### Key Entities

- **Device Subscription**: Represents a user's push notification subscription on a specific device/browser. Maximum 10 active subscriptions per user; when the cap is exceeded, the oldest subscription is automatically replaced. Key attributes: associated user, device identifier, subscription endpoint, encryption keys (p256dh, auth), subscription status (active/expired), creation date, last active date.
- **Notification Preference**: Extends the existing `IUserSettingsNotificationChannels` with a `push: boolean` field on every leaf node. When a user first subscribes, the `push` value for each category defaults to mirroring the user's current `inApp` setting. Key attributes: associated user, event category, push enabled/disabled status.
- **Push Notification** *(transient — not persisted)*: Represents an individual notification to be delivered as an ephemeral RabbitMQ message. Retries are handled via delayed requeue with TTL and dead-letter exchanges; no database table is created for notifications. Delivery outcomes are captured in structured Winston logs (NFR-001). Key attributes (message payload): target user, event type, content summary, deep link destination, retry count, creation timestamp.

### Non-Functional Requirements

- **NFR-001**: Push notification pipeline MUST emit structured Winston log entries at key stages (subscription created/removed, delivery attempted, delivery succeeded/failed, subscription expired, throttled) including fields: subscription ID, event type, delivery status, and error message when applicable.
- **NFR-002**: System MUST handle at least 10,000 concurrent subscriptions without delivery degradation (see SC-006).
- **NFR-003**: Failed deliveries are logged and dropped. Subscriptions that return 4xx errors are marked as expired. No automatic retry with backoff is implemented; the next platform event will reattempt delivery to active subscriptions.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Subscribed users receive push notifications within 30 seconds of the triggering platform event.
- **SC-002**: Push notifications are successfully delivered on both iOS and Android devices through the PWA.
- **SC-003**: At least 80% of notification taps navigate the user to the correct content within 3 seconds.
- **SC-004**: Users can complete the opt-in process (from prompt to confirmed subscription) in under 15 seconds.
- **SC-005**: The notification preference interface loads within 2 seconds and preference changes take effect immediately for subsequent notifications.
- **SC-006**: The system handles at least 10,000 concurrent subscriptions without notification delivery degradation.
- **SC-007**: Invalid or expired subscriptions are detected and cleaned up within 24 hours.

## Assumptions

- Push notifications are delivered using the W3C Web Push protocol with VAPID authentication via the `web-push` npm library. No Firebase or third-party push service dependency is required.
- Push notification logic (subscription management, VAPID key handling, delivery) is implemented as a new NestJS module within the existing server, co-located with the notification adapter layer and user settings entity.
- The Alkemio web client already has a service worker or can have one installed as part of a separate client-side effort; this spec delivers the server-side infrastructure and a documented client integration contract.
- iOS push notification support for PWAs (available since iOS 16.4) is the baseline; users on older iOS versions will see push notifications as unavailable.
- The platform already has an event system (RabbitMQ) that can be extended to trigger push notifications. The push module uses a dedicated `alkemio-push-notifications` queue consumed via `@golevelup/nestjs-rabbitmq` `@RabbitSubscribe` decorator (not NestJS `connectMicroservice` Transport.RMQ, which would create a competing consumer and silently drop messages).
- Notification categories will align with the existing Alkemio event types (comments, mentions, invitations, space updates).
- VAPID key pair (public + private) is provided via environment variables (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) and loaded through NestJS `ConfigService`. Keys are generated once offline (e.g., via `web-push generate-vapid-keys`) and deployed as secrets.
- Users must be authenticated (logged in) to subscribe to push notifications.
- The notification content will be a summary (title + short body) with a link; full content is viewed in-app. P1 delivers all push notification content in English only; localization to user-preferred language is deferred to a follow-up iteration.

## Clarifications

### Session 2026-03-01

- Q: Which push notification delivery approach should the server use? → A: W3C Web Push with VAPID — standards-based, vendor-neutral, using `web-push` npm library directly.
- Q: Where should the push notification server-side logic live? → A: New NestJS module within the existing server — co-located with existing event consumers, notification adapters, and user settings entity.
- Q: Should push channel default to mirroring inApp preferences or start disabled? → A: Mirror `inApp` — push categories default to whatever the user's current in-app notification settings are.
- Q: How should VAPID keys be managed? → A: Environment variables — stored in `.env` / K8s secrets, loaded via NestJS `ConfigService`.
- Q: Which event categories should trigger push notifications in the P1 release? → A: All 34 event types (including 4 poll notification events) — full parity with in-app notifications from day one.
- Q: Does this feature spec cover only the server-side push infrastructure, or also the React web-client changes? → A: Server-primary with client contract — server-side implementation plus a documented client integration contract (API shapes, service worker events) but no client code.
- Q: When a user account is deleted, should all their push subscriptions be immediately purged? → A: Cascade delete — all push subscriptions are immediately and permanently removed when the user account is deleted.
- Q: Should push notification content be localized to the user's preferred language? → A: Deferred — deliver in English for P1; add localization support in a follow-up iteration.
- Q: Should the push notification pipeline expose specific observability signals? → A: Structured logging — push-specific structured log fields (subscription ID, delivery status, latency, error codes) at key pipeline stages using the existing Winston logger.
- Q: What retry policy should be used for failed push notification deliveries? → A: No automatic retry with backoff. Failed deliveries are logged and dropped; 4xx errors mark the subscription as expired. The simplicity trade-off was chosen over DLX-based retry queues — the next platform event will reattempt delivery naturally.
- Q: Should individual push notifications be persisted in a DB table or handled as ephemeral RabbitMQ messages? → A: Ephemeral queue messages — notifications live only in RabbitMQ. No DB table for notifications. Delivery audit via structured Winston logs (NFR-001).
- Q: How should the push notification module consume platform events from RabbitMQ? → A: `@golevelup/nestjs-rabbitmq` `@RabbitSubscribe` decorator on `PushDeliveryService` — consumes directly from the `alkemio-push-notifications` queue. This approach avoids the NestJS `connectMicroservice` Transport.RMQ pattern, which would create a competing consumer with no handler and silently drop messages.
- Q: Should there be a maximum number of device subscriptions per user account? → A: Cap at 10 — maximum 10 active device subscriptions per user; oldest subscription is replaced when the limit is exceeded.
- Q: How should per-user notification throttling (10/min limit) be enforced? → A: Redis counters — per-user key with `INCR` + 60s TTL using the existing Redis instance. Excess notifications within the window are dropped silently.

## Scope Boundaries

### In Scope

- Push notification subscription and delivery infrastructure (server-side)
- iOS and Android PWA push notification support (server delivery pipeline)
- Deep linking URL generation for notification payloads
- User notification preference management (GraphQL API + persistence)
- Multi-device subscription support
- Subscription lifecycle management (create, expire, clean up)
- Client integration contract: documented API shapes (GraphQL mutations/queries), service worker push event payload schema, and VAPID public key endpoint

### Out of Scope

- Native mobile app notifications (only PWA/web push)
- Email notification preferences (managed separately)
- In-app notification center or notification history (existing functionality)
- Rich media notifications (images, action buttons beyond tap-to-open)
- Notification analytics dashboard for administrators
- React web-client implementation (service worker registration, UI prompts, preference screens) — covered by a separate client-side feature effort consuming the integration contract
- Push notification content localization (P1 is English-only; localization deferred to follow-up iteration)
