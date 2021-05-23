import { SMALL_TEXT_LENGTH } from '@common/constants';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';

@InputType()
export class BaseChallengeEventInput {
  @Field(() => UUID, { nullable: false })
  ID!: string;

  @Field({ nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  eventName!: string;
}
