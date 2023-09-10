import { InputType, Field } from '@nestjs/graphql';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { CANVAS_VALUE_LENGTH } from '@common/constants';
import { IsOptional, MaxLength } from 'class-validator';
import JSON from 'graphql-type-json';
@InputType()
export class CreateCalloutResponseDefaultsInput {
  @Field(() => Markdown, {
    nullable: true,
    description: 'The default description to use for new Post contributions.',
  })
  postDescription?: string;

  @Field(() => JSON, { nullable: true })
  @IsOptional()
  @MaxLength(CANVAS_VALUE_LENGTH)
  whiteboardContent?: string;
}
