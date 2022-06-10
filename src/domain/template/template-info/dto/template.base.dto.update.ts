import { InputType, Field } from '@nestjs/graphql';
import { LONG_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@src/common/constants';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class UpdateTemplateInfoInput {
  @Field({ nullable: true })
  @MaxLength(SMALL_TEXT_LENGTH)
  title!: string;

  @Field({ nullable: true })
  @MaxLength(LONG_TEXT_LENGTH)
  description!: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];
}
