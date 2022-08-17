import { InputType, Field } from '@nestjs/graphql';
import { CreateBaseChallengeInput } from '@domain/challenge/base-challenge/base.challenge.dto.create';
import { UUID } from '@domain/common/scalars';

@InputType()
export class CreateOpportunityInput extends CreateBaseChallengeInput {
  @Field(() => UUID, { nullable: false })
  challengeID!: string;

  @Field(() => UUID, { nullable: false })
  lifecycleTemplateID!: string;
}
