import { InputType, Field } from '@nestjs/graphql';
import { CreateBaseChallengeInput } from '@domain/challenge/base-challenge/base.challenge.dto.create';
import { NameID, UUID } from '@domain/common/scalars';

@InputType()
export class CreateOpportunityInput extends CreateBaseChallengeInput {
  @Field(() => UUID, { nullable: false })
  challengeID!: string;

  @Field(() => UUID, {
    nullable: true,
    description: 'The Innovation Flow template to use for the Opportunity.',
  })
  innovationFlowTemplateID?: string;

  // Override
  @Field(() => NameID, {
    nullable: true,
    description: 'A readable identifier, unique within the containing scope.',
  })
  nameID!: string;
}
