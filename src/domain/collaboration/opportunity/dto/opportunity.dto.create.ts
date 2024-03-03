import { InputType, Field } from '@nestjs/graphql';
import { CreateBaseChallengeInput } from '@domain/challenge/base-challenge/base.challenge.dto.create';
import { NameID, UUID } from '@domain/common/scalars';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';

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

  storageAggregatorParent!: IStorageAggregator;

  @Field(() => UUID, {
    nullable: true,
    description:
      'The ID of the Opportunity to use for setting up the collaboration of the Opportunity.',
  })
  collaborationTemplateOpportunityID?: string;

  spaceID = 'not defined';
}
