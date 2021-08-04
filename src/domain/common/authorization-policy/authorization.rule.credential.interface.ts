import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('AuthorizationRuleCredential')
export abstract class IAuthorizationRuleCredential {
  @Field(() => String)
  type!: string;

  @Field(() => String)
  resourceID!: string;

  @Field(() => [String])
  grantedPrivileges!: string[];
}
