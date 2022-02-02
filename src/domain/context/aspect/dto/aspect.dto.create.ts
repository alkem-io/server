import { CreateNameableInput } from '@domain/common/entity/nameable-entity/nameable.dto.create';
import { UUID } from '@domain/common/scalars';
import { InputType, Field } from '@nestjs/graphql';
import { LONG_TEXT_LENGTH, MID_TEXT_LENGTH } from '@src/common/constants';
import { MaxLength } from 'class-validator';

@InputType()
export class CreateAspectInput extends CreateNameableInput {
  @Field(() => UUID, { nullable: false })
  contextID!: string;

  @Field({ nullable: false })
  @MaxLength(MID_TEXT_LENGTH)
  type!: string;

  @Field({ nullable: false })
  @MaxLength(LONG_TEXT_LENGTH)
  description!: string;
}
