import {
  BaseSubscriptionPayload,
  CommunicationMessagePayload,
} from '@src/common/interfaces';

export interface DiscussionMessageReceivedPayload
  extends BaseSubscriptionPayload {
  discussionID: string;
  message: CommunicationMessagePayload;
}
