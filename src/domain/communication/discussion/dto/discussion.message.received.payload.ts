import {
  BaseSubscriptionPayload,
  CommunicationMessagePayload,
} from '@src/common';

export interface DiscussionMessageReceivedPayload
  extends BaseSubscriptionPayload {
  discussionID: string;
  message: CommunicationMessagePayload;
}
