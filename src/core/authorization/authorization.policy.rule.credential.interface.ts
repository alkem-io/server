import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('AuthorizationPolicyRuleCredential')
export abstract class IAuthorizationPolicyRuleCredential {
  @Field(() => String)
  type!: string;

  @Field(() => String)
  resourceID!: string;

  @Field(() => [String])
  grantedPrivileges!: string[];
}
