import { InputType, Field } from '@nestjs/graphql';
import { CreateBaseChallengeInput } from '@domain/challenge/base-challenge/dto/base.challenge.dto.create';
import { UUID } from '@domain/common/scalars';

@InputType()
export class CreateOpportunityInput extends CreateBaseChallengeInput {
  @Field(() => UUID, { nullable: false })
  challengeID!: string;
}
