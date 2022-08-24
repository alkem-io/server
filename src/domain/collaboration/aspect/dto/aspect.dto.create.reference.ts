import { CreateReferenceInput } from '@domain/common/reference/reference.dto.create';
import { UUID } from '@domain/common/scalars';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateReferenceOnAspectInput extends CreateReferenceInput {
  @Field(() => UUID, { nullable: false })
  aspectID!: string;
}
