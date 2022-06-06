import { VERY_LONG_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';
import { CreateTemplateBaseInput } from '@domain/template/template-base/dto';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class CreateCanvasTemplateInput extends CreateTemplateBaseInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @MaxLength(VERY_LONG_TEXT_LENGTH)
  value?: string;
}
