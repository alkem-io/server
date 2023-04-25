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

  @Field(() => Boolean, {
    nullable: true,
    description: 'Include entries happened on child Collaborations.',
  })
  includeChild?: string;

  @Field(() => Float, {
    nullable: true,
    description:
      'The number of ActivityLog entries to return; if omitted return all.',
  })
  limit?: number;

  @Field(() => [ActivityEventType], {
    nullable: true,
    description:
      'Which activity types to include in the results. Returns all by default.',
  })
  types?: ActivityEventType[];
}
