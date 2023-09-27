import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { VERY_LONG_TEXT_LENGTH } from '@src/common/constants';
import { Markdown } from '@domain/common/scalars/scalar.markdown';

@InputType()
export class UpdateContextInput {
  @Field(() => Markdown, { nullable: true })
  @IsOptional()
  @MaxLength(VERY_LONG_TEXT_LENGTH)
  vision?: string;

  @Field(() => Markdown, { nullable: true })
  @IsOptional()
  @MaxLength(VERY_LONG_TEXT_LENGTH)
  who?: string;

  @Field(() => Markdown, { nullable: true })
  @IsOptional()
  @MaxLength(VERY_LONG_TEXT_LENGTH)
  impact?: string;
}
