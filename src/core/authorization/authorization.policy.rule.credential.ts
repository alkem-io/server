import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';

export class AuthorizationPolicyRuleCredential {
  type: string;
  resourceID: string;
  grantedPrivileges: AuthorizationPrivilege[];
  inheritable: boolean;

  constructor(
    grantedPrivileges: AuthorizationPrivilege[],
    type: string,
    resourceID?: string,
    inheritable?: boolean
  ) {
    this.type = type;
    this.resourceID = resourceID || '';
    this.grantedPrivileges = grantedPrivileges;
    this.inheritable = inheritable || true;
  }

  isInheritable(): boolean {
    return this.inheritable;
  }
}
