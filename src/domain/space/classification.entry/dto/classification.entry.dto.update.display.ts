import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';

// Deliberately separate from UpdateClassificationEntryInput (FR-010b ships
// in the UI this iteration; the definition edit is API-only) so the
// shipping client never has to partially populate an input whose other
// fields it must never send.
@InputType()
export class UpdateClassificationEntryDisplayInput {
  @Field(() => UUID, { nullable: false })
  classificationEntryID!: string;

  @Field(() => Boolean, { nullable: false })
  display!: boolean;
}
