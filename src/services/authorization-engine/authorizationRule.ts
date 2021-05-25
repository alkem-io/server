import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';

export type AuthorizationRule = {
  type: string;
  resourceID: string;
  grantedPrivileges: AuthorizationPrivilege[];
};
