import { MessageID, UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RoomMarkMessageReadInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Room to mark message as read in.',
  })
  roomID!: string;

  @Field(() => MessageID, {
    nullable: false,
    description: 'The message id that should be marked as read.',
  })
  messageID!: string;

  @Field(() => MessageID, {
    nullable: true,
    description: 'The thread id if the message is in a thread.',
  })
  threadID?: string;
}
