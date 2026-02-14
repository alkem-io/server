import { SpaceLevel } from '@common/enums/space.level';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { IPlatformRolesAccess } from '@domain/access/platform-roles-access/platform.roles.access.interface';
import { Agent } from '@domain/agent/agent/agent.entity';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { License } from '@domain/common/license/license.entity';
import { Community } from '@domain/community/community/community.entity';
import { ISpace } from '@domain/space/space/space.interface';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { TemplatesManager } from '@domain/template/templates-manager';
import { Account } from '../account/account.entity';
import { SpaceAbout } from '../space.about';
import { ISpaceSettings } from '../space.settings/space.settings.interface';

export class Space extends AuthorizableEntity implements ISpace {
  nameID!: string;

  subspaces?: Space[];

  parentSpace?: Space;

  account?: Account;

  rowId!: number;

  collaboration?: Collaboration;

  about!: SpaceAbout;

  community?: Community;

  agent?: Agent;

  settings: ISpaceSettings;

  // Calculated field to make the authorization logic clearer
  platformRolesAccess!: IPlatformRolesAccess;

  storageAggregator?: StorageAggregator;

  levelZeroSpaceID!: string;

  level!: SpaceLevel;

  sortOrder!: number;

  visibility!: SpaceVisibility;

  templatesManager?: TemplatesManager;

  license?: License;

  constructor() {
    super();
    this.nameID = '';
    this.settings = {} as ISpaceSettings;
    this.platformRolesAccess = { roles: [] } as IPlatformRolesAccess;
  }
}
