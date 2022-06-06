import { VERY_LONG_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';
import { CreateTemplateBaseInput } from '@domain/template/template-base/dto';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import JSON from 'graphql-type-json';

@InputType()
export class CreateCanvasTemplateInput extends CreateTemplateBaseInput {
  // Todo: validate that it is actually JSON? This also applies to our Canvas entity usage.
  @Field(() => JSON, { nullable: true })
  @IsOptional()
  @MaxLength(VERY_LONG_TEXT_LENGTH)
  value?: string;
}
