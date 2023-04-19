import { UUID } from '@domain/common/scalars';
import { Field, Float, InputType } from '@nestjs/graphql';

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
}
