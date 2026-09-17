import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateTaskColumnOnCalloutInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Tasks board Callout whose column is being renamed.',
  })
  calloutID!: string;

  @Field(() => String, {
    nullable: false,
    description:
      'The current column name. Matched case-insensitively to an existing column.',
  })
  currentName!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The new column name. Tasks in the column follow the rename.',
  })
  newName!: string;
}
