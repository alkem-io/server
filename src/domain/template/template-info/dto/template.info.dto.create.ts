import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { InputType, Field } from '@nestjs/graphql';
import { LONG_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@src/common/constants';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class CreateTemplateInfoInput {
  @Field({ nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  title!: string;

  @Field(() => Markdown, { nullable: false })
  @MaxLength(LONG_TEXT_LENGTH)
  description!: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];

  @Field(() => String, { nullable: true })
  @IsOptional()
  visualUri?: string;
}
