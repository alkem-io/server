import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';

export type AuthorizationRuleCredential = {
  type: string;
  resourceID: string;
  grantedPrivileges: AuthorizationPrivilege[];
};
