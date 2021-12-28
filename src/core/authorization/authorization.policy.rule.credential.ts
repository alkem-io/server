import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';

export class AuthorizationPolicyRuleCredential {
  type: string;
  resourceID: string;
  grantedPrivileges: AuthorizationPrivilege[];
  inheritable?: boolean = true;

  constructor() {
    this.type = '';
    this.resourceID = '';
    this.grantedPrivileges = [];
    this.inheritable = true;
  }
}
