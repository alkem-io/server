import {
  LONG_TEXT_LENGTH,
  MID_TEXT_LENGTH,
  TINY_TEXT_LENGTH,
} from '@constants';
import { ContextInput } from '@domain/context/context.dto';
import { Field, InputType } from '@nestjs/graphql';
import {
  IsUniqueTextId,
  TextIdType,
} from '@utils/validation/constraints/unique.text.id';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class ChallengeInput {
  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  name?: string;

  @Field({ nullable: true })
  @IsUniqueTextId(TextIdType.challenge)
  @IsOptional()
  @MaxLength(TINY_TEXT_LENGTH)
  textID?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
  state?: string;

  @Field(() => ContextInput, { nullable: true })
  @IsOptional()
  context?: ContextInput;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];
}
