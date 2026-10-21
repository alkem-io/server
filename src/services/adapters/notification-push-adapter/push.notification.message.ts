export interface PushNotificationMessage {
  subscriptionId: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  payload: {
    title: string;
    body: string;
    url: string;
    eventType: string;
    timestamp: string;
    /**
     * 034-messaging-notifications (FR-024). Passed through to the service
     * worker's `showNotification` as the notification `tag`, so a newer
     * notification with the same tag REPLACES the previous unattended one
     * instead of stacking. Optional: notification kinds that should stack
     * (the pre-existing ones) simply omit it.
     */
    tag?: string;
  };
  retryCount: number;
}

/**
 * 086-app-push-mvp (FR-005). A native app push, for one device token bound to
 * one user, on the SAME `alkemio-push-notifications` queue as the web shape
 * above — no new queue, no new exchange, no envelope version.
 *
 * `PushDeliveryService.handlePushMessage` discriminates on the presence of
 * `platform`, so the web interface stays untouched. `payload` is deliberately
 * the web shape's own type: the server has already rendered `title`/`body`,
 * and the native transports reuse them verbatim.
 */
export interface NativePushNotificationMessage {
  userId: string;
  /** `ios` | `android` — validated on registration, picks APNs vs FCM. */
  platform: string;
  token: string;
  payload: PushNotificationMessage['payload'];
}
