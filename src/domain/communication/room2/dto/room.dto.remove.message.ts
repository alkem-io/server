import { MessageID, UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RoomRemoveMessageInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Room to remove a message from.',
  })
  roomID!: string;

  @Field(() => MessageID, {
    nullable: false,
    description: 'The message id that should be removed',
  })
  messageID!: string;
}
