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
export class CreateWhiteboardTemplateInput extends CreateTemplateBaseInput {
  // Todo: validate that it is actually JSON? This also applies to our Whiteboard entity usage.
  @Field(() => JSON, { nullable: true })
  @IsOptional()
  @MaxLength(CANVAS_VALUE_LENGTH)
  value?: string;

  @Field(() => UUID, {
    nullable: true,
    description:
      'Use the specified Whiteboard as the initial value for this WhiteboardTemplate',
  })
  @IsOptional()
  @MaxLength(UUID_LENGTH)
  whiteboardID?: string;
}
