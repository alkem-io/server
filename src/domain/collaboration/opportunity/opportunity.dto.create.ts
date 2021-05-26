import { InputType, Field } from '@nestjs/graphql';
import { CreateBaseChallengeInput } from '@domain/challenge/base-challenge';
import { UUID_NAMEID } from '@domain/common/scalars/scalar.uuid.nameid';

@InputType()
export class CreateOpportunityInput extends CreateBaseChallengeInput {
  @Field(() => UUID_NAMEID, { nullable: false })
  challengeID!: string;
}
