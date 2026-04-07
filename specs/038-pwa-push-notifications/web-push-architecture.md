# Web Push Notification Architecture

**Feature**: 038-pwa-push-notifications | **Date**: 2026-03-23

This document explains how W3C Web Push notifications work end-to-end in the Alkemio platform, from VAPID key setup through notification delivery to the user's device.

## High-Level Flow

```
                                    SETUP (one-time)
                    ┌──────────────────────────────────────────┐
                    │  Server generates VAPID key pair         │
                    │  (public + private) and stores as        │
                    │  environment variables                   │
                    └──────────────────────────────────────────┘

  ┌─────────┐         ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
  │  User   │         │   Browser    │         │ Push Service │         │   Alkemio    │
  │ Device  │         │   (Client)   │         │ (Google/Apple│         │   Server     │
  │         │         │              │         │  /Mozilla)   │         │              │
  └────┬────┘         └──────┬───────┘         └──────┬───────┘         └──────┬───────┘
       │                     │                        │                        │
       │  SUBSCRIBE FLOW     │                        │                        │
       │  ════════════════   │                        │                        │
       │                     │                        │                        │
       │                     │  1. Query vapidPublicKey                        │
       │                     │───────────────────────────────────────────────►│
       │                     │◄───────────────────────────────────────────────│
       │                     │       (returns VAPID public key)               │
       │                     │                        │                        │
       │                     │  2. PushManager.subscribe                      │
       │                     │      (applicationServerKey)                    │
       │                     │───────────────────────►│                        │
       │                     │                        │  Browser registers     │
       │                     │                        │  with push service     │
       │                     │◄───────────────────────│                        │
       │                     │   {endpoint, keys:     │                        │
       │                     │    {p256dh, auth}}     │                        │
       │                     │                        │                        │
       │                     │  3. subscribeToPushNotifications mutation       │
       │                     │      (endpoint, p256dh, auth)                  │
       │                     │───────────────────────────────────────────────►│
       │                     │                        │                        │  Stored in
       │                     │                        │                        │  push_subscription
       │                     │◄───────────────────────────────────────────────│  table
       │                     │      (subscription confirmed)                  │
       │                     │                        │                        │
       │  DELIVERY FLOW      │                        │                        │
       │  ══════════════     │                        │                        │
       │                     │                        │                        │
       │                     │                        │         4. Platform event fires
       │                     │                        │            (e.g. comment posted)
       │                     │                        │                        │
       │                     │                        │         5. Resolve push recipients
       │                     │                        │            (check user.settings
       │                     │                        │             .notification.push)
       │                     │                        │                        │
       │                     │                        │         6. Check throttle
       │                     │                        │            (Redis: 10/min/user)
       │                     │                        │                        │
       │                     │                        │         7. Lookup active
       │                     │                        │            subscriptions
       │                     │                        │                        │
       │                     │                        │         8. Publish to RabbitMQ
       │                     │                        │            (alkemio-push-
       │                     │                        │             notifications queue)
       │                     │                        │                        │
       │                     │                        │         9. PushDeliveryService
       │                     │                        │            consumes message
       │                     │                        │                        │
       │                     │                        │  10. web-push.send     │
       │                     │                        │      Notification()    │
       │                     │                        │  (encrypted HTTP POST) │
       │                     │                        │◄───────────────────────│
       │                     │                        │   Signed with VAPID    │
       │                     │                        │   private key,         │
       │                     │                        │   encrypted with       │
       │                     │                        │   p256dh + auth        │
       │                     │                        │                        │
       │                     │  11. Push service       │                        │
       │                     │      delivers to device│                        │
       │                     │◄───────────────────────│                        │
       │                     │                        │                        │
       │                     │  12. Service worker     │                        │
       │                     │      'push' event fires│                        │
       │                     │      → showNotification│                        │
       │  13. System         │      (title, body)     │                        │
       │  notification       │                        │                        │
       │◄────────────────────│                        │                        │
       │  appears on device  │                        │                        │
       │                     │                        │                        │
       │  14. User taps      │                        │                        │
       │───────────────────►│                        │                        │
       │                     │  15. 'notificationclick'                        │
       │                     │      → openWindow(url) │                        │
       │                     │      (deep link to     │                        │
       │                     │       relevant content)│                        │
       │                     │                        │                        │
```

