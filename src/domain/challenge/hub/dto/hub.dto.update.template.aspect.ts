import {
  MID_TEXT_LENGTH,
  SMALL_TEXT_LENGTH,
  TINY_TEXT_LENGTH,
} from '@common/constants/entity.field.length.constants';
import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength, MinLength } from 'class-validator';

@InputType()
export class UpdateAspectTemplateInput {
  @Field({ nullable: false })
  @MaxLength(TINY_TEXT_LENGTH)
  @MinLength(3)
  type!: string;

  @Field({ nullable: true })
  @MaxLength(MID_TEXT_LENGTH)
  @IsOptional()
  defaultDescription!: string;

  @Field({ nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  typeDescription!: string;
}
