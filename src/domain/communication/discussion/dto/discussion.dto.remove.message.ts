import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class DiscussionRemoveMessageInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Discussion to remove a message from.',
  })
  discussionID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The message id that should be removed',
  })
  messageID!: string;
}