## Detailed Component Breakdown

### Phase 1: VAPID Key Setup (One-Time, Server Admin)

VAPID (Voluntary Application Server Identification) is a standard that lets the push service verify that the server sending the push is who it claims to be.

```
┌──────────────────────────────────────────────────────────┐
│  $ npx web-push generate-vapid-keys                      │
│                                                          │
│  Public Key:  BNxRj_aNZr...  ──► VAPID_PUBLIC_KEY env   │
│  Private Key: 3KZhVB_c2p...  ──► VAPID_PRIVATE_KEY env  │
│                                                          │
│  These keys are stable across deployments.               │
│  Changing them invalidates ALL existing subscriptions.   │
└──────────────────────────────────────────────────────────┘
```

- **Public key**: Shared with clients (exposed via `vapidPublicKey` GraphQL query). Used by the browser to associate the subscription with the server.
- **Private key**: Never leaves the server. Used to sign push messages so the push service can verify the sender.

### Phase 2: Subscription (Client ↔ Browser ↔ Server)

When a user opts in to push notifications, three systems coordinate:

```
┌─────────────┐        ┌───────────────────┐        ┌───────────────────┐
│   Client    │        │  Browser Engine   │        │  Alkemio Server   │
│   (React)   │        │  (Push Manager)   │        │  (NestJS)         │
└──────┬──────┘        └────────┬──────────┘        └────────┬──────────┘
       │                       │                             │
       │  1. Fetch VAPID key   │                             │
       │  query { vapidPublicKey }  ────────────────────────►│
       │  ◄──────────────────────────────────────────────────│
       │  "BNxRj_aNZr..."     │                             │
       │                       │                             │
       │  2. Request permission│                             │
       │  Notification         │                             │
       │  .requestPermission() │                             │
       │──────────────────────►│                             │
       │  "granted"            │                             │
       │◄──────────────────────│                             │
       │                       │                             │
       │  3. Subscribe          │                             │
       │  registration          │       ┌──────────────┐     │
       │  .pushManager          │       │ Push Service  │     │
       │  .subscribe({          │       │ (e.g. FCM)   │     │
       │    applicationServer   │──────►│              │     │
       │    Key: vapidPublicKey │       │ Allocates    │     │
       │  })                    │◄──────│ endpoint URL │     │
       │                       │       └──────────────┘     │
       │  Returns:             │                             │
       │  {                    │                             │
       │    endpoint: "https://fcm.googleapis.com/...",      │
       │    keys: {            │                             │
       │      p256dh: "BL4E...",  (client encryption key)   │
       │      auth: "5aJB..."     (auth secret)             │
       │    }                  │                             │
       │  }                    │                             │
       │                       │                             │
       │  4. Store on server   │                             │
       │  mutation { subscribeToPushNotifications(           │
       │    subscriptionData: {│                             │
       │      endpoint, p256dh, auth                        │
       │    }                  │                             │
       │  )}  ────────────────────────────────────────────►  │
       │                       │                    ┌────────┴────────┐
       │                       │                    │ push_subscription│
       │                       │                    │ table (PG)      │
       │                       │                    │                 │
       │                       │                    │ endpoint ✓      │
       │                       │                    │ p256dh   ✓      │
       │                       │                    │ auth     ✓      │
       │                       │                    │ userId   ✓      │
       │                       │                    │ status=active   │
       │                       │                    └─────────────────┘
```

