# Quickstart: PWA Push Notifications

**Feature**: 038-pwa-push-notifications | **Date**: 2026-03-01

## Prerequisites

- Node.js 22 LTS (Volta-managed)
- pnpm 10.17.1
- Docker + Compose (for PostgreSQL, RabbitMQ, Redis)
- `web-push` CLI for VAPID key generation

## Setup

### 1. Generate VAPID Keys

```bash
# Install web-push CLI globally (or use npx)
npx web-push generate-vapid-keys
```

This outputs:
```
Public Key:  BNxRj_aNZr...
Private Key: 3KZhVB_c2p...
```

Save both keys — they must remain stable across deployments.

### 2. Configure Environment Variables

Add to `.env` (or set in your environment):

```bash
# Push notification configuration
PUSH_NOTIFICATIONS_ENABLED=true
VAPID_PUBLIC_KEY=<your-public-key-from-step-1>
VAPID_PRIVATE_KEY=<your-private-key-from-step-1>
VAPID_SUBJECT=mailto:notifications@alkem.io
```

### 3. Start Services

```bash
pnpm run start:services   # PostgreSQL, RabbitMQ, Redis
```

### 4. Install Dependencies

```bash
pnpm install   # Installs web-push and other new deps
```

### 5. Run Migrations

```bash
pnpm run migration:run
```

This creates the `push_subscription` table and adds the `push` field to existing user notification settings.

### 6. Start Server

```bash
pnpm start:dev
```

## Verification

### Check VAPID Key Availability

```graphql
query {
  vapidPublicKey
}
```

Expected: Returns the VAPID public key string (same as `VAPID_PUBLIC_KEY` env var).

### Test Subscription (via GraphQL Playground)

Requires authentication. Use a valid session cookie or Bearer token.

```graphql
mutation {
  subscribeToPushNotifications(subscriptionData: {
    endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint"
    p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8p8REfWM8="
    auth: "tBHItJI5svbpC7htKmq1Uw=="
    userAgent: "Mozilla/5.0 (Test Device)"
  }) {
    id
    status
    createdDate
    userAgent
  }
}
```

### Query Subscriptions

```graphql
query {
  myPushSubscriptions {
    id
    status
    userAgent
    lastActiveDate
    createdDate
  }
}
```

### Test Unsubscribe

```graphql
mutation {
  unsubscribeFromPushNotifications(subscriptionData: {
    ID: "<subscription-id-from-above>"
  }) {
    id
    status
  }
}
```

### Verify Push Channel in Notification Settings

After subscribing, the user's notification settings should include `push` fields:

```graphql
query {
  me {
    settings {
      notification {
        user {
          mentioned {
            email
            inApp
            push
          }
          commentReply {
            email
            inApp
            push
          }
        }
      }
    }
  }
}
```

## Testing Push Delivery (End-to-End)

To test actual push notification delivery, you need a real browser subscription:

1. Set up a test page with a service worker that registers for push
2. Use the subscription data from `PushManager.subscribe()` in the GraphQL mutation
3. Trigger a platform event (e.g., mention a user in a comment)
4. Verify the push notification appears on the device

For local testing without a real browser, check the server logs for push delivery attempts:

```bash
# Look for push notification log entries
grep "push-notification" <log-output>
```

Log entries to expect:
- `Push subscription created` — on successful subscribe mutation
- `Push notification delivery attempted` — when an event triggers push
- `Push notification delivered` — on successful web-push send
- `Push subscription expired` — on 410 Gone from push service

## RabbitMQ Queue Verification

After starting the server, verify the push notification queues exist:

1. Open RabbitMQ Management UI: `http://localhost:15672` (guest/guest)
2. Check for queues:
   - `alkemio-push-notifications` — main push delivery queue
   - `alkemio-push-notifications-retry-*` — retry tier queues (created on first retry)

## Configuration Reference

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `PUSH_NOTIFICATIONS_ENABLED` | `false` | Enable/disable push notification feature |
| `VAPID_PUBLIC_KEY` | (none) | VAPID public key for Web Push |
| `VAPID_PRIVATE_KEY` | (none) | VAPID private key for Web Push |
| `VAPID_SUBJECT` | `mailto:notifications@alkem.io` | VAPID subject (mailto: or https: URL) |
| `PUSH_MAX_SUBSCRIPTIONS_PER_USER` | `10` | Max active subscriptions per user |
| `PUSH_THROTTLE_MAX_PER_MINUTE` | `10` | Max push notifications per user per minute |
| `PUSH_RETRY_MAX_ATTEMPTS` | `5` | Max delivery retry attempts |
| `PUSH_CLEANUP_STALE_DAYS` | `30` | Days after which inactive subscriptions are cleaned |
