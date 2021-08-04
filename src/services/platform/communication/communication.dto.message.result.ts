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
  message: MatrixRoomResponseMessage,
  userResolver: (senderName: string) => string
): CommunicationMessageResult | undefined {
  const { event, sender } = message;
  if (!event.content?.body) {
    return;
  }

  const user = userResolver(sender.name);

  return {
    message: event.content.body,
    sender: user ? `${user}` : 'unknown',
    timestamp: event.origin_server_ts || 0,
    id: event.event_id || '',
  };
}
