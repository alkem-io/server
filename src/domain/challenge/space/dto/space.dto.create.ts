import { Field, InputType } from '@nestjs/graphql';
import { CreateBaseChallengeInput } from '@domain/challenge/base-challenge/dto/base.challenge.dto.create';
import { CreateAccountInput } from '@domain/challenge/account/dto';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class CreateSpaceInput extends CreateBaseChallengeInput {
  @Field(() => CreateAccountInput, { nullable: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAccountInput)
  accountData!: CreateAccountInput;
}
