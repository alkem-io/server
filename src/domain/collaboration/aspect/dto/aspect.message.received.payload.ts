import {
  BaseSubscriptionPayload,
  CommunicationMessagePayload,
} from '@src/common';

export interface AspectMessageReceivedPayload extends BaseSubscriptionPayload {
  aspectID: string;
  message: CommunicationMessagePayload;
}
