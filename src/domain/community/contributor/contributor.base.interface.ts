import { IAgent } from '@domain/agent/agent/agent.interface';
import { ObjectType } from '@nestjs/graphql';
import { INameable } from '@domain/common/entity/nameable-entity/nameable.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';

@ObjectType('ContributorBase')
export abstract class IContributorBase extends INameable {
  agent!: IAgent;

  storageAggregator?: IStorageAggregator;

  // the internal communicationID (Matrix) for the user
  communicationID!: string;
}
