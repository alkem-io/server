import { IOpportunity } from '@domain/challenge/opportunity/opportunity.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IInnovationFlow } from '@domain/collaboration/innovation-flow/innovation.flow.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { IJourney } from '../base-challenge/journey.interface';
import { IBaseChallenge } from '../base-challenge/base.challenge.interface';
@ObjectType('Challenge', {
  implements: () => [IJourney],
})
export abstract class IChallenge extends IBaseChallenge implements IJourney {
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
