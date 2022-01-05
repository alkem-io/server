import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';

export class AuthorizationPolicyRulePrivilege {
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
