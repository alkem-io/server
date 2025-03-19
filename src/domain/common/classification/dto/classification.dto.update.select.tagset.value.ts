import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateClassificationSelectTagsetValueInput {
  @Field(() => UUID, { nullable: false })
  classificationID!: string;

  @Field(() => String, { nullable: false })
  tagsetName!: string;

  @Field(() => String, { nullable: false })
  selectedValue!: string;
}