**What the three keys do:**
- **endpoint**: A unique URL on the push service (Google/Apple/Mozilla) that represents this specific browser on this specific device. The server POSTs to this URL to send a push.
- **p256dh**: The browser's public key for ECDH encryption. The server uses this to encrypt the notification payload so that only the user's browser can decrypt it — the push service (middleman) cannot read the content.
- **auth**: An authentication secret used as additional entropy in the encryption process.

### Phase 3: Notification Delivery (Server → Push Service → Device)

When a platform event occurs, the push notification pipeline kicks in:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ALKEMIO SERVER (internal pipeline)                                     │
│                                                                         │
│  ┌──────────────────┐    ┌─────────────────────────┐                   │
│  │ Platform Event   │    │ NotificationRecipients   │                   │
│  │ (e.g. comment    │───►│ Service                  │                   │
│  │  posted)         │    │                          │                   │
│  └──────────────────┘    │ For each user, check:    │                   │
│                          │ settings.notification    │                   │
│                          │  .space.collaborationX   │                   │
│                          │  .push === true?         │                   │
│                          │                          │                   │
│                          │ Returns:                 │                   │
│                          │  emailRecipients: [...]  │                   │
│                          │  inAppRecipients: [...]  │                   │
│                          │  pushRecipients:  [...]  │◄── NEW channel   │
│                          └────────────┬────────────┘                   │
│                                       │                                 │
│                                       ▼                                 │
│                          ┌─────────────────────────┐                   │
│                          │ NotificationPushAdapter  │                   │
│                          │                          │                   │
│                          │ For each push recipient: │                   │
│                          │                          │                   │
│                          │  ┌─ PushThrottleService  │                   │
│                          │  │  Redis INCR per user  │                   │
│                          │  │  > 10/min? → drop     │                   │
│                          │  └───────────────────────│                   │
│                          │                          │                   │
│                          │  ┌─ PushSubscription     │                   │
│                          │  │  Service              │                   │
│                          │  │  Get all active subs  │                   │
│                          │  │  for this user        │                   │
│                          │  │  (may be 1-10 devices)│                   │
│                          │  └───────────────────────│                   │
│                          │                          │                   │
│                          │  For each subscription:  │                   │
│                          │  Publish message to      │                   │
│                          │  RabbitMQ queue          │                   │
│                          └────────────┬────────────┘                   │
│                                       │                                 │
│                                       ▼                                 │
│                          ┌─────────────────────────┐                   │
│                          │ RabbitMQ                 │                   │
│                          │ alkemio-push-            │                   │
│                          │ notifications queue      │                   │
│                          └────────────┬────────────┘                   │
│                                       │                                 │
│                                       ▼                                 │
│                          ┌─────────────────────────┐                   │
│                          │ PushDeliveryService      │                   │
│                          │ (@RabbitSubscribe)       │                   │
│                          │                          │                   │
│                          │ web-push.sendNotification│                   │
│                          │  (endpoint, payload,     │                   │
│                          │   {vapidDetails})        │                   │
│                          │                          │                   │
│                          │ Payload (encrypted):     │                   │
│                          │ {                        │                   │
│                          │   title: "New comment",  │                   │
│                          │   body: "John commented  │                   │
│                          │          on your post",  │                   │
│                          │   url: "/spaces/my-space │                   │
│                          │         /collaboration/…"│                   │
│                          │ }                        │                   │
│                          └────────────┬────────────┘                   │
└───────────────────────────────────────┼─────────────────────────────────┘
                                        │
                           Encrypted HTTP POST
                           to push service endpoint
                           (signed with VAPID private key)
                                        │
                                        ▼
                          ┌─────────────────────────┐
                          │ Push Service             │
                          │ (e.g. fcm.googleapis.com)│
                          │                          │
                          │ 1. Verify VAPID signature│
                          │    (is this server       │
                          │     authorized?)         │
                          │                          │
                          │ 2. Route to device       │
                          │    (endpoint maps to a   │
                          │     specific browser     │
                          │     instance)            │
                          │                          │
                          │ 3. Cannot read payload   │
                          │    (encrypted with       │
                          │     p256dh + auth)       │
                          └────────────┬────────────┘
                                       │
                              Delivered to device
                              (even if browser is closed)
                                       │
                                       ▼
                          ┌─────────────────────────┐
                          │ Browser / Service Worker │
                          │                          │
                          │ 'push' event fires       │
                          │                          │
                          │ 1. Decrypt payload       │
                          │ 2. showNotification(     │
                          │      title, body)        │
                          │                          │
                          │ On tap → 'notificationclick'
                          │ → openWindow(url)        │
                          │   (deep link to content) │
                          └─────────────────────────┘
