import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { SMALL_TEXT_LENGTH, TINY_TEXT_LENGTH } from '@src/common/constants';
import { UpdateContextInput } from '@domain/context/context/context.dto.update';

@InputType()
export class UpdateOpportunityInput {
  @Field({ nullable: false })
  @MaxLength(TINY_TEXT_LENGTH)
  ID!: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  state?: string;

  @Field(() => UpdateContextInput, { nullable: true })
  @IsOptional()
  context?: UpdateContextInput;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];
}
