import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';

export type AuthorizationCredentialRule = {
  type: string;
  resourceID: string;
  grantedPrivileges: AuthorizationPrivilege[];
};
