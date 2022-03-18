import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('AuthorizationPolicyRuleCredential')
export abstract class IAuthorizationPolicyRuleCredential {
  @Field(() => String)
  type!: string;

  @Field(() => String)
  resourceID!: string;

  @Field(() => [AuthorizationPrivilege])
  grantedPrivileges!: AuthorizationPrivilege[];

  @Field(() => Boolean)
  inheritable!: boolean;
}
