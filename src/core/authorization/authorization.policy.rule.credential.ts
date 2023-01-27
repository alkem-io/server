import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { IAuthorizationPolicyRuleCredential } from './authorization.policy.rule.credential.interface';

export class AuthorizationPolicyRuleCredential
  implements IAuthorizationPolicyRuleCredential
{
  criterias: ICredentialDefinition[];
  grantedPrivileges: AuthorizationPrivilege[];
  inheritable: boolean;
  name: string;

  constructor(
    grantedPrivileges: AuthorizationPrivilege[],
    criteria: ICredentialDefinition,
    name?: string
  ) {
    this.criterias = [criteria];
    this.grantedPrivileges = grantedPrivileges;
    this.inheritable = true;
    this.name = name || '';
  }
}
