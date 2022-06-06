import { VERY_LONG_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';
import { UpdateTemplateBaseInput } from '@domain/template/template-base/dto/template.base.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class UpdateCanvasTemplateInput extends UpdateTemplateBaseInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @MaxLength(VERY_LONG_TEXT_LENGTH)
  value?: string;
}
