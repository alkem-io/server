import { Field, ObjectType } from '@nestjs/graphql';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { IContext } from '@domain/context/context/context.interface';
import { ICommunity } from '@domain/community/community/community.interface';
import { INameable } from '@domain/common/entity/nameable-entity/nameable.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { SpaceType } from '@common/enums/space.type';
import { IAccount } from '../account/account.interface';

@ObjectType('IBaseChallenge')
export abstract class IBaseChallenge extends INameable {
  @Field(() => IAccount, {
    nullable: false,
    description: 'The Account that this Space is part of.',
  })
  account!: IAccount;

  @Field(() => Number, {
    description:
      'The level of this Space, representing the number of Spaces above this one.',
  })
  level!: number;

  @Field(() => SpaceType, {
    nullable: false,
    description: 'The Type of the Space e.g. space/challenge/opportunity.',
  })
  type!: SpaceType;

  rowId!: number;
  agent?: IAgent;

  collaboration?: ICollaboration;

  context?: IContext;
  community?: ICommunity;

  settingsStr!: string;

  storageAggregator?: IStorageAggregator;
}
