import { BaseSubscriptionPayload } from '@common/interfaces';

export interface InAppNotificationCounterSubscriptionPayload
  extends BaseSubscriptionPayload {
  receiverID: string;
  count: number;
}
