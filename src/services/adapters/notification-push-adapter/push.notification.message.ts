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
