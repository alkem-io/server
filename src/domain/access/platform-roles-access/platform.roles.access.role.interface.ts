import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { RoleName } from '@common/enums/role.name';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('PlatformAccessRole')
export abstract class IPlatformAccessRole {
  @Field(() => RoleName, {
    nullable: false,
    description: 'The role name for this Platform Access Role.',
  })
  roleName!: RoleName;

  @Field(() => [AuthorizationPrivilege], {
    nullable: false,
    description: 'The privileges to be granted for this Platform Access Role.',
  })
  grantedPrivileges!: AuthorizationPrivilege[];
}
