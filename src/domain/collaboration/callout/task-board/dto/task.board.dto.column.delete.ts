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
      'The column to remove. Matched case-insensitively. The first (default) column cannot be removed; removing any other column reflows its tasks onto the first column.',
  })
  name!: string;
}
