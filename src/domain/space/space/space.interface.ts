import { Field, Int, ObjectType } from '@nestjs/graphql';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { ICollaboration } from '@domain/collaboration/collaboration';
import { ICommunity } from '@domain/community/community';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { IAccount } from '../account/account.interface';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { ITemplatesManager } from '@domain/template/templates-manager';
import { ILicense } from '@domain/common/license/license.interface';
import { SpaceLevel } from '@common/enums/space.level';
import { ISpaceSettings } from '../space.settings/space.settings.interface';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { NameID } from '@domain/common/scalars/scalar.nameid';
import { ISpaceAbout } from '../space.about/space.about.interface';
import { IPlatformRolesAccess } from '@domain/access/platform-roles-access/platform.roles.access.interface';

@ObjectType('Space')
export class ISpace extends IAuthorizable {
  rowId!: number;

  @Field(() => NameID, {
    nullable: false,
    description:
      'A name identifier of the entity, unique within a given scope.',
  })
  nameID!: string;

  about!: ISpaceAbout;

  subspaces?: ISpace[];
  parentSpace?: ISpace;

  account?: IAccount;

  @Field(() => SpaceLevel, {
    description:
      'The level of this Space, representing the number of Spaces above this one.',
  })
  level!: SpaceLevel;

  @Field(() => SpaceVisibility, {
    description: 'Visibility of the Space.',
    nullable: false,
  })
  visibility!: SpaceVisibility;

  agent?: IAgent;

  collaboration?: ICollaboration;

  community?: ICommunity;

  settings!: ISpaceSettings;

  platformRolesAccess!: IPlatformRolesAccess;

  storageAggregator?: IStorageAggregator;

  @Field(() => String, {
    description: 'The ID of the level zero space for this tree.',
  })
  levelZeroSpaceID!: string;

  @Field(() => Int, {
    nullable: false,
    description: 'The sorting order for this Space within its parent.',
  })
  sortOrder!: number;

  templatesManager?: ITemplatesManager;
  license?: ILicense;
}
