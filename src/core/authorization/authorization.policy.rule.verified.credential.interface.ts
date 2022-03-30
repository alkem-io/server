import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('AuthorizationPolicyRuleVerifiedCredential')
export abstract class IAuthorizationPolicyRuleVerifiedCredential {
  @Field(() => String)
  credentialName!: string;

  @Field(() => String)
  claimRule!: string;

  @Field(() => [AuthorizationPrivilege])
  grantedPrivileges!: AuthorizationPrivilege[];
}
