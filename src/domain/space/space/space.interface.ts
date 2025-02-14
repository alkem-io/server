import { Field, ObjectType } from '@nestjs/graphql';
import { INameable } from '@domain/common/entity/nameable-entity';
import { SpaceType } from '@common/enums/space.type';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { ICollaboration } from '@domain/collaboration/collaboration';
import { ICommunity } from '@domain/community/community';
import { IContext } from '@domain/context/context/context.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { IAccount } from '../account/account.interface';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { ITemplatesManager } from '@domain/template/templates-manager';
import { ILicense } from '@domain/common/license/license.interface';
import { SpaceLevel } from '@common/enums/space.level';
import { ISpaceSettings } from '../space.settings/space.settings.interface';

@ObjectType('Space')
export class ISpace extends INameable {
  rowId!: number;

  subspaces?: ISpace[];
  parentSpace?: ISpace;

  account?: IAccount;

  @Field(() => SpaceLevel, {
    description:
      'The level of this Space, representing the number of Spaces above this one.',
  })
  level!: SpaceLevel;

  @Field(() => SpaceType, {
    nullable: false,
    description: 'The Type of the Space e.g. space/challenge/opportunity.',
  })
  type!: SpaceType;

  @Field(() => SpaceVisibility, {
    description: 'Visibility of the Space.',
    nullable: false,
  })
  visibility!: SpaceVisibility;

  agent?: IAgent;

  collaboration?: ICollaboration;

  context?: IContext;
  community?: ICommunity;

  settings!: ISpaceSettings;

  storageAggregator?: IStorageAggregator;

  @Field(() => String, {
    description: 'The ID of the level zero space for this tree.',
  })
  levelZeroSpaceID!: string;

  templatesManager?: ITemplatesManager;
  license?: ILicense;
}
