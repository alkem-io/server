import { ArgsType, Field } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';

@ArgsType()
export class DiscussionMessageReceivedArgs {
  @Field(() => UUID, {
    description: 'The Discussion to receive the messages from.',
    nullable: false,
  })
  discussionID!: string;
}
