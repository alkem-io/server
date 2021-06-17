import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { LONG_TEXT_LENGTH, MID_TEXT_LENGTH } from '@src/common/constants';
import { UpdateReferenceInput } from '@domain/common/reference';
import { UpdateVisualInput } from '@domain/context/visual';

@InputType()
export class UpdateContextInput {
  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
  background?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
  vision?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  tagline?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
  who?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
  impact?: string;

  @Field(() => [UpdateReferenceInput], {
    nullable: true,
    description: 'Update the set of References for the Context.',
  })
  references?: UpdateReferenceInput[];

  @Field(() => UpdateVisualInput, {
    nullable: true,
    description: 'Update the Visual assets for the new Context.',
  })
  visual?: UpdateVisualInput;
}
