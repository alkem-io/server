import { Field, ObjectType } from '@nestjs/graphql';
import { IBaseChallenge } from '../../challenge/base-challenge/base.challenge.interface';
import { IProject } from '@domain/collaboration/project/project.interface';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { IInnovationFlow } from '@domain/challenge/innovation-flow/innovation.flow.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
@ObjectType('Opportunity')
export abstract class IOpportunity extends IBaseChallenge {
  rowId!: number;
  @Field(() => [IProject], {
    nullable: true,
    description: 'The set of projects within the context of this Opportunity',
  })
  projects?: IProject[];

  spaceID!: string;

  challenge?: IChallenge;

  innovationFlow?: IInnovationFlow;

  storageAggregator?: IStorageAggregator;
}
