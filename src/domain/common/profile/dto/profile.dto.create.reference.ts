import { CreateReferenceInput } from '@domain/common/reference/dto/reference.dto.create';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateReferenceOnProfileInput extends CreateReferenceInput {
  @Field(() => UUID, { nullable: false })
  profileID!: string;
}
