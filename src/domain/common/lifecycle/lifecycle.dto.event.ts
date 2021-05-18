import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import { Repository } from 'typeorm';
import { BaseChallenge } from '@domain/challenge';

@InputType()
export class LifecycleEventInput {
  @Field({ nullable: false })
  ID!: number;

  @Field({ nullable: false })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  eventName!: string;

  // Used for handling derived challenges from base challenge
  repository?: Repository<BaseChallenge>;
}
