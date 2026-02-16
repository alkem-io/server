import { RoleName } from '@common/enums/role.name';
import { RoleSet } from '@domain/access/role-set/role.set.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { IPlatformInvitation } from './platform.invitation.interface';

export class PlatformInvitation
  extends AuthorizableEntity
  implements IPlatformInvitation
{
  roleSet?: RoleSet;

  roleSetInvitedToParent!: boolean;

  roleSetExtraRoles!: RoleName[];

  email!: string;

  firstName?: string;

  lastName?: string;

  createdBy!: string;

  welcomeMessage?: string;

  profileCreated!: boolean;
}
