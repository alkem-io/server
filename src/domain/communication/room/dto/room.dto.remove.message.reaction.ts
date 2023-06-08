import { UUID } from '@domain/common/scalars';
import { MessageID } from '@domain/common/scalars/scalar.messageid';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RoomRemoveReactionToMessageInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Room to remove a message from.',
  })
  roomID!: string;

  @Field(() => MessageID, {
    nullable: false,
    description: 'The reaction that is being removed',
  })
  reactionID!: string;
}
