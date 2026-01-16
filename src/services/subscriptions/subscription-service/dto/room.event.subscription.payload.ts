import { IMessageReaction } from '@domain/communication/message.reaction/message.reaction.interface';
import { IMessage } from '@domain/communication/message/message.interface';
import { BaseSubscriptionPayload } from '@interfaces/index';
import { MutationType } from '@common/enums/subscriptions';
import { IRoom } from '@domain/communication/room/room.interface';

export interface ReadReceiptData {
  actorId: string;
  eventId: string;
  threadId?: string;
  timestamp: number;
}

export interface RoomEventSubscriptionPayload extends BaseSubscriptionPayload {
  roomID: string;
  room: Partial<IRoom>;
  message?: {
    type: MutationType;
    data: IMessage | { id: string };
  };
  reaction?: {
    type: MutationType;
    messageID?: string;
    data: IMessageReaction | { id: string };
  };
  receipt?: {
    type: MutationType;
    data: ReadReceiptData;
  };
}
