import { Field, ObjectType } from '@nestjs/graphql';
import { INameable } from '@domain/common/entity/nameable-entity';
import { SpaceType } from '@common/enums/space.type';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { ICollaboration } from '@domain/collaboration/collaboration';
import { ICommunity } from '@domain/community/community';
import { IContext } from '@domain/context/context/context.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { IAccount } from '../account/account.interface';

@ObjectType('Space')
export class ISpace extends INameable {
  rowId!: number;

  subspaces?: ISpace[];
  parentSpace?: ISpace;

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

  agent?: IAgent;

  collaboration?: ICollaboration;

  context?: IContext;
  community?: ICommunity;

  settingsStr!: string;

  storageAggregator?: IStorageAggregator;
}
