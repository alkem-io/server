import { CANVAS_VALUE_LENGTH } from '@common/constants';
import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity/base.alkemio.dto.update';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import JSON from 'graphql-type-json';

@InputType()
export class UpdateCalloutResponseDefaultsInput extends UpdateBaseAlkemioInput {
  @Field(() => Markdown, {
    nullable: true,
    description: 'The default description to use for new Post contributions.',
  })
  postDescription?: string;

  @Field(() => JSON, {
    nullable: true,
    description:
      'The default description to use for new Whiteboard contributions.',
  })
  @IsOptional()
  @MaxLength(CANVAS_VALUE_LENGTH)
  whiteboardContent?: string;
}
