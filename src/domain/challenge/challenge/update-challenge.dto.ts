import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { ContextInput } from '@domain/context/context/context.dto';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';

@InputType()
export class UpdateChallengeInput {
  @Field({ nullable: false })
  ID!: number;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  state?: string;

  @Field(() => ContextInput, { nullable: true })
  @IsOptional()
  context?: ContextInput;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];
}
