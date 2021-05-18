import { SMALL_TEXT_LENGTH } from '@common/constants';
import { BaseChallenge } from '@domain/challenge';
import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { Repository } from 'typeorm';

@InputType()
export class BaseChallengeEventInput {
  @Field({ nullable: false })
  ID!: number;

  @Field({ nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  eventName!: string;

  // Used internally by the server
  repository?: Repository<BaseChallenge>;
}
