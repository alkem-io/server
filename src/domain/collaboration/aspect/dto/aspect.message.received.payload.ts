import { BaseSubscriptionPayload } from '@src/common';
import { CommunicationMessageResult } from '@domain/communication/message/communication.dto.message.result';

export interface AspectMessageReceivedPayload extends BaseSubscriptionPayload {
  aspectID: string;
  message: CommunicationMessageResult;
}