```

### Error Handling

```
web-push.sendNotification() response:

  ┌─────────┐
  │ Success │──► Mark subscription.lastActiveDate = now
  │ (201)   │    Ack message
  └─────────┘

  ┌─────────┐
  │ 410     │──► Subscription no longer valid
  │ Gone    │    (user cleared browser data or revoked permission)
  └────┬────┘    Mark subscription status = 'expired'
       │         Ack message
       │
       │    Daily cron job cleans up expired subscriptions

  ┌─────────┐
  │ 4xx     │──► Client error (bad endpoint, invalid keys)
  │ Other   │    Mark subscription status = 'expired'
  └─────────┘    Ack message

  ┌─────────┐
  │ 5xx /   │──► Push service temporarily down
  │ Network │    Log failure, ack and DROP message
  │ Error   │    (fire-and-forget — next event will retry naturally)
  └─────────┘
```

### Security Model

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  Server                    Push Service              Browser         │
│  ══════                    ════════════              ═══════         │
│                                                                      │
│  VAPID private key ──►  Signs the HTTP POST                         │
│  (proves identity)       Push service verifies ──►  "This is from   │
│                          the signature               Alkemio, not   │
│                                                      a spammer"     │
│                                                                      │
│  p256dh + auth ────────► Encrypts the payload                       │
│  (from subscription)     Push service CANNOT   ──►  Browser         │
│                          read the content            decrypts with  │
│                          (end-to-end encrypted)      its private    │
│                                                      counterpart    │
│                                                                      │
│  Result: The push service is a blind relay.                         │
│  It knows WHO to deliver to, but not WHAT the message says.         │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Multi-Device Fan-Out

A single user can have up to 10 active subscriptions (different browsers/devices). Each subscription has its own endpoint, so the server sends a separate push to each:

```
Platform Event
     │
     ▼
NotificationPushAdapter
     │
     ├──► Subscription 1 (Chrome, laptop)   ──► Push Service ──► Laptop notification
     ├──► Subscription 2 (Safari, iPhone)    ──► Push Service ──► iPhone notification
     └──► Subscription 3 (Firefox, tablet)   ──► Push Service ──► Tablet notification

Each subscription may route to a DIFFERENT push service
(Google for Chrome, Apple for Safari, Mozilla for Firefox).
The server doesn't care — it just POSTs to the endpoint URL.
```

### Notification Preference Granularity

Users control push notifications per event category independently, stored as JSONB in `user_settings.notification`:

```
notification: {
  space: {
    communicationUpdates:          { email: true,  inApp: true,  push: true  }
    collaborationCalloutPublished: { email: true,  inApp: true,  push: true  }
    collaborationCalloutComment:   { email: false, inApp: true,  push: true  }
    collaborationPollVoteCast...:  { email: false, inApp: true,  push: false }  ◄── per-category
    ...
  }
  user: {
    mentioned:      { email: true,  inApp: true,  push: true  }
    commentReply:   { email: false, inApp: true,  push: true  }
    ...
  }
  ...
}

The "push" field was added alongside existing "email" and "inApp" fields.
When a user first subscribes, "push" defaults mirror their "inApp" settings.
```
