import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { CreateReferenceInput } from '@domain/common/reference/reference.dto.create';
import { LONG_TEXT_LENGTH, MID_TEXT_LENGTH } from '@src/common/constants';
import { CreateVisualInput } from '@domain/context/visual';
import { Markdown } from '@domain/common/scalars/scalar.markdown';

@InputType()
export class CreateContextInput {
  @Field(() => Markdown, { nullable: true })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
  background?: string;

  @Field(() => Markdown, { nullable: true })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
  vision?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  tagline?: string;

  @Field(() => Markdown, { nullable: true })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
  who?: string;

  @Field(() => Markdown, { nullable: true })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
  impact?: string;

  @Field(() => [CreateReferenceInput], {
    nullable: true,
    description: 'Set of References for the new Context.',
  })
  references?: CreateReferenceInput[];

  @Field(() => CreateVisualInput, {
    nullable: true,
    description: 'The Visual assets for the new Context.',
  })
  visual?: CreateVisualInput;
}
