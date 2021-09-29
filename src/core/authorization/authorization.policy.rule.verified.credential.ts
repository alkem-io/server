import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';

export type AuthorizationPolicyRuleVerifiedCredential = {
  type: string;
  resourceID: string; // a DID representing the entity to be operated on
  grantedPrivileges: AuthorizationPrivilege[];
};
