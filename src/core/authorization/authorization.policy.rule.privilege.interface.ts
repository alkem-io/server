import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('AuthorizationPolicyRulePrivilege')
export abstract class IAuthorizationPolicyRulePrivilege {
  @Field(() => AuthorizationPrivilege)
  sourcePrivilege!: AuthorizationPrivilege;
  @Field(() => [AuthorizationPrivilege])
  grantedPrivileges!: AuthorizationPrivilege[];
}
