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
  };
  retryCount: number;
}
