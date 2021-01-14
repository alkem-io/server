import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { ContextInput } from '@domain/context/context.dto';
import {
  MID_TEXT_LENGTH,
  TINY_TEXT_LENGTH,
  LONG_TEXT_LENGTH,
} from '@constants';

@InputType()
export class ChallengeInput {
  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  name?: string;

  @Field({ nullable: true })
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
