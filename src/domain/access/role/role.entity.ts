import { RoleName } from '@common/enums/role.name';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { RoleSet } from '../role-set/role.set.entity';
import { IContributorRolePolicy } from './contributor.role.policy.interface';
import { IRole } from './role.interface';

export class Role extends BaseAlkemioEntity implements IRole {
  roleSet?: RoleSet;

  name!: RoleName;

  credential!: ICredentialDefinition;

  parentCredentials!: ICredentialDefinition[];

  requiresEntryRole!: boolean;

  requiresSameRoleInParentRoleSet!: boolean;

  userPolicy!: IContributorRolePolicy;

  organizationPolicy!: IContributorRolePolicy;

  virtualContributorPolicy!: IContributorRolePolicy;
}
