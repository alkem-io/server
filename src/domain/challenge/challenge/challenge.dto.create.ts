import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
// import {
//   IsUniqueTextId,
//   TextIdType,
// } from '@src/core/validation/constraints/unique.text.id';
import { CreateContextInput } from '@domain/context/context';
import { TextID } from '@domain/common/scalars';

@InputType()
export class CreateChallengeInput {
  @Field({ nullable: false })
  parentID!: number;

  @Field({ nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  name!: string;

  @Field(() => TextID, { nullable: false })
  // @IsUniqueTextId(TextIdType.challenge, {
  //   message: 'Challenge with the textID: $value already exists!',
  // })
  textID!: string;

  @Field(() => CreateContextInput, { nullable: true })
  @IsOptional()
  context?: CreateContextInput;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  lifecycleTemplate?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];
}
