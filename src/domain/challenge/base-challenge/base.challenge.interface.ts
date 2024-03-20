import { ObjectType } from '@nestjs/graphql';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { IContext } from '@domain/context/context/context.interface';
import { ICommunity } from '@domain/community/community/community.interface';
import { INameable } from '@domain/common/entity/nameable-entity/nameable.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { SpaceType } from '@common/enums/space.type';

@ObjectType('IBaseChallenge')
export abstract class IBaseChallenge extends INameable {
  rowId!: number;
  agent?: IAgent;

  collaboration?: ICollaboration;

  context?: IContext;
  community?: ICommunity;

  settingsStr!: string;

  storageAggregator?: IStorageAggregator;

  type!: SpaceType;
}
