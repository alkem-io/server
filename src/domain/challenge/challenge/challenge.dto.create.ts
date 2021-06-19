import { UUID_NAMEID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { CreateBaseChallengeInput } from '@domain/challenge/base-challenge/base.challenge.dto.create';

@InputType()
export class CreateChallengeInput extends CreateBaseChallengeInput {
  @Field(() => UUID_NAMEID, { nullable: false })
  parentID!: string;
}
