import {
  BaseSubscriptionPayload,
  CommunicationMessagePayload,
} from '@src/common/interfaces';

export interface AspectMessageReceivedPayload extends BaseSubscriptionPayload {
  aspectID: string;
  message: CommunicationMessagePayload;
}
