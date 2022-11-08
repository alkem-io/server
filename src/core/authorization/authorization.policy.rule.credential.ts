import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { IAuthorizationPolicyRuleCredential } from './authorization.policy.rule.credential.interface';

export class AuthorizationPolicyRuleCredential
  implements IAuthorizationPolicyRuleCredential
{
  criterias: ICredentialDefinition[];
  grantedPrivileges: AuthorizationPrivilege[];
  inheritable: boolean;

  constructor(
    grantedPrivileges: AuthorizationPrivilege[],
    type: string,
    resourceID?: string
  ) {
    const criteria: ICredentialDefinition = {
      type: type,
      resourceID: resourceID || '',
    };
    this.criterias = [criteria];
    this.grantedPrivileges = grantedPrivileges;
    this.inheritable = true;
  }

  appendCriteria(type: string, resourceID?: string) {
    const criteria: ICredentialDefinition = {
      type: type,
      resourceID: resourceID || '',
    };
    this.criterias.push(criteria);
  }
}
