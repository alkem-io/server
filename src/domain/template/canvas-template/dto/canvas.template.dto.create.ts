import {
  CANVAS_VALUE_LENGTH,
  UUID_LENGTH,
} from '@common/constants/entity.field.length.constants';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { CreateTemplateBaseInput } from '@domain/template/template-base/dto';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import JSON from 'graphql-type-json';

@InputType()
export class CreateCanvasTemplateInput extends CreateTemplateBaseInput {
  // Todo: validate that it is actually JSON? This also applies to our Canvas entity usage.
  @Field(() => JSON, { nullable: true })
  @IsOptional()
  @MaxLength(CANVAS_VALUE_LENGTH)
  value?: string;

  @Field(() => UUID, {
    nullable: true,
    description:
      'Use the specified Canvas as the initial value for this CanvasTemplate',
  })
  @IsOptional()
  @MaxLength(UUID_LENGTH)
  canvasID?: string;
}
