import { InputType, Field } from '@nestjs/graphql';
import { LONG_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@src/common/constants';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class CreateTemplateInfoInput {
  @Field({ nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  title!: string;

  @Field({ nullable: false })
  @MaxLength(LONG_TEXT_LENGTH)
  description!: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];
}
