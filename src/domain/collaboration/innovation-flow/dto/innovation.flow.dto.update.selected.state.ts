import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { SMALL_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';

@InputType()
export class UpdateInnovationFlowSelectedStateInput {
  @Field(() => UUID, {
    description: 'ID of the Innovation Flow',
  })
  @IsOptional()
  innovationFlowID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The State that the Innovation Flow is in',
  })
  @MaxLength(SMALL_TEXT_LENGTH)
  selectedState!: string;
}
