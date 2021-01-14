import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { ContextInput } from '@domain/context/context.dto';
import { SMALL_TEXT_LENGTH, TINY_TEXT_LENGTH } from '@constants';

@InputType()
export class OpportunityInput {
  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(TINY_TEXT_LENGTH)
  textID?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  state?: string;

  @Field(() => ContextInput, { nullable: true })
  @IsOptional()
  context?: ContextInput;
}
