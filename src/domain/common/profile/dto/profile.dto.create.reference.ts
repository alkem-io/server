import { CreateReferenceInput } from '@domain/common/reference/reference.dto.create';
import { UUID } from '@domain/common/scalars';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateReferenceOnProfileInput extends CreateReferenceInput {
  @Field(() => UUID, { nullable: false })
  profileID!: string;
}
