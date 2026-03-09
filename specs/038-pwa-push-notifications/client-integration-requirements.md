# Client-Side Requirements: PWA Push Notifications

**PR**: alkem-io/server#5884 (`038-pwa-push-notifications`)
**Date**: 2026-03-09

## Review Summary

The server-side changes in this PR are **complete and correct** — VAPID key management, subscription storage, GraphQL API, push delivery, RabbitMQ queuing, throttling, and retry logic are all implemented.

**However, push notifications will not work without corresponding changes in the web-client repository.** The client must implement the following.

---

## Required Client-Side Changes (web-client repo)

### 1. Service Worker (`sw.ts` or equivalent)

Add `push` and `notificationclick` event handlers:

```ts
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;
  let title: string, body: string, url: string, eventType: string;
  try {
    ({ title, body, url, eventType } = event.data.json());
  } catch {
    return; // Ignore malformed push payloads
  }
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data: { url },
      tag: eventType,
    })
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const url: string = event.notification.data?.url ?? '/';
  // Validate URL is relative (same origin) before navigating
  const safeUrl = url.startsWith('/') ? url : '/';
  event.waitUntil(clients.openWindow(safeUrl));
});
```

The server payload shape is: `{ title, body, url, eventType, timestamp }`.

---

### 2. Subscription Flow (React / app code)

```ts
// 1. Get VAPID public key from server
const { vapidPublicKey } = await apolloClient.query({ query: GET_VAPID_PUBLIC_KEY });

// 2. Convert base64url → Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// 3. Request permission (must be triggered by a user gesture)
const permission = await Notification.requestPermission();
if (permission !== 'granted') return;

// 4. Subscribe via PushManager
const registration = await navigator.serviceWorker.ready;
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
});

// 5. Encode keys as Base64URL (required by the GraphQL input contract)
function arrayBufferToBase64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  const binary = bytes.reduce((str, b) => str + String.fromCharCode(b), '');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

const p256dhBuffer = subscription.getKey('p256dh');
const authBuffer   = subscription.getKey('auth');
if (!p256dhBuffer || !authBuffer) throw new Error('Subscription keys missing');
const p256dh = arrayBufferToBase64url(p256dhBuffer);
const auth   = arrayBufferToBase64url(authBuffer);

// 6. Send subscription to server
const result = await apolloClient.mutate({
  mutation: SUBSCRIBE_TO_PUSH_NOTIFICATIONS,
  variables: {
    subscriptionData: {
      endpoint: subscription.endpoint,
      p256dh,
      auth,
      userAgent: navigator.userAgent,
    },
  },
});
// Store the returned subscription ID (e.g. in React state or localStorage)
// for use with the unsubscribe mutation later.
const subscriptionId = result.data.subscribeToPushNotifications.id;
```

---

### 3. iOS — Required: Install to Home Screen ⚠️

On iOS 16.4+, push notifications only work when the PWA is **installed to the Home Screen**. Without this, `PushManager` is unavailable.

```ts
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = ('standalone' in navigator) && (navigator as any).standalone;

if (isIOS && !isStandalone) {
  // Show "Add to Home Screen" prompt BEFORE requesting notification permission.
  // Do NOT call Notification.requestPermission() until the app is installed.
  showInstallPrompt(); // your UI component
  return;
}
```

**What to show**: "To receive push notifications on iOS, tap the Share button and select 'Add to Home Screen'."

---

### 4. Browser Support Detection

```ts
const isPushSupported =
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

if (!isPushSupported) {
  // Hide push notification toggle in UI
}
```

---

### 5. Notification Preferences UI

The `push` boolean field now exists on every notification category in the GraphQL schema (e.g., `user.mentioned.push`, `user.messageReceived.push`). Add a **Push** toggle alongside the existing Email and In-App toggles in the notification settings screen.

---

### 6. Unsubscribe / Permission Revocation

```ts
// When the user disables push from the app:
await apolloClient.mutate({
  mutation: UNSUBSCRIBE_FROM_PUSH_NOTIFICATIONS,
  variables: { subscriptionData: { subscriptionID: subscriptionId } },
});
await subscription.unsubscribe();

// Monitor for browser-level revocation:
const permStatus = await navigator.permissions.query({ name: 'notifications' });
permStatus.addEventListener('change', async () => {
  if (permStatus.state === 'denied') {
    await apolloClient.mutate({
      mutation: UNSUBSCRIBE_FROM_PUSH_NOTIFICATIONS,
      variables: { subscriptionData: { subscriptionID: subscriptionId } },
    });
  }
});
```

---

## GraphQL Operations Reference

All types and mutations are defined in `specs/038-pwa-push-notifications/contracts/push-notifications.graphql`:

| Operation | Purpose |
|-----------|---------|
| `query { vapidPublicKey }` | Fetch VAPID public key for `PushManager.subscribe()` |
| `query { myPushSubscriptions { id status userAgent } }` | List user's active subscriptions |
| `mutation subscribeToPushNotifications(subscriptionData: {...})` | Register a new device subscription |
| `mutation unsubscribeFromPushNotifications(subscriptionData: { subscriptionID })` | Remove a subscription |
