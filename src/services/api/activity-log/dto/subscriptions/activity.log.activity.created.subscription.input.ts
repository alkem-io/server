import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { ActivityEventType } from '@common/enums/activity.event.type';

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
}
