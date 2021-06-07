import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import { CreateContextInput } from '@domain/context/context';
import { CreateNameableInput } from '@domain/common/nameable-entity';

@InputType()
export class CreateBaseChallengeInput extends CreateNameableInput {
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
