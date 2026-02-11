import { ActivityEventType } from '@common/enums/activity.event.type';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ActivityCreatedSubscriptionInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The collaboration on which to subscribe for new activity',
  })
  collaborationID!: string;

  @Field(() => [ActivityEventType], {
    nullable: true,
    description:
      'Which activity types to include in the results. Returns all by default.',
  })
  types?: ActivityEventType[];

  @Field(() => Boolean, {
    nullable: true,
    description: 'Include activities happened on child Collaborations.',
  })
  includeChild?: boolean;
}
