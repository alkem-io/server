import { IOpportunity } from '@domain/collaboration/opportunity/opportunity.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IInnovationFlow } from '../innovation-flow/innovation.flow.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { IJourney } from '../base-challenge/journey.interface';
@ObjectType('Challenge', {
  implements: () => [IJourney],
})
export abstract class IChallenge extends IJourney {
  rowId!: number;
  childChallenges?: IChallenge[];
  opportunities?: IOpportunity[];

  storageAggregator?: IStorageAggregator;
  innovationFlow?: IInnovationFlow;

  @Field(() => String, {
    description: 'The ID of the containing Space.',
    nullable: false,
  })
  spaceID!: string;
}
