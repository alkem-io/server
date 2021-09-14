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
    description: 'The sender email',
  })
  sender!: string;

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
}

export function convertFromMatrixMessage(
  message: MatrixRoomResponseMessage & { receiver: string },
  userResolver: (senderName: string) => string
): (CommunicationMessageResult & { receiver: string }) | undefined {
  const { event, sender, receiver } = message;
  if (event.type !== 'm.room.message') {
    return;
  }
  if (event.event_id?.indexOf(event.room_id || '') !== -1) {
    return;
  }
  if (!event.content?.body) {
    return;
  }

  const sendingUser = userResolver(sender.name);
  const receivingUser = userResolver(receiver);

  return {
    message: event.content.body,
    sender: sendingUser ? `${sendingUser}` : 'unknown',
    timestamp: event.origin_server_ts || 0,
    id: event.event_id || '',
    receiver: receivingUser ? `${receivingUser}` : 'unknown',
  };
}
