import { CANVAS_VALUE_LENGTH } from '@common/constants/entity.field.length.constants';
import { UpdateTemplateInfoInput } from '@domain/template/template-info/dto/template.base.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, MaxLength, ValidateNested } from 'class-validator';
import JSON from 'graphql-type-json';

@InputType()
export class UpdateCalloutCanvasTemplateInput {
  // Todo: validate that it is actually JSON?
  @Field(() => JSON, { nullable: true })
  @IsOptional()
  @MaxLength(CANVAS_VALUE_LENGTH)
  value?: string;

  @Field({
    nullable: true,
    description: 'The meta information for this Template.',
  })
  @ValidateNested()
  @Type(() => UpdateTemplateInfoInput)
  info!: UpdateTemplateInfoInput;
}
