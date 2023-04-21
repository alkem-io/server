import { UUID } from '@domain/common/scalars';
import { Field, Float, InputType } from '@nestjs/graphql';
import { ActivityEventType } from '@common/enums/activity.event.type';

@InputType()
export class ActivityLogInput {
  @Field(() => UUID, {
    nullable: false,
    description:
      'Display the activityLog results for the specified Collaboration.',
  })
  collaborationID!: string;

  @Field(() => Float, {
    name: 'limit',
    description:
      'The number of ActivityLog entries to return; if omitted return all.',
    nullable: true,
  })
  limit?: number;

  @Field(() => [ActivityEventType], {
    nullable: true,
    description:
      'Which activity types to include in the results. Returns all by default.',
  })
  types?: ActivityEventType[];
}
