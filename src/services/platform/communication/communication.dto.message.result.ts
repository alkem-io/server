import { Field, ObjectType } from '@nestjs/graphql';
import { MatrixRoomResponseMessage } from '../matrix/adapter-room/matrix.room.dto.response.message';

@ObjectType()
export class CommunicationMessageResult {
  @Field(() => String, {
    nullable: false,
    description: 'The message being sent',
  })
  message!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The sender user ID',
  })
  senderId!: string;

  @Field(() => Number, {
    nullable: false,
    description: 'The server timestamp in UTC',
  })
  timestamp!: number;

  @Field(() => String, {
    nullable: false,
    description: 'The id for the message event (Matrix)',
  })
  id!: string;

  receiver!: string;
}

export function convertFromMatrixMessage(
  message: MatrixRoomResponseMessage,
  receiverMatrixID: string
): CommunicationMessageResult | undefined {
  const { event, sender } = message;
  if (event.type !== 'm.room.message') {
    return;
  }
  if (event.event_id?.indexOf(event.room_id || '') !== -1) {
    return;
  }
  // need to use getContent - should be able to resolve the edited value if any
  const content = message.getContent();
  if (!content.body) {
    return;
  }

  // these are used to detect whether a message is a replacement one
  // const isRelation = message.isRelation('m.replace');
  // const mRelatesTo = message.getWireContent()['m.relates_to'];

  return {
    message: content.body,
    senderId: sender.userId,
    timestamp: event.origin_server_ts || 0,
    id: event.event_id || '',
    receiver: receiverMatrixID,
  };
}
