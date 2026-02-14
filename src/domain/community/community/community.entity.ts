import { RoleSet } from '@domain/access/role-set/role.set.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Communication } from '@domain/communication/communication/communication.entity';
import { ICommunity } from '@domain/community/community/community.interface';
import { UserGroup } from '@domain/community/user-group/user-group.entity';
import { IGroupable } from '@src/common/interfaces/groupable.interface';

export class Community
  extends AuthorizableEntity
  implements ICommunity, IGroupable
{
  communication?: Communication;

  groups?: UserGroup[];

  roleSet!: RoleSet;

  parentID!: string;

  constructor() {
    super();
    this.parentID = '';
  }
}
