import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { IAuthorizationPolicyRuleCredential } from './authorization.policy.rule.credential.interface';

export class AuthorizationPolicyRuleCredential
  implements IAuthorizationPolicyRuleCredential
{
  type: string;
  resourceID: string;
  grantedPrivileges: AuthorizationPrivilege[];
  inheritable: boolean;

  constructor(
    grantedPrivileges: AuthorizationPrivilege[],
    type: string,
    resourceID?: string
  ) {
    this.type = type;
    this.resourceID = resourceID || '';
    this.grantedPrivileges = grantedPrivileges;
    this.inheritable = true;
  }
}
