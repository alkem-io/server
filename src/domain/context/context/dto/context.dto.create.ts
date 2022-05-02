import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength, ValidateNested } from 'class-validator';
import { CreateReferenceInput } from '@domain/common/reference/reference.dto.create';
import { LONG_TEXT_LENGTH, MID_TEXT_LENGTH } from '@src/common/constants';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { CreateLocationInput } from '@domain/common/location/dto/location.dto.create';

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

  @Field({ nullable: true })
  @IsOptional()
  @ValidateNested()
  location?: CreateLocationInput;
}
