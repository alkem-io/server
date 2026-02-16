import { RoleName } from '@common/enums/role.name';
import { RoleSetType } from '@common/enums/role.set.type';
import { Application } from '@domain/access/application/application.entity';
import { Invitation } from '@domain/access/invitation/invitation.entity';
import { PlatformInvitation } from '@domain/access/invitation.platform/platform.invitation.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Form } from '@domain/common/form/form.entity';
import { License } from '@domain/common/license/license.entity';
import { IGroupable } from '@src/common/interfaces/groupable.interface';
import { Role } from '../role/role.entity';
import { IRoleSet } from './role.set.interface';

export class RoleSet
  extends AuthorizableEntity
  implements IRoleSet, IGroupable
{
  license?: License;

  applicationForm?: Form;

  roles?: Role[];

  entryRoleName!: RoleName;

  applications?: Application[];

  invitations?: Invitation[];

  platformInvitations?: PlatformInvitation[];

  // The parent roleSet can have many child communities; the relationship is controlled by the child.
  parentRoleSet?: RoleSet;

  type!: RoleSetType;
}
