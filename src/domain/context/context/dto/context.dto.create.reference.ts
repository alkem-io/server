import { CreateReferenceInput } from '@domain/common/reference/reference.dto.create';
import { UUID } from '@domain/common/scalars';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateReferenceOnContextInput extends CreateReferenceInput {
  @Field(() => UUID, { nullable: false })
  contextID!: string;
}
