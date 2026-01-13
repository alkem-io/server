import { IMessage } from '@domain/communication/message/message.interface';
import { BaseSubscriptionPayload } from '@interfaces/index';
import { MutationType } from '@common/enums/subscriptions';

export interface UserConversationMessageSubscriptionPayload
  extends BaseSubscriptionPayload {
  receiverID: string;
  conversationId: string;
  roomId: string;
  message: {
    type: MutationType;
    data: IMessage | { id: string };
  };
}
