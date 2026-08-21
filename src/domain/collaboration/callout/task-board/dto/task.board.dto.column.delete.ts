import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class DeleteTaskColumnOnCalloutInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Tasks board Callout to remove a column from.',
  })
  calloutID!: string;

  @Field(() => String, {
    nullable: false,
    description:
      'The column to remove. Matched case-insensitively; the first (default) column cannot be removed and its tasks reflow to the default.',
  })
  name!: string;
}
