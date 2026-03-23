import { PollEventType } from '@common/enums/poll.event.type';
import { IPoll } from '@domain/collaboration/poll/poll.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('PollOptionsChangedSubscriptionResult')
export class PollOptionsChangedSubscriptionResult {
  @Field(() => PollEventType, {
    nullable: false,
    description: 'The type of poll event.',
  })
  pollEventType!: PollEventType;

  @Field(() => IPoll, {
    nullable: false,
    description:
      "The updated Poll. Fields are filtered per subscriber's visibility context.",
  })
  poll!: IPoll;
}
