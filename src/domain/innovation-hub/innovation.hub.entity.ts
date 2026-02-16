import { SearchVisibility } from '@common/enums/search.visibility';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { NameableEntity } from '@domain/common/entity/nameable-entity';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { Account } from '@domain/space/account/account.entity';
import { InnovationHubType } from './innovation.hub.type.enum';

export class InnovationHub extends NameableEntity implements IInnovationHub {
  account!: Account;

  subdomain!: string;

  type!: InnovationHubType;

  spaceVisibilityFilter?: SpaceVisibility;

  spaceListFilter?: string[];

  listedInStore!: boolean;

  searchVisibility!: SearchVisibility;
}
