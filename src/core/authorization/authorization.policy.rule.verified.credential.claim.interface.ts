import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('AuthorizationPolicyRuleVerifiedCredentialClaim')
export abstract class IAuthorizationPolicyRuleVerifiedCredentialClaim {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  value!: string;

  @Field(() => [AuthorizationPrivilege])
  grantedPrivileges!: AuthorizationPrivilege[];
}
