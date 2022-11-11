import {
  BaseSubscriptionPayload,
  CommunicationMessagePayload,
} from '@src/common/interfaces';

export interface CalloutMessageReceivedPayload extends BaseSubscriptionPayload {
  calloutID: string;
  commentsID: string;
  message: CommunicationMessagePayload;
}
