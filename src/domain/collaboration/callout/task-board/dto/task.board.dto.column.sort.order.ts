import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateTaskColumnsSortOrderOnCalloutInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Tasks board Callout whose columns are being reordered.',
  })
  calloutID!: string;

  @Field(() => [String], {
    nullable: false,
    description:
      'Every existing column exactly once, in the new left-to-right order. Matched case-insensitively.',
  })
  columnNames!: string[];
}
