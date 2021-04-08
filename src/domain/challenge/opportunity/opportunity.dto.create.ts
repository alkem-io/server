import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { SMALL_TEXT_LENGTH, TINY_TEXT_LENGTH } from '@src/common/constants';
import {
  IsUniqueTextId,
  TextIdType,
} from '@src/core/validation/constraints/unique.text.id';
import { CreateContextInput } from '@domain/context/context';

@InputType()
export class CreateOpportunityInput {
  @Field({ nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  parentID!: string;

  @Field({ nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  name!: string;

  @Field({ nullable: false })
  @IsUniqueTextId(TextIdType.challenge)
  @MaxLength(TINY_TEXT_LENGTH)
  textID!: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  state?: string;

  @Field(() => CreateContextInput, { nullable: true })
  context?: CreateContextInput;

  @Field(() => [String], { nullable: true })
  tags?: string[];
}
