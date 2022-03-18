import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { IAuthorizationPolicyRulePrivilege } from './authorization.policy.rule.privilege.interface';

export class AuthorizationPolicyRulePrivilege
  implements IAuthorizationPolicyRulePrivilege
{
  sourcePrivilege: AuthorizationPrivilege;
  grantedPrivileges: AuthorizationPrivilege[];

  constructor(
    grantedPrivileges: AuthorizationPrivilege[],
    sourcePrivilege: AuthorizationPrivilege
  ) {
    this.sourcePrivilege = sourcePrivilege;
    this.grantedPrivileges = grantedPrivileges;
  }
}
