import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class MoveTaskToColumnInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The task (Callout Contribution) to move.',
  })
  contributionID!: string;

  @Field(() => String, {
    nullable: false,
    description:
      'The destination column on the Tasks board. Matched case-insensitively to an existing column.',
  })
  column!: string;
}
