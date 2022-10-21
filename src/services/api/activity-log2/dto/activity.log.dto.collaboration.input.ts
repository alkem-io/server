import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ActivityLog2Input {
  @Field(() => UUID, {
    nullable: false,
    description:
      'Display the activityLog results for the specified Collaboration.',
  })
  collaborationID!: string;
}
