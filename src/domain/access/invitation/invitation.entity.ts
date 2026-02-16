import { RoleName } from '@common/enums/role.name';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { RoleSet } from '@domain/access/role-set/role.set.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Lifecycle } from '@domain/common/lifecycle/lifecycle.entity';
import { IInvitation } from './invitation.interface';

export class Invitation extends AuthorizableEntity implements IInvitation {
  // todo ID in migration is varchar - must be char(36)
  lifecycle!: Lifecycle;

  invitedContributorID!: string;

  createdBy!: string;

  welcomeMessage?: string;

  invitedToParent!: boolean;

  contributorType!: RoleSetContributorType;

  roleSet?: RoleSet;

  extraRoles!: RoleName[];
}
