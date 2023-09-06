import { CANVAS_VALUE_LENGTH } from '@common/constants/entity.field.length.constants';
import { UpdateTemplateBaseInput } from '@domain/template/template-base/dto/template.base.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import JSON from 'graphql-type-json';

@InputType()
export class UpdateWhiteboardTemplateInput extends UpdateTemplateBaseInput {
  // Todo: validate that it is actually JSON?
  @Field(() => JSON, { nullable: true })
  @IsOptional()
  @MaxLength(CANVAS_VALUE_LENGTH)
  content?: string;
}
