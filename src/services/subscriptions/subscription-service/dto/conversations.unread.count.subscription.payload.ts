import { BaseSubscriptionPayload } from '@common/interfaces';

export interface ConversationsUnreadCountSubscriptionPayload
  extends BaseSubscriptionPayload {
  receiverID: string;
  count: number;
}
