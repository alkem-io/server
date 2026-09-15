import { CLASSIFICATION_VALUE_SET_MAX_SIZE } from '@domain/common/classification-value/classification.value.interface';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { ArrayMaxSize } from 'class-validator';

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
  // A selection can never legitimately exceed the value set's own size
  // bound (I-1) — this is a defence-in-depth pipe-level cap, not a business
  // rule on its own; ClassificationEntryValidator.validateSelection is what
  // actually rejects a selection wider than the entry's real value set.
  @ArrayMaxSize(CLASSIFICATION_VALUE_SET_MAX_SIZE)
  selectedValueIDs!: string[];
}
