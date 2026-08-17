import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';

// Step B — a full replacement list, never a per-value delta (FR-012d, S-2).
@InputType()
export class UpdateClassificationEntrySelectionInput {
  @Field(() => UUID, { nullable: false })
  classificationEntryID!: string;

  @Field(() => [String], {
    nullable: false,
    description:
      'The complete set of selected value ids. An empty list clears the selection.',
  })
  selectedValueIDs!: string[];
}
