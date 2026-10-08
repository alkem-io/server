import { MID_TEXT_LENGTH } from '@common/constants';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

@InputType('UpdateCalloutFormQuestionOptionInput')
export class UpdateCalloutFormQuestionOptionInput {
  @Field(() => UUID, {
    nullable: true,
    description:
      'The ID of an existing option. Absent for a new option; an unknown ID is rejected.',
  })
  @IsOptional()
  @IsUUID()
  id?: string;

  @Field(() => String, { nullable: false })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'label must not be blank' })
  @MaxLength(MID_TEXT_LENGTH)
  label!: string;
}
