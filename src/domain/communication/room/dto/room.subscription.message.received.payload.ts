import {
  BaseSubscriptionPayload,
  CommunicationMessagePayload,
} from '@src/common/interfaces';

export interface RoomMessageReceivedPayload extends BaseSubscriptionPayload {
  roomID: string;
  message: CommunicationMessagePayload;
}
