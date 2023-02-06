import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { IAuthorizationPolicyRulePrivilege } from './authorization.policy.rule.privilege.interface';

export class AuthorizationPolicyRulePrivilege
  implements IAuthorizationPolicyRulePrivilege
{
  sourcePrivilege: AuthorizationPrivilege;
  grantedPrivileges: AuthorizationPrivilege[];
  name: string;

  constructor(
    grantedPrivileges: AuthorizationPrivilege[],
    sourcePrivilege: AuthorizationPrivilege,
    name: string
  ) {
    this.sourcePrivilege = sourcePrivilege;
    this.grantedPrivileges = grantedPrivileges;
    this.name = name;
  }
}
