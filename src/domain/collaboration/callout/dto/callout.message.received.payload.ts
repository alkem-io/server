import {
  BaseSubscriptionPayload,
  CommunicationMessagePayload,
} from '@src/common';

export interface CalloutMessageReceivedPayload extends BaseSubscriptionPayload {
  calloutID: string;
  commentsID: string;
  message: CommunicationMessagePayload;
}
