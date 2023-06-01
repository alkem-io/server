import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
@InputType()
export class DiscussionRemoveMessageReactionInput {
  @Field(() => UUID, {
    nullable: false,
    description:
      'The Discussion with the message whose reaction is being removed',
  })
  discussionID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'Reaction that is being removed',
  })
  reactionID!: string;
}
