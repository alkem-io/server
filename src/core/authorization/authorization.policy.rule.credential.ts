import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';

export type AuthorizationPolicyRuleCredential = {
  type: string;
  resourceID: string;
  grantedPrivileges: AuthorizationPrivilege[];
};
