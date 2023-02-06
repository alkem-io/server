import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('AuthorizationPolicyRuleCredential')
export abstract class IAuthorizationPolicyRuleCredential {
  @Field(() => [ICredentialDefinition])
  criterias!: ICredentialDefinition[];

  @Field(() => [AuthorizationPrivilege])
  grantedPrivileges!: AuthorizationPrivilege[];

  @Field(() => Boolean)
  inheritable!: boolean;

  @Field(() => String, { nullable: true })
  name!: string;
}
