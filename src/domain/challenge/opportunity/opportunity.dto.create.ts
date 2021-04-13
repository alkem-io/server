import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import {
  IsUniqueTextId,
  TextIdType,
} from '@src/core/validation/constraints/unique.text.id';
import { CreateContextInput } from '@domain/context/context';
import { TextID } from '@domain/common/scalars';

@InputType()
export class CreateOpportunityInput {
  @Field({ nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  parentID!: string;

  @Field({ nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  name!: string;

  @Field(() => TextID, { nullable: false })
  @IsUniqueTextId(TextIdType.challenge)
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
