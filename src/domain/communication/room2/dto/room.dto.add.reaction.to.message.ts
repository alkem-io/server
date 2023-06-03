import { Emoji } from '@domain/common/scalars';
import { MessageID } from '@domain/common/scalars/scalar.messageid';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RoomAddReactionToMessageInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Room to remove a message from.',
  })
  roomID!: string;

  @Field(() => MessageID, {
    nullable: false,
    description: 'The message id that is being reacted to',
  })
  messageID!: string;

  @Field(() => Emoji, {
    nullable: false,
    description: 'The reaction to the message.',
  })
  text!: string;
}
