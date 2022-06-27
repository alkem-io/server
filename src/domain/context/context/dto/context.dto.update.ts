import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength, ValidateNested } from 'class-validator';
import {
  LONG_TEXT_LENGTH,
  MID_TEXT_LENGTH,
  VERY_LONG_TEXT_LENGTH,
} from '@src/common/constants';
import { UpdateReferenceInput } from '@domain/common/reference/reference.dto.update';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { UpdateLocationInput } from '@domain/common/location/dto/location.dto.update';
import { Type } from 'class-transformer';

@InputType()
export class UpdateContextInput {
  @Field(() => Markdown, { nullable: true })
  @IsOptional()
  @MaxLength(VERY_LONG_TEXT_LENGTH)
  background?: string;

  @Field(() => Markdown, { nullable: true })
  @IsOptional()
  @MaxLength(VERY_LONG_TEXT_LENGTH)
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

  @Field(() => [UpdateReferenceInput], {
    nullable: true,
    description: 'Update the set of References for the Context.',
  })
  @ValidateNested({ each: true })
  @Type(() => UpdateLocationInput)
  references?: UpdateReferenceInput[];

  @Field(() => UpdateLocationInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateLocationInput)
  location?: UpdateLocationInput;
}
