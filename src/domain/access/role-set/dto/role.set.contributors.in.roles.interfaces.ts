import { RoleName } from '@common/enums/role.name';
import { IOrganization } from '@domain/community/organization';
import { IUser } from '@domain/community/user/user.interface';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('UsersInRolesResponse')
export class IUsersInRoles {
  @Field(() => RoleName)
  role!: RoleName;

  @Field(() => [IUser])
  users!: IUser[];
}

@ObjectType('OrganizationsInRolesResponse')
export class IOrganizationsInRoles {
  @Field(() => RoleName)
  role!: RoleName;

  @Field(() => [IOrganization])
  organizations!: IOrganization[];
}

@ObjectType('VirtualContributorsInRolesResponse')
export class IVirtualContributorsInRoles {
  @Field(() => RoleName)
  role!: RoleName;

  @Field(() => [IVirtualContributor])
  virtualContributors!: IVirtualContributor[];
}
