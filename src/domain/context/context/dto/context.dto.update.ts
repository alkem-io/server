import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength, ValidateNested } from 'class-validator';
import { LONG_TEXT_LENGTH, VERY_LONG_TEXT_LENGTH } from '@src/common/constants';
import { UpdateReferenceInput } from '@domain/common/reference/reference.dto.update';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { Type } from 'class-transformer';

@InputType()
export class UpdateContextInput {
  @Field(() => Markdown, { nullable: true })
  @IsOptional()
  @MaxLength(VERY_LONG_TEXT_LENGTH)
  vision?: string;

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
    description: 'Update the set of Recommendations for the Context.',
  })
  @ValidateNested({ each: true })
  @Type(() => UpdateReferenceInput)
  recommendations?: UpdateReferenceInput[];
}
