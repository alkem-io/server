import { IOpportunity } from '@domain/collaboration/opportunity/opportunity.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IBaseChallenge } from '@domain/challenge/base-challenge/base.challenge.interface';
import { IInnovationFlow } from '../innovation-flow/innovation.flow.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
@ObjectType('Challenge')
export abstract class IChallenge extends IBaseChallenge {
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
