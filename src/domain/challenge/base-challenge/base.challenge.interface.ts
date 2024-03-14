import { Field, ObjectType } from '@nestjs/graphql';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { IContext } from '@domain/context/context/context.interface';
import { ICommunity } from '@domain/community/community/community.interface';
import { IPreferenceSet } from '@domain/common/preference-set';
import { INameable } from '@domain/common/entity/nameable-entity/nameable.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';

@ObjectType('IBaseChallenge')
export abstract class IBaseChallenge extends INameable {
  rowId!: number;
  agent?: IAgent;
  @Field(() => ICollaboration, {
    nullable: true,
    description: 'Collaboration object for the base challenge',
  })
  collaboration?: ICollaboration;

  context?: IContext;
  community?: ICommunity;
  preferenceSet?: IPreferenceSet;

  storageAggregator?: IStorageAggregator;
}
