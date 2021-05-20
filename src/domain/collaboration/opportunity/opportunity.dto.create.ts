import { InputType, Field } from '@nestjs/graphql';
import { CreateBaseChallengeInput } from '@domain/challenge/base-challenge';

@InputType()
export class CreateOpportunityInput extends CreateBaseChallengeInput {
  @Field({ nullable: false })
  parentID!: string;
}
