import { InputType, Field } from '@nestjs/graphql';
import { CreateBaseChallengeInput } from '@domain/challenge/base-challenge/base.challenge.dto.create';
import { NameID, UUID } from '@domain/common/scalars';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';

@InputType()
export class CreateOpportunityInput extends CreateBaseChallengeInput {
  @Field(() => UUID, { nullable: false })
  challengeID!: string;

  // Override TOTO: why?
  @Field(() => NameID, {
    nullable: true,
    description: 'A readable identifier, unique within the containing scope.',
  })
  nameID!: string;

  storageAggregatorParent!: IStorageAggregator;

  spaceID = 'not defined';
}
