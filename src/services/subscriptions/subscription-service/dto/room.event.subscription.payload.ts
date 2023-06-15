import { IMessageReaction } from '@domain/communication/message.reaction/message.reaction.interface';
import { IMessage } from '@domain/communication/message/message.interface';
import { BaseSubscriptionPayload } from '@interfaces/index';
import { MutationType } from '@common/enums/subscriptions';

export interface RoomEventSubscriptionPayload extends BaseSubscriptionPayload {
  roomID: string;
  message?: {
    type: MutationType;
    data: IMessage | { id: string };
  };
  reaction?: {
    type: MutationType;
    messageID: string;
    data: IMessageReaction | { id: string };
  };
}
