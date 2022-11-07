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

  @Field(() => Float, {
    name: 'limit',
    description:
      'The number of ActivityLog entries to return; if omitted return all.',
    nullable: true,
  })
  limit?: number;
}
