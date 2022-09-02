import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ActivityLogInput {
  @Field(() => [String], {
    nullable: true,
    description:
      'Restrict the activityLog results to only the specified event types. Default is all.',
  })
  typesFilter?: string[];

  @Field(() => UUID, {
    nullable: true,
    description:
      'Restrict the activityLog results to only the specified collaborationID.',
  })
  collaborationID?: string;
}
